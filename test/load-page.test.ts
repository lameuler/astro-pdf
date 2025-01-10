import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { Browser, launch, Viewport } from 'puppeteer'

import { loadPage, PageError } from 'astro-pdf/dist/page.js'

import { start, TestServer } from './utils/server.js'

describe('load page', () => {
    let server: TestServer
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
        const page = await browser.newPage()
        const fn = loadPage('/page.html', undefined, page, 'load')
        await expect(fn).rejects.toThrowError(new PageError('/page.html', 'invalid location'))
    })

    test('invalid url', async () => {
        const page = await browser.newPage()
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('https://[pathname]', base, page, 'load')
        await expect(fn).rejects.toThrowError(new PageError('https://[pathname]', 'invalid location'))
    })

    test('valid page', async () => {
        const page = await browser.newPage()
        const base = new URL('http://localhost:' + port)
        await loadPage('/index.html', base, page, 'networkidle0')
        expect(page.url()).toBe(new URL('/index.html', base).href)
        expect(await page.content()).toContain('<h1>Page Loaded!</h1>')
    }, 8000)

    test('redirect to valid page', async () => {
        const page = await browser.newPage()
        const base = new URL('http://localhost:' + port)
        await loadPage('/other.html', base, page, 'networkidle0')
        expect(page.url()).toBe(new URL('/index.html', base).href)
    }, 8000)

    test('404 page', async () => {
        const page = await browser.newPage()
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('/page.html', base, page, 'networkidle0')
        const start = Date.now()
        await expect(fn).rejects.toThrowError(new PageError('/page.html', '404 Not Found!!', { status: 404 }))
        expect(Date.now() - start).toBeLessThan(1400)
    })

    test('redirect to 404 page', async () => {
        const page = await browser.newPage()
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('/page2.html', base, page, 'networkidle0')
        const start = Date.now()
        await expect(fn).rejects.toThrowError(new PageError('/page.html', '404 Not Found!!', { status: 404 }))
        expect(Date.now() - start).toBeLessThan(1400)
    })

    test('empty status message', async () => {
        const page = await browser.newPage()
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('/403', base, page, 'networkidle0')
        const start = Date.now()
        await expect(fn).rejects.toThrowError(new PageError('/403', '403'))
        expect(Date.now() - start).toBeLessThan(1400)
    })

    test('unresolved hostname', async () => {
        const page = await browser.newPage()
        const location = 'https://fake-gxcskbrl.example.com/page.html'
        const fn = loadPage(location, undefined, page, 'networkidle0')
        const start = Date.now()
        await expect(fn).rejects.toThrowError(new PageError(location, 'net::ERR_NAME_NOT_RESOLVED'))
        expect(Date.now() - start).toBeLessThan(1400)
    })

    test('redirect to unresolved hostname', async () => {
        const page = await browser.newPage()
        const location = 'https://fake-gxcskbrl.example.com/page.html'
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('/outside', base, page, 'networkidle0')
        const start = Date.now()
        await expect(fn).rejects.toThrowError(new PageError(location, 'net::ERR_NAME_NOT_RESOLVED'))
        expect(Date.now() - start).toBeLessThan(1400)
    })

    test('about:blank', async () => {
        const page = await browser.newPage()
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('about:blank', base, page, 'load')
        await expect(fn).rejects.toThrowError('did not navigate')
    })

    test('rejects if page is reused', async () => {
        const page = await browser.newPage()
        await page.goto('https://example.com', { waitUntil: 'load' })
        const base = new URL('http://localhost:' + port)
        const fn = loadPage('/index.html', base, page, 'load')
        await expect(fn).rejects.toThrowError('internal error: loadPage expects a new page')
    })

    test('runs preCallback after setting viewport and nav timeout', async () => {
        const page = await browser.newPage()
        const base = new URL('http://localhost:' + port)
        let pass = false
        const viewport: Viewport = {
            width: 111,
            height: 99,
            deviceScaleFactor: 1
        }
        await loadPage('/index.html', base, page, 'load', viewport, 12345, async (page) => {
            pass = page.viewport() === viewport && page.getDefaultNavigationTimeout() === 12345
        })
        expect(pass).toBe(true)
    })

    afterAll(async () => {
        await browser.close()
        await server.stop()
    })
})
