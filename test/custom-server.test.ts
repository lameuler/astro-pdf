import { describe, test, beforeAll, expect, vi, afterAll } from 'vitest'
import { AstroConfig, AstroIntegrationLogger } from 'astro'
import { resolve } from 'path'
import { readdir, readFile, rm } from 'fs/promises'
import { existsSync } from 'fs'
import { loadFixture, makeLogger, parsePdf, type TestFixture } from './utils/index.js'
import { start } from './utils/server.js'
import pdf from 'astro-pdf'
import { fileURLToPath } from 'url'

describe('custom server', () => {
    let fixture: TestFixture
    let close: () => unknown

    beforeAll(async () => {
        fixture = await loadFixture('custom-server')
        if (existsSync(resolve(fixture.root, 'node_modules/.astro'))) {
            await rm(resolve(fixture.root, 'node_modules/.astro'), {
                recursive: true
            })
        }
        await fixture.build({
            integrations: [
                pdf({
                    pages: {
                        '': true,
                        page: true
                    },
                    async server(config) {
                        const server = await start(new URL('dist/', config.root))
                        const address = server.address()
                        const url =
                            typeof address === 'object' ? new URL(`http://localhost:${address?.port}`) : undefined
                        close = vi.fn(
                            () =>
                                new Promise((resolve, reject) => {
                                    server.on('close', resolve)
                                    server.on('error', reject)
                                    server.close()
                                })
                        )
                        return {
                            url,
                            close
                        }
                    }
                })
            ]
        })
    })

    test('close called once', () => {
        expect(close).toHaveBeenCalledOnce()
    })
    test('index generated', async () => {
        const data = await parsePdf(fixture.resolveOutput('index.pdf'))
        expect(data.Meta['Title']).toBe('index.astro')
        const texts: string[] = []
        data.Pages[0].Texts.forEach((t) => t.R.forEach((r) => texts.push(decodeURIComponent(r.T))))
        expect(texts).toContain('index.astro')
        expect(texts).toContain('@test/custom-server')
    })
    test('page generated', async () => {
        const data = await parsePdf(fixture.resolveOutput('page.pdf'))
        expect(data.Meta['Title']).toBe('page.astro')
        const texts: string[] = []
        data.Pages[0].Texts.forEach((t) => t.R.forEach((r) => texts.push(decodeURIComponent(r.T))))
        expect(texts).toContain('page.astro')
        expect(texts).toContain('@test/custom-server')
    })

    describe('no server', () => {
        let logger: AstroIntegrationLogger
        const root = new URL('./fixtures/tmp/no-server/', import.meta.url)

        beforeAll(async () => {
            const integration = pdf({
                server: false,
                pages: {
                    'https://example.com': 'example.pdf'
                }
            })

            logger = makeLogger()
            await integration.hooks['astro:config:done']!({
                config: {
                    root,
                    cacheDir: new URL('node_modules/.astro', root)
                } as AstroConfig,
                setAdapter: () => {
                    throw new Error('unimplemented')
                },
                injectTypes: () => {
                    throw new Error('unimplemented')
                },
                logger
            })
            await integration.hooks['astro:build:done']!({
                pages: [],
                dir: new URL('dist', root),
                routes: [],
                logger,
                cacheManifest: false
            })
        })

        test('no warning or error', () => {
            expect(logger.warn).not.toBeCalled()
            expect(logger.error).not.toBeCalled()
        })

        test('file generated', async () => {
            const path = fileURLToPath(new URL('dist/example.pdf', root))
            const buffer = await readFile(path)
            expect(buffer.length).toBeGreaterThan(0)
        })
    })

    describe('server with empty return', () => {
        let logger: AstroIntegrationLogger
        const root = new URL('./fixtures/tmp/server-empty/', import.meta.url)

        beforeAll(async () => {
            const integration = pdf({
                server: () => ({}),
                pages: {
                    'https://example.com': 'example.pdf'
                }
            })

            logger = makeLogger()
            await integration.hooks['astro:config:done']!({
                config: {
                    root,
                    cacheDir: new URL('node_modules/.astro', root)
                } as AstroConfig,
                setAdapter: () => {
                    throw new Error('unimplemented')
                },
                injectTypes: () => {
                    throw new Error('unimplemented')
                },
                logger
            })
            await integration.hooks['astro:build:done']!({
                pages: [],
                dir: new URL('dist', root),
                routes: [],
                logger,
                cacheManifest: false
            })
        })

        test('warning', () => {
            expect(logger.warn).toBeCalled()
            expect(logger.error).not.toBeCalled()
        })

        test('file generated', async () => {
            const path = fileURLToPath(new URL('dist/example.pdf', root))
            const buffer = await readFile(path)
            expect(buffer.length).toBeGreaterThan(0)
        })
    })

    describe('server with error', () => {
        let logger: AstroIntegrationLogger
        const root = new URL('./fixtures/tmp/server-error/', import.meta.url)

        beforeAll(async () => {
            const integration = pdf({
                server: () => {
                    throw new Error('failed to start server')
                },
                pages: {
                    'https://example.com': 'example.pdf'
                }
            })

            logger = makeLogger()
            await integration.hooks['astro:config:done']!({
                config: {
                    root,
                    cacheDir: new URL('node_modules/.astro', root)
                } as AstroConfig,
                setAdapter: () => {
                    throw new Error('unimplemented')
                },
                injectTypes: () => {
                    throw new Error('unimplemented')
                },
                logger
            })
            await integration.hooks['astro:build:done']!({
                pages: [],
                dir: new URL('dist', root),
                routes: [],
                logger,
                cacheManifest: false
            })
        })

        test('error', () => {
            expect(logger.warn).not.toBeCalled()
            expect(logger.error).toBeCalled()
        })

        test('no files generated', async () => {
            let result: string[]
            try {
                result = await readdir(fileURLToPath(new URL('dist', root)))
            } catch {
                result = []
            }
            expect(result.length).toBe(0)
        })
    })

    afterAll(async () => {
        const root = new URL('./fixtures/tmp/', import.meta.url)
        await rm(fileURLToPath(root), { recursive: true, force: true })
    })
})
