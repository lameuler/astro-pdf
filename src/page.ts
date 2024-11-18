import { mkdir } from 'fs/promises'
import { dirname } from 'path'
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

export async function processPage(location: string, pageOptions: PageOptions, env: PageEnv): Promise<PageResult> {
    const { outDir, browser, baseUrl, debug } = env

    debug(`starting processing of ${location}`)

    const page = await loadPage(location, baseUrl, browser, pageOptions.waitUntil)

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
        throw new PageError(dest, 'failed to write pdf', { cause: err, src: location })
    } finally {
        await fd.close()
    }

    await page.close()

    return {
        src: location !== dest ? location : null,
        location: dest,
        output: {
            path,
            pathname: filepathToPathname(path, outDir)
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
    browser: Browser,
    waitUntil: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[]
): Promise<Page> {
    const page = await browser.newPage()
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
