import { expect, test } from 'vitest'

test('default exports function', async () => {
    const module = await import('astro-pdf')
    expect(Object.keys(module)).toStrictEqual(['default'])
    expect(module.default).toBeTypeOf('function')
})

// check all documented types
export type { Options, PageOptions, PagesEntry, PagesFunction, PagesMap, ServerOutput } from 'astro-pdf'
