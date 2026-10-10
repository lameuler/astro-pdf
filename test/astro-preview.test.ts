import { beforeAll, describe, expect, test } from 'vitest'

import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { AstroConfig } from 'astro'
import { load } from 'cheerio'

import type { ServerOutput } from '../dist/index.js'
import { astroPreview } from '../dist/server.js'
import { loadFixture, type TestFixture } from './utils/index.js'

let fixture1: TestFixture
let fixture2: TestFixture

beforeAll(async () => {
    fixture1 = loadFixture('astro-preview-1')
    fixture2 = loadFixture('astro-preview-2')
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

    test('server 1 and server 2 have different ports', () => {
        expect(server1!.url!.hostname).toBe(server2!.url!.hostname)
        expect(server1!.url!.port).not.toBe(server2!.url!.port)
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
        await expect(fetch(server1!.url!)).rejects.toThrow('fetch failed')
    })

    test('server 2 closed', async () => {
        await expect(fetch(server2!.url!)).rejects.toThrow('fetch failed')
    })
})

describe('server url output', () => {
    const root = resolve('test/fixtures/.cache/astro-preview')
    beforeAll(async () => {
        await mkdir(resolve(root, 'dist'), { recursive: true })
    })
    test('can resolve url with server.host: true', async () => {
        await writeFile(resolve(root, 'astro.config.mjs'), 'export default { server: { host: true } }')
        const output = await astroPreview({ root: pathToFileURL(root) } as AstroConfig)
        // the value with host: true is likely 0.0.0.0 or :: but is not necessarily fixed
        expect(output.url).toBeDefined()
        await output.close?.()
    })
    test('can resolve localhost', async () => {
        await writeFile(resolve(root, 'astro.config.mjs'), 'export default { server: { host: false } }')
        const output = await astroPreview({ root: pathToFileURL(root) } as AstroConfig)
        expect(output.url?.hostname).toBe('localhost')
        await output.close?.()
    })
    test('can resolve ipv4 host', async () => {
        await writeFile(resolve(root, 'astro.config.mjs'), 'export default { server: { host: "127.0.0.1" } }')
        const output = await astroPreview({ root: pathToFileURL(root) } as AstroConfig)
        expect(output.url?.hostname).toBe('127.0.0.1')
        await output.close?.()
    })
    test('can resolve ipv6 host', async () => {
        await writeFile(resolve(root, 'astro.config.mjs'), 'export default { server: { host: "::1" } }')
        const output = await astroPreview({ root: pathToFileURL(root) } as AstroConfig)
        expect(output.url?.hostname).toBe('[::1]')
        await output.close?.()
    })
})
