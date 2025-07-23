<script setup lang="ts">
import { ref, type HTMLAttributes } from 'vue';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();
const { t: $t } = useI18n();

const form = ref({
    email: '',
    password: '',
});
const loading = ref(false);
const error = ref('');
const success = ref('');

function validateForm(): string | null {
    if (!form.value.email || !form.value.password) {
        return $t('api_errors.MISSING_REQUIRED_FIELDS');
    }
    if (typeof form.value.email !== 'string' || typeof form.value.password !== 'string') {
        return $t('api_errors.INVALID_DATA_TYPE');
    }
    form.value.email = form.value.email.trim();
    form.value.password = form.value.password.trim();
    if (form.value.email.length < 3 || form.value.email.length > 255) {
        return $t('api_errors.INVALID_DATA_LENGTH_MIN', { field: $t('auth.email'), min: 3 });
    }
    if (form.value.password.length < 8 || form.value.password.length > 255) {
        return $t('api_errors.INVALID_DATA_LENGTH_MIN', { field: $t('auth.password'), min: 8 });
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
        if (code && $t('api_errors.' + code) !== 'api_errors.' + code) {
            return $t('api_errors.' + code);
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
            success.value = res.data.message || $t('api_errors.LOGIN_SUCCESS');
            // Optionally redirect after a short delay
            setTimeout(() => {
                window.location.href = '/';
            }, 1200);
        } else {
            error.value = getErrorMessage(res.data);
        }
    } catch (err: unknown) {
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
                        <Input
                            id="email"
                            type="email"
                            :placeholder="$t('auth.emailPlaceholder')"
                            v-model="form.email"
                            required
                        />
                    </div>
                    <div class="grid gap-3">
                        <Label for="password">{{ $t('auth.password') }}</Label>
                        <Input
                            id="password"
                            type="password"
                            :placeholder="$t('auth.passwordPlaceholder')"
                            v-model="form.password"
                            required
                        />
                    </div>
                    <Button type="submit" class="w-full" :disabled="loading">
                        <span v-if="loading">{{ $t('auth.login') }}...</span>
                        <span v-else>{{ $t('auth.login') }}</span>
                    </Button>
                    <div v-if="error" class="text-center text-sm text-red-500">{{ error }}</div>
                    <div v-if="success" class="text-center text-sm text-green-500">{{ success }}</div>
                    <div class="text-center text-sm">
                        <router-link to="/auth/forgot-password" class="underline underline-offset-4">{{
                            $t('auth.forgotPassword')
                        }}</router-link>
                    </div>
                    <div class="text-center text-sm">
                        {{ $t('auth.noAccount') }}
                        <router-link to="/auth/register" class="underline underline-offset-4">
                            {{ $t('auth.register') }}
                        </router-link>
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
