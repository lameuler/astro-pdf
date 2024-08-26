import { type AstroIntegration } from 'astro'
import { launch, type PuppeteerLaunchOptions, type PDFOptions, type Page, PuppeteerLifeCycleEvent } from 'puppeteer'
import { type InstallOptions } from '@puppeteer/browsers'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { closeServer, installBrowser, startServer } from './utils'

interface Options {
    install?: boolean | Partial<InstallOptions>,
    launch?: PuppeteerLaunchOptions,
    cacheDir?: string,
    pages: (pathname: string) => PageOptions | null | undefined | false | void
    port: number
}

interface PageOptions {
    path: string,
    light?: boolean,
    waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[],
    pdf: Omit<PDFOptions, 'path'>,
    callback?: (page: Page) => any
}

export default function astroPdf(options: Options): AstroIntegration {
    let cacheDir: string | undefined = undefined
    return {
        name: 'astro-pdf',
        hooks: {
            'astro:config:done': ({ config }) => {
                cacheDir = options.cacheDir ?? new URL('.astro-pdf', config.cacheDir).pathname
            },
            'astro:build:done': async ({ dir, pages, logger }) => {
                if (typeof cacheDir !== 'string') {
                    logger.error('cacheDir is undefined. ending execution...')
                    return
                }
                const executablePath = options.install ? await installBrowser(
                    typeof options.install === 'object' ? options.install : {},
                    cacheDir
                ) : null

                // start simple server
                const { server, port } = await startServer(options.port ?? 54321, fileURLToPath(dir))
                
                const browser = await launch({
                    executablePath,
                    ...options.launch
                })

                await Promise.all(pages.map(async ({ pathname }) => {
                    const pageOptions = options.pages(pathname)
                    if (pageOptions) {
                        const page = await browser.newPage()
                        await page.goto(`http://localhost:${port}/${pathname}`, {
                            waitUntil: pageOptions.waitUntil ?? 'networkidle2'
                        })

                        if (pageOptions.light) {
                            await page.emulateMediaFeatures([{
                                name: 'prefers-color-scheme',
                                value: 'light'
                            }])
                        }
                        await pageOptions.callback?.(page)

                        await page.pdf({
                            ...pageOptions.pdf,
                            // resolve pdf output relative to astro output directory
                            path: resolve(fileURLToPath(dir), pageOptions.path)
                        })
                    }
                }))

                await browser.close()
                closeServer(server)
            }
        }
    }
}