<script setup lang="ts">
import { ref, onMounted, type HTMLAttributes } from 'vue';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from 'vue-i18n';
import Turnstile from 'vue-turnstile';
import { useSettingsStore } from '@/stores/settings';
import { useRouter } from 'vue-router';

const settingsStore = useSettingsStore();
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

const turnstileKey = settingsStore.settings?.turnstile_key_public as string;

function validateForm(): string | null {
    if (!form.value.email || !form.value.password) {
        return $t('api_errors.MISSING_REQUIRED_FIELDS');
    }
    if (settingsStore.settings?.turnstile_enabled == 'true') {
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
        };
        const res = await axios.put('/api/user/auth/login', payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        if (res.data && res.data.success) {
            success.value = res.data.message || 'Login successful! Redirecting...';
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
                        <Label for="email">Email</Label>
                        <Input id="email" v-model="form.email" type="email" :placeholder="'m@example.com'" required />
                    </div>
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
                    <Turnstile v-model="form.turnstile_token" :site-key="turnstileKey" />
                    <Button type="submit" class="w-full" :disabled="loading">
                        <span v-if="loading">Login...</span>
                        <span v-else>Login</span>
                    </Button>
                    <div v-if="error" class="text-center text-sm text-red-500">{{ error }}</div>
                    <div v-if="success" class="text-center text-sm text-green-500">{{ success }}</div>
                    <div class="text-center text-sm">
                        <router-link to="/auth/forgot-password" class="underline underline-offset-4">
                            Forgot Password?
                        </router-link>
                    </div>
                    <div class="text-center text-sm">
                        Don't have an account?
                        <router-link to="/auth/register" class="underline underline-offset-4"> Register </router-link>
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
