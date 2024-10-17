import { beforeAll, describe, expect, test } from 'vitest'
import { PageEnv, PageResult, processPage } from '../src/page'
import { Server } from 'http'
import { start } from './utils/server'
import { launch } from 'puppeteer'
import { fileURLToPath } from 'url'
import { PageOptions } from '../src/integration'
import { defaultPathFunction } from '../src/utils'
import { Output } from 'pdf2json'
import { existsSync } from 'fs'
import { rm } from 'fs/promises'
import { parsePdf } from './utils'
import { resolve } from 'path'

describe('process page', () => {
    let server: Server
    let env: PageEnv

    beforeAll(async () => {
        const root = new URL('./fixtures/process-page/', import.meta.url)
        server = await start(new URL('./public/', root))
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
        if (existsSync(env.outDir)) {
            rm(env.outDir, { recursive: true })
        }
    })

    describe('valid page full test', () => {
        const injectedTitle = '@test/process-page | astro-pdf'
        const injectedText = 'astro-pdf{sCAf-aBDXfnOfgtm9HZHj}'

        const options: PageOptions = {
            path: defaultPathFunction('[pathname].pdf'),
            light: false,
            waitUntil: 'networkidle0',
            pdf: {
                printBackground: true,
                format: 'a4',
                landscape: true
            },
            callback: async (page) => {
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
            }
        }
        let result: PageResult

        beforeAll(async () => {
            result = await processPage('/', options, env)
        })

        test('output location', () => {
            expect(result.location).toBe('/')
            expect(result.src).toBe(null)
        })

        test('output path', () => {
            expect(result.output.path).toBe(resolve(env.outDir, 'index.pdf'))
            expect(result.output.pathname).toBe('/index.pdf')
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
            })
        })
    })
})
