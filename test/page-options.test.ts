import { beforeAll, describe, expect, test } from 'vitest'
import { mergePages, getPageOptions } from '@/utils'
import { defaultPageOptions, PagesEntry, PagesFunction } from '@/integration'

test('merge pages', () => {
    const routes = [{ pathname: 'route/a' }, { pathname: '/route/b' }, { pathname: 'route/c/' }]
    const pages = {
        path: undefined,
        'https://example.com': true,
        'route/c/': false
    }
    const { map, locations } = mergePages(routes, pages)
    locations.sort()
    expect(locations).toStrictEqual(['/route/a', '/route/b', '/route/c', 'https://example.com/'])
    expect(map).toStrictEqual({
        'https://example.com/': true,
        '/route/c': false
    })
})

describe('page options', () => {
    let map: Record<string, Exclude<PagesEntry, null | undefined>>
    let fallback: PagesFunction
    let locations: string[]

    beforeAll(() => {
        const routes = [{ pathname: 'route/a' }, { pathname: '/route/b' }, { pathname: 'route/c/' }]
        const pages = {
            path: undefined,
            'https://example.com': 'example.pdf',
            'route/c/': false,
            fallback: (pathname: string) => {
                if (pathname === '/route/a') return 'static[pathname].pdf'
            }
        }
        const merged = mergePages(routes, pages)
        map = merged.map
        fallback = merged.fallback
        merged.locations.sort()
        locations = merged.locations
    })

    test('merged options', () => {
        expect(locations).toStrictEqual(['/route/a', '/route/b', '/route/c', 'https://example.com/'])
        expect(map).toStrictEqual({
            'https://example.com/': 'example.pdf',
            '/route/c': false
        })
    })

    test('url mapped to string', () => {
        const result = getPageOptions('https://example.com/', defaultPageOptions, map, fallback)
        expect(result).toBeDefined()
        expect(result!.path).toBe('example.pdf')
    })

    test('route mapped to false', () => {
        const result = getPageOptions('/route/c', defaultPageOptions, map, fallback)
        expect(result).toBeUndefined()
    })

    test('fallback with [pathname]', () => {
        const result = getPageOptions('/route/a', defaultPageOptions, map, fallback)
        expect(result).toBeDefined()
        const p = result!.path
        expect(p).toBeTypeOf('function')
        if (typeof p !== 'function') return
        expect(p(new URL('http://localhost:4321/route/a'))).toBe('static/route/a.pdf')
    })
})
