import { beforeAll, describe, expect, expectTypeOf, test } from 'vitest'
import { load } from 'cheerio'
import { astroPreview, AstroPreviewResult } from '../src/utils'
import { loadFixture, type TestFixture } from './utils'

let fixture1: TestFixture
let fixture2: TestFixture

beforeAll(async () => {
    fixture1 = await loadFixture('astro-preview-1')
    fixture2 = await loadFixture('astro-preview-2')
    await fixture1.build()
    await fixture2.build()
})

let server1: AstroPreviewResult | undefined
let server2: AstroPreviewResult | undefined

describe('test server', () => {
    beforeAll(async () => {
        server1 = await astroPreview({ cwd: fixture1.root })
        server2 = await astroPreview({ cwd: fixture2.root })
    })

    test('returns value', () => {
        expect(server1).toBeDefined()
        expect(server2).toBeDefined()
    })

    test('server 1 and server 2 have different urls', () => {
        expect(server1!!.url).not.toBe(server2!!.url)
    })

    test('server 1 running', async () => {
        const res = await fetch(server1!!.url)
        expect(res.status).toBe(200)
        const text = await res.text()
        const $ = load(text)
        expect($('h1').text()).toBe('astro-preview-1')
    })

    test('server 2 running', async () => {
        const res = await fetch(server2!!.url)
        expect(res.status).toBe(200)
        const text = await res.text()
        const $ = load(text)
        expect($('h1').text()).toBe('astro-preview-2')
    })
    
})

describe('stop servers', () => {
    beforeAll(async () => {
        await server1!!.close()
        await server2!!.close()
    })

    test('server 1 closed', async () => {
        await expect(fetch(server1!!.url)).rejects.toThrowError('fetch failed')
    })

    test('server 2 closed', async () => {
        await expect(fetch(server2!!.url)).rejects.toThrowError('fetch failed')
    })

    test('can call close again', async () => {
        expect(server1!!.close()).resolves.toBeUndefined()
        expect(server2!!.close()).resolves.toBeUndefined()
    })
})