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
    const requiredFields: Array<keyof typeof form.value> = ['username', 'email', 'password', 'first_name', 'last_name'];
    for (const field of requiredFields) {
        if (!form.value[field] || form.value[field].trim() === '') {
            return $t('api_errors.MISSING_REQUIRED_FIELDS');
        }
    }
    for (const field of requiredFields) {
        if (typeof form.value[field] !== 'string') {
            switch (field) {
                case 'email':
                    return $t('api_errors.INVALID_DATA_TYPE_EMAIL');
                case 'password':
                    return $t('api_errors.INVALID_DATA_TYPE_PASSWORD');
                case 'username':
                    return $t('api_errors.INVALID_DATA_TYPE_USERNAME');
                case 'first_name':
                    return $t('api_errors.INVALID_DATA_TYPE_FIRST_NAME');
                case 'last_name':
                    return $t('api_errors.INVALID_DATA_TYPE_LAST_NAME');
            }
        }
        form.value[field] = form.value[field].trim();
    }
    const lengthRules: Record<keyof typeof form.value, [number, number]> = {
        username: [3, 64],
        email: [3, 255],
        first_name: [3, 64],
        last_name: [3, 64],
        password: [8, 255],
        turnstile_token: [0, 255],
    };
    for (const field of requiredFields) {
        const [min, max] = lengthRules[field];
        const len = form.value[field].length;
        if (len < min) {
            switch (field) {
                case 'email':
                    return $t('api_errors.INVALID_DATA_LENGTH_MIN_EMAIL');
                case 'password':
                    return $t('api_errors.INVALID_DATA_LENGTH_MIN_PASSWORD');
                case 'username':
                    return $t('api_errors.INVALID_DATA_LENGTH_MIN_USERNAME');
                case 'first_name':
                    return $t('api_errors.INVALID_DATA_LENGTH_MIN_FIRST_NAME');
                case 'last_name':
                    return $t('api_errors.INVALID_DATA_LENGTH_MIN_LAST_NAME');
            }
        }
        if (len > max) {
            switch (field) {
                case 'email':
                    return $t('api_errors.INVALID_DATA_LENGTH_MAX_EMAIL');
                case 'password':
                    return $t('api_errors.INVALID_DATA_LENGTH_MAX_PASSWORD');
                case 'username':
                    return $t('api_errors.INVALID_DATA_LENGTH_MAX_USERNAME');
                case 'first_name':
                    return $t('api_errors.INVALID_DATA_LENGTH_MAX_FIRST_NAME');
                case 'last_name':
                    return $t('api_errors.INVALID_DATA_LENGTH_MAX_LAST_NAME');
            }
        }
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.value.email)) {
        return $t('api_errors.INVALID_EMAIL_ADDRESS');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(form.value.username)) {
        return $t('api_errors.INVALID_USERNAME_FORMAT');
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
                case 'INVALID_USERNAME_FORMAT':
                    return $t('api_errors.INVALID_USERNAME_FORMAT');
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
            success.value = res.data.message || 'Registration successful!';
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
                            <Label for="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                v-model="form.first_name"
                                type="text"
                                :placeholder="'First Name'"
                                required
                                minlength="3"
                                maxlength="64"
                            />
                        </div>
                        <div class="w-full md:w-1/2 flex flex-col gap-2">
                            <Label for="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                v-model="form.last_name"
                                type="text"
                                :placeholder="'Last Name'"
                                required
                                minlength="3"
                                maxlength="64"
                            />
                        </div>
                    </div>
                    <div class="grid gap-3">
                        <Label for="email">Email</Label>
                        <Input
                            id="email"
                            v-model="form.email"
                            type="email"
                            :placeholder="'m@example.com'"
                            required
                            minlength="3"
                            maxlength="255"
                        />
                    </div>
                    <div class="grid gap-3">
                        <Label for="username">Username</Label>
                        <Input
                            id="username"
                            v-model="form.username"
                            type="text"
                            :placeholder="'username'"
                            required
                            minlength="3"
                            maxlength="64"
                            pattern="^[a-zA-Z0-9_]+$"
                        />
                    </div>
                    <div class="grid gap-3">
                        <Label for="password">Password</Label>
                        <Input
                            id="password"
                            v-model="form.password"
                            type="password"
                            :placeholder="'********'"
                            required
                            minlength="8"
                            maxlength="255"
                        />
                    </div>
                    <Turnstile v-model="form.turnstile_token" :site-key="turnstileKey" />
                    <Button type="submit" class="w-full" :disabled="loading">
                        <span v-if="loading">Register...</span>
                        <span v-else>Register</span>
                    </Button>
                    <div v-if="error" class="text-center text-sm text-red-500">{{ error }}</div>
                    <div v-if="success" class="text-center text-sm text-green-500">{{ success }}</div>
                    <div class="text-center text-sm">
                        Already have an account?
                        <router-link to="/auth/login" class="underline underline-offset-4"> Login </router-link>
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
