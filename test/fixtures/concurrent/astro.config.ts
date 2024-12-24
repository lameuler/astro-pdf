import { defineConfig } from 'astro/config'

import pdf, { PagesMap } from 'astro-pdf'

const N = 80

const url = 'https://en.wikipedia.org/wiki/Special:RandomInCategory?wpcategory=Featured+articles'

const pages: PagesMap = {
    [url]: Array(N)
        .fill(0)
        .map((_, i) => `random-${i}.pdf`)
}

export default defineConfig({
    integrations: [
        pdf({
            pages,
            baseOptions: {
                waitUntil: 'networkidle0',
                //maxRetries: 2
                //navTimeout: 0
                throwOnFail: true
            },
            maxConcurrent: null //40
        })
    ]
})
