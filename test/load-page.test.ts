import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { start } from './fixtures/404-page/server'
import { loadPage, PageError } from '../src/page'
import { Browser, launch, Page } from 'puppeteer'
import { Server } from 'http'

describe('load errors', () => {
    let server: Server
    let port: number
    let browser: Browser
    let page: Page

    beforeAll(async () => {
        server = await start()
        const address = server.address()
        if (!address || typeof address !== 'object') {
            throw new Error('test error: invalid server address')
        }
        port = address.port
        browser = await launch()
        page = await browser.newPage()
    })

    test('404 page', async () => {
        const base = new URL('http://localhost:'+port)
        const fn = loadPage('/page.html', base, page, 'networkidle0')
        await expect(fn).rejects.toThrowError(new PageError('/page.html', '404 Not Found!!', { status: 404 }))
    })

    test('unresolved hostname', async () => {
        const location = 'https://fake-gxcskbrl.example.com/page.html'
        const fn = loadPage(location, undefined, page, 'networkidle0')
        await expect(fn).rejects.toThrowError(
            new PageError(location, 'net::ERR_NAME_NOT_RESOLVED at '+location)
        )
    })

    afterAll(async () => {
        await page.close()
        await browser.close()
        server.close()
        await new Promise((resolve) => {
            server.on('close', resolve)
        })
    })
})