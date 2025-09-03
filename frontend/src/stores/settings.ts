import { defineStore } from 'pinia';
import axios from 'axios';

export const useSettingsStore = defineStore('settings', {
    state: () => ({
        settings: null as null | Record<string, unknown>,
        loaded: false,
        loading: false,
    }),
    actions: {
        async fetchSettings() {
            // Prevent multiple simultaneous fetches
            if (this.loading) {
                return;
            }

            // Return cached settings if already loaded
            if (this.loaded && this.settings) {
                return;
            }

            this.loading = true;
            try {
                const res = await axios.get('/api/system/settings');
                const json = res.data;
                if (json.success && json.data?.settings) {
                    this.settings = json.data.settings;
                    this.loaded = true;
                } else {
                    console.warn('Settings API response invalid:', json);
                    this.settings = null;
                    this.loaded = false;
                }
            } catch (e) {
                console.error('Failed to fetch settings:', e);
                this.settings = null;
                this.loaded = false;
            } finally {
                this.loading = false;
            }
        },
        setSettings(settings: Record<string, unknown>) {
            this.settings = settings;
            this.loaded = true;
        },
    },
    getters: {
        appName: (state) => state.settings?.app_name || 'App',
        appLogo: (state) => state.settings?.app_logo || '',
        appLang: (state) => state.settings?.app_lang || 'en_US',
        appUrl: (state) => state.settings?.app_url || '',
        appTimezone: (state) => state.settings?.app_timezone || 'UTC',
        turnstile_enabled: (state) => state.settings?.turnstile_enabled === 'true',
        turnstile_key_pub: (state) => state.settings?.turnstile_key_pub || '',
        legalTos: (state) => state.settings?.legal_tos || '',
        legalPrivacy: (state) => state.settings?.legal_privacy || '',
        smtpEnabled: (state) => state.settings?.smtp_enabled === 'true',
        registrationEnabled: (state) => state.settings?.registration_enabled === 'true',
    },
});
