import { docsLoader } from '@lameuler/atlas/content'
// eslint-disable-next-line n/no-missing-import
import { defineCollection } from 'astro:content'

export const collections = {
    docs: defineCollection({
        loader: docsLoader({ base: 'src/content' })
    })
}
