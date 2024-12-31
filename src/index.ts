import { fileURLToPath } from 'node:url'

import { type AstroConfig, type AstroIntegration } from 'astro'
import { bgBlue, blue, bold, dim, green, red, yellow } from 'kleur/colors'
import PQueue from 'p-queue'
import { launch } from 'puppeteer'

import { findOrInstallBrowser } from './browser.js'
import { defaultPageOptions, getPageOptions, mergePages, type Options, type PageOptions } from './options.js'
import { PageError, processPage } from './page.js'
import { astroPreview, type ServerOutput } from './server.js'

export type { PagesEntry, PagesFunction, PagesMap } from './options.js'
export type { ServerOutput } from './server.js'
export type { Options, PageOptions }

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
                const forked = logger.fork('')
                logger = {
                    ...logger,
                    fork: logger.fork,
                    info: (message: string) => forked.info(message),
                    warn: logger.warn,
                    error: logger.error,
                    debug: logger.debug
                }

                if (typeof cacheDir !== 'string') {
                    logger.error('cacheDir is undefined. ending execution...')
                    return
                }

                const basePageOptions = {
                    ...defaultPageOptions,
                    ...options.baseOptions
                }

                const startTime = Date.now()
                const versionColour = VERSION.includes('-') ? yellow : green
                logger.info(`\r${bold(bgBlue(' astro-pdf '))} ${versionColour('v' + VERSION)} – generating pdf files`)

                if (typeof options.runBefore === 'function') {
                    logger.info(dim('running runBefore hook...'))
                    const runStart = Date.now()
                    await options.runBefore(dir)
                    logger.debug(`finished running runBefore hook in ${Date.now() - runStart}ms`)
                }

                const executablePath = await findOrInstallBrowser(options.install, cacheDir, logger)
                logger.debug(`using browser at ${blue(executablePath)}`)

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
                        logger.info(`using server at ${blue(url.href)}`)
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
                    const arr = getPageOptions(location, basePageOptions, map, fallback)
                    queue.push(...arr.map((pageOptions) => ({ location, pageOptions })))
                })

                const env = {
                    outDir,
                    browser,
                    baseUrl: url,
                    debug: (message: string) => logger.debug(message)
                }

                let count = 0
                let totalCount = queue.length

                const pool = new PQueue({ concurrency: options.maxConcurrent ?? Number.POSITIVE_INFINITY })

                const generated: string[] = []

                await Promise.all(
                    queue.map(({ location, pageOptions }) => {
                        const maxRuns = Math.max(pageOptions.maxRetries ?? 0, 0) + 1
                        let i = 0
                        const task = async () => {
                            const start = Date.now()
                            i++
                            const retryInfo = maxRuns > 1 ? ` (${i}/${maxRuns} attempts)` : ''
                            try {
                                const result = await processPage(location, pageOptions, env)
                                const time = Date.now() - start
                                const src = result.src ? dim(' ← ' + result.src) : ''
                                const attempts = i > 1 ? dim(retryInfo) : ''
                                logger.info(`${green('▶')} ${result.location}${src}${attempts}`)
                                logger.info(
                                    `  ${blue('└─')} ${dim(`${result.output.pathname} (+${time}ms) (${++count}/${totalCount})`)}`
                                )
                                generated.push(result.output.pathname)
                            } catch (err) {
                                const attempts = maxRuns > 1 && i < maxRuns ? yellow(retryInfo) : retryInfo

                                if (err instanceof PageError && (i < maxRuns || !pageOptions.throwOnFail)) {
                                    const time = Date.now() - start
                                    const src = err.src ? dim(' ← ' + err.src) : ''
                                    logger.info(
                                        red(
                                            `✖︎ ${err.location} (${err.title}) ${dim(`(+${time}ms)`)}${src}${attempts}`
                                        )
                                    )
                                }
                                logger.debug(bold(red(`error while processing ${location}: `)) + err)

                                if (i < maxRuns) {
                                    await task()
                                } else {
                                    totalCount--
                                    if (pageOptions.throwOnFail) {
                                        throw err
                                    }
                                }
                            }
                        }
                        return pool.add(task)
                    })
                )

                await browser.close()
                if (typeof close === 'function') {
                    await close()
                }
                if (totalCount < queue.length) {
                    const n = queue.length - totalCount
                    logger.info(red(`Failed to generate ${n} page${n === 1 ? '' : 's'}`))
                }

                if (typeof options.runAfter === 'function') {
                    logger.info(dim('running runAfter hook...'))
                    const runStart = Date.now()
                    await options.runAfter(dir, generated)
                    logger.debug(`finished running runAfter hook in ${Date.now() - runStart}ms`)
                }

                logger.info(green(`✓ Completed in ${Date.now() - startTime}ms.\n`))
            }
        }
    }
}
