import { beforeAll, describe, expect, test } from 'vitest'

import { PageOptions } from '../../src/options.js'
import { FatalError, PageEnv, PageError, PageResult } from '../../src/page.js'
import { PageProcessor, PageProcessorOpts, Runner } from '../../src/runner.js'
import { makeLogger } from '../utils/index.js'

function fakePageOptions(partial: Partial<PageOptions>): PageOptions {
    return {
        navTimeout: 0,
        path: '',
        screen: false,
        waitUntil: 'load',
        pdf: {},
        ...partial
    }
}
function fakePageResult(): PageResult {
    return {
        location: '',
        src: null,
        output: {
            path: '',
            pathname: ''
        }
    }
}

describe('max concurrent', () => {
    test('runs at most n tasks at once', async () => {
        const n = 3
        const history: number[] = []
        let running = 0
        const processor: PageProcessor = async (opts) => {
            history.push(++running)
            await new Promise<void>((resolve) => {
                setTimeout(resolve, opts.pageOptions.navTimeout ?? 200)
            })
            history.push(--running)
            return fakePageResult()
        }

        const runner = new Runner(processor, {} as PageEnv, n, makeLogger())

        const queue: PageProcessorOpts[] = [50, 30, 80, 100, 20, 40].map((n) => ({
            location: '',
            pageOptions: fakePageOptions({ navTimeout: n })
        }))
        await runner.run(queue)

        expect(Math.max(...history)).toBe(n)
    })
    test('can run sequentially', async () => {
        const history: number[] = []
        let running = 0
        const processor: PageProcessor = async (opts) => {
            history.push(++running)
            await new Promise<void>((resolve) => {
                setTimeout(resolve, opts.pageOptions.navTimeout ?? 200)
            })
            history.push(--running)
            return fakePageResult()
        }

        const runner = new Runner(processor, {} as PageEnv, 1, makeLogger())

        const timings = [50, 30, 80, 100, 20, 40]
        const queue: PageProcessorOpts[] = timings.map((n) => ({
            location: '',
            pageOptions: fakePageOptions({ navTimeout: n })
        }))
        const start = Date.now()
        await runner.run(queue)
        const duration = Date.now() - start

        const total = timings.reduce((p, n) => p + n)
        expect(duration).toBeGreaterThan(total - 20)
        expect(duration).toBeLessThan(total + 100)

        expect(Math.max(...history)).toBe(1)
    })
    test('can run all in parallel', async () => {
        const history: number[] = []
        let running = 0
        const processor: PageProcessor = async (opts) => {
            history.push(++running)
            await new Promise<void>((resolve) => {
                setTimeout(resolve, opts.pageOptions.navTimeout ?? 200)
            })
            history.push(--running)
            return fakePageResult()
        }

        const runner = new Runner(processor, {} as PageEnv, Number.POSITIVE_INFINITY, makeLogger())

        const timings = [150, 30, 80, 100, 50, 40]
        const queue: PageProcessorOpts[] = timings.map((n) => ({
            location: '',
            pageOptions: fakePageOptions({ navTimeout: n })
        }))
        const start = Date.now()
        await runner.run(queue)
        const duration = Date.now() - start

        expect(duration).toBeGreaterThan(Math.max(...timings) - 20)
        expect(duration).toBeLessThan(Math.max(...timings) + 60)

        expect(Math.max(...history)).toBe(queue.length)
    })
})

describe('max retries without throwOnFail', () => {
    const history: Record<string, number> = {}

    beforeAll(async () => {
        const processor: PageProcessor = async (opts) => {
            const attempt = (history[opts.location] = (history[opts.location] ?? 0) + 1)

            if (opts.location[attempt - 1] === 'x') {
                throw new PageError(opts.location, '')
            }
            return Promise.resolve(fakePageResult())
        }

        const runner = new Runner(processor, {} as PageEnv, Number.POSITIVE_INFINITY, makeLogger())

        const queue: PageProcessorOpts[] = [
            { location: 'start ok', pageOptions: fakePageOptions({ maxRetries: 2 }) },
            { location: 'x then ok', pageOptions: fakePageOptions({ maxRetries: 2 }) },
            { location: 'xxx not ok', pageOptions: fakePageOptions({ maxRetries: 2 }) }
        ]
        await runner.run(queue)
    })

    test('does not retry success', () => {
        expect(history['start ok']).toBe(1)
    })

    test('retries until success', () => {
        expect(history['x then ok']).toBe(2)
    })

    test('retries until limit', () => {
        expect(history['xxx not ok']).toBe(3)
    })
})

describe('max retries with throwOnFail', () => {
    const history: Record<string, number> = {}
    let runner: Runner

    const queue: PageProcessorOpts[] = [
        { location: 'x then ok', pageOptions: fakePageOptions({ maxRetries: 2, throwOnFail: true }) },
        { location: 'xxx not ok', pageOptions: fakePageOptions({ maxRetries: 2, throwOnFail: true }) }
    ]

    beforeAll(() => {
        const processor: PageProcessor = async (opts) => {
            const attempt = (history[opts.location] = (history[opts.location] ?? 0) + 1)

            await new Promise((resolve) => setTimeout(resolve, 50))

            if (opts.location[attempt - 1] === 'x') {
                throw new PageError(opts.location, '')
            }
            return fakePageResult()
        }

        runner = new Runner(processor, {} as PageEnv, Number.POSITIVE_INFINITY, makeLogger())
    })

    test('throws only after retries', async () => {
        await expect(() => runner.run(queue)).rejects.toThrow(PageError)
        expect(history['xxx not ok']).toBe(3)
    })

    test('retries until success', () => {
        expect(history['x then ok']).toBe(2)
    })
})

describe('fatal errors', () => {
    test('immediately throws fatal error', async () => {
        const history: Record<string, number> = {}

        const processor: PageProcessor = async (opts) => {
            const attempt = (history[opts.location] = (history[opts.location] ?? 0) + 1)

            if (opts.location[attempt - 1] === 'f') {
                throw new FatalError('')
            }

            await new Promise((resolve) => setTimeout(resolve, 50))

            if (opts.location[attempt - 1] === 'x') {
                throw new PageError(opts.location, '')
            }
            return fakePageResult()
        }

        const queue: PageProcessorOpts[] = [
            { location: 'x then ok', pageOptions: fakePageOptions({ maxRetries: 2 }) },
            { location: 'f fatal', pageOptions: fakePageOptions({ maxRetries: 2 }) }
        ]

        const runner = new Runner(processor, {} as PageEnv, Number.POSITIVE_INFINITY, makeLogger())

        await expect(() => runner.run(queue)).rejects.toThrow(FatalError)
        expect(history['f fatal']).toBe(1)
        expect(history['x then ok']).toBeLessThanOrEqual(1)
    })

    test('immediately throws unexpected error', async () => {
        const history: Record<string, number> = {}

        const processor: PageProcessor = async (opts) => {
            const attempt = (history[opts.location] = (history[opts.location] ?? 0) + 1)

            if (opts.location[attempt - 1] === 'u') {
                throw new Error('???')
            }

            await new Promise((resolve) => setTimeout(resolve, 50))

            if (opts.location[attempt - 1] === 'x') {
                throw new PageError(opts.location, '')
            }
            return fakePageResult()
        }

        const queue: PageProcessorOpts[] = [
            { location: 'x then ok', pageOptions: fakePageOptions({ maxRetries: 2 }) },
            { location: 'u unexpected', pageOptions: fakePageOptions({ maxRetries: 2 }) }
        ]

        const runner = new Runner(processor, {} as PageEnv, Number.POSITIVE_INFINITY, makeLogger())

        await expect(() => runner.run(queue)).rejects.toThrow(
            'An unexpected error occurred and was not handled by astro-pdf'
        )
        expect(history['u unexpected']).toBe(1)
        expect(history['x then ok']).toBeLessThanOrEqual(1)
    })
})
