# astro-pdf

A simple Astro integration to generate PDFs from built pages.

This package is still under developement and is not stable yet.

## Example
```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import astroPdf from 'astro-pdf'

// https://astro.build/config
export default defineConfig({
    integrations: [
        astroPdf({
            // pages will receive the pathname of each page being built
            pages: path => {
                if (path === 'testing/') {
                    return { // return options for pages to be generated
                        path: 'testing.pdf', // output path
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