# astro-pdf

[![CI](https://github.com/lameuler/astro-pdf/actions/workflows/ci.yml/badge.svg)](https://github.com/lameuler/astro-pdf/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/astro-pdf.svg)](https://badge.fury.io/js/astro-pdf)

A simple Astro integration to generate PDFs from built pages.

> [!IMPORTANT]
> This documentation is for `astro-pdf@1.0.0` which is not released yet.

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
            // specify base options as defaults for options pages dont return
            baseOptions: {
                path: '/pdf[pathname].pdf',
                waitUntil: 'networkidle2',
                ...
            },
            // pages will receive the pathname of each page being built
            pages: {
                '/some-page': '/pages/some.pdf', // output path
                '/other-page': true,
                'https://example.com': {
                    path: 'example.pdf',
                    light: true, // set system theme to light
                    waitUntil: 'networkidle0', // for puppeteer page loading
                    pdf: { // puppeteer PDFOptions
                        format: 'A4',
                        printBackground: true
                    }
                },
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

- **`install`**: `boolean` | [`Partial<InstallOptions>`]() _(optional)_

  Specifies whether to install a browser, or options to pass to Puppeteer [`install`](https://pptr.dev/browsers-api/browsers.install). By default, it will install the latest stable build of Chrome if `install` is truthy and the browser to install is not specified.

  If `install` is `false` or undefined, but no browser is found, it will automatically install a browser.

- **`launch`**: [`PuppeteerLaunchOptions`](https://pptr.dev/api/puppeteer.puppeteerlaunchoptions) _(optional)_
  
  Options to pass to Puppeteer [`launch`](https://pptr.dev/api/puppeteer.puppeteernode.launch) for launching the browser.
  
- **`baseOptions`**: [`Partial<PageOptions>`](#pageoptions) _(optional)_

  Default options to use for each page. Overrides the default options of [`PageOptions`](#pageoptions).


### `PageOptions`
```ts
export interface PageOptions
```

Specifies options for generating each PDF.

- **`path`**: `string`

  Default: `'[pathname].pdf'`

  Specify the location where the PDF will be generated. This is treated like a `href` in the site, so it absolute paths will be resolved relative to the root of the site.

  If the path contains `[pathname]`, it will be substitued for the pathname of the page generated e.g. `/path/to/page`.

- **`light`**: `boolean`

  Default: `false`

  Set whether to set [`prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) to `light` before the PDF is generated. This is run before `callback`.

- **`waitUntil`**: [`PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[]`]()
  
  Default: `'networkidle2'`

  Used when Puppeteer is loading the page in [`Page.goto`](https://pptr.dev/api/puppeteer.page.goto)

- **`pdf`**: [`Omit<PDFOptions, 'path'>`](https://pptr.dev/api/puppeteer.page)

  Options to  be passed to [`Page.pdf`](https://pptr.dev/api/puppeteer.page.pdf) to specify how the PDF is generated.

- **`callback`**: `(page: Page) => any`  _(optional)_

  Receives a Puppeteer [`Page`]() after the page has loaded. This callback is run before the PDF is generated.

### `PagesEntry`
```ts
export type PagesEntry = Partial<PageOptions> | string | boolean | null | undefined | void
```

If `PagesEntry` is truthy, `astro-pdf` will try to resolve options and generate the page. Any missing options will inherit from the `baseOptions` if given, otherwise the default options will be used.

If `PagesEntry` is a `string`, it will be used as the `path` value. If it is `true`, then the page will be generated completely using the base or default options.

### `PagesFunction`
```ts
export type PagesFunction = (pathname: string) => PageEntry
```

Will be called with pathnames of the pages generated by astro. The pathnames are normalised to have a leading slash and no trailing slash.

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
export type PagesMap = {
    [location: PagesKey]: PagesEntry
    fallback?: PagesFunction
}
export type PagesKey = `/${string}` | `http://${string}` | `https://${string}`
```

Specify locations\. Locations should be an absolute pathname or a full url.

Optionally provide a `fallback` function which will be called with the pathnames of pages generated by astro which are not already in the map.

If the pathname is in the map, but the `PagesEntry` for that pathname is `null` or `undefined`, it will still be passed to the `fallback` function. If `PagesEntry` for a pathname is `false`, then the page is skipped.

**Example:**

```js
{
    pages: {
        'https://example.com': 'example.pdf',
        '/specific/page': {
            path: 'specific-page.pdf',
            light: true
        },
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