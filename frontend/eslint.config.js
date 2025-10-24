import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import licenseHeader from 'eslint-plugin-license-header';
import eslintPluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import typescriptEslint from 'typescript-eslint';
import vueLicenseHeader from './eslint-rules/vue-license-header.js';

export default typescriptEslint.config(
    { ignores: ['*.d.ts', '**/coverage', '**/dist', 'node_modules', '.vite', 'src/components/ui/*'] },
    {
        extends: [
            eslint.configs.recommended,
            ...typescriptEslint.configs.recommended,
            ...eslintPluginVue.configs['flat/recommended'],
        ],
        files: ['**/*.{ts,vue}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: globals.browser,
            parserOptions: {
                parser: typescriptEslint.parser,
            },
        },
        plugins: {
            'license-header': licenseHeader,
            custom: {
                rules: {
                    'vue-license-header': vueLicenseHeader,
                },
            },
        },
        rules: {
            'vue/multi-word-component-names': 'off',
            // Ignore suggestCanonicalClasses for shrink-0/shrink-0
            'unocss/suggest-canonical-classes': [
                'warn',
                {
                    ignore: [
                        // Ignore recommendations to replace shrink-0 with shrink-0 and vice versa
                        { from: 'shrink-0', to: 'shrink-0' },
                        { from: 'shrink-0', to: 'shrink-0' },
                    ],
                },
            ],
        },
    },
    // TypeScript files
    {
        files: ['**/*.ts'],
        rules: {
            'license-header/header': ['error', '.license-header'],
        },
    },
    // Vue files - use custom rule
    {
        files: ['**/*.vue'],
        rules: {
            'custom/vue-license-header': 'error',
        },
    },
    eslintConfigPrettier,
);
