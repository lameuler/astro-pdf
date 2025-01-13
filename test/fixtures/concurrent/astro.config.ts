import { defineConfig } from 'astro/config'

import pdf, { PagesMap } from 'astro-pdf'

const N = 80

const url = 'https://en.wikipedia.org/wiki/Special:RandomInCategory?wpcategory=Featured+articles'

const pages: PagesMap = {
    [url]: Array(N)
        .fill(0)
        .map(() => ({
            async path(url, page) {
                return (
                    (await page.title())
                        .toLowerCase()
                        .replace(/wikipedia\s*$/, '')
                        .replaceAll(/[^a-z0-9\s]/g, '')
                        .trim()
                        .replaceAll(/\s+/g, '-') + '.pdf'
                )
            },
            async callback(page) {
                if ((await page.title()).toLowerCase().includes('j')) {
                    await page.browser().close()
                }
            }
        })),
    'https://fake.example.com': 'fake.pdf'
}

export default defineConfig({
    integrations: [
        pdf({
            pages,
            baseOptions: {
                //throwOnFail: true,
                waitUntil: 'networkidle0'
                //maxRetries: 2
                //navTimeout: 0
            },
            maxConcurrent: 5
        })
    ]
})
