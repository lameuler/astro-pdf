import { describe, expect, test } from 'vitest'
import { filepathToPathname, pathnameToFilepath } from '../src/utils'
import { pathToFileURL } from 'url'
import path, { resolve, sep } from 'path'

function createTests(name: string, resolveRoot: (root: string) => string | URL, slash = '/') {
    const d = resolveRoot
    const r = resolve
    function s(pathname: string) {
        return pathname.replace('/', slash)
    }

    describe(name + 'pathnameToFilepath', () => {
        test('relative path with ./', () => {
            const root = d('./dist/')
            const path = pathnameToFilepath(s('./dir/file.pdf'), root)
            expect(path).toBe(r('./dist/dir/file.pdf'))
        })
        test('relative path without ./', () => {
            const root = d('./dist/')
            const path = pathnameToFilepath(s('dir/file.pdf'), root)
            expect(path).toBe(r('./dist/dir/file.pdf'))
        })
        test('absolute path', () => {
            const root = d('./dist/')
            const path = pathnameToFilepath(s('/dir/that/contains/file.txt'), root)
            expect(path).toBe(r('./dist/dir/that/contains/file.txt'))
        })
        test('windows full absolute path', () => {
            const root = d('./dist/')
            const path = pathnameToFilepath(s('C:/root/dir/file.txt'), root)
            expect(path).toBe(r('./dist/C:/root/dir/file.txt'))
        })
        test('root without trailing slash', () => {
            const root = d('./project/dist')
            const path = pathnameToFilepath(s('./dir/file.pdf'), root)
            expect(path).toBe(r('./project/dist/dir/file.pdf'))
        })
        test('root without trailing slash and ./', () => {
            const root = d('dist')
            const path = pathnameToFilepath(s('./dir/file.pdf'), root)
            expect(path).toBe(r('./dist/dir/file.pdf'))
        })
        test('relative path outside root', () => {
            const root = d('./project/dist/')
            const path = pathnameToFilepath(s('../../../dir/to/../file.pdf'), root)
            expect(path).toBe(r('./project/dist/dir/file.pdf'))
        })
        test('relative path outside root without trailing slash', () => {
            const root = d('./project/dist')
            const path = pathnameToFilepath(s('../dir/file.pdf'), root)
            expect(path).toBe(r('./project/dist/dir/file.pdf'))
        })
        test('absolute path containing relative path', () => {
            const root = d('./project/dist/')
            const path = pathnameToFilepath(s('/assets/../../dir/file.pdf'), root)
            expect(path).toBe(r('./project/dist/dir/file.pdf'))
        })
    })
    describe(name + ': filepathToPathname', () => {
        test('root without trailing slash', () => {
            const root = d('./dist')
            const pathname = filepathToPathname(r('./dist/testing/1/2/3.pdf'), root)
            expect(pathname).toBe('/testing/1/2/3.pdf')
        })
        test('root with trailing slash', () => {
            const root = d('./dist/')
            const pathname = filepathToPathname(r('./dist/testing/1/2/3.pdf'), root)
            expect(pathname).toBe('/testing/1/2/3.pdf')
        })
        test('directory path', () => {
            const root = d('project/dist')
            const pathname = filepathToPathname(r('./project/dist/outputs/'), root)
            expect(pathname).toBe('/outputs')
        })
    })
}

function resolvePath(p: string) {
    return resolve(p) + (p.endsWith(sep) || p.endsWith('/') ? path.sep : '')
}

function resolveUrl(p: string) {
    const cwd = pathToFileURL(process.cwd())
    if (!cwd.pathname.endsWith('/')) {
        cwd.pathname += '/'
    }
    return new URL(p, cwd)
}

createTests('forward slash and absolute path root', resolvePath, '/')
createTests('forward slash and relative path root', (p) => p, '/')
createTests('forward slash and url root', resolveUrl, '/')
createTests('back slash and absolute path root', resolvePath, '\\')
createTests('back slash and relative path root', (p) => p, '\\')
createTests('back slash and url', resolveUrl, '\\')
