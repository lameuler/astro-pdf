import { beforeAll, describe, expect, test, vi } from 'vitest'

import { existsSync } from 'node:fs'
import { cp, lstat, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { AstroConfig, AstroIntegration, build } from 'astro'
import type { Browser } from 'puppeteer'

import pdf from 'astro-pdf'

import { Logger, makeLogger, parsePdf } from './utils/index.js'

describe('run integration', () => {
    let integration: AstroIntegration
    const runBefore = vi.fn()
    const runAfter = vi.fn()
    const browserCallback = vi.fn(async (browser: Browser) => {
        if ((await browser.pages()).length !== 0) {
            throw new Error('expected browserCallback to be called before any pages are processed')
        }
    })

    beforeAll(() => {
        let i = 0
        integration = pdf({
            install: false,
            pages: {
                'https://ler.sg/cv': {
                    waitUntil: 'networkidle0',
                    pdf: {
                        printBackground: true,
                        format: 'a4'
                    }
                },
                '/': [true, true, 'index.pdf', 'copy.pdf'],
                '/missing': {
                    path: 'missing.pdf',
                    maxRetries: 2
                },
                'https://example.com': {
                    path: 'example.pdf',
                    maxRetries: 1,
                    pdf: () => ({
                        timeout: i++ === 0 ? 1 : undefined
                    })
                }
            },
            runBefore,
            runAfter,
            browserCallback
        })
    })

    test('has name astro-pdf', () => {
        expect(integration.name).toBe('astro-pdf')
    })

    test('has hooks config:done and build:done', () => {
        expect(integration.hooks['astro:config:done']).toBeTypeOf('function')
        expect(integration.hooks['astro:build:done']).toBeTypeOf('function')
    })

    describe('run hooks', () => {
        let logger: Logger
        const root = new URL('./fixtures/integration/', import.meta.url)
        const cacheDir = new URL('./node_modules/.astro/', root)
        const cachePath = fileURLToPath(cacheDir)
        const outDir = new URL('./dist', root)
        const outPath = fileURLToPath(outDir)

        const warnings: Error[] = []
        process.on('warning', (warning) => {
            warnings.push(warning)
        })

        beforeAll(async () => {
            if (existsSync(outPath)) {
                await rm(outPath, { recursive: true })
            }
            // "build" site
            await cp(fileURLToPath(new URL('public', root)), outPath, { recursive: true })

            if (existsSync(cachePath)) {
                await rm(cachePath, { recursive: true })
            }
            await mkdir(cachePath, { recursive: true })

            logger = makeLogger()
            await integration.hooks['astro:config:done']!({
                config: {
                    root,
                    cacheDir
                } as AstroConfig,
                setAdapter: () => {
                    throw new Error('unimplemented')
                },
                injectTypes: () => {
                    throw new Error('unimplemented')
                },
                buildOutput: 'static',
                logger
            })
        })

        beforeAll(async () => {
            await integration.hooks['astro:build:done']!({
                pages: [],
                dir: outDir,
                logger,
                assets: new Map()
            })
        }, 30000)

        test('warns for deprecated options', () => {
            expect(
                warnings
                    .filter((warning) => warning.name === 'DeprecationWarning')
                    .map((warning) => 'code' in warning && warning.code)
            ).toStrictEqual(['astro-pdf:001'])
        })

        test('called runBefore', () => {
            expect(runBefore).toBeCalledTimes(1)
            expect(runBefore).toHaveBeenCalledWith(outDir)
        })

        test('called runAfter', () => {
            const calls = runAfter.mock.calls
            expect(calls.length).toBe(1)
            expect(calls[0][0]).toBe(outDir)
            const expected = ['/resume.pdf', '/index.pdf', '/index-1.pdf', '/index-2.pdf', '/copy.pdf', '/example.pdf']
            expect(calls[0][1].sort()).toStrictEqual(expected.sort())
        })

        test('called browserCallback', () => {
            expect(browserCallback).toBeCalledTimes(1)
        })

        test('generated local page', async () => {
            const path = resolve(outPath, 'index.pdf')
            expect((await lstat(path)).isFile()).toBe(true)
            const data = await parsePdf(path)
            expect(data.Meta['Title']).toBe('home page')
            const texts: string[] = []
            data.Pages[0].Texts.forEach((t) => t.R.forEach((r) => texts.push(decodeURIComponent(r.T))))
            expect(texts).toContain('@test/integration')
        })

        test('handles multiple pdfs per page', async () => {
            const paths = [
                resolve(outPath, 'index-1.pdf'),
                resolve(outPath, 'index-2.pdf'),
                resolve(outPath, 'copy.pdf')
            ]
            for (const path of paths) {
                expect((await lstat(path)).isFile()).toBe(true)
                const data = await parsePdf(path)
                expect(data.Meta['Title']).toBe('home page')
                const texts: string[] = []
                data.Pages[0].Texts.forEach((t) => t.R.forEach((r) => texts.push(decodeURIComponent(r.T))))
                expect(texts).toContain('@test/integration')
            }
        }, 10000)

        test('does not add suffix for retry', () => {
            expect(existsSync(resolve(outPath, 'example.pdf'))).toBe(true)
            expect(existsSync(resolve(outPath, 'example-1.pdf'))).toBe(false)
        })

        test('generated remote page', async () => {
            const path = resolve(outPath, 'resume.pdf')
            expect((await lstat(path)).isFile()).toBe(true)
            const data = await parsePdf(path)
            expect(data.Meta['Title']).toContain('resume')
        })

        test('did not generate 404 page', () => {
            const path = resolve(outPath, 'missing.pdf')
            expect(existsSync(path)).toBe(false)
        })
    })
})

describe('throw on fail', () => {
    test('causes build to fail with throwOnFail', async () => {
        const promise = build({
            logLevel: 'silent',
            root: 'test/fixtures/.cache/throw-on-fail',
            integrations: [
                pdf({
                    baseOptions: {
                        waitUntil: 'load',
                        throwOnFail: true
                    },
                    pages: {
                        'https://example.com/not/a/real/page.php': true
                    }
                })
            ]
        })
        await expect(promise).rejects.toThrow('Failed to load')
    }, 10000)
})

describe('throw on fail logs', () => {
    let integration: AstroIntegration
    let logger: Logger
    const root = new URL('./fixtures/integration/', import.meta.url)
    const cacheDir = new URL('./node_modules/.astro/', root)
    const cachePath = fileURLToPath(cacheDir)
    const outDir = new URL('./dist', root)
    const outPath = fileURLToPath(outDir)

    beforeAll(async () => {
        if (existsSync(outPath)) {
            await rm(outPath, { recursive: true })
        }
        // "build" site
        await cp(fileURLToPath(new URL('public', root)), outPath, { recursive: true })

        if (existsSync(cachePath)) {
            await rm(cachePath, { recursive: true })
        }
        await mkdir(cachePath, { recursive: true })

        integration = pdf({
            pages: {
                'https://example.com/not/a/real/page.php': {
                    throwOnFail: true
                },
                'https://example.com': true
            },
            throwErrors: false
        })

        logger = makeLogger()
        await integration.hooks['astro:config:done']!({
            config: {
                root,
                cacheDir
            } as AstroConfig,
            setAdapter: () => {
                throw new Error('unimplemented')
            },
            injectTypes: () => {
                throw new Error('unimplemented')
            },
            buildOutput: 'static',
            logger
        })
        await integration.hooks['astro:build:done']!({
            pages: [],
            dir: outDir,
            logger,
            assets: new Map()
        })
    }, 10000)

    test('logs failed pages', () => {
        console.log(logger.debug.mock.calls)
        console.log(logger.info.mock.calls)
        console.log(logger.error.mock.calls)
        expect(logger.error).toHaveBeenCalledWith('Failed to generate 2 files')
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('PageError: Failed to load `https://example.com/not/a/real/page.php`: 404\n')
        )
        expect(logger.info).toHaveBeenCalledWith(expect.stringMatching(/^✖︎ Failed after \d+ms./))
    })

    test('does not info log when error thrown', () => {
        expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
    })

    test('logs page load aborted', () => {
        expect(logger.debug).toHaveBeenCalledWith(
            expect.stringContaining('page load aborted for https://example.com/' + '\n' + 'Caused by:')
        )
        expect(logger.debug).not.toHaveBeenCalledWith(
            expect.stringContaining('page load aborted for https://example.com/not/a/real/page.php')
        )
    })

    test('closes all pages', () => {
        expect(logger.debug).toHaveBeenCalledWith('page closed for `https://example.com/not/a/real/page.php`')
        expect(logger.debug).toHaveBeenCalledWith('page closed for `https://example.com/`')
    })
})
