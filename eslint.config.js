import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

/** @type {import('eslint').Linter.Config} */
export default [
    { files: ['**/*.{js,mjs,cjs,ts}'] },
    { ignores: ['dist/*', 'test/fixtures/**/*.d.ts'] },
    { languageOptions: { globals: globals.node } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    eslintConfigPrettier
]