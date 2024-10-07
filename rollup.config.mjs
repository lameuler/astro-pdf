import { defineConfig } from 'rollup'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { builtinModules } from 'module'
import virtual from '@rollup/plugin-virtual'
import { readFile } from 'fs/promises'

const version = JSON.parse(await readFile('package.json', 'utf-8')).version

export default defineConfig({
    input: 'src/index.ts',
    output: {
        dir: 'dist',
        format: 'es',
        sourcemap: true
    },
    external: [...builtinModules, /node_modules/],
    plugins: [
        resolve(),
        typescript({
            declaration: true,
            declarationDir: 'dist/types'
        }), virtual({
            'virtual:version': `const version = ${JSON.stringify(version)}; export default version`
        })
    ]
})