import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        dir: './test',
        alias: {
            '@/': new URL('./src/', import.meta.url).pathname
        }
    }
})
