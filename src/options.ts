import type { InstallOptions } from '@puppeteer/browsers'
import type { AstroConfig } from 'astro'
import type { Page, PDFOptions, LaunchOptions, PuppeteerLifeCycleEvent } from 'puppeteer'

import type { ServerOutput } from './server.js'

export interface Options {
    install?: boolean | Partial<InstallOptions>
    launch?: LaunchOptions
    baseOptions?: Partial<PageOptions>
    server?: ((config: AstroConfig) => ServerOutput | Promise<ServerOutput>) | false
    pages: PagesFunction | PagesMap
    maxConcurrent?: number | null
    runBefore?: (dir: URL) => void | Promise<void>
    runAfter?: (dir: URL, pathnames: string[]) => void | Promise<void>
}

export type PagesEntry = Partial<PageOptions> | string | boolean | null | undefined | void

export type PagesFunction = (pathname: string) => PagesEntry | PagesEntry[]

export type PagesMap = Record<string, PagesEntry | PagesEntry[]> & {
    fallback?: PagesFunction
}

export interface PageOptions {
    path: string | ((url: URL) => string)
    screen: boolean
    waitUntil: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[]
    navTimeout?: number
    pdf: Omit<PDFOptions, 'path'>
    maxRetries?: number
    throwOnFail?: boolean
    callback?: (page: Page) => void | Promise<void>
}

export const defaultPageOptions: PageOptions = {
    path: '[pathname].pdf',
    screen: false,
    waitUntil: 'networkidle2',
    pdf: {},
    maxRetries: 0,
    throwOnFail: false
} as const

export type CleanedMap = Record<string, Exclude<PagesEntry, null | undefined>[]>

export function mergePages(builtPages: { pathname: string }[], pages: PagesFunction | PagesMap) {
    const map: CleanedMap = {}
    if (typeof pages === 'object') {
        for (const key in pages) {
            if (key !== 'fallback') {
                const url = new URL(key, 'base://')
                const options = pages[key]
                const arr = Array.isArray(options) ? options : [options]
                const result: CleanedMap[string] = []
                for (let i = 0; i < arr.length; i++) {
                    const opts = arr[i]
                    if (opts !== null && opts !== undefined) {
                        result.push(opts)
                    }
                }
                if (result.length > 0) {
                    if (url.protocol === 'http:' || url.protocol === 'https:') {
                        map[url.href] = result
                    } else {
                        map[url.pathname + url.search] = result
                    }
                }
            }
        }
    }
    const locations = new Set<string>(Object.keys(map))

    for (const { pathname } of builtPages) {
        locations.add(new URL(pathname, 'base://').pathname)
    }

    const fallback = (typeof pages === 'function' ? pages : pages.fallback) ?? function () {}

    return { map, fallback, locations: Array.from(locations) }
}

export function getPageOptions(
    location: string,
    baseOptions: PageOptions,
    map: CleanedMap,
    fallback: PagesFunction
): PageOptions[] {
    const pageOptions = map[location] ?? fallback(location)
    const arr = Array.isArray(pageOptions) ? pageOptions : [pageOptions]
    const result: PageOptions[] = []
    for (let i = 0; i < arr.length; i++) {
        const opts = arr[i]
        if (opts) {
            const partial = typeof opts === 'object' ? opts : typeof opts === 'string' ? { path: opts } : {}
            const options = {
                ...baseOptions,
                ...partial
            }
            const path = options.path
            if (typeof path === 'string' && path.includes('[pathname]')) {
                options.path = defaultPathFunction(path)
            }
            result.push(options)
        }
    }
    return result
}

export function defaultPathFunction(path: string) {
    return (url: URL) => {
        const pathname = url.pathname.replace(/\/+$/, '') || '/index'
        return path.replace('[pathname]', pathname)
    }
}
