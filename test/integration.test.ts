import { beforeAll, describe, expect, test, vi } from 'vitest'

import { existsSync } from 'node:fs'
import { cp, lstat, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { AstroConfig, AstroIntegration, build } from 'astro'

import pdf from 'astro-pdf'

import { Logger, makeLogger, parsePdf } from './utils/index.js'

describe('run integration', () => {
    let integration: AstroIntegration
    const runBefore = vi.fn()
    const runAfter = vi.fn()

    beforeAll(() => {
        integration = pdf({
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
                }
            },
            runBefore,
            runAfter
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
                routes: [],
                logger,
                assets: new Map()
            })
        }, 30000)

        test('called runBefore', () => {
            expect(runBefore).toBeCalledTimes(1)
            expect(runBefore).toHaveBeenCalledWith(outDir)
        })

        test('called runAfter', () => {
            const calls = runAfter.mock.calls
            expect(calls.length).toBe(1)
            expect(calls[0][0]).toBe(outDir)
            const expected = ['/resume.pdf', '/index.pdf', '/index-1.pdf', '/index-2.pdf', '/copy.pdf']
            expect(calls[0][1].sort()).toStrictEqual(expected.sort())
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

        test('generated remote page', async () => {
            const path = resolve(outPath, 'resume.pdf')
            expect((await lstat(path)).isFile()).toBe(true)
            const data = await parsePdf(path)
            expect(data.Meta['Title']).toContain('resume')
        })

        test('did not generate 404 page', async () => {
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
