import { install } from '@puppeteer/browsers'
import { findOrInstallBrowser } from 'astro-pdf/dist/browser.js'
import { existsSync } from 'fs'
import { mkdir, rm } from 'fs/promises'
import { fileURLToPath } from 'url'
import { beforeAll, describe, expect, test, vi } from 'vitest'
import { makeLogger } from './utils/index.js'

vi.mock('puppeteer', async (originalImport) => {
    const cacheDir = fileURLToPath(new URL('./fixtures/.cache/browser-no-default/', import.meta.url))
    const oldValue = process.env['PUPPETEER_CACHE_DIR']
    process.env['PUPPETEER_CACHE_DIR'] = cacheDir

    const mod = await originalImport<typeof import('puppeteer')>()

    process.env['PUPPETEER_CACHE_DIR'] = oldValue

    return mod
})
vi.mock('@puppeteer/browsers', async (originalImport) => {
    const mod = await originalImport<typeof import('@puppeteer/browsers')>()
    return {
        ...mod,
        // skip actually installing the browser
        install: vi.fn(() => ({ executablePath: '[executable-path]' }))
    }
})

describe('', () => {
    const cacheDir = fileURLToPath(new URL('./fixtures/.cache/browser-no-default/', import.meta.url))

    beforeAll(async () => {
        if (existsSync(cacheDir)) {
            await rm(cacheDir, { recursive: true })
        }
        await mkdir(cacheDir, { recursive: true })
    })

    test('no browser in default cache', async () => {
        const logger = makeLogger()
        const result = await findOrInstallBrowser(false, cacheDir, logger)
        expect(result).toBe('[executable-path]')
        expect(install).toHaveBeenCalledOnce()
        expect(logger.info).toHaveBeenCalledOnce()
        expect(logger.info.mock.lastCall?.[0]).toContain('could not find default browser.')
    })
})
