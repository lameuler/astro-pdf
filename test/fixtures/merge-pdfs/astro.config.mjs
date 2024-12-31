// @ts-check
import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'astro/config'
import PDFMerger from 'pdf-merger-js'

import pdf from 'astro-pdf'

// https://astro.build/config
export default defineConfig({
    integrations: [
        pdf({
            pages: {
                '/': true,
                page1: true,
                page2: true,
                'https://en.wikipedia.org/wiki/HTML': 'html.pdf'
            },
            runBefore: () => {},
            runAfter: async (dir) => {
                const pages = ['index.pdf', 'page1.pdf', 'html.pdf', 'page2.pdf'].map((file) =>
                    fileURLToPath(new URL(file, dir))
                )

                const merger = new PDFMerger()

                for (const page of pages) {
                    await merger.add(page)
                }
                await merger.setMetadata({
                    title: 'Merged pages'
                })

                await merger.save(fileURLToPath(new URL('merged.pdf', dir)))

                await Promise.all(
                    pages.map((page) => {
                        // return the promise
                        return rm(page)
                    })
                )
            }
        })
    ]
})
