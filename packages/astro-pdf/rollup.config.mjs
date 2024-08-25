import { defineConfig } from 'rollup'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { builtinModules } from 'module'
import { join } from 'path'

export default defineConfig({
    input: 'src/integration.ts',
    output: [
        {
            dir: 'dist',
            format: 'cjs',
            sourcemap: true,
            entryFileNames: '[format]/[name].js'
        },
        {
            dir: 'dist',
            format: 'es',
            sourcemap: true,
            entryFileNames: '[format]/[name].js',
            plugins: [pluginEmitPackageJSON('es')]
        }
    ],
    external: [...builtinModules, /node_modules/],
    plugins: [resolve(), typescript({
        declaration: true,
        declarationDir: 'dist/types'
    })]
})

// create a package.json file for node to recognise es modules
function pluginEmitPackageJSON(dir = '') {
    return {
        name: 'plugin-emit-package-json',
        generateBundle() {
            this.emitFile({
                type: 'asset',
                fileName: join(dir, 'package.json'),
                source: '{"type":"module"}'
            })
        }
    }
}