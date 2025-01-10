import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'

import { existsSync } from 'node:fs'
import { lstat, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Output } from 'pdf2json'
import { BrowserContext, CookieData, launch, Page } from 'puppeteer'

import { defaultPathFunction, PageOptions } from 'astro-pdf/dist/options.js'
import { PageEnv, PageError, PageResult, processPage } from 'astro-pdf/dist/page.js'

import { parsePdf } from './utils/index.js'
import { start, TestServer } from './utils/server.js'

describe('process page', () => {
    let server: TestServer
    let env: PageEnv

    beforeAll(async () => {
        const root = new URL('./fixtures/process-page/', import.meta.url)
        const redirects = {
            '/docs': { dest: '/docs/page' },
            '/somewhere': { dest: '/somewhere/else' }
        }
        server = await start(new URL('./public/', root), redirects)
        const address = server.address()
        if (!address || typeof address !== 'object') {
            throw new Error('test error: invalid server address')
        }
        env = {
            browser: await launch(),
            baseUrl: new URL('http://localhost:' + address.port),
            outDir: fileURLToPath(new URL('./dist/', root)),
            debug: () => {}
        }
        await Promise.all((await env.browser.pages()).map((page) => page.close()))
        if (existsSync(env.outDir)) {
            await rm(env.outDir, { recursive: true })
        }
    })

    describe('valid page full test', () => {
        const injectedTitle = '@test/process-page | astro-pdf'
        const injectedText = 'astro-pdf{sCAf-aBDXfnOfgtm9HZHj}'

        const options: PageOptions = {
            path: defaultPathFunction('[pathname].pdf'),
            screen: true,
            waitUntil: 'networkidle0',
            pdf: {
                printBackground: true,
                format: 'a4',
                landscape: true
            },
            callback: vi.fn(async (page: Page) => {
                await page.$eval(
                    'body',
                    (body, args) => {
                        body.ownerDocument.title = args.injectedTitle
                        const span = body.ownerDocument.createElement('span')
                        span.innerText = args.injectedText
                        body.appendChild(span)
                    },
                    { injectedTitle, injectedText }
                )
            })
        }
        let result: PageResult

        beforeAll(async () => {
            result = await processPage('/', options, env)
        }, 15000)

        test('output location', () => {
            expect(result.location).toBe('/')
            expect(result.src).toBe(null)
        })

        test('output path', async () => {
            expect(result.output.path).toBe(resolve(env.outDir, 'index.pdf'))
            expect(result.output.pathname).toBe('/index.pdf')
            expect((await lstat(result.output.path)).isFile()).toBe(true)
        })

        test('callback called', async () => {
            expect(options.callback).toHaveBeenCalledOnce()
        })

        describe('parse pdf', () => {
            let data: Output

            beforeAll(async () => {
                data = await parsePdf(result.output.path)
            })

            test('pdf title', () => {
                expect(data.Meta['Title']).toBe(injectedTitle)
            })

            test('pdf size', () => {
                const page = data.Pages[0]
                expect(page.Width / page.Height).toBeCloseTo(29.7 / 21, 2)
            })

            test('pdf content', () => {
                const page = data.Pages[0]
                const texts: string[] = []
                page.Texts.forEach((text) => {
                    text.R.forEach((r) => texts.push(decodeURIComponent(r.T)))
                })
                expect(texts).toContain('@test/process-page')
                expect(texts).toContain('[added by script.js]')
                expect(texts).toContain(injectedText)
                expect(texts).toContain('@media screen')
            })
        })
    })

    test('redirect', async () => {
        const options: PageOptions = {
            path: 'docs/page.pdf',
            screen: false,
            waitUntil: 'networkidle2',
            pdf: {}
        }
        const result = await processPage('/docs', options, env)
        expect(result.location).toBe('/docs/page')
        expect(result.src).toBe('/docs')
        expect(result.output.path).toBe(resolve(env.outDir, 'docs/page.pdf'))
        expect(result.output.pathname).toBe('/docs/page.pdf')
        expect((await lstat(result.output.path)).isFile()).toBe(true)
        const data = await parsePdf(result.output.path)
        expect(data.Meta['Title']).toBe('docs')
    })

    test('404 page', async () => {
        const options: PageOptions = {
            path: 'somewhere.pdf',
            screen: false,
            waitUntil: 'networkidle2',
            pdf: {}
        }
        const fn = processPage('/somewhere', options, env)
        await expect(fn).rejects.toThrowError(
            new PageError('/somewhere/else', '404 Not Found!!', { src: '/somewhere', status: 404 })
        )
        expect(existsSync(resolve(env.outDir, 'somewhere.pdf'))).toBe(false)
    })

    test('conflicting filenames', async () => {
        const options: PageOptions = {
            path: 'output.pdf',
            screen: false,
            waitUntil: 'networkidle2',
            pdf: {}
        }
        const results = await Promise.all([processPage('/docs', options, env), processPage('/docs/page', options, env)])
        expect(results[0].location).toBe(results[1].location)
        const paths = [results[0].output.path, results[1].output.path]
        expect(paths).toContain(resolve(env.outDir, 'output.pdf'))
        expect(paths).toContain(resolve(env.outDir, 'output-1.pdf'))
        const pathnames = [results[0].output.pathname, results[1].output.pathname]
        expect(pathnames).toContain('/output.pdf')
        expect(pathnames).toContain('/output-1.pdf')
    })
    describe('isolated pages', () => {
        let cookie: CookieData
        beforeAll(async () => {
            cookie = {
                domain: 'localhost',
                name: 'test:cookie',
                value: 'G19onZSj8uRt1_9ttkHG5',
                expires: Math.round(Date.now() / 1000) + 86400
            }
            await env.browser.defaultBrowserContext().setCookie(cookie)
            console.log(await env.browser.cookies())
        })
        test('non-isolated page can see cookie', async () => {
            let hasCookie: boolean | null = null
            let sameContext: boolean | null = null
            await processPage(
                '/',
                {
                    path: 'index.pdf',
                    screen: false,
                    waitUntil: 'load',
                    pdf: {},
                    async preCallback(page) {
                        sameContext = page.browserContext() === env.browser.defaultBrowserContext()
                        const cookies = await page.browserContext().cookies()
                        console.log(cookies, await env.browser.cookies())
                        hasCookie = !!cookies.find(
                            ({ name, value, domain }) =>
                                domain === cookie.domain && name === cookie.name && value === cookie.value
                        )
                    }
                },
                env
            )
            expect(sameContext).toBe(true)
            expect(hasCookie).toBe(true)
        }, 10000)
        test('isolated pages cannot see cookie', async () => {
            let hasDefaultCookie: boolean | null = null
            let sameAsDefaultContext: boolean | null = null
            let isolatedContext: BrowserContext
            await processPage(
                '/',
                {
                    path: 'index.pdf',
                    screen: false,
                    waitUntil: 'load',
                    pdf: {},
                    isolated: true,
                    async preCallback(page) {
                        isolatedContext = page.browserContext()
                        sameAsDefaultContext = isolatedContext === env.browser.defaultBrowserContext()
                        const cookies = await isolatedContext.cookies()
                        hasDefaultCookie = !!cookies.find(
                            ({ name, value, domain }) =>
                                domain === cookie.domain && name === cookie.name && value === cookie.value
                        )
                        if (hasDefaultCookie) return

                        await page.browserContext().setCookie(cookie)
                    }
                },
                env
            )
            expect(sameAsDefaultContext).toBe(false)
            expect(hasDefaultCookie).toBe(false)

            sameAsDefaultContext = null
            let sameAsIsolatedContext: boolean | null = null
            let hasIsolatedCookie: boolean | null = null
            await processPage(
                '/',
                {
                    path: 'index.pdf',
                    screen: false,
                    waitUntil: 'load',
                    pdf: {},
                    isolated: true,
                    async preCallback(page) {
                        sameAsDefaultContext = page.browserContext() === env.browser.defaultBrowserContext()
                        sameAsIsolatedContext = page.browserContext() === isolatedContext
                        const cookies = await page.browserContext().cookies()
                        hasIsolatedCookie = !!cookies.find(
                            ({ name, value, domain }) =>
                                domain === cookie.domain && name === cookie.name && value === cookie.value
                        )
                    }
                },
                env
            )
            expect(sameAsDefaultContext).toBe(false)
            expect(sameAsIsolatedContext).toBe(false)
            expect(hasIsolatedCookie).toBe(false)
        }, 15000)
    })

    afterAll(async () => {
        const pages = (await env.browser.pages()).length
        const contexts = env.browser.browserContexts().length - 1
        await env.browser.close()
        if (pages > 0) {
            throw new Error(`${pages} page(s) were left open by processPage`)
        }
        if (contexts > 0) {
            throw new Error(`${contexts} created browser context(s) were left open by processPage`)
        }
        await server.stop()
    })
})
