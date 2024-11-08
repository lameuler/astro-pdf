import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        dir: './test',
        coverage: {
            provider: 'istanbul',
            include: ['src/**/*', 'dist/**/*.js'],
            exclude: ['**/*.d.ts']
        }
    }
})
