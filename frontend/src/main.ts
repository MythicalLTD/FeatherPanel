import './assets/main.css';
import 'vue-toastification/dist/index.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { createTerminal } from 'vue-web-terminal';
import router from './router';
import { createI18n } from 'vue-i18n';
import Toast from 'vue-toastification';

// Performance optimization: Create app with production tip disabled
const app = createApp(App, {
    // Disable production tip
    productionTip: false,
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
        app.use(createTerminal());
        app.use(Toast, {
            // Toast configuration options
            position: 'top-right',
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

// Mount the app with error boundary and performance monitoring
const mountApp = async () => {
    try {
        await registerPlugins();

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

mountApp();
