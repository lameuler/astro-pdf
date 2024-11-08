import { type AstroConfig, type AstroIntegration } from 'astro'
import { launch } from 'puppeteer'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import { astroPreview, type ServerOutput } from './server.js'
import { defaultPageOptions, getPageOptions, mergePages, type Options, type PageOptions } from './options.js'
import { findOrInstallBrowser } from './browser.js'
import { PageError, processPage } from './page.js'
import version from 'virtual:version'

export type { Options, PageOptions }
export type { PagesEntry, PagesFunction, PagesMap } from './options.js'
export type { ServerOutput } from './server.js'

export default function pdf(options: Options): AstroIntegration {
    let cacheDir: string
    let astroConfig: AstroConfig
    return {
        name: 'astro-pdf',
        hooks: {
            'astro:config:done': ({ config }) => {
                astroConfig = config
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
                let serverFn = options.server
                if (serverFn === false) {
                    logger.debug('running without server')
                } else if (typeof serverFn !== 'function') {
                    logger.debug('running astro preview server')
                    serverFn = astroPreview
                } else {
                    logger.debug('running custom server')
                }
                let url: URL | undefined = undefined
                let close: ServerOutput['close'] = undefined
                if (serverFn) {
                    try {
                        const server = await serverFn(astroConfig)
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
