import { Browser, HTTPResponse, Page, PuppeteerLifeCycleEvent } from 'puppeteer'
import { type PageOptions } from './integration'
import { filepathToPathname, pathnameToFilepath } from './utils'
import { dirname, extname } from 'path'
import { FileHandle, mkdir } from 'fs/promises'
import { open } from 'fs/promises'

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

export type PageEnv = {
    outDir: string
    browser: Browser
    baseUrl?: URL
    debug: (message: string) => void
}

export async function processPage(location: string, pageOptions: PageOptions, env: PageEnv) {
    const { outDir, browser, baseUrl, debug } = env

    debug(`starting processing of ${location}`)

    const page = await browser.newPage()

    await loadPage(location, baseUrl, page, pageOptions.waitUntil)

    if (pageOptions.light) {
        await page.emulateMediaFeatures([
            {
                name: 'prefers-color-scheme',
                value: 'light'
            }
        ])
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
        throw new PageError(location, 'failed to write pdf', { cause: err })
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

class PageLoadedSignal extends Error {
    constructor() {
        super('abort signal: page loaded')
    }
}

export function loadPage(
    location: string,
    baseUrl: URL | undefined,
    page: Page,
    waitUntil: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[]
): Promise<HTTPResponse> {
    return new Promise((resolve, reject) => {
        let url: URL
        try {
            url = new URL(location, baseUrl)
        } catch (err) {
            reject(new PageError(location, 'invalid location', { cause: err }))
            return
        }

        function rejectResponse(res: HTTPResponse) {
            const title = res.status() + (res.statusText() ? ' ' + res.statusText() : '')
            let dest = res.url()
            if (baseUrl && dest.startsWith(baseUrl.origin)) {
                dest = dest.substring(baseUrl.origin.length)
            }
            reject(
                new PageError(dest, title, {
                    status: res.status(),
                    src: location
                })
            )
        }

        const controller = new AbortController()

        // reject early if response status is not ok
        page.waitForResponse((res) => res.request().url() === url.href, {
            signal: controller.signal
        })
            .then((res) => {
                if (!res.ok()) {
                    rejectResponse(res)
                }
            })
            .catch((err) => {
                if (!(err instanceof PageLoadedSignal)) {
                    const message = err instanceof Error ? err.message : 'error while navigating'
                    reject(
                        new PageError(location, message, {
                            cause: err
                        })
                    )
                }
            })

        page.goto(url.href, { waitUntil })
            .then((res) => {
                if (res === null) {
                    reject(
                        new PageError(location, 'did not navigate', {
                            details:
                                '`page.goto` returned null. this could mean navigation to about:blank or the same URL with a different hash.'
                        })
                    )
                } else if (!res.ok()) {
                    rejectResponse(res)
                } else {
                    resolve(res)
                }
            })
            .catch((err) => {
                const message = err instanceof Error ? err.message : 'error while navigating'
                reject(
                    new PageError(location, message, {
                        cause: err
                    })
                )
            })
            .finally(() => {
                controller.abort(new PageLoadedSignal())
            })
    })
}

async function openFd(path: string, debug: (message: string) => void) {
    const ext = extname(path)
    const name = path.substring(0, path.length - ext.length)
    let i = 0
    let fd: FileHandle | null = null
    let p: string = path
    while (fd === null) {
        try {
            const suffix = i ? '-' + i : ''
            p = name + suffix + ext
            fd = await open(p, 'wx')
            break
        } catch (err) {
            debug('openFd: ' + err)
            i++
        }
    }
    return { fd, path: p }
}

async function pipeToFd(stream: ReadableStream<Uint8Array>, fd: FileHandle) {
    const writeStream = fd.createWriteStream()
    const reader = stream.getReader()

    try {
        while (true) {
            const { value, done } = await reader.read()
            if (done) {
                break
            }
            writeStream.write(value)
        }
    } finally {
        writeStream.end()
    }
}
