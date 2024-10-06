import { detectBrowserPlatform, install, resolveBuildId, Browser, type InstallOptions } from '@puppeteer/browsers'
import { resolve, sep } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { $, type ProcessPromise } from 'zx'
import { PageOptions, PagesEntry, PagesFunction, PagesKey, PagesMap } from './integration'

export async function installBrowser(options: Partial<InstallOptions>, defaultCacheDir: string) {
    const browser = options.browser ?? Browser.CHROME
    const buildId = options.buildId ?? await resolveBuildId(browser, detectBrowserPlatform()!!, 'stable')
    const installOptions: InstallOptions = {
        ...options,
        browser,
        buildId,
        cacheDir: options.cacheDir ?? defaultCacheDir
    }
    // cast to any to handle overloading of install (theres probably a better way to do this)
    const installed = await install(installOptions as any)
    return installed.executablePath
}

export type AstroPreviewResult = {
    url: URL,
    close: () => Promise<void>
}

export function astroPreview(options: { debug?: (message: string) => any, root?: string, timeout?: number } = {}): Promise<AstroPreviewResult | undefined> {
    const { debug, root, timeout } = options

    debug?.('starting astro preview server')
    const proc = $({ cwd: root })`npx astro preview`

    return new Promise(async (resolve) => {
        const tid = setTimeout(() => resolve(undefined), timeout ?? 5000)

        for await (const chunk of proc.stdout) {
            const text: string = chunk.toString('utf8')
    
            // look for server url
            const m = text.match(/https?:\/\/[\w\-.]+:\d+/)
            if (m) {
                try {
                    const url = new URL(m[0])
                    debug?.(`started astro preview server at ${url.href}`)
    
                    // function to end astro preview process
                    const close = async function () {
                        debug?.('closing astro preview server')
                        if (! await kill(proc, 'SIGTERM', 1000)) {
                            debug?.('killing server with SIGKILL')
                            await kill(proc, 'SIGKILL')
                        }
                        debug?.('successfully closed astro preview server')
                    }
    
                    clearTimeout(tid)
                    resolve({ url, close })
                } catch (e) {
                    debug?.(`failed to parse ${m[0]}. continuing to listen for server url`)
                }
            }
        }
    })
}

async function kill(proc: ProcessPromise, signal: NodeJS.Signals, timeout?: number) {
    return new Promise<boolean>((resolve, reject) => {
        const t = timeout !== undefined ? setTimeout(() => resolve(false), timeout) : -1
        proc.catch(p => {
            if(p.signal === signal) {
                clearTimeout(t)
                resolve(true)
            } else {
                clearTimeout(t)
                reject(p)
            }
        })
        proc.kill(signal)
    })
}

export function mergePages(builtPages: { pathname: string }[], pagesOption: PagesFunction | PagesMap) {

    const map: { [location: string]: PagesEntry } = {}
    if (typeof pagesOption === 'object') {
        for (const key in pagesOption) {
            if (key !== 'fallback') {
                const url = new URL(key, 'base://')
                if (url.protocol === 'http:' || url.protocol === 'https:') {
                    map[url.href] = pagesOption[key as PagesKey]
                } else {
                    map[url.pathname.replace(/(?<=\/.*)\/+$/, '') + url.search] = pagesOption[key as PagesKey]
                }
            }
        }
    }
    const locations = new Set<string>(Object.keys(map))

    for (const { pathname } of builtPages) {
        locations.add(new URL(pathname, 'base://').pathname.replace(/(?<=\/.*)\/+$/, ''))
    }

    const fallback = (typeof pagesOption === 'function' ? pagesOption : pagesOption.fallback) ?? function(){}

    return { map, fallback, locations: Array.from(locations) }
}

export function getPageOptions(location: string, baseOptions: PageOptions, map: { [location: string]: PagesEntry }, fallback: PagesFunction) {
    const pageOptions = map[location] ?? fallback(location)
    if (pageOptions) {
        const partial = typeof pageOptions === 'object' ? pageOptions : typeof pageOptions === 'string' ? { path: pageOptions } : {}
        const options = {
            ...baseOptions,
            ...partial
        }
        const pathname = new URL(location, 'base://').pathname.replace(/\/+$/, '') || '/index'
        options.path = options.path.replace('[pathname]', pathname)
        return options
    }
    return undefined
}

export function resolvePathname(pathname: string, rootDir: string | URL) {
    const root = (typeof rootDir === 'string') ? pathToFileURL(resolve(rootDir)+sep) : rootDir
    
    if (!pathname.startsWith('/') && !pathname.startsWith('\\')) {
        pathname = '/' + pathname
    }

    const url = new URL(pathname, 'file://')

    // ensure root is treated as a directory
    if (!root.pathname.endsWith('/')) {
        root.pathname += '/'
    }

    const location = new URL('.'+url.pathname, root)

    return {
        path: fileURLToPath(location),
        pathname: url.pathname
    }
}