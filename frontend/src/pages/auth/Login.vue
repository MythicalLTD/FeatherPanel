<script setup lang="ts">
// MIT License
//
// Copyright (c) 2025 MythicalSystems
// Copyright (c) 2025 Cassian Gherman (NaysKutzu)
// Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { computed, ref, onMounted, type HTMLAttributes } from 'vue';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from 'vue-i18n';
import Turnstile from 'vue-turnstile';
import { useSettingsStore } from '@/stores/settings';
import { usePreferencesStore } from '@/stores/preferences';
import { useRouter } from 'vue-router';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';

const settingsStore = useSettingsStore();
const preferencesStore = usePreferencesStore();

onMounted(async () => {
    await settingsStore.fetchSettings();

    // Fetch plugin widgets
    await fetchPluginWidgets();

    // Check for Discord login token
    const discordToken = router.currentRoute.value.query.discord_token as string;
    if (discordToken) {
        await handleDiscordLogin(discordToken);
    }

    // Check for Discord link token
    const linkToken = router.currentRoute.value.query.discord_link_token as string;
    if (linkToken) {
        discordLinkToken.value = linkToken;
        // Show link account message - user needs to enter credentials
        success.value = $t('auth.discordLinkPrompt');
    }

    // Check for SSO login token
    const ssoToken = router.currentRoute.value.query.sso_token as string;
    if (ssoToken) {
        isSsoLogin.value = true;
        ssoStatus.value = $t('auth.ssoLoggingIn') as string;
        error.value = '';
        success.value = '';
        await handleSsoLogin(ssoToken);
        return;
    }

    // Check for username_or_email in query (for 2FA redirect)
    const usernameOrEmail = router.currentRoute.value.query.username_or_email as string;
    if (usernameOrEmail) {
        form.value.username_or_email = usernameOrEmail;
    }
});

const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();
const { t: $t } = useI18n();
const router = useRouter();

const form = ref({
    username_or_email: '',
    password: '',
    turnstile_token: '',
});
const loading = ref(false);
const error = ref('');
const success = ref('');
const discordLinkToken = ref<string | null>(null);

// SSO login state
const isSsoLogin = ref(false);
const ssoStatus = ref('');

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('auth-login');
const widgetsTopOfPage = computed(() => getWidgets('auth-login', 'top-of-page'));
const widgetsBeforeForm = computed(() => getWidgets('auth-login', 'before-form'));
const widgetsAfterForm = computed(() => getWidgets('auth-login', 'after-form'));
const widgetsBottomOfPage = computed(() => getWidgets('auth-login', 'bottom-of-page'));

function validateForm(): string | null {
    if (!form.value.username_or_email || !form.value.password) {
        return $t('api_errors.MISSING_REQUIRED_FIELDS');
    }
    if (settingsStore.turnstile_enabled) {
        if (!form.value.turnstile_token) {
            return $t('api_errors.TURNSTILE_TOKEN_REQUIRED');
        }
    }
    if (typeof form.value.username_or_email !== 'string') {
        return $t('api_errors.INVALID_DATA_TYPE_EMAIL');
    }
    if (typeof form.value.password !== 'string') {
        return $t('api_errors.INVALID_DATA_TYPE_PASSWORD');
    }
    form.value.username_or_email = form.value.username_or_email.trim();
    form.value.password = form.value.password.trim();
    if (form.value.username_or_email.length < 3) {
        return $t('api_errors.INVALID_DATA_LENGTH_MIN_EMAIL');
    }
    if (form.value.username_or_email.length > 255) {
        return $t('api_errors.INVALID_DATA_LENGTH_MAX_EMAIL');
    }
    if (form.value.password.length < 8) {
        return $t('api_errors.INVALID_DATA_LENGTH_MIN_PASSWORD');
    }
    if (form.value.password.length > 255) {
        return $t('api_errors.INVALID_DATA_LENGTH_MAX_PASSWORD');
    }
    // Validate as either email or username format
    const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.value.username_or_email);
    const isUsername = /^[a-zA-Z0-9_]+$/.test(form.value.username_or_email);
    if (!isEmail && !isUsername) {
        return $t('api_errors.INVALID_USERNAME_OR_EMAIL');
    }
    return null;
}

function onDiscordLogin() {
    window.location.href = '/api/user/auth/discord/login';
}

async function handleDiscordLink(): Promise<void> {
    if (!discordLinkToken.value) {
        error.value = $t('auth.discordLinkTokenInvalid');
        return;
    }

    loading.value = true;
    try {
        const payload = {
            token: discordLinkToken.value,
            username_or_email: form.value.username_or_email,
            password: form.value.password,
        };
        const res = await axios.put('/api/user/auth/discord/link', payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        if (res.data && res.data.success) {
            success.value = $t('auth.discordAccountLinked');

            // Clear the link token so normal login can proceed
            discordLinkToken.value = null;

            // Now log in with credentials (without the link token check)
            const loginPayload = {
                username_or_email: form.value.username_or_email,
                password: form.value.password,
                turnstile_token: form.value.turnstile_token,
            };

            setTimeout(async () => {
                try {
                    const loginRes = await axios.put('/api/user/auth/login', loginPayload, {
                        headers: { 'Content-Type': 'application/json' },
                    });
                    if (loginRes.data && loginRes.data.success) {
                        success.value = loginRes.data.message || $t('auth.loginSuccess');

                        // Load and sync user preferences after successful login
                        try {
                            // Initialize the store (set up listeners and load lastSyncTime)
                            preferencesStore.initialize();

                            const hasLocalStorage = preferencesStore.hasLocalStorage();
                            if (hasLocalStorage) {
                                await preferencesStore.migrateLocalStorage();
                            } else {
                                await preferencesStore.loadPreferences();
                            }
                            preferencesStore.startAutoSync();
                            console.log('[Login] Auto-sync enabled for user preferences');
                        } catch (prefError) {
                            console.error('Failed to sync user preferences:', prefError);
                        }

                        // Redirect immediately (no delay needed with router)
                        const redirect = router.currentRoute.value.query.redirect as string;
                        if (redirect && redirect.startsWith('/')) {
                            router.replace(redirect);
                        } else {
                            router.replace('/');
                        }
                    }
                } catch (loginError) {
                    error.value = getErrorMessage(loginError);
                }
            }, 1000);
        } else {
            error.value = getErrorMessage(res.data);
        }
    } catch (err: unknown) {
        error.value = getErrorMessage(err);
    } finally {
        loading.value = false;
    }
}

async function handleDiscordLogin(token: string): Promise<void> {
    loading.value = true;
    try {
        const payload = {
            discord_token: token,
        };
        const res = await axios.put('/api/user/auth/login', payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        if (res.data && res.data.success) {
            success.value = res.data.message || $t('auth.loginSuccess');

            // Load and sync user preferences after successful login
            try {
                // Initialize the store (set up listeners and load lastSyncTime)
                preferencesStore.initialize();

                // Check if user has preferences in localStorage that need to be synced
                const hasLocalStorage = preferencesStore.hasLocalStorage();

                if (hasLocalStorage) {
                    // User has local preferences - sync them to backend first
                    await preferencesStore.migrateLocalStorage();
                } else {
                    // No local preferences - load from backend
                    await preferencesStore.loadPreferences();
                }

                // Start auto-sync (saves entire localStorage every 5 minutes)
                preferencesStore.startAutoSync();
                console.log('[Login] Auto-sync enabled for user preferences');
            } catch (prefError) {
                console.error('Failed to sync user preferences:', prefError);
                // Don't block login if preferences fail to sync
            }

            // Redirect immediately (no delay needed with router)
            const redirect = router.currentRoute.value.query.redirect as string;
            if (redirect && redirect.startsWith('/')) {
                router.replace(redirect);
            } else {
                router.replace('/');
            }
        } else {
            error.value = getErrorMessage(res.data);
        }
    } catch (err: unknown) {
        error.value = getErrorMessage(err);
    } finally {
        loading.value = false;
    }
}

async function handleSsoLogin(token: string): Promise<void> {
    isSsoLogin.value = true;
    ssoStatus.value = $t('auth.ssoLoggingIn') as string;
    loading.value = true;
    error.value = '';
    success.value = '';
    try {
        const payload = {
            sso_token: token,
        };
        const res = await axios.put('/api/user/auth/login', payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        if (res.data && res.data.success) {
            success.value = res.data.message || $t('auth.loginSuccess');

            // Load and sync user preferences after successful login
            try {
                preferencesStore.initialize();

                const hasLocalStorage = preferencesStore.hasLocalStorage();

                if (hasLocalStorage) {
                    await preferencesStore.migrateLocalStorage();
                } else {
                    await preferencesStore.loadPreferences();
                }

                preferencesStore.startAutoSync();
                console.log('[Login] Auto-sync enabled for user preferences');
            } catch (prefError) {
                console.error('Failed to sync user preferences:', prefError);
            }

            const redirect = router.currentRoute.value.query.redirect as string;
            if (redirect && redirect.startsWith('/')) {
                router.replace(redirect);
            } else {
                router.replace('/');
            }
        } else if (res.data) {
            isSsoLogin.value = false;
            error.value = getErrorMessage(res.data);
        }
    } catch (err: unknown) {
        isSsoLogin.value = false;
        error.value = getErrorMessage(err);
    } finally {
        loading.value = false;
    }
}

function getErrorMessage(err: unknown): string {
    if (typeof err === 'object' && err !== null) {
        const e = err as { response?: { data?: { message?: string; error_code?: string } }; message?: string };
        const code = e.response?.data?.error_code;
        if (code) {
            switch (code) {
                case 'MISSING_REQUIRED_FIELDS':
                    return $t('api_errors.MISSING_REQUIRED_FIELDS');
                case 'INVALID_DATA_TYPE':
                    return $t('api_errors.INVALID_DATA_TYPE_EMAIL');
                case 'INVALID_DATA_LENGTH_MIN':
                    return $t('api_errors.INVALID_DATA_LENGTH_MIN_EMAIL');
                case 'INVALID_DATA_LENGTH_MAX':
                    return $t('api_errors.INVALID_DATA_LENGTH_MAX_EMAIL');
                case 'INVALID_EMAIL_ADDRESS':
                    return $t('api_errors.INVALID_EMAIL_ADDRESS');
                default:
                    break;
            }
        }
        return e.response?.data?.message || e.message || $t('api_errors.UNKNOWN_ERROR');
    }
    if (typeof err === 'string') return err;
    return $t('api_errors.UNKNOWN_ERROR');
}

async function onSubmit(e: Event) {
    e.preventDefault();
    error.value = '';
    success.value = '';

    // If we have a Discord link token, handle linking instead of normal login
    if (discordLinkToken.value) {
        await handleDiscordLink();
        return;
    }

    const validationError = validateForm();
    if (validationError) {
        error.value = validationError;
        return;
    }
    loading.value = true;
    try {
        const payload = {
            username_or_email: form.value.username_or_email,
            password: form.value.password,
            turnstile_token: form.value.turnstile_token,
        };
        const res = await axios.put('/api/user/auth/login', payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        if (res.data && res.data.success) {
            success.value = res.data.message || $t('auth.loginSuccess');

            // Load and sync user preferences after successful login
            try {
                // Initialize the store (set up listeners and load lastSyncTime)
                preferencesStore.initialize();

                // Check if user has preferences in localStorage that need to be synced
                const hasLocalStorage = preferencesStore.hasLocalStorage();

                if (hasLocalStorage) {
                    // User has local preferences - sync them to backend first
                    await preferencesStore.migrateLocalStorage();
                } else {
                    // No local preferences - load from backend
                    await preferencesStore.loadPreferences();
                }

                // Start auto-sync (saves entire localStorage every 5 minutes)
                preferencesStore.startAutoSync();
                console.log('[Login] Auto-sync enabled for user preferences');
            } catch (prefError) {
                console.error('Failed to sync user preferences:', prefError);
                // Don't block login if preferences fail to sync
            }

            // Redirect immediately (no delay needed with router)
            const redirect = router.currentRoute.value.query.redirect as string;
            if (redirect && redirect.startsWith('/')) {
                router.replace(redirect);
            } else {
                router.replace('/');
            }
        } else {
            error.value = getErrorMessage(res.data);
        }
    } catch (err: unknown) {
        let errorCode: string | undefined;
        if (typeof err === 'object' && err !== null && 'response' in err) {
            const response = (err as { response?: { data?: { error_code?: string } } }).response;
            errorCode = response?.data?.error_code;
        }
        if (errorCode === 'TWO_FACTOR_REQUIRED') {
            // Extract email from response if available (backend always returns email for 2FA)
            let emailFor2FA = form.value.username_or_email;
            if (typeof err === 'object' && err !== null && 'response' in err) {
                const response = (err as { response?: { data?: { data?: { email?: string } } } }).response;
                emailFor2FA = response?.data?.data?.email || form.value.username_or_email;
            }
            await router.push({
                name: 'VerifyTwoFactor',
                query: { email: emailFor2FA, username_or_email: form.value.username_or_email },
            });
            return;
        }
        error.value = getErrorMessage(err);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div :class="cn('flex flex-col gap-6', props.class)">
        <!-- Plugin Widgets: Top of Page -->
        <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

        <!-- Plugin Widgets: Before Form -->
        <WidgetRenderer v-if="widgetsBeforeForm.length > 0" :widgets="widgetsBeforeForm" />

        <div v-if="isSsoLogin" class="flex flex-col items-center gap-4 py-6">
            <div class="flex items-center gap-3">
                <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                <span class="text-muted-foreground">
                    {{ ssoStatus || $t('auth.ssoLoggingIn') }}
                </span>
            </div>
            <p class="text-xs text-muted-foreground">
                {{ $t('auth.ssoPleaseWait') }}
            </p>
        </div>

        <form v-else @submit.prevent="onSubmit">
            <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-4">
                    <div class="grid gap-3">
                        <Label for="username_or_email">{{ $t('auth.usernameOrEmail') }}</Label>
                        <Input id="username_or_email" v-model="form.username_or_email" type="text" required />
                    </div>
                    <div class="grid gap-3">
                        <Label for="password">{{ $t('auth.password') }}</Label>
                        <Input id="password" v-model="form.password" type="password" required />
                    </div>
                    <Turnstile
                        v-if="settingsStore.turnstile_enabled"
                        v-model="form.turnstile_token"
                        :site-key="settingsStore.turnstile_key_pub as string"
                    />
                    <Button
                        type="submit"
                        class="w-full"
                        :disabled="loading"
                        data-umami-event="Login attempt"
                        :data-umami-event-email="form.username_or_email"
                    >
                        <span v-if="loading">{{ $t('auth.loggingIn') }}</span>
                        <span v-else>{{ $t('auth.login') }}</span>
                    </Button>
                    <div v-if="error" class="text-center text-sm text-red-500">{{ error }}</div>
                    <div v-if="success" class="text-center text-sm text-green-500">{{ success }}</div>
                    <div v-if="settingsStore.smtpEnabled" class="text-center text-sm">
                        <button
                            type="button"
                            class="underline underline-offset-4 cursor-pointer bg-transparent border-none p-0 text-inherit"
                            data-umami-event="Forgot password link"
                            @click="router.push({ name: 'ForgotPassword' })"
                        >
                            {{ $t('auth.forgotPassword') }}
                        </button>
                    </div>
                    <div v-if="settingsStore.discordOAuthEnabled" class="text-center">
                        <Button
                            type="button"
                            class="w-full flex items-center justify-center gap-2"
                            style="background: #5865f2; color: white"
                            data-umami-event="Login with Discord"
                            @click="onDiscordLogin"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-5 w-5"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path
                                    d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.07.07 0 00-.075.035 13.812 13.812 0 00-.605 1.246 18.016 18.016 0 00-5.427 0 12.217 12.217 0 00-.617-1.246.064.064 0 00-.075-.035c-1.724.285-3.362.83-4.885 1.515a.06.06 0 00-.024.022C.533 8.059-.32 11.591.099 15.08a.078.078 0 00.028.055 20.53 20.53 0 006.104 3.108.073.073 0 00.078-.023c.472-.651.889-1.341 1.246-2.065a.07.07 0 00-.038-.094 13.235 13.235 0 01-1.885-.884.07.07 0 01-.007-.117c.126-.094.252-.192.374-.291a.06.06 0 01.061-.011c3.927 1.792 8.18 1.792 12.061 0a.062.062 0 01.063.008c.122.099.248.197.374.291a.07.07 0 01-.006.117 12.298 12.298 0 01-1.885.883.07.07 0 00-.038.095c.36.723.777 1.413 1.246 2.064a.073.073 0 00.078.023 20.477 20.477 0 006.105-3.107.075.075 0 00.028-.055c.5-4.101-.838-7.597-3.548-10.692a.061.061 0 00-.024-.023zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.949-2.418 2.157-2.418 1.222 0 2.172 1.101 2.157 2.418 0 1.334-.949 2.419-2.157 2.419zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.948-2.418 2.157-2.418 1.221 0 2.171 1.101 2.157 2.418 0 1.334-.936 2.419-2.157 2.419z"
                                />
                            </svg>
                            <span>{{ $t('auth.loginWithDiscord') }}</span>
                        </Button>
                    </div>
                    <div v-if="settingsStore.registrationEnabled" class="text-center text-sm">
                        {{ $t('auth.noAccount') }}
                        <button
                            type="button"
                            class="underline underline-offset-4 cursor-pointer bg-transparent border-none p-0 text-inherit"
                            data-umami-event="Register link"
                            @click="router.push({ name: 'Register' })"
                        >
                            {{ $t('auth.register') }}
                        </button>
                    </div>
                </div>
            </div>
        </form>

        <!-- Plugin Widgets: After Form -->
        <WidgetRenderer v-if="widgetsAfterForm.length > 0" :widgets="widgetsAfterForm" />

        <!-- Plugin Widgets: Bottom of Page -->
        <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
    </div>
</template>
