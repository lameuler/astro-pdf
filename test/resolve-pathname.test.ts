import { describe, expect, test } from 'vitest'
import { resolvePathname } from '../src/utils'
import { pathToFileURL } from 'url'
import path, { resolve, sep } from 'path'

function createTests(name: string, resolveRoot: (root: string) => string | URL, slash='/') {
    const d = resolveRoot
    const r = resolve
    function s(pathname: string) {
        return pathname.replace('/', slash)
    }

    describe(name, () => {
        test('root with trailing slash', () => {
            const root = d('./dist/')
            const result = resolvePathname(s('./dir/file.pdf'), root)
            expect(result.path).toBe(r('./dist/dir/file.pdf'))
            expect(result.pathname).toBe('/dir/file.pdf')
        })
        test('root without trailing slash', () => {
            const root = d('./dist/')
            const result = resolvePathname(s('dir/file.pdf'), root)
            expect(result.path).toBe(r('./dist/dir/file.pdf'))
            expect(result.pathname).toBe('/dir/file.pdf')
        })
        test('absolute path', () => {
            const root = d('./dist/')
            const result = resolvePathname(s('/dir/that/contains/file.txt'), root)
            expect(result.path).toBe(r('./dist/dir/that/contains/file.txt'))
            expect(result.pathname).toBe('/dir/that/contains/file.txt')
        })
        test('windows full absolute path', () => {
            const root = d('./dist/')
            const result = resolvePathname(s('C:/root/dir/file.txt'), root)
            expect(result.path).toBe(r('./dist/C:/root/dir/file.txt'))
            expect(result.pathname).toBe('/C:/root/dir/file.txt')
        })
        test('root without trailing slash', () => {
            const root = d('./project/dist')
            const result = resolvePathname(s('./dir/file.pdf'), root)
            expect(result.path).toBe(r('./project/dist/dir/file.pdf'))
            expect(result.pathname).toBe('/dir/file.pdf')
        })
        test('relative path outside root', () => {
            const root = d('./project/dist/')
            const result = resolvePathname(s('../../../dir/to/../file.pdf'), root)
            expect(result.path).toBe(r('./project/dist/dir/file.pdf'))
            expect(result.pathname).toBe('/dir/file.pdf')
        })
        test('relative path outside root without trailing slash', () => {
            const root = d('./project/dist')
            const result = resolvePathname(s('../dir/file.pdf'), root)
            expect(result.path).toBe(r('./project/dist/dir/file.pdf'))
            expect(result.pathname).toBe('/dir/file.pdf')
        })
        test('absolute path containing relative path', () => {
            const root = d('./project/dist/')
            const result = resolvePathname(s('/assets/../../dir/file.pdf'), root)
            expect(result.path).toBe(r('./project/dist/dir/file.pdf'))
            expect(result.pathname).toBe('/dir/file.pdf')
        })
    })
}

function resolvePath(p: string) {
    return resolve(p) + ((p.endsWith(sep) || p.endsWith('/')) ? path.sep : '')
}

function resolveUrl(p: string) {
    const cwd = pathToFileURL(process.cwd())
    if (!cwd.pathname.endsWith('/')) {
        cwd.pathname += '/'
    }
    return new URL(p, cwd)
}

createTests('forward slash and absolute path root', resolvePath, '/')
createTests('forward slash and relative path root', p => p, '/')
createTests('forward slash and url root', resolveUrl, '/')
createTests('back slash and absolute path root', resolvePath, '\\')
createTests('back slash and relative path root', p => p, '\\')
createTests('back slash and url', resolveUrl, '\\')