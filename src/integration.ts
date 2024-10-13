import { type AstroIntegration } from 'astro'
import { launch, type PuppeteerLaunchOptions, type PDFOptions, type Page, type PuppeteerLifeCycleEvent, type Browser, executablePath } from 'puppeteer'
import { type InstallOptions } from '@puppeteer/browsers'
import { mkdir } from 'fs/promises'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import { installBrowser, astroPreview, resolvePathname, mergePages, getPageOptions } from './utils'
import version from 'virtual:version'

export interface Options {
    install?: boolean | Partial<InstallOptions>,
    launch?: PuppeteerLaunchOptions,
    baseOptions?: Partial<PageOptions>,
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
    path: string,
    light: boolean,
    waitUntil: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[],
    pdf: Omit<PDFOptions, 'path'>,
    callback?: (page: Page) => any
}

const defaultPageOptions: PageOptions = {
    path: '[pathname].pdf',
    light: false,
    waitUntil: 'networkidle2',
    pdf: {}
}

export interface ServerOutput {
    url?: URL,
    close?: () => Promise<any>
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
                logger.info(`\r${chalk.bold.bgBlue(' astro-pdf ')} ${versionColour('v'+version)} – generating pdf files`)

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
                    logger.error('error when setting up server: '+e)
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

                const queue: { location: string, pageOptions: PageOptions }[] = []
                locations.forEach(location => {
                    const pageOptions = getPageOptions(location, basePageOptions, map, fallback)
                    if (pageOptions) {
                        queue.push({ location, pageOptions })
                    }
                })

                const env = {
                    outDir,
                    browser,
                    baseUrl: url,
                    logger,
                    count: 0,
                    totalCount: queue.length
                }

                await Promise.all(queue.map(({ location, pageOptions }) => 
                    processPage(location, pageOptions, env)
                ))

                await browser.close()
                if (typeof close === 'function') {
                    await close()
                }
                logger.info(chalk.green(`✓ Completed in ${ Date.now()-startTime }ms.\n`))
            }
        }
    }
}

export async function findOrInstallBrowser(options: Partial<InstallOptions> | boolean | undefined, defaultCacheDir: string, logger: Logger) {
    let defaultPath: string | null
    try {
        defaultPath = executablePath()
    } catch (e) {
        defaultPath = null
    }
    if (options || !defaultPath) {
        logger.info(chalk.dim(`installing browser...`))
        return await installBrowser(typeof options === 'object' ? options : {}, defaultCacheDir)
    } else {
        return defaultPath
    }
}

export type GenerationEnv = {
    outDir: string,
    browser: Browser,
    baseUrl?: URL,
    logger: Logger,
    count: number,
    totalCount: number
}

// exported for testing only
export async function processPage(pathname: string, pageOptions: PageOptions, env: GenerationEnv) {
    const { outDir, browser, baseUrl, logger } = env

    const start = Date.now()
    logger.debug(`starting processing of ${pathname}`)

    // resolve pdf output relative to astro output directory
    const output = resolvePathname(pageOptions.path, outDir)

    const page = await browser.newPage()
    if (!URL.canParse(pathname, baseUrl)) {
        logger.info(chalk.yellow(`${chalk.bold('?')} ${pathname}`))
        return
    }
    const location = new URL(pathname, baseUrl)

    logger.debug(`visiting ${location.href}`)
    try {
        const response = await page.goto(location.href, {
            waitUntil: pageOptions.waitUntil
        })

        if (!response) {
            env.totalCount--
            logger.info(chalk.red(`✖︎ ${pathname} ()`))
            return
        }
    
        if (!response.ok()) {
            env.totalCount--
            const message = response.status() + (response.statusText() ? ' '+response.statusText() : '')
            logger.info(chalk.red(`✖︎ ${pathname} (${message})`))
            return
        }
    } catch (e) {
        env.totalCount--
        const message = ((e && typeof e === 'object' && 'message' in e) ? e.message : null) || 'error while navigating'
        logger.debug(`${pathname}: ${e}`)
        logger.info(chalk.red(`✖︎ ${pathname} (${message})`))
        return
    }

    if (pageOptions.light) {
        await page.emulateMediaFeatures([{
            name: 'prefers-color-scheme',
            value: 'light'
        }])
    }
    if (pageOptions.callback) {
        logger.debug('running user callback')
        await pageOptions.callback(page)
    }

    const dir = dirname(output.path)
    await mkdir(dir, { recursive: true })

    await page.pdf({
        ...pageOptions.pdf,
        path: output.path
    })
    logger.info(`${chalk.green('▶')} ${pathname}`)
    logger.info(`  ${chalk.blue('└─')} ${chalk.dim(`${output.pathname} (+${Date.now()-start}ms) (${++env.count}/${env.totalCount})`)}`)

    page.close()
}