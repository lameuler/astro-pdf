import { type AstroIntegration } from 'astro'
import { launch, type PuppeteerLaunchOptions, type PDFOptions, type Page, type PuppeteerLifeCycleEvent, type Browser, executablePath } from 'puppeteer'
import { type InstallOptions } from '@puppeteer/browsers'
import { mkdir } from 'fs/promises'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { chalk } from 'zx'
import { installBrowser, astroPreview, resolvePathname } from './utils'
import version from 'virtual:version'

export interface Options {
    install?: boolean | Partial<InstallOptions>,
    launch?: PuppeteerLaunchOptions,
    cacheDir?: string,
    pages: (pathname: string) => PageOptions | null | undefined | false | void
    port: number
}

export interface PageOptions {
    path: string,
    light?: boolean,
    waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[],
    pdf: Omit<PDFOptions, 'path'>,
    callback?: (page: Page) => any
}

export interface Logger {
    info(message: string): void
    warn(message: string): void
    error(message: string): void
    debug(message: string): void
}

export function astroPdf(options: Options): AstroIntegration {
    let cacheDir: string | undefined = undefined
    return {
        name: 'astro-pdf',
        hooks: {
            'astro:config:done': ({ config }) => {
                cacheDir = options.cacheDir ?? new URL('.astro-pdf', config.cacheDir).pathname
            },
            'astro:build:done': async ({ dir, pages, logger: l }) => {
                const forked = l.fork('')
                const logger: Logger = {
                    info: forked.info.bind(forked),
                    warn: l.warn.bind(l),
                    error: l.error.bind(l),
                    debug: l.debug.bind(l)
                }

                if (typeof cacheDir !== 'string') {
                    logger.error('cacheDir is undefined. ending execution...')
                    return
                }

                const startTime = Date.now()
                const versionColour = version.includes('-') ? chalk.yellow : chalk.green
                logger.info(`\r${chalk.bold.bgBlue(' astro-pdf ')} ${versionColour('v'+version)} – generating pdf files`)

                const executablePath = await findOrInstallBrowser(options.install, cacheDir, logger)
                logger.debug(`using browser at ${chalk.blue(executablePath)}`)

                const outDir = fileURLToPath(dir)

                // run astro preview
                const { url, close } = await astroPreview({ debug: logger.debug.bind(logger) })
                logger.info(`using server at ${chalk.blue(url)}`)
                
                const browser = await launch({
                    executablePath,
                    ...options.launch
                })
                logger.debug(`launched browser ${await browser.version()}`)

                const queue: { pathname: string, pageOptions: PageOptions }[] = []
                pages.forEach(({ pathname }) => {
                    const pageOptions = options.pages(pathname)
                    if (pageOptions) {
                        queue.push({ pathname, pageOptions })
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

                await Promise.all(queue.map(({ pathname, pageOptions }) => 
                    processPage(pathname, pageOptions, env)
                ))

                await browser.close()
                await close()
                logger.info(chalk.green(`✓ Completed in ${ Date.now()-startTime }ms.\n`))
            }
        }
    }
}

export async function findOrInstallBrowser(options: Partial<InstallOptions> | boolean, defaultCacheDir: string, logger: Logger) {
    const defaultPath = executablePath()
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
    baseUrl: URL,
    logger: Logger,
    count: number,
    totalCount: number
}

// exported for testing only
export async function processPage(pathname: string, pageOptions: PageOptions, env: GenerationEnv) {
    const { outDir, browser, baseUrl, logger } = env

    const start = Date.now()
    logger.debug(`starting processing ${pathname}`)

    // resolve pdf output relative to astro output directory
    const output = resolvePathname(pageOptions.path, outDir)

    const page = await browser.newPage()
    const location = new URL(pathname, baseUrl)

    logger.debug(`visiting ${location.href}`)
    await page.goto(location.href, {
        waitUntil: pageOptions.waitUntil ?? 'networkidle2'
    })

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
    logger.info(`${chalk.green('▶')} ${'/'+pathname}`)
    logger.info(`  ${chalk.blue('└─')} ${chalk.dim(`${output.pathname} (+${Date.now()-start}ms) (${++env.count}/${env.totalCount})`)}`)
}