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

                    // Only set localStorage values if they don't exist or if server has different values
                    // This preserves custom branding that users might have set
                    const currentAppName = localStorage.getItem('appName');
                    const currentAppLogoDark = localStorage.getItem('appLogoDark');
                    const currentAppLogoWhite = localStorage.getItem('appLogoWhite');

                    // Only set telemetry if it doesn't exist (preserve user choice)
                    const currentTelemetry = localStorage.getItem('telemetry');
                    if (json.data.settings.telemetry !== undefined && !currentTelemetry) {
                        localStorage.setItem('telemetry', json.data.settings.telemetry);
                    }

                    // Only set appName if it doesn't exist or if server has a different value
                    if (json.data.settings.app_name && (!currentAppName || currentAppName === 'FeatherPanel')) {
                        localStorage.setItem('appName', json.data.settings.app_name);
                    }

                    // Only set appLogoDark if it doesn't exist or if server has a different value
                    if (
                        json.data.settings.app_logo_dark &&
                        (!currentAppLogoDark ||
                            currentAppLogoDark === 'https://cdn.mythical.systems/featherpanel/logo.png')
                    ) {
                        localStorage.setItem('appLogoDark', json.data.settings.app_logo_dark);
                    }

                    // Only set appLogoWhite if it doesn't exist or if server has a different value
                    if (
                        json.data.settings.app_logo_white &&
                        (!currentAppLogoWhite || currentAppLogoWhite === 'https://github.com/mythicalltd.png')
                    ) {
                        localStorage.setItem('appLogoWhite', json.data.settings.app_logo_white);
                    }
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

        /**
         * Set custom branding that won't be overwritten by server settings
         *
         * Usage:
         * const settingsStore = useSettingsStore();
         * settingsStore.setCustomBranding('My Custom App', 'https://example.com/logo-dark.png', 'https://example.com/logo-white.png');
         *
         * This will persist across page reloads and won't be overwritten by server settings
         */
        setCustomBranding(appName: string, appLogoDark: string, appLogoWhite: string) {
            localStorage.setItem('appName', appName);
            localStorage.setItem('appLogoDark', appLogoDark);
            localStorage.setItem('appLogoWhite', appLogoWhite);
        },

        /**
         * Clear custom branding and revert to server defaults
         *
         * Usage:
         * const settingsStore = useSettingsStore();
         * settingsStore.clearCustomBranding();
         */
        clearCustomBranding() {
            localStorage.removeItem('appName');
            localStorage.removeItem('appLogoDark');
            localStorage.removeItem('appLogoWhite');
        },

        /**
         * Set telemetry preference
         *
         * Usage:
         * const settingsStore = useSettingsStore();
         * settingsStore.setTelemetry(false); // Disable telemetry
         */
        setTelemetry(enabled: boolean) {
            localStorage.setItem('telemetry', enabled.toString());
        },
    },
    getters: {
        appVersion: (state) => state.settings?.app_version || '0.0.8',
        appName: (state) => state.settings?.app_name || 'FeatherPanel',
        appLogo: (state) => state.settings?.app_logo_dark || 'https://github.com/mythicalltd.png',
        appLogoWhite: (state) => state.settings?.app_logo_white || 'https://github.com/mythicalltd.png',
        appDeveloperMode: (state) => getBooleanSetting(state, 'app_developer_mode'),
        appLang: (state) => state.settings?.app_lang || 'en_US',
        appUrl: (state) => state.settings?.app_url || 'https://featherpanel.mythical.systems',
        appSupport: (state) => state.settings?.app_support_url || 'https://discord.mythical.systems',
        appTimezone: (state) => state.settings?.app_timezone || 'UTC',
        linkedinUrl: (state) => state.settings?.linkedin_url || '',
        telegramUrl: (state) => state.settings?.telegram_url || '',
        tiktokUrl: (state) => state.settings?.tiktok_url || '',
        twitterUrl: (state) => state.settings?.twitter_url || '',
        whatsappUrl: (state) => state.settings?.whatsapp_url || '',
        youtubeUrl: (state) => state.settings?.youtube_url || '',
        websiteUrl: (state) => state.settings?.website_url || '',
        statusPageUrl: (state) => state.settings?.status_page_url || '',
        turnstile_enabled: (state) => getBooleanSetting(state, 'turnstile_enabled'),
        turnstile_key_pub: (state) => state.settings?.turnstile_key_pub || '',
        legalTos: (state) => state.settings?.legal_tos || '/tos',
        legalPrivacy: (state) => state.settings?.legal_privacy || '/privacy',
        smtpEnabled: (state) => getBooleanSetting(state, 'smtp_enabled'),
        registrationEnabled: (state) => getBooleanSetting(state, 'registration_enabled'),
        requireTwoFaAdmins: (state) => getBooleanSetting(state, 'require_two_fa_admins'),

        discordOAuthEnabled: (state) => getBooleanSetting(state, 'discord_oauth_enabled'),

        statusPageEnabled: (state) => getBooleanSetting(state, 'status_page_enabled'),

        // Custom branding getters that check localStorage first
        customAppName: () => localStorage.getItem('appName') || null,
        customAppLogoDark: () => localStorage.getItem('appLogoDark') || null,
        customAppLogoWhite: () => localStorage.getItem('appLogoWhite') || null,
        customTelemetry: () => localStorage.getItem('telemetry') || null,

        /**
         * Server-related settings
         */
        serverAllowEggChange: (state) => getBooleanSetting(state, 'server_allow_egg_change'),
        serverAllowStartupChange: (state) => getBooleanSetting(state, 'server_allow_startup_change'),
        serverAllowAllocationSelect: (state) => getBooleanSetting(state, 'server_allow_allocation_select'),
        serverAllowUserMadeFirewall: (state) => getBooleanSetting(state, 'server_allow_user_made_firewall'),
        serverAllowUserMadeProxy: (state) => getBooleanSetting(state, 'server_allow_user_made_proxy'),
        serverProxyMaxPerServer: (state) => {
            const value = state.settings?.server_proxy_max_per_server;
            return value ? Number(value) : 5;
        },

        /**
         * User-related settings
         */
        userAllowAvatarChange: (state) => getBooleanSetting(state, 'user_allow_avatar_change'),
        userAllowUsernameChange: (state) => getBooleanSetting(state, 'user_allow_username_change'),
        userAllowEmailChange: (state) => getBooleanSetting(state, 'user_allow_email_change'),
        userAllowFirstNameChange: (state) => getBooleanSetting(state, 'user_allow_first_name_change'),
        userAllowLastNameChange: (state) => getBooleanSetting(state, 'user_allow_last_name_change'),
        userAllowApiKeysCreate: (state) => getBooleanSetting(state, 'user_allow_api_keys_create'),

        /**
         * Chatbot-related settings
         */
        chatbotEnabled: (state) => getBooleanSetting(state, 'chatbot_enabled'),
    },
});
