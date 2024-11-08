import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { start } from './utils/server.js'
import { Browser, launch } from 'puppeteer'
import { Server } from 'http'
import { loadPage, PageError } from 'astro-pdf/dist/page.js'

describe('load errors', () => {
    let server: Server
    let port: number
    let browser: Browser

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
    })

    test('relative path with no base url', async () => {
        const fn = loadPage('/page.html', undefined, browser, 'load')
        await expect(fn).rejects.toThrowError(new PageError('/page.html', 'invalid location'))
    })

    test('invalid url', async () => {
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('https://[pathname]', base, browser, 'load')
        await expect(fn).rejects.toThrowError(new PageError('https://[pathname]', 'invalid location'))
    })

    test('valid page', async () => {
        const base = new URL('http://localhost:' + port)
        const page = await loadPage('/index.html', base, browser, 'networkidle0')
        expect(page.url()).toBe(new URL('/index.html', base).href)
        expect(await page.content()).toContain('<h1>Page Loaded!</h1>')
    })

    test('redirect to valid page', async () => {
        const base = new URL('http://localhost:' + port)
        const page = await loadPage('/other.html', base, browser, 'networkidle0')
        expect(page.url()).toBe(new URL('/index.html', base).href)
    })

    test('404 page', async () => {
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('/page.html', base, browser, 'networkidle0')
        const start = Date.now()
        await expect(fn).rejects.toThrowError(new PageError('/page.html', '404 Not Found!!', { status: 404 }))
        expect(Date.now() - start).toBeLessThan(1000)
    })

    test('redirect to 404 page', async () => {
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('/page2.html', base, browser, 'networkidle0')
        const start = Date.now()
        await expect(fn).rejects.toThrowError(new PageError('/page.html', '404 Not Found!!', { status: 404 }))
        expect(Date.now() - start).toBeLessThan(1000)
    })

    test('unresolved hostname', async () => {
        const location = 'https://fake-gxcskbrl.example.com/page.html'
        const fn = loadPage(location, undefined, browser, 'networkidle0')
        const start = Date.now()
        await expect(fn).rejects.toThrowError(new PageError(location, 'net::ERR_NAME_NOT_RESOLVED'))
        expect(Date.now() - start).toBeLessThan(1000)
    })

    test('redirect to unresolved hostname', async () => {
        const location = 'https://fake-gxcskbrl.example.com/page.html'
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('/outside', base, browser, 'networkidle0')
        const start = Date.now()
        await expect(fn).rejects.toThrowError(new PageError(location, 'net::ERR_NAME_NOT_RESOLVED'))
        expect(Date.now() - start).toBeLessThan(1000)
    })

    test('about:blank', async () => {
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('about:blank', base, browser, 'load')
        await expect(fn).rejects.toThrowError('did not navigate')

    })

    afterAll(async () => {
        await browser.close()
        server.close()
        await new Promise((resolve) => {
            server.on('close', resolve)
        })
    })
})
