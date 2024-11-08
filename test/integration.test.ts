import { beforeAll, describe, expect, test } from 'vitest'
import { AstroConfig, AstroIntegration } from 'astro'
import { Logger, makeLogger, parsePdf } from './utils/index.js'
import { cp, lstat, mkdir, rm } from 'fs/promises'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { resolve } from 'path'
import pdf from 'astro-pdf'

describe('run integration', () => {
    let integration: AstroIntegration

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
                '/': true,
                '/missing': 'missing.pdf'
            }
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
                logger
            })
            await integration.hooks['astro:build:done']!({
                pages: [],
                dir: outDir,
                routes: [],
                logger,
                cacheManifest: false
            })
        }, 20000)

        test('generated local page', async () => {
            const path = resolve(outPath, 'index.pdf')
            expect((await lstat(path)).isFile()).toBe(true)
            const data = await parsePdf(path)
            expect(data.Meta['Title']).toBe('home page')
            const texts: string[] = []
            data.Pages[0].Texts.forEach((t) => t.R.forEach((r) => texts.push(decodeURIComponent(r.T))))
            expect(texts).toContain('@test/integration')
        })

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
