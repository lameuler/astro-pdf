import { describe, test, expect, beforeAll } from 'vitest'

import { mkdir } from 'node:fs/promises'

import { build } from 'astro'
import type { Page } from 'puppeteer'

import pdf from 'astro-pdf'

describe('max concurrent pages', () => {
    const calls: number[] = []
    beforeAll(async () => {
        const root = './test/fixtures/.cache/concurrent'
        await mkdir(root, { recursive: true })

        async function callback(page: Page) {
            calls.push((await page.browser().pages()).length)
        }

        await build({
            logLevel: 'silent',
            root,
            integrations: [
                pdf({
                    baseOptions: {
                        waitUntil: 'load',
                        callback
                    },
                    pages: {
                        'https://en.wikipedia.org/wiki/Special:Random': Array(4).fill('random.pdf'),
                        'https://example.com/not/a/real/page': {
                            path: 'fake.pdf',
                            maxRetries: 1
                        },
                        'https://not.a.real.subdomain.example.com': {
                            path: 'fake.pdf',
                            maxRetries: 1
                        },
                        'https://example.com': Array(2).fill('example.pdf')
                    },
                    maxConcurrent: 2
                })
            ]
        })
    }, 30_000)

    test('has at most 2 pages open at once', () => {
        expect(calls.length).toBe(6) // only successfully loaded pages call the callback
        expect(calls.every((n) => n <= 2)).toBe(true)
    })
})
