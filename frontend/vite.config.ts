import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import vueDevTools from 'vite-plugin-vue-devtools';
import ViteYaml from '@modyfi/vite-plugin-yaml';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

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
        hmr: {
            host: 'devsv.mythical.systems',
            protocol: 'wss',
            clientPort: 443,
            overlay: true,
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
        },
    },
    build: {
        minify: false,
        sourcemap: true,
        assetsInlineLimit: 0,
        emptyOutDir: false,
        chunkSizeWarningLimit: 120000,
        // Output filenames without [hash]
        rollupOptions: {
            output: {
                // Keep entry/chunk names predictable (no hash)
                entryFileNames: `assets/[name].js`,
                chunkFileNames: `assets/[name].js`,
                // For assets (images, css) keep original name + ext (no hash)
                assetFileNames: ({ name }) => {
                    // attempt to preserve original file name where possible
                    if (!name) return 'assets/[name][extname]';
                    const ext = path.extname(name);
                    const base = path.basename(name, ext);
                    return `assets/${base}${ext}`;
                },
                // Optional: preserve module/order for easier diffing
                // manualChunks: undefined
            },
        },
        target: 'esnext'
    },
    optimizeDeps: {
        include: ['vue', 'vue-router', 'pinia', 'vue-i18n'],
    },
    cacheDir: '.vite',
});
