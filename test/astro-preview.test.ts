import { beforeAll, describe, expect, test } from 'vitest'
import { load } from 'cheerio'
import { loadFixture, type TestFixture } from './utils'
import { astroPreview } from '@/utils'
import { ServerOutput } from '@/integration'
import { AstroConfig } from 'astro'
import { pathToFileURL } from 'url'

let fixture1: TestFixture
let fixture2: TestFixture

beforeAll(async () => {
    fixture1 = await loadFixture('astro-preview-1')
    fixture2 = await loadFixture('astro-preview-2')
    await fixture1.build()
    await fixture2.build()
})

let server1: ServerOutput | undefined
let server2: ServerOutput | undefined

describe('test server', () => {
    beforeAll(async () => {
        // astroPreview only needs root from AstroConfig
        const config1 = { root: pathToFileURL(fixture1.root) } as AstroConfig
        const config2 = { root: pathToFileURL(fixture2.root) } as AstroConfig
        server1 = await astroPreview(config1)
        server2 = await astroPreview(config2)
    })

    test('returns url and close', () => {
        expect(server1).toBeDefined()
        expect(server2).toBeDefined()

        expect(server1?.url).toBeDefined()
        expect(server2?.url).toBeDefined()

        expect(server1?.close).toBeTypeOf('function')
        expect(server2?.close).toBeTypeOf('function')
    })

    test('server 1 and server 2 have different urls', () => {
        expect(server1!.url).not.toBe(server2!.url)
    })

    test('server 1 running', async () => {
        const res = await fetch(server1!.url!)
        expect(res.status).toBe(200)
        const text = await res.text()
        const $ = load(text)
        expect($('h1').text()).toBe('astro-preview-1')
    })

    test('server 2 running', async () => {
        const res = await fetch(server2!.url!)
        expect(res.status).toBe(200)
        const text = await res.text()
        const $ = load(text)
        expect($('h1').text()).toBe('astro-preview-2')
    })
})

describe('stop servers', () => {
    beforeAll(async () => {
        await server1!.close!()
        await server2!.close!()
    })

    test('server 1 closed', async () => {
        await expect(fetch(server1!.url!)).rejects.toThrowError('fetch failed')
    })

    test('server 2 closed', async () => {
        await expect(fetch(server2!.url!)).rejects.toThrowError('fetch failed')
    })
})
