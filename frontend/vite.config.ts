import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import ViteYaml from '@modyfi/vite-plugin-yaml';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        ViteYaml({
            onWarning: (warning) => {
                console.warn('[App/YML⚠️] Yaml parser warning: ' + warning);
            },
        }),
        vue(),
        vueDevTools(),
        tailwindcss(),
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
            },
        },
    },
    build: {
        minify: true,
        sourcemap: true,
        assetsInlineLimit: 0,
        chunkSizeWarningLimit: 120000,
    },
    optimizeDeps: {
        include: ['vue', 'vue-router', 'pinia', 'vue-i18n'],
    },
    cacheDir: '.vite',
});
