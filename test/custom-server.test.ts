import { describe, test, beforeAll, expect, vi } from 'vitest'
import { loadFixture, parsePdf, type TestFixture } from './utils/index.js'
import { resolve } from 'path'
import { rm } from 'fs/promises'
import { existsSync } from 'fs'
import pdf from '@/index.js'
import { start } from './utils/server.js'

describe('build', () => {
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
})
