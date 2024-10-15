import { detectBrowserPlatform, install, resolveBuildId, Browser, type InstallOptions } from '@puppeteer/browsers'
import { relative, resolve, sep } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { PageOptions, PagesEntry, PagesFunction, PagesKey, PagesMap, ServerOutput } from './integration'
import { preview } from 'astro'
import { Server } from 'http'

export async function installBrowser(options: Partial<InstallOptions>, defaultCacheDir: string) {
    const browser = options.browser ?? Browser.CHROME
    const buildId = options.buildId ?? (await resolveBuildId(browser, detectBrowserPlatform()!, 'stable'))
    const installOptions: InstallOptions & { unpack: true } = {
        ...options,
        browser,
        buildId,
        cacheDir: options.cacheDir ?? defaultCacheDir,
        unpack: true // ensure that browser is unpacked so it can be used
    }
    const installed = await install(installOptions)
    return installed.executablePath
}

export async function astroPreview(root: string): Promise<ServerOutput> {
    // ** `preview` is an experimental API **
    const server = await preview({ root, logLevel: 'error' })
    // get the actual port number for static preview server
    const address = 'server' in server && server.server instanceof Server ? server.server.address() : undefined
    let host: string | undefined = undefined
    let port: number | undefined = undefined
    if (address && typeof address === 'object') {
        host = address?.address
        port = address?.port
    }
    const url = new URL(`http://${server.host ?? host ?? 'localhost'}:${port ?? server.port}`)
    return {
        url,
        close: server.stop
    }
}

export function mergePages(builtPages: { pathname: string }[], pagesOption: PagesFunction | PagesMap) {
    const map: { [location: string]: Exclude<PagesEntry, null | undefined> } = {}
    if (typeof pagesOption === 'object') {
        for (const key in pagesOption) {
            if (key !== 'fallback') {
                const url = new URL(key, 'base://')
                const options = pagesOption[key as PagesKey]
                if (options !== null && options !== undefined) {
                    if (url.protocol === 'http:' || url.protocol === 'https:') {
                        map[url.href] = options
                    } else {
                        map[url.pathname.replace(/(?<=\/.*)\/+$/, '') + url.search] = options
                    }
                }
            }
        }
    }
    const locations = new Set<string>(Object.keys(map))

    for (const { pathname } of builtPages) {
        locations.add(new URL(pathname, 'base://').pathname.replace(/(?<=\/.*)\/+$/, ''))
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
            options.path = (url: URL) => {
                const pathname = url.pathname.replace(/\/+$/, '') || '/index'
                return path.replace('[pathname]', pathname)
            }
        }
        return options
    }
    return undefined
}

export function pathnameToFilepath(pathname: string, rootDir: string | URL) {
    const root = typeof rootDir === 'string' ? pathToFileURL(resolve(rootDir) + sep) : rootDir

    if (!pathname.startsWith('/') && !pathname.startsWith('\\')) {
        pathname = '/' + pathname
    }

    const url = new URL(pathname, 'file://')

    // ensure root is treated as a directory
    if (!root.pathname.endsWith('/')) {
        root.pathname += '/'
    }

    const location = new URL('.' + url.pathname, root)

    return fileURLToPath(location)
}

export function filepathToPathname(path: string, rootDir: string | URL) {
    const root = typeof rootDir === 'string' ? rootDir : fileURLToPath(rootDir)

    let pathname = relative(root, path)
    if (pathname.startsWith('./') || pathname.startsWith('.\\')) {
        pathname = pathname.substring(1)
    } else if (!pathname.startsWith('.') && !pathname.startsWith('/') && !pathname.startsWith('\\')) {
        pathname = '/' + pathname
    }
    return pathname.replaceAll(sep, '/')
}
