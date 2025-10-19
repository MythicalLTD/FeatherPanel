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

import './assets/main.css';
import 'vue-toastification/dist/index.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { createI18n } from 'vue-i18n';
import Toast from 'vue-toastification';

// Performance optimization: Create app with production tip disabled
const app = createApp(App, {
    // Disable production tip
    productionTip: false,
    // Disable devtools
    devtools: false,
});

const pinia = createPinia();
const locale = localStorage.getItem('locale') || 'EN';

// Performance optimization: Configure i18n with runtimeOnly
const i18n = createI18n({
    legacy: false,
    locale: locale,
    fallbackLocale: 'EN',
    runtimeOnly: true,
    messages: {
        EN: {},
    },
});

// Performance optimization: Lazy load translations with caching
const messageCache = new Map();
const FALLBACK_LOCALE = 'EN';

const loadLocaleMessages = async (locale: string) => {
    // Always load fallback first if not loaded
    if (!messageCache.has(FALLBACK_LOCALE)) {
        try {
            const fallbackMessages = await import(`@/locale/${FALLBACK_LOCALE.toLowerCase()}.yml`);
            messageCache.set(FALLBACK_LOCALE, fallbackMessages.default);
            i18n.global.setLocaleMessage(FALLBACK_LOCALE, fallbackMessages.default);
        } catch (error) {
            console.error(`Failed to load fallback locale messages for ${FALLBACK_LOCALE}:`, error);
        }
    }

    // Then load the requested locale if different
    if (locale !== FALLBACK_LOCALE && !messageCache.has(locale)) {
        try {
            const messages = await import(`@/locale/${locale.toLowerCase()}.yml`);
            messageCache.set(locale, messages.default);
            i18n.global.setLocaleMessage(locale, messages.default);
        } catch (error) {
            console.error(`Failed to load locale messages for ${locale}:`, error);
        }
    }
};

// Load initial locale
await loadLocaleMessages(locale);
i18n.global.locale.value = locale as 'EN';

// Performance optimization: Disable devtools in production
if (import.meta.env.PROD) {
    // @ts-expect-error - devtools is a valid property but not in types
    app.config.devtools = false;

    // Performance optimization: Disable warnings in production
    app.config.warnHandler = () => null;
}

// Performance optimization: Register plugins with proper error handling and lazy loading
const registerPlugins = async () => {
    try {
        app.use(i18n);
        app.use(pinia);
        app.use(router);
        app.use(Toast, {
            // Toast configuration options
            position: 'bottom-right',
            timeout: 5000,
            closeOnClick: true,
            pauseOnFocusLoss: true,
            pauseOnHover: true,
            draggable: true,
            draggablePercent: 0.6,
            showCloseButtonOnHover: false,
            hideProgressBar: false,
            closeButton: 'button',
            icon: true,
            rtl: false,
            maxToasts: 20,
            newestOnTop: true,
        });
    } catch (error) {
        console.error('Failed to initialize Vue plugins:', error);
    }
};

// Initialize background settings immediately
const initializeBackground = () => {
    // Load background settings from localStorage
    const savedBackground = localStorage.getItem('background_image');
    const savedOpacity = localStorage.getItem('background_opacity');
    const savedBlur = localStorage.getItem('background_blur');

    if (savedBackground) {
        document.body.style.setProperty('--background-image', `url(${savedBackground})`);
        document.body.classList.add('has-custom-background');
    }

    if (savedOpacity) {
        document.documentElement.style.setProperty('--background-opacity', `${parseInt(savedOpacity) / 100}`);
    }

    if (savedBlur) {
        document.documentElement.style.setProperty('--background-blur', `${savedBlur}px`);
    }
};

// Mount the app with error boundary and performance monitoring
const mountApp = async () => {
    try {
        // Initialize background settings before mounting
        initializeBackground();

        await registerPlugins();
        // Preserve HTML comments in templates
        app.config.compilerOptions = {
            ...app.config.compilerOptions,
            comments: true,
        };
        // Performance optimization: Use requestAnimationFrame for mounting
        requestAnimationFrame(() => {
            app.mount('#app');
        });
    } catch (error) {
        console.error('Failed to mount Vue app:', error);
        document.getElementById('app')!.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <h2>Application Error</h2>
                <p>Sorry, something went wrong. Please try refreshing the page.</p>
            </div>
        `;
    }
};

// Import plugin services
import { pluginLoader } from './services/pluginLoader';
import { pluginAPI } from './services/pluginAPI';

// Load plugin CSS and JS
const loadCustomResources = async () => {
    try {
        await pluginLoader.loadAllPlugins();
    } catch (error) {
        console.error('Failed to load plugin resources:', error);
    }
};

// Initialize app and plugins
const initializeApp = async () => {
    await mountApp();

    // Initialize plugin API with app and router references
    pluginAPI.initialize(app, router);

    await loadCustomResources();
};

initializeApp();
