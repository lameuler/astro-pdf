import type { InstallOptions } from '@puppeteer/browsers'
import type { AstroConfig } from 'astro'
import type {
    Page,
    PDFOptions as PuppeteerPDFOptions,
    LaunchOptions,
    PuppeteerLifeCycleEvent,
    Viewport,
    Browser
} from 'puppeteer'

/**
 * Specifies options for `astro-pdf`.
 */
export interface Options {
    /**
     * Specifies which pages in the site to convert to PDF and the options for each page.
     *
     * @remarks
     * This is the only required option.
     */
    pages: PagesFunction | PagesMap
    /**
     * Set the maximum number of pages to load and process at once.
     *
     * @remarks
     * By default, all pages will be loaded in parallel, which may result in a Puppeteer navigation timeout if there are too many pages.
     * If set to `null` or `undefined`, there will be no limit (which is the default behaviour).
     */
    maxConcurrent?: number | null
    /**
     * Specifies whether to install a browser, or options to pass to {@link https://pptr.dev/browsers-api/browsers.install | Puppeteer `install`}
     *
     * @remarks
     * By default, it will install the latest stable build of Chrome if `install` is truthy and the browser to install is not specified.
     *
     * If `install` is `false` or `undefined`, but no browser is found, it will automatically install a browser.
     */
    install?: boolean | Partial<InstallOptions>
    /**
     * Options to pass to {@link https://pptr.dev/api/puppeteer.puppeteernode.launch | Puppeteer `launch`} for launching the browser.
     */
    launch?: LaunchOptions
    /**
     * Function to launch a custom server which will be used to serve the built pages.
     *
     * @remarks
     * By default, {@link https://docs.astro.build/en/reference/cli-reference/#astro-preview | `astro preview` } will be used.
     * However, if you are using an adapter, you will likely need to use a custom server as currently only the {@link https://docs.astro.build/en/guides/integrations-guide/node/ | `@astrojs/node` adapter} supports `astro preview`.
     *
     * The `server` function will be called with the project's {@link https://docs.astro.build/en/reference/configuration-reference/ | Astro config}.
     *
     * This can also be set to `false` to not run any server. If `server` is set to `false` or returns no URL, then only pages with a full URL specified for the location in {@link PagesMap | `PagesMap`} will work.
     * 
     * @returns
     * The URL of the server, and optionally a function to close the server. Note that only the origin of the URL will be used.
     */
    server?: ((config: AstroConfig) => ServerOutput | Promise<ServerOutput>) | false
    /**
     * Set to `false` to prevent `astro-pdf` from throwing any errors.
     *
     * @remarks
     * This will cause `astro-pdf` to exit gracefully when it encounters errors, instead of the default behaviour of causing the whole Astro build to fail.
     */
    throwErrors?: boolean
    /**
     * Default options to use for each page.
     *
     * @remarks
     * This will override the default options of {@link PageOptions | `PageOptions`}.
     */
    baseOptions?: Partial<PageOptions>
    /**
     * Callback to run before `astro-pdf` has started running anything, but after the Astro build has completed.
     *
     * @remarks
     * The function will be called with the file URL of the output directory.
     *
     * @param dir - The file URL of the output directory
     */
    runBefore?: (dir: URL) => void | Promise<void>
    /**
     * Callback to run after `astro-pdf` has finishing running and has generated all the PDFs.
     *
     * @remarks
     * The function will be called with the file URL of the output directory, and a list of the pathnames of the generated PDFs.
     *
     * The full file URL of each PDF can be resolved using the URL constructor:
     *
     * ```ts
     * const pdfUrl = new URL(pathnames[0], dir)
     * ```
     *
     * @param dir - The file URL of the output directory
     * @param pathnames - Array of the pathnames of PDF files generated
     */
    runAfter?: (dir: URL, pathnames: string[]) => void | Promise<void>
    /**
     * Receives the {@link https://pptr.dev/api/puppeteer.browser | Puppeteer `Browser`} after it is launched.
     *
     * @remarks
     * This can be used to configure the browser before any pages are processed.
     *
     * @param browser - The {@link https://pptr.dev/api/puppeteer.browser | Puppeteer `Browser`} used by `astro-pdf`
     */
    browserCallback?: (browser: Browser) => void | Promise<void>
}

/**
 * Defines the options for generating a single PDF file in a {@link PagesMap | `PagesMap`} or {@link PagesFunction | `PagesFunction`}.
 *
 * @remarks
 * This is a type alias to allow more flexibility when defining page options.
 *
 * `PagesEntry` can be an object to specify {@link PageOptions | `PageOptions`}.
 * Any missing options will inherit from the {@link Options.baseOptions | `baseOptions`} if given, otherwise the default options of `PageOptions` will be used.
 *
 * If a `PagesEntry` is a `string`, it will be used as the {@link PageOptions.path | `path`} option.
 *
 * If it is `true`, then the page will be generated completely using the base or default options.
 *
 * If it is falsy (i.e. `null`, `undefined`, or `false`), then it will be ignored and no PDF file will be generated.
 */
export type PagesEntry = Partial<PageOptions> | string | boolean | null | undefined | void

/**
 * Defines the pages generated by `astro-pdf` using a callback, rather than listing all the pages in {@link PagesMap | `PagesMap`}.
 *
 * @remarks
 * The callback will be called with each of the pathnames of the pages generated by Astro, and should return the options of the PDF file(s) to generate.
 * If the return value is falsy, then no PDF files will be generated for that page. See {@link PagesEntry | `PagesEntry`} for more details.
 *
 * The pathnames are normalised to have a leading slash. Whether the pathnames have a trailing slash will depend on {@link https://docs.astro.build/en/reference/configuration-reference/#buildformat | `build.format`} in your Astro config.
 *
 * Using `PagesFunction` alone will only allow generated PDF files from pages which are within your Astro site.
 * For more flexibility, instead use the `fallback` option in {@link PagesMap | `PagesMap`} to define a `PagesFunction` in addition to the other locations, which can include other websites.
 *
 * @example
 * ```js
 * {
 *     pages: (pathname) => {
 *         if (pathname === '/specific/page') {
 *             return {
 *                 path: 'specific-page.pdf',
 *                 light: true
 *             }
 *         }
 *         if (pathname.startsWith('/documents/')) {
 *             return pathname.replace(/^\/documents/, '/generated')
 *         }
 *     }
 * }
 * ```
 */
export type PagesFunction = (pathname: string) => PagesEntry | PagesEntry[]

/**
 * Specifies the locations of pages to use for generating PDF files.
 *
 * @remarks
 * The locations can be absolute pathnames to use pages within your Astro site, or full URLs for using other websites.
 *
 * Optionally provide a `fallback` {@link PagesFunction | `PagesFunction`} which will be called with the pagenames of pages generated by Astro which are not already in the map.
 *
 * If the pathname is in the map, but the maps to `null`, `undefined`, or an empty array, it will treated as if it is not in the map, meaning the pathname will still be passed to `fallback`. If the pathname maps to `false`, then the page is skipped.
 *
 * @example
 * ```js
 * {
 *     pages: {
 *         'https://example.com': 'example.pdf',
 *         '/specific/page': [
 *             {
 *                 path: 'specific-page.pdf'
 *             },
 *             {
 *                 path: 'specific-page-screen.pdf',
 *                 screen: true,
 *                 pdf: {
 *                     printBackground: true
 *                 }
 *             }
 *         ],
 *         '/documents/dynamic': false, // will not be passed to fallback
 *         fallback: (pathname) => {
 *             if (pathname.startsWith('/documents/')) {
 *                 return pathname.replace(/^\/documents/, '/generated')
 *             }
 *         }
 *     }
 * }
 * ```
 *
 * Given the following project structure:
 *
 * ```
 * pages/
 * ├── documents/
 * │   ├── index.astro
 * │   ├── static1.astro
 * │   ├── static2.astro
 * │   └── dynamic.astro
 * ├── specific/
 * │   └── page.astro
 * └── other/
 *     └── page.astro
 * ```
 *
 * The above config will generate:
 *
 * ```
 * example.pdf
 * specific-page.pdf
 * specific-page-screen.pdf
 * generated/
 * ├── static1.pdf
 * └── static2.pdf
 * ```
 *
 * with the `fallback` function being called with:
 *
 * ```
 * /documents
 * /documents/static1
 * /documents/static2
 * /other/page
 * ```
 */
export type PagesMap = Record<string, PagesEntry | PagesEntry[]> & {
    fallback?: PagesFunction
}

/**
 * Specifies options for generating each PDF.
 *
 * @remarks
 * All options are optional when specifying pages in a {@link PagesMap | `PagesMap`} or {@link PagesFunction | `PagesFunction`}.
 * See {@link PagesEntry | `PagesEntry`} for more details.
 *
 * {@link Options.baseOptions | `baseOptions`} can be used to specify options to apply to all pages, otherwise the default options will be used for options which are not specified.
 */
export interface PageOptions {
    /**
     * Specify the location where the PDF will be generated.
     *
     * @remarks
     * This is treated like a `href` within the site, so absolute paths will be resolved relative to the root of the site.
     * For example, `/path/to/file.pdf` and `path/to/file.pdf` are equivalent.
     * If `path` contains certain special characters like `%`, you will need to encode those characters using {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI | `encodeURI`} or {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent | `encodeURIComponent`}.
     *
     * If the path contains `[pathname]`, it will be substituted for the pathname of the page generated e.g. `/path/to/page` will be substituted into `[pathname].pdf` to get `/path/to/page.pdf`.
     * If there are any redirects, the pathname will be the final location that is used to generate the PDF.
     *
     * `path` can also be a function which receives the final URL of the page and the {@link https://pptr.dev/api/puppeteer.page | Puppeteer `Page`}.
     * The function can return the path where the PDF will be generated as a string, or a Promise which will resolve to the path.
     * The `url` parameter is equivalent to getting `new URL(page.url())`.
     *
     * If there is already a file with the same name, a counter suffix will be added to prevent overwriting the file.
     * For example: `example.pdf` then `example-1.pdf` then `example-2.pdf`.
     *
     * @defaultValue `'[pathname].pdf'`
     */
    path: string | ((url: URL, page: Page) => string | Promise<string>)
    /**
     * Set to `true` to ensure that the output path of the file is the same as the `path` option.
     *
     * @remarks
     * This will prevent `astro-pdf` from adding the counter suffix if there is a file with the same name, and will instead cause the processing of that page to fail.
     *
     * @defaultValue `false`
     */
    ensurePath?: boolean
    /**
     * Use the CSS {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@media#media_types | `screen` media type} instead of the default `print`.
     *
     * @remarks
     * This is set before `callback` is run.
     *
     * @defaultValue `false`
     */
    screen: boolean
    /**
     * Used when Puppeteer is loading the page in {@link https://pptr.dev/api/puppeteer.page.goto | `Page.goto`}.
     *
     * @defaultValue `'networkidle2'`
     */
    waitUntil: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[]
    /**
     * {@link https://pptr.dev/api/puppeteer.page.setviewport | Set the viewport} for Puppeteer.
     *
     * @remarks
     * This may be useful to set `deviceScaleFactor`.
     * Read {@link https://github.com/puppeteer/puppeteer/issues/3910 | this Puppeteer issue} for more info.
     */
    viewport?: Viewport
    /**
     * {@link https://pptr.dev/api/puppeteer.page.setdefaultnavigationtimeout | Set the default navigation timeout} (in milliseconds) for Puppeteer.
     *
     * @remarks
     * The default used by Puppeteer is 30 seconds. This can be set to 0 to have no timeout.
     */
    navTimeout?: number
    /**
     * Options to be passed to Puppeteer to specify how the PDF should be generated.
     *
     * @remarks
     * If you pass a callback, it will be called with the {@link https://pptr.dev/api/puppeteer.page | Puppeteer `Page`} once it is loaded.
     * You can use this to define {@link https://github.com/lameuler/astro-pdf/issues/77 | dynamic page dimensions}.
     *
     * @defaultValue `{}`
     */
    pdf: PDFOptions | ((page: Page) => PDFOptions | Promise<PDFOptions>)
    /**
     * The maximum number of times to retry loading and processing a page if there is an error.
     *
     * @defaultValue `0`
     */
    maxRetries?: number
    /**
     * Set to throw errors encountered when loading and processing the page.
     *
     * @remarks
     * This will cause the build of your site to fail when `astro-pdf` fails to generate the PDF for the page if {@link Options.throwErrors | `Options.throwErrors`} is set to `true` (which is the default).
     *
     * By default, errors for failed pages will be logged and the Astro build will still successfully complete.
     *
     * @defaultValue `false`
     */
    throwOnFail?: boolean
    /**
     * If set to `true`, a new {@link https://pptr.dev/api/puppeteer.browsercontext | `BrowserContext`} will be created every time the page is loaded.
     *
     * @remarks
     * This is like opening the page in a new incognito window, and `isolated` pages will not share any cookies or cache with the other pages.
     *
     * Otherwise, all other pages (with `isolated: false`) will be opened in the same browser context.
     *
     * @defaultValue `false`
     */
    isolated?: boolean
    /**
     * Receives a {@link https://pptr.dev/api/puppeteer.page | Puppeteer `Page`} before any navigation is done.
     *
     * @remarks
     * This can be used, for example, to {@link https://pptr.dev/api/puppeteer.page.setuseragent | set the user agent}, or {@link https://pptr.dev/api/puppeteer.page.setextrahttpheaders | HTTP headers} for the request.
     *
     * @param page - The {@link https://pptr.dev/api/puppeteer.page | Puppeteer `Page`}
     */
    preCallback?: (page: Page) => void | Promise<void>
    /**
     * Receives a {@link https://pptr.dev/api/puppeteer.page | Puppeteer `Page`} after the page has loaded.
     *
     * @remarks
     * This callback is run before the PDF is generated.
     *
     * This can be used to modify the loaded page before generated the PDF, for example to remove certain elements, or {@link https://ler.quest/astro-pdf/loading-images/#lazily-loaded-images | eagerly load all images}
     *
     * @param page - The {@link https://pptr.dev/api/puppeteer.page | Puppeteer `Page`}
     */
    callback?: (page: Page) => void | Promise<void>
}

/**
 * Options to pass to {@link https://pptr.dev/api/puppeteer.page.createpdfstream | Puppeteer's `page.createPDFStream()`} function.
 * 
 * @remarks
 * The `path` property is omitted as it is unused. To specify the output path of PDF files, use the {@link PageOptions.path | `path` page option}.
 */
export type PDFOptions = Omit<PuppeteerPDFOptions, 'path'>

/**
 * The return type of the {@link Options.server | `server` option}.
 */
export interface ServerOutput {
    url?: URL
    close?: () => unknown | Promise<unknown>
}

export const defaultPageOptions = {
    path: '[pathname].pdf',
    ensurePath: false,
    screen: false,
    waitUntil: 'networkidle2',
    pdf: {},
    maxRetries: 0,
    throwOnFail: false,
    isolated: false
} satisfies PageOptions

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
