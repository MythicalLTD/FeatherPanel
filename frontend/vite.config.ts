/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
        vue({
            // Performance: Enable template compilation optimizations
            template: {
                compilerOptions: {
                    // Remove whitespace in production
                    whitespace: 'condense',
                },
            },
        }),
        // Only enable devtools in development
        ...(process.env.NODE_ENV === 'development' ? [vueDevTools()] : []),
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
        // Performance: Optimize HMR
        hmr: {
            overlay: true,
        },
        // Performance: Reduce file watching overhead
        watch: {
            usePolling: false,
            ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
        },
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
            },
        },
    },
    build: {
        // Performance: Use terser for minification (rolldown-vite compatible)
        minify: 'terser',
        // Terser options for production builds
        terserOptions:
            process.env.NODE_ENV === 'production'
                ? {
                      compress: {
                          drop_console: true,
                          drop_debugger: true,
                      },
                  }
                : undefined,
        // Performance: Disable sourcemaps in production (saves RAM and build time)
        sourcemap: process.env.NODE_ENV === 'development',
        // Performance: Inline small assets to reduce HTTP requests
        assetsInlineLimit: 4096, // 4kb - inline small assets
        // Performance: Split CSS into separate files for better caching
        cssCodeSplit: true,
        // Performance: Target modern browsers for smaller bundles
        target: 'esnext',
        // Performance: Use rollup for better tree-shaking
        rollupOptions: {
            output: {
                // Performance: Manual chunk splitting for better caching and smaller initial bundles
                manualChunks: (id) => {
                    // Vendor chunks - split large dependencies aggressively
                    if (id.includes('node_modules')) {
                        // Large editor libraries - split individually
                        if (id.includes('ace-builds')) {
                            return 'ace-editor';
                        }
                        if (id.includes('@xterm')) {
                            return 'xterm';
                        }
                        if (id.includes('vue3-ace-editor')) {
                            return 'vue-ace-editor';
                        }

                        // Chart libraries - split individually
                        if (id.includes('chart.js')) {
                            return 'chartjs';
                        }
                        if (id.includes('vue-chartjs')) {
                            return 'vue-chartjs';
                        }

                        // Large UI libraries - split individually
                        if (id.includes('@tanstack/vue-table')) {
                            return 'tanstack-table';
                        }
                        if (id.includes('reka-ui')) {
                            return 'reka-ui';
                        }
                        if (id.includes('vaul-vue')) {
                            return 'vaul-vue';
                        }
                        if (id.includes('lucide-vue-next')) {
                            return 'lucide-icons';
                        }

                        // Form/validation libraries - split individually
                        if (id.includes('vee-validate')) {
                            return 'vee-validate';
                        }
                        if (id.includes('dompurify')) {
                            return 'dompurify';
                        }
                        if (id.includes('marked')) {
                            return 'marked';
                        }

                        // Vue ecosystem - keep together but separate from other vendors
                        if (id.includes('vue') && !id.includes('vue-chartjs') && !id.includes('vue3-ace-editor')) {
                            if (id.includes('vue-router')) {
                                return 'vue-router';
                            }
                            if (id.includes('pinia')) {
                                return 'pinia';
                            }
                            if (id.includes('vue-i18n')) {
                                return 'vue-i18n';
                            }
                            if (id.includes('vue-toastification')) {
                                return 'vue-toastification';
                            }
                            return 'vue-core';
                        }

                        // Utility libraries - split individually
                        if (id.includes('@vueuse')) {
                            return 'vueuse';
                        }
                        if (id.includes('axios')) {
                            return 'axios';
                        }
                        if (id.includes('yaml')) {
                            return 'yaml';
                        }

                        // Other large dependencies - split by package name
                        if (id.includes('vuedraggable')) {
                            return 'vuedraggable';
                        }
                        if (id.includes('vue-qrcode') || id.includes('qrcode')) {
                            return 'qrcode';
                        }
                        if (id.includes('vue-turnstile')) {
                            return 'vue-turnstile';
                        }
                        if (id.includes('vue-animejs')) {
                            return 'vue-animejs';
                        }

                        // Group smaller dependencies
                        return 'vendor';
                    }
                },
                // Performance: Optimize chunk file names for better caching
                chunkFileNames: (chunkInfo) => {
                    const facadeModuleId = chunkInfo.facadeModuleId
                        ? chunkInfo.facadeModuleId
                              .split('/')
                              .pop()
                              ?.replace(/\.[^.]*$/, '')
                        : 'chunk';
                    return `js/${facadeModuleId}-[hash].js`;
                },
                assetFileNames: (assetInfo) => {
                    const info = assetInfo.name?.split('.') || [];
                    const ext = info[info.length - 1];
                    if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
                        return `img/[name]-[hash][extname]`;
                    }
                    if (/woff2?|eot|ttf|otf/i.test(ext || '')) {
                        return `fonts/[name]-[hash][extname]`;
                    }
                    return `assets/[name]-[hash][extname]`;
                },
            },
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
        // Performance: Reduce chunk size warning limit (helps identify optimization opportunities)
        chunkSizeWarningLimit: 200000,
        // Performance: Enable CSS minification
        cssMinify: true,
        // Performance: Report compressed size
        reportCompressedSize: true,
    },
    optimizeDeps: {
        // Performance: Pre-bundle common dependencies to reduce dev server startup time
        include: [
            'vue',
            'vue-router',
            'pinia',
            'vue-i18n',
            'axios',
            '@vueuse/core',
            'lucide-vue-next',
            'vue-toastification',
            'marked',
            'dompurify',
            'vue-demi', // Required for Vue 2/3 compatibility in many libraries
        ],
        // Performance: Exclude large dependencies that don't need pre-bundling
        // Note: vue-demi is now included to fix resolution issues
        // Note: Rolldown is used by default in Vite 7+ for dependency optimization
        // No additional configuration needed - Rolldown automatically optimizes dependencies
    },
    // Performance: Use custom cache directory
    cacheDir: '.vite',
    // Performance: Optimize CSS processing
    css: {
        devSourcemap: false, // Disable CSS sourcemaps in dev (saves RAM)
    },
    // Performance: Reduce memory usage during build
    // Note: esbuild config removed - rolldown-vite handles minification differently
    // Console/debugger removal is handled by the minifier (terser) in production builds
});
