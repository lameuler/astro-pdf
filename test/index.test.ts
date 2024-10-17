import { expect, test } from 'vitest'

test('default exports function', async () => {
    const module = (await import('../src'))
    expect(Object.keys(module)).toStrictEqual([ 'default' ])
    expect(module.default).toBeTypeOf('function')
})