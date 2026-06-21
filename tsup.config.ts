import { readFile } from 'node:fs/promises'

import { glob } from 'glob'
import { defineConfig } from 'tsup'

async function getPackageVersion() {
    const pkg: unknown = JSON.parse(await readFile('package.json', 'utf8'))
    if (typeof pkg === 'object' && pkg !== null) {
        if ('version' in pkg && typeof pkg.version === 'string') {
            return pkg.version
        }
    }
    throw new Error('failed to read "version" from package.json')
}

export default defineConfig({
    entry: await glob('src/**/*.ts', { ignore: 'src/**/*.*.ts', posix: true }),
    outDir: 'dist',
    bundle: false,
    clean: true,
    format: 'esm',
    platform: 'node',
    sourcemap: true,
    define: {
        VERSION: await getPackageVersion()
    }
})
