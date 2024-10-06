import { describe, test, beforeAll, expect } from 'vitest'
import { loadFixture, type TestFixture } from './utils'
import { rm } from 'fs/promises'
import { resolve } from 'path'
import { readFile } from 'fs/promises'

describe('build', () => {
    let fixture: TestFixture

    beforeAll(async () => {
        fixture = await loadFixture('build-pdf')
        await rm(resolve(fixture.root, 'node_modules/.astro'), { recursive: true })
        await rm(fixture.resolveOutput(), { recursive: true })
        await fixture.build()
    }, 40_000)

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