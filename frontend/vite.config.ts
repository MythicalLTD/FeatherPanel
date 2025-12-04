/*
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import ViteYaml from '@modyfi/vite-plugin-yaml';
import tailwindcss from '@tailwindcss/vite';
// @ts-expect-error - html-minifier-terser doesn't have type definitions
import { minify } from 'html-minifier-terser';

// HTML minification plugin
function htmlMinifyPlugin(): Plugin {
    return {
        name: 'html-minify',
        enforce: 'post',
        apply: 'build',
        async transformIndexHtml(html: string) {
            return await minify(html, {
                collapseWhitespace: true,
                removeComments: false, // Keep comments for placeholders
                removeRedundantAttributes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true,
                useShortDoctype: true,
                minifyCSS: true,
                minifyJS: true,
                removeEmptyAttributes: true,
                removeOptionalTags: false, // Keep optional tags for compatibility
            });
        },
    };
}

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        ViteYaml({
            onWarning: (warning) => {
                console.warn('[App/YML⚠️] Yaml parser warning: ' + warning);
            },
        }),
        vue({}),
        vueDevTools(),
        tailwindcss(),
        htmlMinifyPlugin(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        host: '0.0.0.0',
        strictPort: true,
        allowedHosts: ['localhost', '127.0.0.1', '0.0.0.0', 'devsv.mythical.systems'],
        proxy: {
            '/api': {
                target: 'http://localhost:8721',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path,
            },
            '/attachments': {
                target: 'http://localhost:8721',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path,
            },
            '/addons': {
                target: 'http://localhost:8721',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path,
            },
            '/components': {
                target: 'http://localhost:8721',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path,
            }
        },
    },
    build: {
        minify: true,
        sourcemap: true,
        assetsInlineLimit: 0,
        chunkSizeWarningLimit: 120000,
        rollupOptions: {
            onwarn(warning, warn) {
                // Suppress eval warnings from Rolldown
                if (
                    warning.code === 'EVAL' ||
                    warning.message?.includes('eval') ||
                    warning.message?.includes('Use of direct `eval`')
                ) {
                    return;
                }
                // Suppress vue-i18n currentInstance warning (harmless - vue-i18n falls back to getCurrentInstance)
                if (
                    warning.code === 'IMPORT_IS_UNDEFINED' &&
                    warning.message?.includes('currentInstance') &&
                    warning.message?.includes('vue-i18n')
                ) {
                    return;
                }
                // Use default warning handler for other warnings
                warn(warning);
            },
        },
    },
    optimizeDeps: {
        include: ['vue', 'vue-router', 'pinia', 'vue-i18n'],
    },
    cacheDir: '.vite',
});
