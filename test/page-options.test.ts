import { beforeAll, describe, expect, test, vi } from 'vitest'

import { CleanedMap, defaultPageOptions, getPageOptions, mergePages, PagesFunction } from 'astro-pdf/dist/options.js'

describe('merge pages', () => {
    test('pages map', () => {
        const routes = [{ pathname: 'route/a' }, { pathname: '/route/b' }, { pathname: 'route/c/' }]
        const pages = {
            path: undefined,
            'https://example.com': [true, 'example.pdf'],
            'route/c/': [false, undefined, null]
        }
        const { map, locations, fallback } = mergePages(routes, pages)
        locations.sort()
        expect(locations).toStrictEqual(['/route/a', '/route/b', '/route/c/', 'https://example.com/'])
        expect(map).toStrictEqual({
            'https://example.com/': [true, 'example.pdf'],
            '/route/c/': [false]
        })
        expect(fallback).toBeDefined()
        expect(fallback('/route/a')).toBeUndefined()
    })

    test('pages function', () => {
        const fn = (pathname: string) => pathname === '/page'
        const routes = [{ pathname: '/page1' }, { pathname: '/page2' }, { pathname: '/page3' }]
        const { map, locations, fallback } = mergePages(routes, fn)
        locations.sort()
        expect(locations).toStrictEqual(['/page1', '/page2', '/page3'])
        expect(map).toStrictEqual({})
        expect(fallback).toBe(fn)
    })
})

describe('page options', () => {
    let map: CleanedMap
    let fallback: PagesFunction
    let locations: string[]

    beforeAll(() => {
        const routes = [{ pathname: 'route/a' }, { pathname: '/route/b' }, { pathname: 'route/c/' }]
        const pages = {
            path: undefined,
            'https://example.com': 'example.pdf',
            'route/c/': false,
            somewhere: [true, undefined, { path: 'elsewhere.pdf' }],
            fallback: vi.fn((pathname: string) => {
                if (pathname === '/route/a') return 'static[pathname].pdf'
            })
        }
        const merged = mergePages(routes, pages)
        map = merged.map
        fallback = merged.fallback
        merged.locations.sort()
        locations = merged.locations
    })

    test('merged options', () => {
        expect(locations).toStrictEqual(['/route/a', '/route/b', '/route/c/', '/somewhere', 'https://example.com/'])
        expect(map).toStrictEqual({
            'https://example.com/': ['example.pdf'],
            '/route/c/': [false],
            '/somewhere': [true, { path: 'elsewhere.pdf' }]
        })
    })

    test('url mapped to string', () => {
        const result = getPageOptions('https://example.com/', defaultPageOptions, map, fallback)
        expect(result).toBeDefined()
        expect(result.length).toBe(1)
        expect(result![0].path).toBe('example.pdf')
    })

    test('route mapped to false', () => {
        const result = getPageOptions('/route/c/', defaultPageOptions, map, fallback)
        expect(result.length).toBe(0)
        expect(fallback).not.toHaveBeenCalledWith('/route/c/')
    })

    test('true page entry', () => {
        const result = getPageOptions('/somewhere', defaultPageOptions, map, fallback)
        expect(result).toBeDefined()
        expect(result.length).toBe(2)
        expect(result![0].path).toBeTypeOf('function')
    })

    test('object page entry', () => {
        const result = getPageOptions('/somewhere', defaultPageOptions, map, fallback)
        expect(result).toBeDefined()
        expect(result.length).toBe(2)
        expect(result![1].path).toBe('elsewhere.pdf')
    })

    test('fallback with [pathname]', () => {
        const result = getPageOptions('/route/a', defaultPageOptions, map, fallback)
        expect(result).toBeDefined()
        expect(result.length).toBe(1)
        expect(fallback).toHaveBeenCalledWith('/route/a')
        const p = result![0].path
        expect(p).toBeTypeOf('function')
        if (typeof p !== 'function') return
        expect(p(new URL('http://localhost:4321/route/a'))).toBe('static/route/a.pdf')
    })
})
