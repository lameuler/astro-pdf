import { mkdir, rm } from 'node:fs/promises'
import { dirname, sep } from 'node:path'

import { bold, red, yellow } from 'kleur/colors'
import type { Browser, HTTPRequest, HTTPResponse, Page, PuppeteerLifeCycleEvent } from 'puppeteer'

import { type PageOptions } from './options.js'
import { filepathToPathname, openFd, pathnameToFilepath, pipeToFd } from './utils.js'

export interface PageErrorOptions extends ErrorOptions {
    status: number | null
    details: string | null
    src: string | null
}

export class PageError extends Error implements PageErrorOptions {
    name = 'PageError' as const
    location: string
    title: string
    status: number | null
    details: string | null
    src: string | null

    constructor(location: string, title: string, options?: Partial<PageErrorOptions>) {
        let message = `Failed to load \`${location}\`: ${title}`
        if (options?.details) {
            message += '\n' + options?.details
        }
        super(message, options)

        this.location = location
        this.title = title

        const { status, details, src } = options ?? {}

        this.status = status ?? null
        this.details = details ?? null
        this.src = src && src !== location ? src : null
    }
}

export class FatalError extends Error {
    name = 'FatalError' as const
    constructor(message: string, cause?: unknown) {
        if (cause) {
            message += ': ' + cause
        }
        super(message, cause ? { cause } : undefined)
    }
}

export interface PageResult {
    location: string
    src: string | null
    output: {
        path: string
        pathname: string
    }
}

export type PageEnv = {
    outDir: string
    browser: Browser
    baseUrl?: URL
    signal?: AbortSignal
    debug: (message: string) => void
    warn: (message: string) => void
}

async function newPage(browser: Browser, location: string, debug: (msg: string) => void, isolated?: boolean) {
    if (!browser.connected) {
        throw new FatalError(
            `Fatal error when opening a new page for \`${location}\`: ` +
                'browser is not connected. it may have been unexpectedly closed.'
        )
    }
    try {
        if (isolated) {
            const context = await browser.createBrowserContext()
            debug(`created browser context (${context.id}) for \`${location}\``)
            return await context.newPage()
        } else {
            return await browser.newPage()
        }
    } catch (err) {
        throw new FatalError(`Fatal error when opening a new page for \`${location}\``, err)
    }
}

async function runCallback<T extends unknown[], R>(
    info: { dest: string; src?: string },
    name: string,
    callback: (...args: T) => R,
    ...args: T
): Promise<R> {
    try {
        return await callback(...args)
    } catch (err) {
        const message = err instanceof Error ? `: [${err.name}] ${err.message}` : ''
        throw new PageError(info.dest, `failed to run \`${name}\`${message}`, { cause: err, src: info.src })
    }
}

export async function processPage(location: string, pageOptions: PageOptions, env: PageEnv): Promise<PageResult> {
    const { outDir, browser, baseUrl, debug, warn, signal } = env
    signal?.throwIfAborted()

    debug(`starting processing of ${location}`)

    const page = await newPage(browser, location, debug, pageOptions.isolated)

    try {
        signal?.throwIfAborted()

        await loadPage(location, baseUrl, page, pageOptions.waitUntil, pageOptions, signal)
        signal?.throwIfAborted()

        const url = page.url()
        const dest = baseUrl && url.startsWith(baseUrl?.origin) ? url.substring(baseUrl?.origin.length) : url

        if (pageOptions.screen) {
            await page.emulateMediaType('screen')
        }
        signal?.throwIfAborted()
        if (pageOptions.callback) {
            debug('running user callback')
            await runCallback({ dest, src: location }, 'callback', pageOptions.callback, page)
        }
        signal?.throwIfAborted()

        const outPathRaw =
            typeof pageOptions.path === 'function'
                ? await runCallback({ dest, src: location }, 'path', pageOptions.path, new URL(url), page)
                : pageOptions.path
        signal?.throwIfAborted()

        // resolve pdf output relative to astro output directory
        const outPath = pathnameToFilepath(outPathRaw, outDir)

        if (outPath.endsWith(sep) || outPath.endsWith('/')) {
            throw new PageError(dest, `output path \`${outPath}\` is a directory`, { src: location })
        }

        const dir = dirname(outPath)
        signal?.throwIfAborted()
        await mkdir(dir, { recursive: true })

        signal?.throwIfAborted()

        const { fd, path, err } = await openFd(outPath, pageOptions.ensurePath, debug, warn, signal)
        const pathname = filepathToPathname(path, outDir)

        if (!fd) {
            let code = err instanceof Error && 'code' in err ? err.code : false
            if (code === 'EEXIST') {
                code = 'file already exists'
            } else if (code) {
                code = 'error code ' + code
            }
            const message = code ? ': ' + code : ''
            throw new PageError(dest, `failed to open \`${pathname}\`${message}`, { src: location })
        }

        try {
            signal?.throwIfAborted()

            const pdfOptions =
                typeof pageOptions.pdf === 'function'
                    ? await runCallback({ dest, src: location }, 'pdf', pageOptions.pdf, page)
                    : pageOptions.pdf
            signal?.throwIfAborted()

            const stream = await page.createPDFStream(pdfOptions)
            signal?.throwIfAborted()

            await pipeToFd(stream, fd, signal)
        } catch (err) {
            await fd.close()
            try {
                // remove the created file if writing was not successful
                await rm(path)
                debug(`removed \`${path}\``)
            } catch (e) {
                debug(`failed to remove \`${path}\`: ${e}`)
            }
            if (err instanceof PageError || err instanceof FatalError) {
                throw err
            }
            const info = err instanceof Error ? `: [${err.name}] ${err.message}` : ''
            throw new PageError(dest, 'failed to write pdf' + info, { cause: err, src: location })
        } finally {
            await fd.close()
        }

        signal?.throwIfAborted()

        return {
            src: location !== dest ? location : null,
            location: dest,
            output: {
                path,
                pathname
            }
        }
    } finally {
        if (!page.isClosed()) {
            debug(`closing page for \`${location}\` (page.url: ${page.url()})`)
            try {
                await page.close()
            } catch (err) {
                debug(bold(red(`failed to close page for \`${location}\`: `)) + err)
            }
        } else {
            debug(yellow(`page for \`${location}\` has already been closed`))
        }
        const context = page.browserContext()
        if (context !== page.browser().defaultBrowserContext()) {
            if (!context.closed) {
                debug(`closing browser context (${context.id}) for \`${location}\``)
                try {
                    await context.close()
                } catch (err) {
                    debug(bold(red(`failed to close browser context (${context.id}) for \`${location}\`: `)) + err)
                }
            } else {
                debug(yellow(`browser context (${context.id}) for \`${location}\` has already been closed`))
            }
        }
    }
}

class AbortPageLoad extends Error {
    constructor() {
        super('abort signal: abort page load')
    }
}

export async function loadPage(
    location: string,
    baseUrl: URL | undefined,
    page: Page,
    waitUntil: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[],
    options: Pick<PageOptions, 'viewport' | 'navTimeout' | 'preCallback'> = {},
    signal?: AbortSignal
): Promise<Page> {
    signal?.throwIfAborted()
    if (page.url() !== 'about:blank' || page.isClosed()) {
        throw new Error(`internal error: loadPage expects a new page`)
    }

    const { viewport, navTimeout, preCallback } = options

    if (viewport) {
        await page.setViewport(viewport)
    }
    signal?.throwIfAborted()
    if (typeof navTimeout === 'number') {
        page.setDefaultNavigationTimeout(navTimeout)
    }
    signal?.throwIfAborted()
    if (typeof preCallback === 'function') {
        await runCallback({ dest: location }, 'preCallback', preCallback, page)
    }
    signal?.throwIfAborted()

    return new Promise((resolve, reject) => {
        let url: URL
        try {
            url = new URL(location, baseUrl)
        } catch (err) {
            reject(new PageError(location, 'invalid location', { cause: err }))
            return
        }

        let dest = location

        function rejectResponse(res: HTTPResponse) {
            const title = res.status() + (res.statusText() ? ' ' + res.statusText() : '')
            reject(
                new PageError(dest, title, {
                    status: res.status(),
                    src: location
                })
            )
            signal?.removeEventListener('abort', onAbort)
        }

        const controller = new AbortController()

        function onAbort() {
            controller.abort(new AbortPageLoad())
            signal?.removeEventListener('abort', onAbort)
            reject(signal?.reason)
        }
        signal?.addEventListener('abort', onAbort)

        const requestListener = (req: HTTPRequest) => {
            if (req.url() === new URL(dest, baseUrl).href) {
                const err = req.failure()?.errorText ?? 'request failed'
                page.off('response', responseListener)
                page.off('requestfailed', requestListener)
                controller.abort(new AbortPageLoad())
                reject(new PageError(dest, err, { src: location }))
            }
        }
        page.on('requestfailed', requestListener)

        const responseListener = (res: HTTPResponse) => {
            if (res.url() === new URL(dest, baseUrl).href) {
                const s = res.status()
                if (s >= 200 && s < 300) {
                    page.off('response', responseListener)
                    page.off('requestfailed', requestListener)
                } else if (s >= 300 && s < 400) {
                    const location = res.headers()['location']
                    // check if it is a redirect
                    // let puppeteer handle 3XX response codes which are not redirects
                    if (typeof location === 'string') {
                        const destUrl = new URL(res.headers()['location'], res.url())
                        dest = destUrl.href
                        if (baseUrl && dest.startsWith(baseUrl.origin)) {
                            dest = dest.substring(baseUrl.origin.length)
                        }
                    }
                } else if (s >= 400) {
                    controller.abort(new AbortPageLoad())
                    rejectResponse(res)
                }
            }
        }
        page.on('response', responseListener)

        page.goto(url.href, { waitUntil, signal: controller.signal })
            .then((res) => {
                if (res === null) {
                    reject(
                        new PageError(location, 'did not navigate', {
                            details:
                                '`page.goto` returned null. this could mean navigation to about:blank or the same URL with a different hash.'
                        })
                    )
                } else if (res.status() >= 400) {
                    rejectResponse(res)
                } else {
                    resolve(page)
                }
            })
            .catch((err) => {
                if (err instanceof AbortPageLoad) return
                const message = err instanceof Error ? err.message : 'error while navigating'
                reject(
                    new PageError(dest, message, {
                        cause: err,
                        src: location
                    })
                )
            })
            .finally(() => {
                signal?.removeEventListener('abort', onAbort)
            })
    })
}
