// @ts-check
import atlas from '@lameuler/atlas'
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
    site: 'https://ler.quest',
    base: 'astro-pdf',
    server: {
        port: 2050
    },
    integrations: [
        atlas({
            name: 'astro-pdf',
            github: 'astro-pdf',
            sidebar: [
                {
                    name: 'Guides',
                    pages: [
                        '/',
                        'loading-images',
                        'generating-many-pdfs',
                        'configuring-puppeteer',
                        'modifying-pdfs',
                        'troubleshooting'
                    ]
                }
            ],
            reference: {
                entries: ['../src/index.ts'],
                tsconfig: '../tsconfig.json',
                resolveLink(id) {
                    const mod = id.toDeclarationReference().moduleSource
                    switch (mod) {
                        case 'puppeteer':
                            return `https://pptr.dev/api/puppeteer.${id.qualifiedName.toLowerCase()}`
                        case '@puppeteer/browsers':
                            return `https://pptr.dev/browsers-api/browsers.${id.qualifiedName.toLowerCase()}`
                        case 'astro': {
                            if (id.qualifiedName === 'AstroConfig') {
                                return 'https://docs.astro.build/en/reference/configuration-reference/'
                            }
                            break
                        }
                    }
                },
                releaseInfo(version) {
                    return {
                        name: `astro-pdf@${version}`,
                        url: `https://github.com/lameuler/astro-pdf/releases/tag/astro-pdf%40${version}`
                    }
                }
            }
        })
    ]
})
