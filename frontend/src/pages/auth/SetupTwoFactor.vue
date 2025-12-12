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
import Turnstile from 'vue-turnstile';
import { useSettingsStore } from '@/stores/settings';
import VueQrcode from 'vue-qrcode';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useSessionStore, type UserInfo } from '@/stores/session';
import { useToast } from 'vue-toastification';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';

const user = computed<UserInfo | null>(() => sessionStore.user);
const settingsStore = useSettingsStore();
const sessionStore = useSessionStore();
const toast = useToast();

const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();

const { t } = useI18n();

const qrCodeUrl = ref('');
const secret = ref('');
const code = ref('');
const loading = ref(true);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('auth-setup-two-factor');
const widgetsTopOfPage = computed(() => getWidgets('auth-setup-two-factor', 'top-of-page'));
const widgetsBeforeForm = computed(() => getWidgets('auth-setup-two-factor', 'before-form'));
const widgetsAfterForm = computed(() => getWidgets('auth-setup-two-factor', 'after-form'));
const widgetsBottomOfPage = computed(() => getWidgets('auth-setup-two-factor', 'bottom-of-page'));

const form = ref({
    turnstile_token: '',
    code: '',
});

const router = useRouter();
onMounted(async () => {
    const ok = await sessionStore.checkSessionOrRedirect(router);
    if (!ok) return;

    // Fetch plugin widgets
    await fetchPluginWidgets();

    loading.value = true;
    try {
        const res = await axios.request({
            url: '/api/user/auth/two-factor',
            method: 'GET',
        });
        if (res.data && res.data.success) {
            qrCodeUrl.value = res.data.data.qr_code_url;
            secret.value = res.data.data.secret;
        } else {
            toast.error(t('api_errors.TWO_FACTOR_SETUP_FAILED'));
        }
    } catch (err: unknown) {
        const code = (err as { response?: { data?: { error_code?: string } } }).response?.data?.error_code;
        if (code === 'TWO_FACTOR_AUTH_ENABLED') {
            toast.error(
                `${t('api_errors.TWO_FACTOR_AUTH_ENABLED_TITLE')}: ${t('api_errors.TWO_FACTOR_AUTH_ENABLED_TEXT')}`,
                {
                    timeout: 1500,
                },
            );
            router.replace({ path: '/dashboard', query: { e: t('api_errors.TWO_FACTOR_AUTH_ENABLED_TITLE') } });
            return;
        }
        toast.error(t('api_errors.TWO_FACTOR_SETUP_FAILED') + ' ' + code);
    } finally {
        loading.value = false;
    }
});

function validateForm(): string | null {
    if (!code.value || code.value.trim() === '') {
        return t('api_errors.MISSING_REQUIRED_FIELDS');
    }
    if (code.value.length !== 6) {
        return t('api_errors.INVALID_CODE');
    }
    if (settingsStore.turnstile_enabled) {
        if (!form.value.turnstile_token) {
            return t('api_errors.TURNSTILE_TOKEN_REQUIRED');
        }
    }
    return null;
}

async function verify2FA(e: Event) {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
        toast.error(validationError);
        return;
    }
    loading.value = true;
    try {
        const payload: Record<string, string> = {
            code: code.value,
            secret: secret.value,
        };
        if (settingsStore.turnstile_enabled) {
            payload.turnstile_token = form.value.turnstile_token;
        }
        const res = await axios.put('/api/user/auth/two-factor', payload);
        if (res.data && res.data.success) {
            toast.success(t('api_errors.TWO_FACTOR_ENABLED_SUCCESS'));

            // Redirect after a short delay
            const redirect = router.currentRoute.value.query.redirect as string;
            setTimeout(() => {
                if (redirect && redirect.startsWith('/')) {
                    router.replace(redirect);
                } else {
                    router.replace('/');
                }
            }, 1200);
        } else {
            toast.error(t(`api_errors.${res.data.code}`) || t('api_errors.INVALID_CODE'));
        }
    } catch {
        toast.error(t('api_errors.TWO_FACTOR_VERIFY_FAILED'));
    } finally {
        loading.value = false;
    }
}
</script>
<template>
    <div :class="cn('flex flex-col gap-6', props.class)">
        <!-- Plugin Widgets: Top of Page -->
        <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

        <div v-if="loading" class="text-center text-sm">{{ t('api_errors.TWO_FACTOR_LOADING') }}</div>
        <div v-else>
            <!-- Plugin Widgets: Before Form -->
            <WidgetRenderer v-if="widgetsBeforeForm.length > 0" :widgets="widgetsBeforeForm" />
            <form @submit="verify2FA">
                <div class="flex flex-col gap-6">
                    <div class="flex flex-col gap-4">
                        <div class="text-center text-sm flex justify-center">
                            <vue-qrcode
                                :value="`otpauth://totp/${user?.email}?secret=${secret}&issuer=${settingsStore.settings?.app_name}`"
                                type="image/png"
                                :color="{ dark: '#000000', light: '#ffffff' }"
                            />
                        </div>
                        <div class="text-center text-sm">{{ t('api_errors.TWO_FACTOR_SCAN_QR') }}</div>
                        <div class="text-center text-sm">{{ t('api_errors.TWO_FACTOR_ENTER_MANUALLY') }}</div>
                        <div class="text-center text-sm">
                            <code>{{ secret }}</code>
                        </div>
                        <div class="grid gap-3">
                            <Label for="code">{{ t('api_errors.TWO_FACTOR_CODE_LABEL') }}</Label>
                            <Input
                                id="code"
                                v-model="code"
                                type="text"
                                autocomplete="one-time-code"
                                name="otp"
                                inputmode="numeric"
                                :placeholder="t('api_errors.TWO_FACTOR_CODE_PLACEHOLDER')"
                                required
                                @input="code = code.replace(/\D/g, '')"
                            />
                        </div>
                        <div v-if="settingsStore.turnstile_enabled" class="grid gap-3">
                            <Turnstile
                                v-model="form.turnstile_token"
                                :site-key="settingsStore.turnstile_key_pub as string"
                            />
                        </div>
                        <Button type="submit" class="w-full" :disabled="loading" data-umami-event="2FA setup attempt">
                            <span v-if="loading">{{ t('api_errors.TWO_FACTOR_LOADING') }}</span>
                            <span v-else>{{ t('api_errors.TWO_FACTOR_VERIFY_BUTTON') }}</span>
                        </Button>
                    </div>
                </div>
            </form>

            <!-- Plugin Widgets: After Form -->
            <WidgetRenderer v-if="widgetsAfterForm.length > 0" :widgets="widgetsAfterForm" />
        </div>

        <!-- Plugin Widgets: Bottom of Page -->
        <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
    </div>
</template>
