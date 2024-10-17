import { virtualVersion } from './rollup.config.mjs'
import { defineConfig } from 'vite'

export default defineConfig({
    test: {
        dir: './test',
        alias: {
            '@/': new URL('./src/', import.meta.url).pathname
        }
    },
    plugins: [virtualVersion]
})
