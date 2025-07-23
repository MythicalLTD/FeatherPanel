import { defineStore } from 'pinia';

export const useSettingsStore = defineStore('settings', {
    state: () => ({
        settings: null as null | Record<string, unknown>,
        loaded: false,
    }),
    actions: {
        async fetchSettings() {
            try {
                const res = await fetch('/api/system/settings');
                const json = await res.json();
                if (json.success && json.data?.settings) {
                    this.settings = json.data.settings;
                    this.loaded = true;
                } else {
                    this.settings = null;
                    this.loaded = false;
                }
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('Failed to fetch settings:', e);
                this.settings = null;
                this.loaded = false;
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
        turnstileEnabled: (state) => state.settings?.turnstile_enabled === 'true',
        turnstileKeyPub: (state) => state.settings?.turnstile_key_pub || '',
        legalTos: (state) => state.settings?.legal_tos || '',
        legalPrivacy: (state) => state.settings?.legal_privacy || '',
        smtpEnabled: (state) => state.settings?.smtp_enabled === 'true',
    },
});
