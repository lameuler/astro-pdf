import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { start } from './utils/server'
import { Browser, launch, Page } from 'puppeteer'
import { Server } from 'http'
import { loadPage, PageError } from '@/page'

describe('load errors', () => {
    let server: Server
    let port: number
    let browser: Browser
    let page: Page

    beforeAll(async () => {
        const redirects = {
            '/other.html': { dest: '/index.html' },
            '/page2.html': { dest: '/page.html' },
            '/outside': { dest: 'https://fake-gxcskbrl.example.com/page.html' }
        }
        server = await start(new URL('./fixtures/load-page/public/', import.meta.url), redirects)
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

    test('redirect to valid page', async () => {
        const base = new URL('http://localhost:' + port)
        const response = await loadPage('/other.html', base, page, 'networkidle0')
        expect(response.ok()).toBe(true)
        expect(response.url()).toBe(new URL('/index.html', base).href)
    })

    test('404 page', async () => {
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('/page.html', base, page, 'networkidle0')
        const start = Date.now()
        await expect(fn).rejects.toThrowError(new PageError('/page.html', '404 Not Found!!', { status: 404 }))
        expect(Date.now() - start).toBeLessThan(1000)
    })

    test('redirect to 404 page', async () => {
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('/page2.html', base, page, 'networkidle0')
        const start = Date.now()
        await expect(fn).rejects.toThrowError(new PageError('/page.html', '404 Not Found!!', { status: 404 }))
        expect(Date.now() - start).toBeLessThan(1000)
    })

    test('unresolved hostname', async () => {
        const location = 'https://fake-gxcskbrl.example.com/page.html'
        const fn = loadPage(location, undefined, page, 'networkidle0')
        const start = Date.now()
        await expect(fn).rejects.toThrowError(new PageError(location, 'net::ERR_NAME_NOT_RESOLVED'))
        expect(Date.now() - start).toBeLessThan(1000)
    })

    test('redirect to unresolved hostname', async () => {
        const location = 'https://fake-gxcskbrl.example.com/page.html'
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('/outside', base, page, 'networkidle0')
        const start = Date.now()
        await expect(fn).rejects.toThrowError(new PageError(location, 'net::ERR_NAME_NOT_RESOLVED'))
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
