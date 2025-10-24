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
import { useRoute, useRouter } from 'vue-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from 'vue-i18n';
import Turnstile from 'vue-turnstile';
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();

const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();
const { t: $t } = useI18n();
const route = useRoute();
const router = useRouter();
const form = ref({
    password: '',
    confirmPassword: '',
    turnstile_token: '',
});
const loading = ref(true);
const error = ref('');
const success = ref('');
const tokenValid = ref(false);
const submitting = ref(false);

onMounted(async () => {
    await settingsStore.fetchSettings();
    const token = route.query.token as string;
    if (!token) {
        error.value = 'Token is required.';
        loading.value = false;
        return;
    }
    try {
        // Send token as a query parameter
        const res = await axios.get('/api/user/auth/reset-password', {
            params: { token },
        });
        if (res.data && res.data.success) {
            tokenValid.value = true;
        } else {
            error.value = res.data?.message || 'Invalid token.';
        }
    } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'response' in err) {
            const e = err as { response?: { data?: { error_message?: string; message?: string } }; message?: string };
            error.value =
                e.response?.data?.error_message ||
                e.response?.data?.message ||
                e.message ||
                'An unknown error occurred. Please try again.';
        } else if (typeof err === 'string') {
            error.value = err;
        } else {
            error.value = 'An unknown error occurred. Please try again.';
        }
    } finally {
        loading.value = false;
    }
});

function validateForm(): string | null {
    if (!form.value.password || !form.value.confirmPassword) {
        return $t('api_errors.MISSING_REQUIRED_FIELDS');
    }
    if (settingsStore.turnstile_enabled) {
        if (settingsStore.turnstile_enabled) {
            return $t('api_errors.TURNSTILE_TOKEN_REQUIRED');
        }
    }
    if (typeof form.value.password !== 'string') {
        return $t('api_errors.INVALID_DATA_TYPE_PASSWORD');
    }
    if (typeof form.value.confirmPassword !== 'string') {
        return $t('api_errors.INVALID_DATA_TYPE_PASSWORD');
    }
    if (form.value.password !== form.value.confirmPassword) {
        return $t('api_errors.PASSWORDS_DO_NOT_MATCH');
    }
    if (form.value.password.length < 8) {
        return $t('api_errors.INVALID_DATA_LENGTH_MIN_PASSWORD');
    }
    if (form.value.password.length > 255) {
        return $t('api_errors.INVALID_DATA_LENGTH_MAX_PASSWORD');
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
                case 'PASSWORDS_DO_NOT_MATCH':
                    return $t('api_errors.PASSWORDS_DO_NOT_MATCH');
                case 'INVALID_DATA_LENGTH_MIN':
                    return $t('api_errors.INVALID_DATA_LENGTH_MIN_PASSWORD');
                case 'INVALID_DATA_LENGTH_MAX':
                    return $t('api_errors.INVALID_DATA_LENGTH_MAX_PASSWORD');
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
    submitting.value = true;
    try {
        const token = route.query.token as string;
        const payload = {
            token,
            password: form.value.password,
        };
        const res = await axios.put('/api/user/auth/reset-password', payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        if (res.data && res.data.success) {
            success.value = res.data.message || 'Password reset successful.';
            router.push('/auth/login');
        } else {
            error.value = getErrorMessage(res.data);
        }
    } catch (err: unknown) {
        error.value = getErrorMessage(err);
    } finally {
        submitting.value = false;
    }
}
</script>

<template>
    <div :class="cn('flex flex-col gap-6', props.class)">
        <div v-if="loading" class="text-center text-sm">{{ $t('common.loading') }}</div>
        <div v-else>
            <form v-if="tokenValid" @submit="onSubmit">
                <div class="flex flex-col gap-6">
                    <div class="flex flex-col gap-4">
                        <div class="grid gap-3">
                            <Label for="password">{{ $t('auth.password') }}</Label>
                            <Input id="password" v-model="form.password" type="password" required />
                        </div>
                        <div class="grid gap-3">
                            <Label for="confirmPassword">{{ $t('auth.confirmPassword') }}</Label>
                            <Input id="confirmPassword" v-model="form.confirmPassword" type="password" required />
                        </div>
                        <Turnstile
                            v-if="settingsStore.turnstile_enabled"
                            v-model="form.turnstile_token"
                            :site-key="settingsStore.turnstile_key_pub as string"
                        />
                        <Button
                            type="submit"
                            class="w-full"
                            :disabled="submitting"
                            data-umami-event="Password reset completion"
                        >
                            <span v-if="submitting">{{ $t('auth.resettingPassword') }}</span>
                            <span v-else>{{ $t('auth.reset') }}</span>
                        </Button>
                        <div v-if="error" class="text-center text-sm text-red-500">{{ error }}</div>
                        <div v-if="success" class="text-center text-sm text-green-500">{{ success }}</div>
                        <div class="text-center text-sm">
                            {{ $t('auth.remembered') }}
                            <router-link
                                to="/auth/login"
                                class="underline underline-offset-4"
                                data-umami-event="Login link"
                            >
                                {{ $t('auth.login') }}
                            </router-link>
                        </div>
                    </div>
                </div>
            </form>
            <div v-else class="text-center text-sm text-red-500">
                {{ error || $t('auth.invalidToken') }}
            </div>
        </div>
    </div>
</template>
