import { detectBrowserPlatform, install, resolveBuildId, Browser, type InstallOptions } from '@puppeteer/browsers'
import { $ } from 'zx'
import { type AstroIntegrationLogger } from 'astro/dist/core/logger/core'

export async function installBrowser(options: Partial<InstallOptions>, defaultCacheDir: string) {
    const browser = options.browser ?? Browser.CHROME
    const buildId = options.buildId ?? await resolveBuildId(browser, detectBrowserPlatform(), 'stable')
    const installOptions: InstallOptions = {
        ...options,
        browser,
        buildId,
        cacheDir: options.cacheDir ?? defaultCacheDir
    }
    // cast to any to handle overloading of install (theres probably a better way to do this)
    const installed = await install(installOptions as any)
    return installed.executablePath
}

export async function astroPreview(logger?: AstroIntegrationLogger) {
    try {
        const proc = $`npx astro preview`
        
        for await (const chunk of proc.stdout) {
            const text: string = chunk.toString('utf8')

            // look for server url
            const m = text.match(/https?:\/\/[\w\-.]+:\d+/)
            if (m) {
                try {
                    const url = new URL(m[0])
                    logger?.info(`using server url ${url.href}`)

                    // function to end astro preview process
                    const close = async function () {
                        logger?.debug('closing astro preview server')
                        await proc.kill('SIGINT')
                        logger?.debug('successfully closed astro preview server')
                    }

                    return { url, close }
                } catch (e) {
                    logger?.debug(`failed to parse ${m[0]}. continuing to listen for server url`)
                }
            }
        }
    } catch (e) {
        logger?.error(`error when running 'npx astro preview':\n${e}`)
    }
}