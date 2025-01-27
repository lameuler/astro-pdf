---
title: Getting Started
description: astro-pdf is an Astro integration to generate PDFs from pages on your site, or any other websites. Find out more about how to install and configure astro-pdf.
---

`astro-pdf` is an Astro integration to generate PDFs from pages on your site, or any other websites.

It uses [Puppeteer](https://pptr.dev) under the hood to generate PDFs from webpages, which is essentially like using Chrome to print PDFs of the pages, but automated.

`astro-pdf` runs whenever you build your static site, and runs after all your other pages are built by Astro so that you can generate PDF versions of the pages on your site.

## Install

To add `astro-pdf` to your Astro site, you can run the `astro add` command:

```sh
npx astro add astro-pdf
```

Follow the CLI prompts to install and add `astro-pdf` to your Astro configuration.

Or, manually install `astro-pdf` from [npm](https://www.npmjs.com/package/astro-pdf):

```sh
npm i astro-pdf
```

and add it to your Astro configuration file (e.g. `astro.config.mjs`).

```js
// @ts-check
import { defineConfig } from 'astro/config'

import pdf from 'astro-pdf'

// https://astro.build/config
export default defineConfig({
    integrations: [pdf(options)]
})
```

You can write your Astro config in typescript (`astro.config.ts`), or add `// @ts-check` to the top of your Astro config file to allow your IDE to provide better type hints while you are configuring `astro-pdf`.

Refer to the [Astro Integration Guide](https://docs.astro.build/en/guides/integrations-guide/) for more information on using integrations in Astro.

## Specify pages

You can specify the pages to generate PDFs for either in a map, or using a function.

### PagesMap

When defining pages in a [`PagesMap`](reference/pagesmap), you specify the pages you want to use — which can be either pathnames for pages in your site, or URLs for pages on other websites — and the options for the generated PDF(s).

```ts
const options = {
    pages: {
        '/': 'home.pdf',
        '/about': [
            true,
            'about.pdf',
            {
                path: '/path/to/file.pdf',
                ensurePath: true,
                throwOnFail: true,
                pdf: {
                    timeout: 10_000
                }
            }
        ],
        'https://example.com': {
            path: '/example.pdf',
            navTimeout: 45_000,
            isolated: true
        }
    }
}
```

Each page can map to 1 or more generated PDF. For more details on how to define options for each PDF, see the [`PagesEntry` documentation](reference/pagesentry).

### PagesFunction

Alternatively, you can use a [`PagesFunction`](reference/pagesfunction). It is mainly useful for dynamically specifying pages to use based on what pages there in your site.
For example, if you want to generate a PDF of every page in your site, or every page in a certain directory, you can use a `PagesFunction`.

The function will be called with each of the pathnames of the pages built by Astro in your site. The function should return the options for the generated PDF(s), just like the options that a page can map to in a `PagesMap`.

> [!TIP]
> The pathname will always have a leading slash, but may or may not have a trailing slash depending on the
> [`build.format`](https://docs.astro.build/en/reference/configuration-reference/#buildformat) option in your Astro config.

```ts
const options = {
    pages: (pathname) => {
        if (pathname.startsWith('/press/')) {
            return {
                path: pathname + '.pdf'
            }
        }
        if (pathname.startsWith('/brochure/')) {
            return [
                {
                    waitUntil: 'networkidle0',
                    pdf: {
                        format: 'A4',
                        printBackground: true
                    }
                },
                {
                    path: pathname + '-alt.pdf',
                    callback: async (page) => {
                        await page.evaluate(() => document.body.classList.add('alt'))
                    }
                }
            ]
        }
    }
}
```

You can use it directly, or as the `fallback` option in a [`PagesMap`](reference/pagesmap). Note that using a `PagesMap` is the only way to generate PDFs of other websites, as the `PagesFunction` is only called with pages within your site.

```ts
const options = {
    pages: {
        '/': true,
        'https://example.com': 'example.pdf',
        '/skipped': false,
        fallback: (pathname) => {
            if (pathname.startsWith('/blog/')) {
                return '/docs' pathname + '.pdf'
            }
        }
    }
}
```

If a page is already defined in the `PagesMap`, or is set to `false`, then it won't be passed to the `fallback` function.

## Configure pages

For each PDF you generated, you can configure various options about how the page is loaded and how the PDF is generated.

For more details on all the options for each page, see the [`PageOptions` documentation](reference/pageoptions).

### Output path

The output path is treated like a URL pathname, with the [output directory](https://docs.astro.build/en/reference/configuration-reference/#outdir) being treated like the root of the site.
The output path is like the pathname you will use to access the PDF file on your site (but without the [base path](https://docs.astro.build/en/reference/configuration-reference/#base)).
This means that it is not possible for `astro-pdf` to generate PDFs outside of your Astro output directory.

> [!TIP]
> If you need to change the output location of PDF files after they have been generated, you can use the [`runAfter` callback](reference/options#runafter).

The path can include `[pathname]`, which will be substituted for the pathname of the site. The substituted pathname will include a leading slash but not a trailing slash, and will be `/index` if the pathname is `/`.

The default path used by `astro-pdf` is `[pathname].pdf`.

The [`path` option](reference/pageoptions#path) can also be a callback to dynamically set the output path based on the loaded page and its URL.

```ts
const options = {
    pages: {
        '/': '/out.pdf'
        'https://en.wikipedia.org/wiki/Special:Random': 'wiki[pathname].pdf',
        'https://en.wikipedia.org/wiki/Special:RandomInCategory?wpcategory=Featured+articles': {
            async path(url, page) {
                return (await page.title())
                    .toLowerCase()
                    .replace(/wikipedia\s*$/, '')
                    .replaceAll(/[^a-z0-9\s]/g, '')
                    .trim()
                    .replaceAll(/\s+/g, '-') + '.pdf'
            },
        }
    }
}
```

### Callbacks

The [`preCallback`](reference/pageoptions#precallback) runs before the page is loaded, can be used, for example, to [set cookies](https://pptr.dev/api/puppeteer.browsercontext.setcookie) or [HTTP headers](https://pptr.dev/api/puppeteer.page.setextrahttpheaders).

> [!TIP]
> If you are setting cookies for a page, you may want to use the [`isolated` page option](reference/pageoptions#isolated)
> which will prevent the page from sharing cookies with other pages.

The [`callback`](reference/pageoptions#callback) runs after the page content is loaded, and before the PDF is generated. It can be used to modify the page contents, such as to [set the PDF title](modifying-pdfs.md#set-the-pdf-title), or to [force lazily loaded images to load](loading-images.md#lazily-loaded-images).

```ts
const pageOptions = {
    preCallback: async (page) => {
        await page.browserContext().setCookie(cookie)
        await page.setExtraHTTPHeaders({
            Authorization: 'Bearer ***'
        })
    },
    callback: async (page) => {
        await page.$$eval('a', (elements) => {
            for (const a of elements) {
                a.removeAttribute('href')
            }
        })
    }
}
```

Similar to the [`path` option](reference/pageoptions#path), the [`pdf` option](reference/pageoptions#pdf) can also be a callback to dynamically set the options for generating the PDF based on loaded page.

### Errors

By default, when `astro-pdf` encounters an error while loading and processing a page, it will log the error and continue handling other pages.

This includes failed web requests (e.g. `404 Page Not Found`), as well as runtime errors which occurred while Puppeteer was loading and processing the page (including timeouts).

You can set the [`throwOnFail` option](reference/pageoptions#throwonfail) to cause an error to be thrown when the page load fails, rather than just logging the error. This will cause `astro-pdf` to stop running and cause the Astro build. This option should be set to `true` if you want to ensure that your PDFs are all generated (and otherwise fail the Astro build to stop deployment).

You can also allow `astro-pdf` to retry loading and processing a page which had errors by setting the [`maxRetries` option](reference/pageoptions#maxretries). This can help to prevent errors relating to [generating a large number of PDFs](generating-many-pdfs.md).

### Base options

To specify default options for all pages, you can use the [`baseOptions` option](reference/options#baseoptions).

```ts
const options = {
    baseOptions: {
        path: '/pdfs[pathname].pdf',
        throwOnFail: true,
        pdf: {
            format: 'A4'
        }
    },
    pages: {
        '/': {
            throwOnFail: false,
            pdf: {
                format: 'A4',
                printBackground: true
            }
        },
        'https://example.com': true
    }
}
```

Any options which are specified in neither the `baseOptions` nor the options for the page will use the defaults from [`PageOptions`](reference/pageoptions).

> [!NOTE]
> Page options which are objects, like `pdf` and `viewport` will not be merged if specified in both `baseOptions` and for the page,
> and will instead be overriden.

## Other configuration options

To generate PDFs of pages within your Astro site, `astro-pdf` will start the Astro preview server whenever it runs.
You can disable this, or use a different server using the [`server` option](reference/options#server).

To configure the [Puppeteer `Browser` instance](https://pptr.dev/api/puppeteer.browser) before any pages are processed, you can use the [`browserCallback` option](reference/options#browsercallback).
There are also the [`runBefore`](reference/options#runbefore) and [`runAfter`](reference/options#runafter) callbacks which can be used to run things before and after `astro-pdf` runs.

```ts
import { fileURLToPath } from 'node:url'

const options = {
    browserCallback: async (browser) => {
        console.log(`running ${await browser.version()}`)
    },
    runBefore: (dir) => {
        console.log('astro-pdf has started running')
        console.log(`output directory: ${fileURLToPath(dir)}`)
    },
    runAfter: (dir, pathnames) => {
        console.log('astro-pdf has finished running')
        console.log(`generated ${pathnames.length} PDFs`)
    }
}
```

For more details on all of the configuration options for `astro-pdf`, refer to the [`Options` documentation](reference/options).

If you have a use case which is not covered by the options provided by `astro-pdf`, consider submitting a [feature request](https://github.com/lameuler/astro-pdf/issues/new?template=1-feature.yml).
