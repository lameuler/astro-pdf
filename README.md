# astro-pdf

[![CI](https://github.com/lameuler/astro-pdf/actions/workflows/ci.yml/badge.svg)](https://github.com/lameuler/astro-pdf/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/astro-pdf)](https://www.npmjs.com/package/astro-pdf)

Astro integration to generate PDFs from any webpage. Generate PDF versions of pages in your Astro site, or pages on external sites. Note that the PDFs will only be generated during builds and not when running the dev server.

## Quickstart

Install and add `astro-pdf`:

```sh
npx astro add astro-pdf
```

and follow the CLI prompts.

Or, manually install `astro-pdf`:

```sh
npm i -D astro-pdf
```

and add it to `astro.config.mjs` (see the example below).

See the [Astro Integrations Guide](https://docs.astro.build/en/guides/integrations-guide/) for more details.

## Example

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import pdf from 'astro-pdf'

// https://astro.build/config
export default defineConfig({
    integrations: [
        pdf({
            // specify base options as defaults for pages
            baseOptions: {
                path: '/pdf[pathname].pdf',
                waitUntil: 'networkidle2',
                maxRetries: 2,
                ...
            },
            // max number of pages to load at once
            maxConcurrent: 2,
            // pages will receive the pathname of each page being built
            pages: {
                '/some-page': '/pages/some.pdf', // output path
                '/other-page': true, // outputs to /other-page.pdf
                'https://example.com': [
                    {
                        path: 'example.pdf',
                        screen: true, // use screen media type instead of print
                        waitUntil: 'networkidle0', // for Puppeteer page loading
                        navTimeout: 40_000,
                        maxRetries: 0,
                        throwOnFail: true,
                        viewport: { // Puppeteer Viewport
                            width: 800,
                            height: 600,
                            // https://github.com/puppeteer/puppeteer/issues/3910
                            deviceScaleFactor: 3
                        }
                        pdf: { // Puppeteer PDFOptions
                            format: 'A4',
                            printBackground: true,
                            timeout: 20_000
                        },
                        isolated: true // do not share cookies with other pages
                    },
                    'basic-example.pdf'
                ],
                ...,
                fallback: (pathname) => ... // receives pathnames not specified above
            }
        })
    ]
});
```

See [`PagesMap`](#pagesmap) for a more detailed example on how pages are generated from the config.

## Reference

### `pdf()`

```ts
export default function pdf(options: Options): AstroIntegration {}
```

- **`options`**: [`Options`](#options)

    Configure `astro-pdf` and specify which pages to build to pdf.

### `Options`

```ts
export interface Options
```

- **`pages`**: [`PagesMap`](#pagesmap) | [`PagesFunction`](#pagesfunction)

    Specifies which pages in the site to convert to PDF and the options for each page.

- **`maxConcurrent`**: `number` | `null` _(optional)_

    Set the maximum number of pages to load and process at once. By default, all pages will be loaded in parallel, which may result in a Puppeteer navigation timeout if there are too many pages. If set to `null` or `undefined`, there will be no limit (which is the default behaviour).

- **`install`**: `boolean` | [`Partial<InstallOptions>`](https://pptr.dev/browsers-api/browsers.installoptions) _(optional)_

    Specifies whether to install a browser, or options to pass to Puppeteer [`install`](https://pptr.dev/browsers-api/browsers.install). By default, it will install the latest stable build of Chrome if `install` is truthy and the browser to install is not specified.

    If `install` is `false` or undefined, but no browser is found, it will automatically install a browser.

    See [Configuring Puppeteer](#configuring-puppeteer) for more information.

- **`launch`**: [`LaunchOptions`](https://pptr.dev/api/puppeteer.launchoptions) _(optional)_

    Options to pass to Puppeteer [`launch`](https://pptr.dev/api/puppeteer.puppeteernode.launch) for launching the browser.

- **`server`**: `((config: AstroConfig) => ServerOutput | Promise<ServerOutput>)` | `false` _(optional)_

    Function to launch a custom server which will be used to serve the built pages. By default, [`astro preview`](https://docs.astro.build/en/reference/cli-reference/#astro-preview) will be used. However, if you are using an adapter, you will likely need to use a custom server as currently only the [`@astrojs/node` adapter](https://docs.astro.build/en/guides/integrations-guide/node/) supports `astro preview`.

    ```ts
    export interface ServerOutput {
        url?: URL
        close?: () => unknown | Promise<unknown>
    }
    ```

    The `server` function will be called with the project's [Astro config](https://docs.astro.build/en/reference/configuration-reference/), and should return the URL of the server and optionally a function to close the server. Note that only the `origin` of the server URL will be used.

    This can also be set to `false` to not run any server. If `server` is set to `false` or returns no URL, then only pages with a full URL specified for the location in [`PagesMap`](#pagesmap) will work.

- **`baseOptions`**: [`Partial<PageOptions>`](#pageoptions) _(optional)_

    Default options to use for each page. Overrides the default options of [`PageOptions`](#pageoptions).

- **`runBefore`**: `(dir: URL) => void | Promise<void>` _(optional)_

    Callback to run before `astro-pdf` has started running anything, but after the Astro build has completed.
    The function will be called with the file URL of the output directory.

- **`runAfter`**: `(dir: URL, pathnames: string[]) => void | Promise<void>` _(optional)_

    Callback to run after `astro-pdf` has finishing running and has generated all the PDFs. The function will be called with the file URL of the output directory, and a list of the pathnames of the generated PDFs.

    The full file URL of each PDF can be resolved using the URL constructor:

    ```ts
    const pdfUrl = new URL(pathnames[0], dir)
    ```

- **`browserCallback`**: `(browser: Browser) => void | Promise<void>` _(optional)_

    Receives a Puppeteer [`Browser`](https://pptr.dev/api/puppeteer.browser) after it is launched. This can be used to configure the browser before any pages are processed.

### `PageOptions`

```ts
export interface PageOptions
```

Specifies options for generating each PDF. All options are optional when specifying pages in a [`PagesMap`](#pagesmap) or [`PagesFunction`](#pagesfunction). See [`PagesEntry`](#pagesentry) for more details.

- **`path`**: `string` | `((url: URL, page: Page) => string | Promise<string>)`

    Default: `'[pathname].pdf'`

    Specify the location where the PDF will be generated. This is treated like a `href` in the site, so absolute paths will be resolved relative to the root of the site. For example, `/path/to/file.pdf` and `path/to/file.pdf` are equivalent. If `path` contains certain special characters like `%`, you will need to encode those characters using [`encodeURI`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI) or [`encodeURIComponent`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent).

    If the path contains `[pathname]`, it will be substituted for the pathname of the page generated e.g. `/path/to/page` will be substituted into `[pathname].pdf` to get `/path/to/page.pdf`. If there are any redirects, the pathname will be the final location that is used to generate the PDF.

    `path` can also be a function which receives the final URL of the page and the Puppeteer [`Page`](https://pptr.dev/api/puppeteer.page). The function can return the path where the PDF will be generated as a string, or a Promise which will resolve to the path. The `url` parameter is equivalent to getting `new URL(page.url())`.

    If there is already a file with the same name, a counter suffix will be added to prevent overwriting the file. For example: `example.pdf` then `example-1.pdf` then `example-2.pdf`.

- **`screen`**: `boolean`

    Default: `false`

    Use the CSS `screen` [media type](https://developer.mozilla.org/en-US/docs/Web/CSS/@media#media_types) instead of the default `print`. This is set before `callback`.

- **`viewport`**: [`Viewport`](https://pptr.dev/api/puppeteer.viewport) _(optional)_

    Set the [viewport](https://pptr.dev/api/puppeteer.page.setviewport) for Puppeteer. This may be useful to set `deviceScaleFactor`. Read [this](https://github.com/puppeteer/puppeteer/issues/3910) Puppeteer issue for more info.

- **`waitUntil`**: [`PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[]`](https://pptr.dev/api/puppeteer.puppeteerlifecycleevent)

    Default: `'networkidle2'`

    Used when Puppeteer is loading the page in [`Page.goto`](https://pptr.dev/api/puppeteer.page.goto)

- **`navTimeout`**: `number` _(optional)_

    Set the [default navigation timeout](https://pptr.dev/api/puppeteer.page.setdefaultnavigationtimeout) (in milliseconds) for Puppeteer. The default used by Puppeteer is 30 seconds. This can be set to 0 to have no timeout.

- **`pdf`**: `PDFOptions | ((page: Page) => PDFOptions | Promise<PDFOptions>)`

    Default: `{}`

    Options to be passed to [`Page.pdf`](https://pptr.dev/api/puppeteer.page.pdf) to specify how the PDF is generated.

    `PDFOptions` type is declared like this: [`Omit<PuppeteerPDFOptions, 'path'>`](https://pptr.dev/api/puppeteer.pdfoptions)

    If you pass a callback, it will be called with the Puppeteer [`Page`](https://pptr.dev/api/puppeteer.page) once it is loaded. You can use this to define [dynamic page dimensions](https://github.com/lameuler/astro-pdf/issues/77).

- **`maxRetries`**: `number`

    Default: `0`

    The maximum number of times to retry loading and processing a page if there is an error.

- **`throwOnFail`**: `boolean`

    Default: `false`

    Set to throw errors encountered when loading and processing the page. This will cause the build of your site to fail when `astro-pdf` fails to generate the PDF for the page.

    By default, errors for failed pages will be logged and the build will still successfully complete.

- **`isolated`**: `boolean`

    Default: `false`

    If `isolated` is set to `true`, a new [`BrowserContext`](https://pptr.dev/api/puppeteer.browsercontext) will be created every time the page is loaded.

    This is like opening the page in a new incognito window, and `isolated` pages will not share any cookies or cache with the other pages.

    Otherwise, all other pages (with `isolated: false`) will be opened in the same browser context.

- **`preCallback`**: `(page: Page) => void | Promise<void>` _(optional)_

    Receives a Puppeteer [`Page`](https://pptr.dev/api/puppeteer.page) before any navigation is done. This can be used, for example, to set the [user agent](https://pptr.dev/api/puppeteer.page.setuseragent), or [HTTP headers](https://pptr.dev/api/puppeteer.page.setextrahttpheaders) for the request.

- **`callback`**: `(page: Page) => void | Promise<void>` _(optional)_

    Receives a Puppeteer [`Page`](https://pptr.dev/api/puppeteer.page) after the page has loaded. This callback is run before the PDF is generated.

### `PagesEntry`

```ts
export type PagesEntry = Partial<PageOptions> | string | boolean | null | undefined | void
```

If `PagesEntry` is truthy, `astro-pdf` will try to resolve options and generate the page. Any missing options will inherit from the `baseOptions` if given, otherwise the default options of [`PageOptions`](#pageoptions) will be used.

If `PagesEntry` is a `string`, it will be used as the `path` value. If it is `true`, then the page will be generated completely using the base or default options.

### `PagesFunction`

```ts
export type PagesFunction = (pathname: string) => PageEntry | PageEntry[]
```

Will be called with pathnames of the pages generated by astro. The pathnames are normalised to have a leading slash. Whether the pathnames have a trailing slash will depend on [build.format](https://docs.astro.build/en/reference/configuration-reference/#buildformat) in Astro config.

**Example:**

```js
{
    pages: (pathname) => {
        if (pathname === '/specific/page') {
            return {
                path: 'specific-page.pdf',
                light: true
            }
        }
        if (pathname.startsWith('/documents/')) {
            return pathname.replace(/^\/documents/, '/generated')
        }
    }
}
```

### `PagesMap`

```ts
export type PagesMap = Record<string, PagesEntry | PagesEntry[]> & {
    fallback?: PagesFunction
}
```

Specify locations. Locations should be an absolute pathname or a full URL.

Optionally provide a `fallback` function which will be called with the pathnames of pages generated by astro which are not already in the map.

If the pathname is in the map, but the `PagesEntry` for that pathname is `null`, `undefined`, or an empty array, it will still be passed to the `fallback` function. Only routes generated by astro will be passed into `fallback`. If `PagesEntry` for a pathname is `false`, then the page is skipped.

If any error is encountered when loading the location, the page will be skipped.

**Example:**

```js
{
    pages: {
        'https://example.com': 'example.pdf',
        '/specific/page': [
            {
                path: 'specific-page.pdf'
            },
            {
                path: 'specific-page-screen.pdf',
                screen: true,
                pdf: {
                    printBackground: true
                }
            }
        ],
        '/documents/dynamic': false, // will not be passed to fallback
        fallback: (pathname) => {
            if (pathname.startsWith('/documents/')) {
                return pathname.replace(/^\/documents/, '/generated')
            }
        }
    }
}
```

Given the following project structure:

```
pages/
├── documents/
│   ├── index.astro
│   ├── static1.astro
│   ├── static2.astro
│   └── dynamic.astro
├── specific/
│   └── page.astro
└── other/
    └── page.astro
```

The above config will generate:

```
example.pdf
specific-page.pdf
specific-page-screen.pdf
generated/
├── static1.pdf
└── static2.pdf
```

with the `fallback` function being called with:

```
/documents
/documents/static1
/documents/static2
/other/page
```

## Configuring Puppeteer

`astro-pdf` relies on [Puppeteer](https://pptr.dev) to generate PDFs. By default, installing `astro-pdf` will install `puppeteer`, which will automatically install a recent version of Chrome for Testing. To prevent this, add a [Puppeteer Configuration File](https://pptr.dev/guides/configuration/#configuration-files) and set `skipDownload` to `true`. Then, you can set [`Options.install`](#options) to specify a specific browser version to install.

### Linux

On newer Linux distros like Ubuntu 23.10+, you may run into a `No usable sandbox!` error. This will likely be the case if you are building your site using the `ubuntu-latest` GitHub Actions runner.

To fix this, you can create an AppArmor profile to allow Puppeteer's installations of chrome to run.

```bash
sudo tee /etc/apparmor.d/chrome-dev-builds <<EOF
abi <abi/4.0>,
include <tunables/global>

# default executable location for puppeteer
profile chrome $HOME/.cache/puppeteer/chrome/*/chrome-linux64/chrome flags=(unconfined) {
    userns,

    # Site-specific additions and overrides. See local/README for details.
    include if exists <local/chrome>
}

# if you are installing other versions using the install option
profile chrome-local $PWD/node_modules/.astro/chrome/*/chrome-linux64/chrome flags=(unconfined) {
    userns,

    # Site-specific additions and overrides. See local/README for details.
    include if exists <local/chrome>
}
EOF
sudo apparmor_parser -r /etc/apparmor.d/chrome-dev-builds
sudo service apparmor reload
```

You may need to change the target path of the profile depending on where Puppeteer has installed chrome.

For more information and options, refer to the [Chromium Docs](https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md).

Alternatively, for GitHub Actions, use the `ubuntu-22.04` runner instead.

### Windows

If Puppeteer times out after calling `Page.pdf` on Windows, it may be due to [sandbox errors](https://pptr.dev/troubleshooting#chrome-reports-sandbox-errors-on-windows).

To address this, you can run the following command in command prompt if you are using the default installation of Chrome.

```
icacls "%USERPROFILE%/.cache/puppeteer/chrome" /grant *S-1-15-2-1:(OI)(CI)(RX)
```

Or, if you have set `Options.install`, run:

```
icacls "<cacheDir>/chrome" /grant *S-1-15-2-1:(OI)(CI)(RX)
```

with the specified cacheDir (defaults to Astro's cacheDir of `node_modules/.astro`).

Refer to the [Puppeteer Troubleshooting Guide](https://pptr.dev/troubleshooting) if there are any other issues.
