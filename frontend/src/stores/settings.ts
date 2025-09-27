import { defineStore } from 'pinia';
import axios from 'axios';
/** Coerce common truthy/falsey representations from backend settings into boolean */
function asBool(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1' || value === 'on' || value === 'yes';
}

function getBooleanSetting(state: { settings: Record<string, unknown> | null }, key: string): boolean {
    const source: Record<string, unknown> | null = state.settings ?? null;
    const raw: unknown = source ? (source as Record<string, unknown>)[key] : undefined;
    return asBool(raw);
}

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
                // Log what settings you get from the server
                if (json.success && json.data?.settings) {
                    this.settings = json.data.settings;
                    this.loaded = true;
                    // Log what settings yall server (store in state)
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
        appDeveloperMode: (state) => getBooleanSetting(state, 'app_developer_mode'),
        appLang: (state) => state.settings?.app_lang || 'en_US',
        appUrl: (state) => state.settings?.app_url || '',
        appTimezone: (state) => state.settings?.app_timezone || 'UTC',
        turnstile_enabled: (state) => getBooleanSetting(state, 'turnstile_enabled'),
        turnstile_key_pub: (state) => state.settings?.turnstile_key_pub || '',
        legalTos: (state) => state.settings?.legal_tos || '',
        legalPrivacy: (state) => state.settings?.legal_privacy || '',
        smtpEnabled: (state) => getBooleanSetting(state, 'smtp_enabled'),
        registrationEnabled: (state) => getBooleanSetting(state, 'registration_enabled'),
    },
});
