# astro-pdf

[![CI](https://github.com/lameuler/astro-pdf/actions/workflows/ci.yml/badge.svg)](https://github.com/lameuler/astro-pdf/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/astro-pdf)](https://www.npmjs.com/package/astro-pdf)

Astro integration to generate PDFs from any webpage. Generate PDF versions of pages in your Astro site, or pages on external sites. Note that the PDFs will only be generated during builds and not when running the dev server.

Read the documentation at [ler.quest/astro-pdf](https://ler.quest/astro-pdf/).

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
