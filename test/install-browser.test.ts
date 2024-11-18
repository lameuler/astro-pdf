import { beforeAll, describe, expect, test } from 'vitest'

import {
    Browser,
    BrowserPlatform,
    detectBrowserPlatform,
    getInstalledBrowsers,
    resolveBuildId
} from '@puppeteer/browsers'
import { existsSync } from 'fs'
import { access, constants, mkdir, rm } from 'fs/promises'
import { isAbsolute } from 'path'
import { fileURLToPath } from 'url'

import { findOrInstallBrowser } from 'astro-pdf/dist/browser.js'

import { makeLogger } from './utils/index.js'

describe('install browser', () => {
    const cacheDir = fileURLToPath(new URL('./fixtures/.cache/install-browser/', import.meta.url))
    let platform: BrowserPlatform
    beforeAll(async () => {
        if (existsSync(cacheDir)) {
            await rm(cacheDir, { recursive: true })
        }
        await mkdir(cacheDir, { recursive: true })
        platform = detectBrowserPlatform()!
    })
    test('find default', { timeout: 30000 }, async () => {
        const logger = makeLogger()
        const result = await findOrInstallBrowser(undefined, cacheDir, logger)
        expect(isAbsolute(result)).toBe(true)
    })
    test('install chrome', { timeout: 30000 }, async () => {
        const logger = makeLogger()
        const buildId = await resolveBuildId(Browser.CHROME, platform, 'stable')
        const result = await findOrInstallBrowser(true, cacheDir, logger)

        expect(logger.info).toHaveBeenCalled()
        const fn = access(result, constants.X_OK)
        await expect(fn).resolves.toBeUndefined()
        const browsers = await getInstalledBrowsers({ cacheDir })
        const installed = browsers.find((b) => b.executablePath === result)

        expect(installed).toBeDefined()
        expect(installed!.browser).toBe(Browser.CHROME)
        expect(installed!.buildId).toBe(buildId)
    })

    test.skip('install firefox', { timeout: 30000 }, async () => {
        const logger = makeLogger()
        const result = await findOrInstallBrowser({ browser: Browser.FIREFOX }, cacheDir, logger)
        expect(logger.info).toHaveBeenCalled()
        const fn = access(result, constants.X_OK)
        await expect(fn).resolves.toBeUndefined()
        const browsers = await getInstalledBrowsers({ cacheDir })
        const installed = browsers.find((b) => b.executablePath === result)
        expect(installed).toBeDefined()
        expect(installed!.browser).toBe(Browser.FIREFOX)
    })
})
