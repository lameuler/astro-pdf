import { expect, test } from 'vitest'

test('default exports function', async () => {
    const module = await import('../dist/index.js')
    expect(Object.keys(module)).toStrictEqual(['default'])
    expect(module.default).toBeTypeOf('function')
})

// check all documented types
export type {
    Options,
    PageOptions,
    PagesEntry,
    PagesFunction,
    PagesMap,
    PDFOptions,
    ServerOutput
} from '../dist/index.js'
