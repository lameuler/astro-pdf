import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import { bold, red, yellow } from 'kleur/colors'
import type { Browser, HTTPRequest, HTTPResponse, Page, PuppeteerLifeCycleEvent, Viewport } from 'puppeteer'

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
    debug: (message: string) => void
}

async function newPage(browser: Browser, location: string) {
    if (!browser.connected) {
        throw new FatalError(
            `Fatal error when opening a new page for \`${location}\`: ` +
                'browser is not connected. it may have been unexpectedly closed.'
        )
    }
    try {
        return await browser.newPage()
    } catch (err) {
        throw new FatalError(`Fatal error when opening a new page for \`${location}\``, err)
    }
}

export async function processPage(location: string, pageOptions: PageOptions, env: PageEnv): Promise<PageResult> {
    const { outDir, browser, baseUrl, debug } = env

    debug(`starting processing of ${location}`)

    const page = await newPage(browser, location)

    try {
        await loadPage(location, baseUrl, page, pageOptions.waitUntil, pageOptions.viewport, pageOptions.navTimeout, pageOptions.preCallback)

        if (pageOptions.screen) {
            await page.emulateMediaType('screen')
        }
        if (pageOptions.callback) {
            debug('running user callback')
            await pageOptions.callback(page)
        }

        const url = page.url()
        const dest = baseUrl && url.startsWith(baseUrl?.origin) ? url.substring(baseUrl?.origin.length) : url

        const outPathRaw = typeof pageOptions.path === 'function' ? pageOptions.path(new URL(url)) : pageOptions.path
        // resolve pdf output relative to astro output directory
        const outPath = pathnameToFilepath(outPathRaw, outDir)

        const dir = dirname(outPath)
        await mkdir(dir, { recursive: true })

        const { fd, path } = await openFd(outPath, debug)

        try {
            const stream = await page.createPDFStream(pageOptions.pdf)

            await pipeToFd(stream, fd)
        } catch (err) {
            const info = err instanceof Error ? ': ' + err.message : ''
            throw new PageError(dest, 'failed to write pdf' + info, { cause: err, src: location })
        } finally {
            await fd.close()
        }

        return {
            src: location !== dest ? location : null,
            location: dest,
            output: {
                path,
                pathname: filepathToPathname(path, outDir)
            }
        }
    } finally {
        if (!page.isClosed()) {
            debug(`closing page for ${location} (page.url: ${page.url()})`)
            try {
                await page.close()
            } catch (err) {
                debug(bold(red(`failed to close page for ${location}: `)) + err)
            }
        } else {
            debug(yellow(`page for ${location} has already been closed`))
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
    viewport?: Viewport,
    navTimeout?: number,
    preCallback?: (page: Page) => void | Promise<void>
): Promise<Page> {
    if (page.url() !== 'about:blank' || page.isClosed()) {
        throw new Error(`internal error: loadPage expects a new page`)
    }

    if (viewport) {
        await page.setViewport(viewport)
    }
    if (typeof navTimeout === 'number') {
        page.setDefaultNavigationTimeout(navTimeout)
    }
    if (typeof preCallback === 'function') {
        await preCallback(page)
    }

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
        }

        const controller = new AbortController()

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
    })
}
