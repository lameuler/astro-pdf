import { Browser, HTTPResponse, Page, PuppeteerLifeCycleEvent } from 'puppeteer'
import { type PageOptions } from './integration'
import { resolvePathname } from './utils'
import { dirname } from 'path'
import { mkdir } from 'fs/promises'

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

    // resolve pdf output relative to astro output directory
    const output = resolvePathname(pageOptions.path, outDir)

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

    const dir = dirname(output.path)
    await mkdir(dir, { recursive: true })

    debug(`generating pdf for ${page}`)
    await page.pdf({
        ...pageOptions.pdf,
        path: output.path
    })
    debug(`wrote pdf to ${output.path}`)

    await page.close()

    return {
        location,
        output
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
