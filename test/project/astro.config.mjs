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
