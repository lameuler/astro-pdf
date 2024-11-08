import type { AstroConfig } from 'astro'
import type { Page, PDFOptions, PuppeteerLaunchOptions, PuppeteerLifeCycleEvent } from 'puppeteer'
import type { InstallOptions } from '@puppeteer/browsers'
import type { ServerOutput } from './server.js'

export interface Options {
    install?: boolean | Partial<InstallOptions>
    launch?: PuppeteerLaunchOptions
    baseOptions?: Partial<PageOptions>
    server?: ((config: AstroConfig) => ServerOutput | Promise<ServerOutput>) | false
    pages: PagesFunction | PagesMap
}

export type PagesEntry = Partial<PageOptions> | string | boolean | null | undefined | void

export type PagesFunction = (pathname: string) => PagesEntry

export type PagesMap = Record<string, PagesEntry> & {
    fallback?: PagesFunction
}

export interface PageOptions {
    path: string | ((url: URL) => string)
    screen: boolean
    waitUntil: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[]
    pdf: Omit<PDFOptions, 'path'>
    callback?: (page: Page) => void | Promise<void>
}

export const defaultPageOptions: PageOptions = {
    path: '[pathname].pdf',
    screen: false,
    waitUntil: 'networkidle2',
    pdf: {}
} as const

export function mergePages(builtPages: { pathname: string }[], pagesOption: PagesFunction | PagesMap) {
    const map: { [location: string]: Exclude<PagesEntry, null | undefined> } = {}
    if (typeof pagesOption === 'object') {
        for (const key in pagesOption) {
            if (key !== 'fallback') {
                const url = new URL(key, 'base://')
                const options = pagesOption[key]
                if (options !== null && options !== undefined) {
                    if (url.protocol === 'http:' || url.protocol === 'https:') {
                        map[url.href] = options
                    } else {
                        map[url.pathname + url.search] = options
                    }
                }
            }
        }
    }
    const locations = new Set<string>(Object.keys(map))

    for (const { pathname } of builtPages) {
        locations.add(new URL(pathname, 'base://').pathname)
    }

    const fallback = (typeof pagesOption === 'function' ? pagesOption : pagesOption.fallback) ?? function () {}

    return { map, fallback, locations: Array.from(locations) }
}

export function getPageOptions(
    location: string,
    baseOptions: PageOptions,
    map: { [location: string]: Exclude<PagesEntry, null | undefined> },
    fallback: PagesFunction
) {
    const pageOptions = map[location] ?? fallback(location)
    if (pageOptions) {
        const partial =
            typeof pageOptions === 'object' ? pageOptions : typeof pageOptions === 'string' ? { path: pageOptions } : {}
        const options = {
            ...baseOptions,
            ...partial
        }
        const path = options.path
        if (typeof path === 'string' && path.includes('[pathname]')) {
            options.path = defaultPathFunction(path)
        }
        return options
    }
    return undefined
}

export function defaultPathFunction(path: string) {
    return (url: URL) => {
        const pathname = url.pathname.replace(/\/+$/, '') || '/index'
        return path.replace('[pathname]', pathname)
    }
}
