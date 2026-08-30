/**
 * This is the documentation for the `astro-pdf` Astro integration.
 *
 * For more infomation on how to install and use `astro-pdf`, refer to the {@link https://ler.quest/astro-pdf/ | Getting Started guide}.
 * @module
 */
import EventEmitter from 'node:events'
import { extname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { type AstroConfig, type AstroIntegration } from 'astro'
import { bgBlue, blue, bold, dim, green, red, yellow } from 'kleur/colors'
import { launch } from 'puppeteer'

import { makeLogger } from './logger.js'
import {
    defaultPageOptions,
    getPageOptions,
    mergePages,
    type Options,
    type PageOptions,
    type ServerOutput
} from './options.js'
import { FatalError, processPage } from './page.js'
import { Runner } from './runner.js'
import { astroPreview } from './server.js'
import { VERSION } from './version.js'

export type { Options, PageOptions, ServerOutput }
export type { PagesEntry, PagesFunction, PagesMap, PDFOptions } from './options.js'

/**
 * Creates the `astro-pdf` integration.
 *
 * @param options - `astro-pdf` configuration options
 *
 * @example
 * ```ts
 * import { defineConfig } from 'astro/config'
 * import pdf from 'astro-pdf'
 *
 * export default defineConfig({
 *     integrations: [pdf({
 *         pages: {
 *             '/': 'home.pdf'
 *         }
 *     })]
 * })
 * ```
 */
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
            'astro:build:done': async (opts) => {
                const { dir, pages } = opts
                const logger = makeLogger(opts.logger)

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

                try {
                    if (typeof options.runBefore === 'function') {
                        logger.info(dim('running runBefore hook...'))
                        const runStart = Date.now()
                        await options.runBefore(dir)
                        logger.debug(`finished running runBefore hook in ${(Date.now() - runStart).toFixed()}ms`)
                    }

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
                            throw new Error(`error when setting up server: ` + String(e), { cause: e })
                        }
                        if (url) {
                            logger.info(`using server at ${blue(url.href)}`)
                        } else {
                            logger.warn(`no url returned from server. all locations must be full urls.`)
                        }
                    }

                    const browser = await launch(options.launch)
                    logger.debug(`launched browser ${await browser.version()}`)

                    const controller = new AbortController()

                    function onDisconnected() {
                        controller.abort(new FatalError('Fatal error: Browser disconnected unexpectedly'))
                    }
                    browser.on('disconnected', onDisconnected)

                    await Promise.all((await browser.pages()).map((page) => page.close()))

                    const { locations, map, fallback } = mergePages(pages, options.pages)

                    const queue: { location: string; pageOptions: PageOptions }[] = []
                    locations.forEach((location) => {
                        const arr = getPageOptions(location, basePageOptions, map, fallback)
                        queue.push(...arr.map((pageOptions) => ({ location, pageOptions })))
                    })

                    const concurrency = Math.max(options.maxConcurrent ?? Number.POSITIVE_INFINITY, 1)

                    const signal = controller.signal
                    EventEmitter.setMaxListeners(Math.min(queue.length, concurrency) + 1, signal)

                    const env = {
                        outDir,
                        browser,
                        baseUrl: url,
                        signal,
                        debug: (message: string) => {
                            logger.debug(message)
                        },
                        warn: (message: string) => {
                            logger.warn(message)
                        }
                    }

                    const runner = new Runner(
                        (entry, env) => processPage(entry.location, entry.pageOptions, env),
                        env,
                        concurrency,
                        logger
                    )

                    try {
                        if (typeof options.browserCallback === 'function') {
                            await options.browserCallback(browser)
                        }
                        await runner.run(queue)
                    } catch (err) {
                        if (!signal.aborted) {
                            controller.abort(err)
                        }
                        throw err
                    } finally {
                        browser.off('disconnected', onDisconnected)
                        await browser.close()
                        if (typeof close === 'function') {
                            await close()
                        }

                        const noExt = runner.generated.filter(({ path }) => extname(path) !== '.pdf').length
                        if (noExt > 0) {
                            logger.warn(
                                `${noExt.toFixed()} file${noExt === 1 ? '' : 's'} generated without .pdf extension`
                            )
                        }

                        if (runner.generated.length < queue.length) {
                            const n = queue.length - runner.generated.length
                            logger.error(red(`Failed to generate ${n.toFixed()} file${n === 1 ? '' : 's'}`))
                        }
                    }

                    if (typeof options.runAfter === 'function') {
                        logger.info(dim('running runAfter hook...'))
                        const runStart = Date.now()
                        await options.runAfter(
                            dir,
                            runner.generated.map(({ pathname }) => pathname)
                        )
                        logger.debug(`finished running runAfter hook in ${(Date.now() - runStart).toFixed()}ms`)
                    }

                    logger.info(green(`✓ Completed in ${(Date.now() - startTime).toFixed()}ms.\n`))
                } catch (error) {
                    logger.info(red(`✖︎ Failed after ${(Date.now() - startTime).toFixed()}ms.\n`))
                    if (options.throwErrors ?? true) {
                        throw error
                    } else if (error instanceof Error && error.stack) {
                        if (error.cause instanceof Error && error.cause.stack) {
                            logger.error(`${error.stack}\n\n${bold('Caused by:')}\n${error.cause.stack}\n`)
                        } else {
                            logger.error(error.stack + '\n')
                        }
                    } else {
                        logger.error(String(error) + '\n')
                    }
                }
            }
        }
    }
}
