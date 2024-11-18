import { beforeAll, describe, expect, test } from 'vitest'

import { existsSync } from 'fs'
import { readFile, rm } from 'fs/promises'
import { resolve } from 'path'

import { loadFixture, type TestFixture } from './utils/index.js'

describe('build', () => {
    let fixture: TestFixture

    beforeAll(async () => {
        fixture = await loadFixture('build-pdf')
        if (existsSync(resolve(fixture.root, 'node_modules/.astro'))) {
            await rm(resolve(fixture.root, 'node_modules/.astro'), {
                recursive: true
            })
        }
        await fixture.build()
    }, 80_000)

    test('pdf file generated', async () => {
        const data = await readFile(fixture.resolveOutput('testing.pdf'))
        expect(data.length).toBeGreaterThan(0)
    })
    test('can create directories', async () => {
        const data = await readFile(fixture.resolveOutput('testing3/testing4/testing5/testing6.pdf'))
        expect(data.length).toBeGreaterThan(0)
    })

    // TODO check more test cases
})
