import { defineConfig } from 'tsup'
import { readFile } from 'fs/promises'
import { glob } from 'glob'

const pkg = JSON.parse(await readFile('package.json', 'utf8'))

export default defineConfig({
    entry: await glob('src/**/*.ts', { ignore: 'src/**/*.*.ts', posix: true }),
    outDir: 'dist',
    bundle: false,
    clean: true,
    format: 'esm',
    platform: 'node',
    sourcemap: true,
    define: {
        VERSION: JSON.stringify(pkg.version)
    }
})
