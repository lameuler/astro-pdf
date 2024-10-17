import { fileURLToPath } from 'url'
import { virtualVersion } from './rollup.config.mjs'
import { defineConfig } from 'vite'

export default defineConfig({
    test: {
        dir: './test',
        alias: {
            '@/': fileURLToPath(new URL('./src/', import.meta.url))
        }
    },
    plugins: [virtualVersion]
})
