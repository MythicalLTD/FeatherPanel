import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import vueDevTools from 'vite-plugin-vue-devtools';
import oxlintPlugin from 'vite-plugin-oxlint';
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
        vueJsx(),
        vueDevTools(),
        tailwindcss(),
        oxlintPlugin(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        host: '0.0.0.0',
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
        },
    },
    build: {
        sourcemap: true,
        chunkSizeWarningLimit: 120000,
    },
    optimizeDeps: {
        include: ['vue', 'vue-router', 'pinia', 'vue-i18n', 'vue-sweetalert2'],
    },
    cacheDir: '.vite',
});
