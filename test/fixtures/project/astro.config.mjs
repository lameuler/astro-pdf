import { defineConfig } from 'astro/config';
import astroPdf from 'astro-pdf'

// https://astro.build/config
export default defineConfig({
    integrations: [
        astroPdf({
            pages: path => {
                if (path === 'testing/') {
                    return {
                        path: 'testing.pdf',
                        waitUntil: 'networkidle0',
                        callback: async page => {
                            await page.$eval('main', main => {
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
            }
        })
    ]
});
