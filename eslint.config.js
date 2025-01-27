// @ts-check
import pluginJs from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import pluginNode from 'eslint-plugin-n'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    { files: ['**/*.{js,mjs,cjs,ts}'] },
    { ignores: ['**/dist', 'test/fixtures/**/*.d.ts', 'test/fixtures/**/public', '**/.cache', '**/.astro'] },
    { languageOptions: { globals: globals.node } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    pluginNode.configs['flat/recommended'],
    {
        rules: {
            'n/prefer-node-protocol': 'error',
            'n/prefer-promises/fs': 'error'
        }
    },
    {
        files: ['test/**'],
        rules: {
            'n/no-missing-import': [
                'error',
                {
                    allowModules: ['astro-pdf']
                }
            ],
            'n/no-unsupported-features/node-builtins': [
                'error',
                {
                    allowExperimental: true
                }
            ]
        }
    },
    eslintConfigPrettier
)
