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

import { ref, onMounted, type HTMLAttributes } from 'vue';
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

const settingsStore = useSettingsStore();
const preferencesStore = usePreferencesStore();

onMounted(async () => {
    await settingsStore.fetchSettings();
});

const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();
const { t: $t } = useI18n();
const router = useRouter();

const form = ref({
    email: '',
    password: '',
    turnstile_token: '',
});
const loading = ref(false);
const error = ref('');
const success = ref('');

function validateForm(): string | null {
    if (!form.value.email || !form.value.password) {
        return $t('api_errors.MISSING_REQUIRED_FIELDS');
    }
    if (settingsStore.turnstile_enabled) {
        if (!form.value.turnstile_token) {
            return $t('api_errors.TURNSTILE_TOKEN_REQUIRED');
        }
    }
    if (typeof form.value.email !== 'string') {
        return $t('api_errors.INVALID_DATA_TYPE_EMAIL');
    }
    if (typeof form.value.password !== 'string') {
        return $t('api_errors.INVALID_DATA_TYPE_PASSWORD');
    }
    form.value.email = form.value.email.trim();
    form.value.password = form.value.password.trim();
    if (form.value.email.length < 3) {
        return $t('api_errors.INVALID_DATA_LENGTH_MIN_EMAIL');
    }
    if (form.value.email.length > 255) {
        return $t('api_errors.INVALID_DATA_LENGTH_MAX_EMAIL');
    }
    if (form.value.password.length < 8) {
        return $t('api_errors.INVALID_DATA_LENGTH_MIN_PASSWORD');
    }
    if (form.value.password.length > 255) {
        return $t('api_errors.INVALID_DATA_LENGTH_MAX_PASSWORD');
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.value.email)) {
        return $t('api_errors.INVALID_EMAIL_ADDRESS');
    }
    return null;
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
    const validationError = validateForm();
    if (validationError) {
        error.value = validationError;
        return;
    }
    loading.value = true;
    try {
        const payload = {
            email: form.value.email,
            password: form.value.password,
            turnstile_token: form.value.turnstile_token,
        };
        const res = await axios.put('/api/user/auth/login', payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        if (res.data && res.data.success) {
            success.value = res.data.message || 'Login successful! Redirecting...';

            // Load and sync user preferences after successful login
            try {
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

            // Optionally redirect after a short delay
            const redirect = router.currentRoute.value.query.redirect as string;
            setTimeout(() => {
                window.location.href = redirect || '/';
            }, 1200);
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
            await router.push({ name: 'VerifyTwoFactor', query: { email: form.value.email } });
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
        <form @submit="onSubmit">
            <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-4">
                    <div class="grid gap-3">
                        <Label for="email">{{ $t('auth.email') }}</Label>
                        <Input id="email" v-model="form.email" type="email" required />
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
                        :data-umami-event-email="form.email"
                    >
                        <span v-if="loading">{{ $t('auth.loggingIn') }}</span>
                        <span v-else>{{ $t('auth.login') }}</span>
                    </Button>
                    <div v-if="error" class="text-center text-sm text-red-500">{{ error }}</div>
                    <div v-if="success" class="text-center text-sm text-green-500">{{ success }}</div>
                    <div v-if="settingsStore.smtpEnabled" class="text-center text-sm">
                        <router-link
                            to="/auth/forgot-password"
                            class="underline underline-offset-4"
                            data-umami-event="Forgot password link"
                        >
                            {{ $t('auth.forgotPassword') }}
                        </router-link>
                    </div>
                    <div v-if="settingsStore.registrationEnabled" class="text-center text-sm">
                        {{ $t('auth.noAccount') }}
                        <router-link
                            to="/auth/register"
                            class="underline underline-offset-4"
                            data-umami-event="Register link"
                        >
                            {{ $t('auth.register') }}
                        </router-link>
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
