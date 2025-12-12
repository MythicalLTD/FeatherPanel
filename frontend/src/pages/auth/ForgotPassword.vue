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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Turnstile from 'vue-turnstile';
import { useSettingsStore } from '@/stores/settings';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { CheckCircle2 } from 'lucide-vue-next';

const settingsStore = useSettingsStore();
onMounted(async () => {
    await settingsStore.fetchSettings();

    // Fetch plugin widgets
    await fetchPluginWidgets();
});

const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();
const { t: $t } = useI18n();
const router = useRouter();
const form = ref({
    email: '',
    turnstile_token: '',
});
const loading = ref(false);
const error = ref('');
const showSuccessDialog = ref(false);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('auth-forgot-password');
const widgetsTopOfPage = computed(() => getWidgets('auth-forgot-password', 'top-of-page'));
const widgetsBeforeForm = computed(() => getWidgets('auth-forgot-password', 'before-form'));
const widgetsAfterForm = computed(() => getWidgets('auth-forgot-password', 'after-form'));
const widgetsBottomOfPage = computed(() => getWidgets('auth-forgot-password', 'bottom-of-page'));

function validateForm(): string | null {
    if (!form.value.email) {
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
    form.value.email = form.value.email.trim();
    if (form.value.email.length < 3) {
        return $t('api_errors.INVALID_DATA_LENGTH_MIN_EMAIL');
    }
    if (form.value.email.length > 255) {
        return $t('api_errors.INVALID_DATA_LENGTH_MAX_EMAIL');
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
    const validationError = validateForm();
    if (validationError) {
        error.value = validationError;
        return;
    }
    loading.value = true;
    try {
        const payload: Record<string, string> = {
            email: form.value.email,
        };
        if (settingsStore.turnstile_enabled) {
            payload.turnstile_token = form.value.turnstile_token;
        }
        const res = await axios.put('/api/user/auth/forgot-password', payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        if (res.data && res.data.success) {
            showSuccessDialog.value = true;
        } else {
            error.value = getErrorMessage(res.data);
        }
    } catch (err: unknown) {
        error.value = getErrorMessage(err);
    } finally {
        loading.value = false;
    }
}

function handleDialogClose() {
    showSuccessDialog.value = false;
    router.replace('/auth/login');
}
</script>

<template>
    <div :class="cn('flex flex-col gap-6', props.class)">
        <!-- Plugin Widgets: Top of Page -->
        <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

        <!-- Plugin Widgets: Before Form -->
        <WidgetRenderer v-if="widgetsBeforeForm.length > 0" :widgets="widgetsBeforeForm" />

        <form @submit="onSubmit">
            <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-4">
                    <div class="grid gap-3">
                        <Label for="email">{{ $t('auth.email') }}</Label>
                        <Input id="email" v-model="form.email" type="email" required />
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
                        data-umami-event="Forgot password request"
                        :data-umami-event-email="form.email"
                    >
                        <span v-if="loading">{{ $t('auth.sendingReset') }}</span>
                        <span v-else>{{ $t('auth.sendReset') }}</span>
                    </Button>
                    <div v-if="error" class="text-center text-sm text-red-500">{{ error }}</div>
                    <div class="text-center text-sm">
                        {{ $t('auth.remembered') }}
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

        <!-- Success Dialog -->
        <Dialog v-model:open="showSuccessDialog">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle class="flex items-center gap-2">
                        <div class="h-10 w-10 rounded-lg flex items-center justify-center bg-green-500/10">
                            <CheckCircle2 class="h-5 w-5 text-green-500" />
                        </div>
                        <span>{{ $t('auth.forgotPasswordSuccessTitle') }}</span>
                    </DialogTitle>
                    <DialogDescription class="text-sm">
                        {{ $t('auth.forgotPasswordSuccessMessage') }}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button class="w-full" @click="handleDialogClose">
                        {{ $t('auth.goToLogin') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>
