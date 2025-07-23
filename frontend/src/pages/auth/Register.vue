<script setup lang="ts">
import { onMounted, ref, type HTMLAttributes } from 'vue';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Turnstile from 'vue-turnstile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from 'vue-i18n';
const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();
const { t: $t } = useI18n();

onMounted(async () => {
    await settingsStore.fetchSettings();
});

const form = ref({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: '',
    turnstile_token: '',
});
const loading = ref(false);
const error = ref('');
const success = ref('');

const turnstileKey = settingsStore.turnstileKeyPub as string;

function validateForm(): string | null {
    // Required fields
    const requiredFields: Array<keyof typeof form.value> = ['username', 'email', 'password', 'first_name', 'last_name'];
    for (const field of requiredFields) {
        if (!form.value[field] || form.value[field].trim() === '') {
            return $t('api_errors.MISSING_REQUIRED_FIELDS');
        }
    }
    // Type checks
    for (const field of requiredFields) {
        if (typeof form.value[field] !== 'string') {
            return $t('api_errors.INVALID_DATA_TYPE', { field: $t('auth.' + field) });
        }
        form.value[field] = form.value[field].trim();
    }
    // Length checks
    const lengthRules: Record<keyof typeof form.value, [number, number]> = {
        username: [3, 64],
        email: [3, 255],
        first_name: [3, 64],
        last_name: [3, 64],
        password: [8, 255],
        turnstile_token: [0, 255], // not validated here
    };
    for (const field of requiredFields) {
        const [min, max] = lengthRules[field];
        const len = form.value[field].length;
        if (len < min) {
            return $t('api_errors.INVALID_DATA_LENGTH_MIN', { field: $t('auth.' + field), min });
        }
        if (len > max) {
            return $t('api_errors.INVALID_DATA_LENGTH_MAX', { field: $t('auth.' + field), max });
        }
    }
    // Email format
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.value.email)) {
        return $t('api_errors.INVALID_EMAIL_ADDRESS');
    }
    // Username format
    if (!/^[a-zA-Z0-9_]+$/.test(form.value.username)) {
        return $t('api_errors.INVALID_USERNAME_FORMAT');
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
        const payload: Record<string, string> = {
            username: form.value.username,
            email: form.value.email,
            password: form.value.password,
            first_name: form.value.first_name,
            last_name: form.value.last_name,
        };
        if (form.value.turnstile_token) {
            payload.turnstile_token = form.value.turnstile_token;
        }
        const res = await axios.put('/api/user/auth/register', payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        if (res.data && res.data.success) {
            success.value = res.data.message || $t('api_errors.REGISTRATION_SUCCESS');
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
                    <div class="flex flex-col md:flex-row gap-3">
                        <div class="w-full md:w-1/2 flex flex-col gap-2">
                            <Label for="firstName">{{ $t('auth.firstName') }}</Label>
                            <Input
                                id="firstName"
                                type="text"
                                :placeholder="$t('auth.firstNamePlaceholder')"
                                v-model="form.first_name"
                                required
                                minlength="3"
                                maxlength="64"
                            />
                        </div>
                        <div class="w-full md:w-1/2 flex flex-col gap-2">
                            <Label for="lastName">{{ $t('auth.lastName') }}</Label>
                            <Input
                                id="lastName"
                                type="text"
                                :placeholder="$t('auth.lastNamePlaceholder')"
                                v-model="form.last_name"
                                required
                                minlength="3"
                                maxlength="64"
                            />
                        </div>
                    </div>
                    <div class="grid gap-3">
                        <Label for="email">{{ $t('auth.email') }}</Label>
                        <Input
                            id="email"
                            type="email"
                            :placeholder="$t('auth.emailPlaceholder')"
                            v-model="form.email"
                            required
                            minlength="3"
                            maxlength="255"
                        />
                    </div>
                    <div class="grid gap-3">
                        <Label for="username">{{ $t('auth.username') }}</Label>
                        <Input
                            id="username"
                            type="text"
                            :placeholder="$t('auth.usernamePlaceholder')"
                            v-model="form.username"
                            required
                            minlength="3"
                            maxlength="64"
                            pattern="^[a-zA-Z0-9_]+$"
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
                            minlength="8"
                            maxlength="255"
                        />
                    </div>
                    <Turnstile :siteKey="turnstileKey" v-model="form.turnstile_token" />
                    <Button type="submit" class="w-full" :disabled="loading">
                        <span v-if="loading">{{ $t('auth.register') }}...</span>
                        <span v-else>{{ $t('auth.register') }}</span>
                    </Button>
                    <div v-if="error" class="text-center text-sm text-red-500">{{ error }}</div>
                    <div v-if="success" class="text-center text-sm text-green-500">{{ success }}</div>
                    <div class="text-center text-sm">
                        {{ $t('auth.alreadyAccount') }}
                        <router-link to="/auth/login" class="underline underline-offset-4">
                            {{ $t('auth.login') }}
                        </router-link>
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
