<script setup lang="ts">
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
const turnstileEnabled = settingsStore.settings?.turnstile_enabled as boolean;
const turnstileKey = settingsStore.turnstileKeyPub as string;

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
            console.log(error.value);
            console.log('Provided token: ' + token);
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
    if (settingsStore.settings?.turnstile_enabled == 'true') {
        if (!form.value.turnstile_token) {
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
        <div v-if="loading" class="text-center text-sm">Loading...</div>
        <div v-else>
            <form v-if="tokenValid" @submit="onSubmit">
                <div class="flex flex-col gap-6">
                    <div class="flex flex-col gap-4">
                        <div class="grid gap-3">
                            <Label for="password">Password</Label>
                            <Input
                                id="password"
                                v-model="form.password"
                                type="password"
                                :placeholder="'********'"
                                required
                            />
                        </div>
                        <div class="grid gap-3">
                            <Label for="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                v-model="form.confirmPassword"
                                type="password"
                                :placeholder="'********'"
                                required
                            />
                        </div>
                        <Turnstile v-if="turnstileEnabled" v-model="form.turnstile_token" :site-key="turnstileKey" />
                        <Button type="submit" class="w-full" :disabled="submitting">
                            <span v-if="submitting">Reset Password...</span>
                            <span v-else>Reset Password</span>
                        </Button>
                        <div v-if="error" class="text-center text-sm text-red-500">{{ error }}</div>
                        <div v-if="success" class="text-center text-sm text-green-500">{{ success }}</div>
                        <div class="text-center text-sm">
                            Remember your password?
                            <router-link to="/auth/login" class="underline underline-offset-4"> Login </router-link>
                        </div>
                    </div>
                </div>
            </form>
            <div v-else class="text-center text-sm text-red-500">
                {{ error || 'This password reset link is invalid or has expired.' }}
            </div>
        </div>
    </div>
</template>
