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

    test('relative path with no base url', async () => {
        const fn = loadPage('/page.html', undefined, page, 'load')
        await expect(fn).rejects.toThrowError(new PageError('/page.html', 'invalid location'))
    })

    test('invalid url', async () => {
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('https://[pathname]', base, page, 'load')
        await expect(fn).rejects.toThrowError(new PageError('https://[pathname]', 'invalid location'))
    })

    test('valid page', async () => {
        const base = new URL('http://localhost:' + port)
        const response = await loadPage('/index.html', base, page, 'networkidle0')
        expect(response.ok()).toBe(true)
        expect(response.url()).toBe(new URL('/index.html', base).href)
        expect(response.url()).toBe(page.url())
        expect(await response.text()).toContain('<h1>Page Loaded!</h1>')
    })

    test('404 page', async () => {
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('/page.html', base, page, 'networkidle0')
        const start = Date.now()
        await expect(fn).rejects.toThrowError(new PageError('/page.html', '404 Not Found!!', { status: 404 }))
        expect(Date.now() - start).toBeLessThan(1000)
    })

    test('unresolved hostname', async () => {
        const location = 'https://fake-gxcskbrl.example.com/page.html'
        const fn = loadPage(location, undefined, page, 'networkidle0')
        const start = Date.now()
        await expect(fn).rejects.toThrowError(new PageError(location, 'net::ERR_NAME_NOT_RESOLVED at ' + location))
        expect(Date.now() - start).toBeLessThan(1000)
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
