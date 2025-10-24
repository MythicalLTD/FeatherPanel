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
import Turnstile from 'vue-turnstile';
import { useSettingsStore } from '@/stores/settings';
import VueQrcode from 'vue-qrcode';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { useToast } from 'vue-toastification';

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
const loading = ref(false);

const form = ref({
    turnstile_token: '',
    code: '',
});

const router = useRouter();
onMounted(async () => {
    const ok = await sessionStore.checkSessionOrRedirect(router);
    if (!ok) return;
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

async function verify2FA(e: Event) {
    e.preventDefault();
    loading.value = true;
    try {
        const res = await axios.put('/api/user/auth/two-factor', {
            code: code.value,
            secret: secret.value,
            turnstile_token: form.value.turnstile_token,
        });
        if (res.data && res.data.success) {
            toast.success(t('api_errors.TWO_FACTOR_ENABLED_SUCCESS'));
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
        <div v-if="loading" class="text-center text-sm">{{ t('api_errors.TWO_FACTOR_LOADING') }}</div>
        <div v-else>
            <form @submit="verify2FA">
                <div class="flex flex-col gap-6">
                    <div class="flex flex-col gap-4">
                        <div class="text-center text-sm flex justify-center">
                            <vue-qrcode
                                :value="`otpauth://totp/NaysKutzu?secret=${secret}&issuer=${settingsStore.settings?.app_name}`"
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
                                type="password"
                                :placeholder="t('api_errors.TWO_FACTOR_CODE_PLACEHOLDER')"
                                required
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
        </div>
    </div>
</template>
