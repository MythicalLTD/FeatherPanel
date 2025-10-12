/*
MIT License

Copyright (c) 2025 MythicalSystems
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

import { defineStore } from 'pinia';
import axios from 'axios';
/** Coerce common truthy/falsey representations from backend settings into boolean */
function asBool(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1' || value === 'on' || value === 'yes';
}

function getBooleanSetting(state: { settings: Record<string, unknown> | null }, key: string): boolean {
    const source: Record<string, unknown> | null = state.settings ?? null;
    const raw: unknown = source ? (source as Record<string, unknown>)[key] : undefined;
    return raw !== undefined ? asBool(raw) : false;
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
        appName: (state) => state.settings?.app_name || 'FeatherPanel',
        appLogo: (state) => state.settings?.app_logo || 'https://github.com/mythicalltd.png',
        appLogoWhite: (state) => state.settings?.app_logo_white || 'https://github.com/mythicalltd.png',
        appDeveloperMode: (state) => getBooleanSetting(state, 'app_developer_mode'),
        appLang: (state) => state.settings?.app_lang || 'en_US',
        appUrl: (state) => state.settings?.app_url || 'https://mythicalpanel.mythical.systems',
        appTimezone: (state) => state.settings?.app_timezone || 'UTC',
        turnstile_enabled: (state) => getBooleanSetting(state, 'turnstile_enabled'),
        turnstile_key_pub: (state) => state.settings?.turnstile_key_pub || '',
        legalTos: (state) => state.settings?.legal_tos || '/tos',
        legalPrivacy: (state) => state.settings?.legal_privacy || '/privacy',
        smtpEnabled: (state) => getBooleanSetting(state, 'smtp_enabled'),
        registrationEnabled: (state) => getBooleanSetting(state, 'registration_enabled'),
    },
});
