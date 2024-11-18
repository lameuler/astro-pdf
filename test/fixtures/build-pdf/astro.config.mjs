import { defineConfig } from 'astro/config'

import astroPdf from 'astro-pdf'

// https://astro.build/config
export default defineConfig({
    integrations: [
        astroPdf({
            install: true,
            pages: (path) => {
                if (path === '/testing/') {
                    return {
                        path: 'testing.pdf',
                        waitUntil: 'networkidle0',
                        callback: async (page) => {
                            await page.$eval('main', (main) => {
                                const doc = main.ownerDocument
                                const el = doc.createElement('span')
                                el.innerText = 'testing 123'
                                main.appendChild(el)
                            })
                        },
                        pdf: {
                            format: 'A4',
                            printBackground: true
                        }
                    }
                }
                if (path === '/testing2/') return {}
                if (path === '/testing3/') return true
            }
        }),
        astroPdf({
            pages: {
                testing: {
                    path: '../testing4.pdf',
                    pdf: { printBackground: true }
                },
                testing2: { path: 'testing3/testing4/testing5/testing6.pdf' },
                testing3: 'testing3/testing4/testing5/testing6.pdf',
                'index.html': undefined,
                'https://fake.example.com': 'fake.pdf',
                'https://ler.sg/to/fake.example.com': 'fake.pdf',
                'https://example.com': true,
                'https://developer.mozilla.org/404/page/not/found': true,
                'https://ler.sg/cv': { pdf: { printBackground: true } },
                'http://eu.ler.sg/resume': true,
                'http://ler.sg/to/ler.sg/cv': true,
                fallback: (pathname) => pathname === '/index.html'
            }
        })
    ]
})
