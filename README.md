# astro-pdf

A simple Astro integration to generate PDFs from built pages.

This package is still under development and is not stable yet.

## Quickstart
Install and add `astro-pdf`:
```sh
npx astro add astro-pdf
```
and follow the CLI prompts.

## Example
```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import pdf from 'astro-pdf'

// https://astro.build/config
export default defineConfig({
    integrations: [
        pdf({
            // pages will receive the pathname of each page being built
            pages: path => {
                if (path === 'testing/') {
                    return { // return options for pages to be generated
                        path: 'testing.pdf', // output path
                        light: true, // set system theme to light
                        waitUntil: 'networkidle0', // for puppeteer page loading
                        pdf: { // puppeteer PDFOptions
                            format: 'A4',
                            printBackground: true
                        }
                    }
                }
            }
        })
    ]
});
```