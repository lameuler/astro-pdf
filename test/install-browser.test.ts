import { beforeAll, describe, expect, test, vi } from 'vitest'
import { existsSync } from 'fs'
import { access, constants, mkdir, rm } from 'fs/promises'
import { isAbsolute } from 'path'
import { fileURLToPath } from 'url'
import {
    Browser,
    BrowserPlatform,
    detectBrowserPlatform,
    getInstalledBrowsers,
    resolveBuildId
} from '@puppeteer/browsers'
import { findOrInstallBrowser, installBrowser, Logger } from '@/utils'

describe('install browser', () => {
    const cacheDir = fileURLToPath(new URL('./fixtures/.cache/', import.meta.url))
    let platform: BrowserPlatform
    beforeAll(async () => {
        if (existsSync(cacheDir)) {
            await rm(cacheDir, { recursive: true })
        }
        await mkdir(cacheDir, { recursive: true })
        platform = detectBrowserPlatform()!
    })
    test('find default', async () => {
        const logger: Logger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        }
        const result = await findOrInstallBrowser(undefined, cacheDir, logger)
        expect(isAbsolute(result)).toBe(true)
    })
    test('install chrome', { timeout: 30000 }, async () => {
        const buildId = await resolveBuildId(Browser.CHROME, platform, 'latest')
        const result = await installBrowser({ browser: Browser.CHROME, buildId }, cacheDir)
        const fn = access(result, constants.X_OK)
        await expect(fn).resolves.toBeUndefined()
        const browsers = await getInstalledBrowsers({ cacheDir })
        const installed = browsers.find((b) => b.buildId === buildId)
        expect(installed).toBeDefined()
        expect(installed!.browser).toBe(Browser.CHROME)
        expect(installed!.executablePath).toBe(result)
    })

    test('install firefox', { timeout: 30000 }, async () => {
        const result = await installBrowser({ browser: Browser.FIREFOX }, cacheDir)
        const fn = access(result, constants.X_OK)
        await expect(fn).resolves.toBeUndefined()
        const browsers = await getInstalledBrowsers({ cacheDir })
        const installed = browsers.find((b) => b.executablePath === result)
        expect(installed).toBeDefined()
        expect(installed!.browser).toBe(Browser.FIREFOX)
    })
})
