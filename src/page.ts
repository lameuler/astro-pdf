import { Browser, HTTPResponse, Page, PuppeteerLifeCycleEvent } from 'puppeteer'
import { type PageOptions } from './integration'
import { filepathToPathname, pathnameToFilepath } from './utils'
import { dirname, extname } from 'path'
import { FileHandle, mkdir } from 'fs/promises'
import { open } from 'fs/promises'

export interface PageErrorOptions extends ErrorOptions {
    status: number | null
    details: string | null
}

export class PageError extends Error implements PageErrorOptions {
    name = 'PageError' as const
    location: string
    title: string
    status: number | null
    details: string | null

    constructor(location: string, title: string, options?: Partial<PageErrorOptions>) {
        let message = `Failed to load \`${location}\`: ${title}`
        if (options?.details) {
            message += '\n' + options?.details
        }
        super(message, options)

        this.location = location
        this.title = title
        this.status = options?.status ?? null
        this.details = options?.details ?? null
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

    let url: URL
    try {
        url = new URL(location, baseUrl)
    } catch (err) {
        throw new PageError(location, 'invalid location', { cause: err })
    }

    debug(`visiting ${url.href}`)

    await loadPage(location, page, url, pageOptions.waitUntil)

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


    const outPathRaw = typeof pageOptions.path === 'function' ? pageOptions.path(new URL(page.url())) : pageOptions.path
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
        location,
        output: {
            path,
            pathname: filepathToPathname(path, outDir)
        }
    }
}

function loadPage(
    location: string,
    page: Page,
    url: URL,
    waitUntil: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[]
): Promise<HTTPResponse> {
    return new Promise((resolve, reject) => {
        // reject early if response status is not ok
        page.waitForNavigation({ waitUntil: [] })
            .then((res) => {
                // let goto handle null response
                if (res !== null && !res.ok()) {
                    const title = res.status() + (res.statusText() ? ' ' + res.statusText() : '')
                    reject(
                        new PageError(location, title, {
                            status: res.status()
                        })
                    )
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
                    const title = res.status() + (res.statusText() ? ' ' + res.statusText() : '')
                    reject(
                        new PageError(location, title, {
                            status: res.status()
                        })
                    )
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
