import { type AstroIntegration } from 'astro'
import {
    launch,
    type PuppeteerLaunchOptions,
    type PDFOptions,
    type Page,
    type PuppeteerLifeCycleEvent,
    executablePath
} from 'puppeteer'
import { type InstallOptions } from '@puppeteer/browsers'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import { installBrowser, astroPreview, mergePages, getPageOptions } from './utils'
import version from 'virtual:version'
import { PageError, processPage } from './page'

export interface Options {
    install?: boolean | Partial<InstallOptions>
    launch?: PuppeteerLaunchOptions
    baseOptions?: Partial<PageOptions>
    pages: PagesFunction | PagesMap
}

export type PagesKey = `/${string}` | `http://${string}` | `https://${string}`

export type PagesEntry = Partial<PageOptions> | string | boolean | null | undefined | void

export type PagesFunction = (pathname: string) => PagesEntry

export type PagesMap = {
    [pathname: PagesKey]: PagesEntry
    fallback?: PagesFunction
}

export interface PageOptions {
    path: string | ((url: URL) => string)
    light: boolean
    waitUntil: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[]
    pdf: Omit<PDFOptions, 'path'>
    callback?: (page: Page) => void | Promise<void>
}

const defaultPageOptions: PageOptions = {
    path: '[pathname].pdf',
    light: false,
    waitUntil: 'networkidle2',
    pdf: {}
}

export interface ServerOutput {
    url?: URL
    close?: () => Promise<void>
}

export interface Logger {
    info(message: string): void
    warn(message: string): void
    error(message: string): void
    debug(message: string): void
}

export function pdf(options: Options): AstroIntegration {
    let root: string
    let cacheDir: string
    return {
        name: 'astro-pdf',
        hooks: {
            'astro:config:done': ({ config }) => {
                root = fileURLToPath(config.root)
                cacheDir = fileURLToPath(config.cacheDir)
            },
            'astro:build:done': async ({ dir, pages, logger }) => {
                logger.info = logger.info.bind(logger.fork(''))

                if (typeof cacheDir !== 'string') {
                    logger.error('cacheDir is undefined. ending execution...')
                    return
                }

                const basePageOptions = {
                    ...defaultPageOptions,
                    ...options.baseOptions
                }

                const startTime = Date.now()
                const versionColour = version.includes('-') ? chalk.yellow : chalk.green
                logger.info(
                    `\r${chalk.bold.bgBlue(' astro-pdf ')} ${versionColour('v' + version)} – generating pdf files`
                )

                const executablePath = await findOrInstallBrowser(options.install, cacheDir, logger)
                logger.debug(`using browser at ${chalk.blue(executablePath)}`)

                const outDir = fileURLToPath(dir)

                // run astro preview
                logger.debug('running astro preview server')
                let url: URL | undefined = undefined
                let close: (() => Promise<void>) | undefined = undefined
                try {
                    const server = await astroPreview(root)
                    url = server.url
                    close = server.close
                } catch (e) {
                    logger.error('error when setting up server: ' + e)
                    return
                }
                if (url) {
                    logger.info(`using server at ${chalk.blue(url)}`)
                } else {
                    logger.warn(`no url returned from server. all locations must be full urls.`)
                }

                const browser = await launch({
                    executablePath,
                    ...options.launch
                })
                logger.debug(`launched browser ${await browser.version()}`)

                const { locations, map, fallback } = mergePages(pages, options.pages)

                const queue: { location: string; pageOptions: PageOptions }[] = []
                locations.forEach((location) => {
                    const pageOptions = getPageOptions(location, basePageOptions, map, fallback)
                    if (pageOptions) {
                        queue.push({ location, pageOptions })
                    }
                })

                const env = {
                    outDir,
                    browser,
                    baseUrl: url,
                    debug: logger.debug.bind(logger)
                }

                let count = 0
                let totalCount = queue.length

                await Promise.all(
                    queue.map(async ({ location, pageOptions }) => {
                        const start = Date.now()
                        try {
                            const result = await processPage(location, pageOptions, env)
                            const time = Date.now() - start
                            const src = result.src ? chalk.dim(' ← ' + result.src) : ''
                            logger.info(`${chalk.green('▶')} ${result.location}${src}`)
                            logger.info(
                                `  ${chalk.blue('└─')} ${chalk.dim(`${result.output.pathname} (+${time}ms) (${++count}/${totalCount})`)}`
                            )
                        } catch (err) {
                            totalCount--
                            if (err instanceof PageError) {
                                const time = Date.now() - start
                                const src = err.src ? chalk.dim(' ← ' + err.src) : ''
                                logger.info(
                                    chalk.red(`✖︎ ${err.location} (${err.title}) ${chalk.dim(`(+${time}ms)`)}${src}`)
                                )
                            }
                            logger.debug(chalk.red.bold(`error while processing ${location}: `) + err)
                        }
                    })
                )

                await browser.close()
                if (typeof close === 'function') {
                    await close()
                }
                logger.info(chalk.green(`✓ Completed in ${Date.now() - startTime}ms.\n`))
            }
        }
    }
}

export async function findOrInstallBrowser(
    options: Partial<InstallOptions> | boolean | undefined,
    defaultCacheDir: string,
    logger: Logger
) {
    let defaultPath: string | null = null
    if (!options) {
        try {
            defaultPath = executablePath()
        } catch (e) {
            logger.debug('error: ' + e)
            logger.info(chalk.yellow(`could not find default browser. installing browser...`))
        }
    } else {
        logger.info(chalk.dim(`installing browser...`))
    }
    if (!defaultPath) {
        return await installBrowser(typeof options === 'object' ? options : {}, defaultCacheDir)
    } else {
        return defaultPath
    }
}
