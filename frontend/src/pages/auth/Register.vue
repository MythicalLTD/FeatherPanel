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

import { computed, onMounted, ref, type HTMLAttributes } from 'vue';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Turnstile from 'vue-turnstile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();
import { useSettingsStore } from '@/stores/settings';
import { usePreferencesStore } from '@/stores/preferences';

const settingsStore = useSettingsStore();
const preferencesStore = usePreferencesStore();
const { t: $t } = useI18n();
const router = useRouter();

onMounted(async () => {
    await settingsStore.fetchSettings();

    // Fetch plugin widgets
    await fetchPluginWidgets();
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

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('auth-register');
const widgetsTopOfPage = computed(() => getWidgets('auth-register', 'top-of-page'));
const widgetsBeforeForm = computed(() => getWidgets('auth-register', 'before-form'));
const widgetsAfterForm = computed(() => getWidgets('auth-register', 'after-form'));
const widgetsBottomOfPage = computed(() => getWidgets('auth-register', 'bottom-of-page'));

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
        if (settingsStore.turnstile_enabled) {
            payload.turnstile_token = form.value.turnstile_token;
        }
        const res = await axios.put('/api/user/auth/register', payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        if (res.data && res.data.success) {
            success.value = res.data.message || $t('auth.registrationSuccess');

            // Load and sync user preferences after successful registration (user is auto-logged in)
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
                console.log('[Register] Auto-sync enabled for user preferences');
            } catch (prefError) {
                console.error('Failed to sync user preferences:', prefError);
                // Don't block registration if preferences fail to sync
            }

            // Navigate immediately (no delay needed with router)
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
</script>

<template>
    <div :class="cn('flex flex-col gap-6', props.class)">
        <!-- Plugin Widgets: Top of Page -->
        <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

        <!-- Plugin Widgets: Before Form -->
        <WidgetRenderer v-if="widgetsBeforeForm.length > 0" :widgets="widgetsBeforeForm" />

        <form @submit.prevent="onSubmit">
            <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-4">
                    <div class="flex flex-col md:flex-row gap-3">
                        <div class="w-full md:w-1/2 flex flex-col gap-2">
                            <Label for="firstName">{{ $t('auth.firstName') }}</Label>
                            <Input
                                id="firstName"
                                v-model="form.first_name"
                                type="text"
                                required
                                minlength="3"
                                maxlength="64"
                            />
                        </div>
                        <div class="w-full md:w-1/2 flex flex-col gap-2">
                            <Label for="lastName">{{ $t('auth.lastName') }}</Label>
                            <Input
                                id="lastName"
                                v-model="form.last_name"
                                type="text"
                                required
                                minlength="3"
                                maxlength="64"
                            />
                        </div>
                    </div>
                    <div class="grid gap-3">
                        <Label for="email">{{ $t('auth.email') }}</Label>
                        <Input id="email" v-model="form.email" type="email" required minlength="3" maxlength="255" />
                    </div>
                    <div class="grid gap-3">
                        <Label for="username">{{ $t('auth.username') }}</Label>
                        <Input
                            id="username"
                            v-model="form.username"
                            type="text"
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
                            v-model="form.password"
                            type="password"
                            required
                            minlength="8"
                            maxlength="255"
                        />
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
                        data-umami-event="Register attempt"
                        :data-umami-event-email="form.email"
                        :data-umami-event-username="form.username"
                    >
                        <span v-if="loading">{{ $t('auth.registering') }}</span>
                        <span v-else>{{ $t('auth.register') }}</span>
                    </Button>
                    <div v-if="error" class="text-center text-sm text-red-500">{{ error }}</div>
                    <div v-if="success" class="text-center text-sm text-green-500">{{ success }}</div>
                    <div class="text-center text-sm">
                        {{ $t('auth.alreadyAccount') }}
                        <button
                            type="button"
                            class="underline underline-offset-4 cursor-pointer bg-transparent border-none p-0 text-inherit"
                            data-umami-event="Login link"
                            @click="router.push({ name: 'Login' })"
                        >
                            {{ $t('auth.login') }}
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
