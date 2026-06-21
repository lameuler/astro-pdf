// @ts-check
import pluginJs from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import pluginNode from 'eslint-plugin-n'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
    { files: ['**/*.{js,mjs,cjs,ts}'] },
    { ignores: ['**/dist', 'test/fixtures/**/*.d.ts', 'test/fixtures/**/public', '**/.cache', '**/.astro'] },
    { languageOptions: { globals: globals.node } },
    pluginJs.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    pluginNode.configs['flat/recommended'],
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['eslint.config.js']
                }
            }
        }
    },
    {
        rules: {
            'n/prefer-node-protocol': 'error',
            'n/prefer-promises/fs': 'error',
            '@typescript-eslint/no-unnecessary-condition': [
                'error',
                {
                    allowConstantLoopConditions: 'only-allowed-literals'
                }
            ]
        }
    },
    {
        files: ['test/**'],
        rules: {
            'n/no-missing-import': 'off',
            'n/no-unsupported-features/node-builtins': [
                'error',
                {
                    allowExperimental: true
                }
            ],
            // test files can be less strict for convenience
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/restrict-plus-operands': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/no-empty-function': 'off'
        }
    },
    eslintConfigPrettier
)
