import { Browser, detectBrowserPlatform, install, resolveBuildId, type InstallOptions } from '@puppeteer/browsers'
import { type AstroIntegrationLogger } from 'astro'
import { dim, yellow } from 'kleur/colors'
import { executablePath } from 'puppeteer'

export async function installBrowser(options: Partial<InstallOptions>, defaultCacheDir: string) {
    const browser = options.browser ?? Browser.CHROME
    const buildId = options.buildId ?? (await resolveBuildId(browser, detectBrowserPlatform()!, 'stable'))
    const installOptions: InstallOptions & { unpack: true } = {
        ...options,
        browser,
        buildId,
        cacheDir: options.cacheDir ?? defaultCacheDir,
        unpack: true // ensure that browser is unpacked so it can be used
    }
    const installed = await install(installOptions)
    return installed.executablePath
}

export async function findOrInstallBrowser(
    options: Partial<InstallOptions> | boolean | undefined,
    defaultCacheDir: string,
    logger: AstroIntegrationLogger
) {
    let defaultPath: string | null = null
    if (!options) {
        try {
            defaultPath = executablePath()
        } catch (e) {
            logger.debug('error: ' + e)
            logger.info(yellow(`could not find default browser. installing browser...`))
        }
    } else {
        logger.info(dim(`installing browser...`))
    }
    if (!defaultPath) {
        return await installBrowser(typeof options === 'object' ? options : {}, defaultCacheDir)
    } else {
        return defaultPath
    }
}
