import { describe, test, expect, beforeAll } from 'vitest'

import { pathToFileURL } from 'node:url'

import { build } from 'astro'

import pdf from 'astro-pdf'

import { start, TestServer } from './utils/server.js'

describe('retries failed load', () => {
    let server: TestServer

    beforeAll(async () => {
        server = await start(pathToFileURL('test/fixtures/.cache/max-retries/public/'), {
            '/b': {
                dest: 'https://super.fake.example.com'
            },
            '/c': {
                dest: 'https://example.com'
            },
            '/d': {
                dest: 'https://en.wikipedia.org/wiki/Special:Random'
            }
        })
        const address = server.address()
        if (!address || typeof address !== 'object') {
            throw new Error('test error: invalid server address')
        }
        const url = new URL('http://localhost:' + address.port)
        await build({
            logLevel: 'silent',
            root: 'test/fixtures/.cache/max-retries',
            integrations: [
                pdf({
                    baseOptions: {
                        waitUntil: 'load',
                        maxRetries: 2
                    },
                    pages: {
                        [new URL('a', url).href]: 'a.pdf',
                        [new URL('b', url).href]: 'b.pdf',
                        [new URL('c', url).href]: 'c.pdf',
                        [new URL('d', url).href]: 'd.pdf'
                    }
                })
            ]
        })
    }, 15000)

    test('requests each failed page 3 times', () => {
        expect(server.history.filter((req) => req.url === '/a').length).toBe(3)
        expect(server.history.filter((req) => req.url === '/b').length).toBe(3)
    })
    test('requests each successful page 1 time', () => {
        expect(server.history.filter((req) => req.url === '/c').length).toBe(1)
        expect(server.history.filter((req) => req.url === '/d').length).toBe(1)
    })
})
