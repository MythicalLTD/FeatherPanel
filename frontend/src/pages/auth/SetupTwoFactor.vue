<script setup lang="ts">
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
import Swal from 'sweetalert2';

const settingsStore = useSettingsStore();
const sessionStore = useSessionStore();

const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();

const { t } = useI18n();

const turnstileKey = settingsStore.settings?.turnstile_key_public as string;

const qrCodeUrl = ref('');
const secret = ref('');
const code = ref('');
const loading = ref(false);
const error = ref('');
const success = ref('');

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
            error.value = t('api_errors.TWO_FACTOR_SETUP_FAILED');
        }
    } catch (err: unknown) {
        const code = (err as { response?: { data?: { error_code?: string } } }).response?.data?.error_code;
        if (code === 'TWO_FACTOR_AUTH_ENABLED') {
            Swal.fire({
                title: t('api_errors.TWO_FACTOR_AUTH_ENABLED_TITLE'),
                text: t('api_errors.TWO_FACTOR_AUTH_ENABLED_TEXT'),

                icon: 'error',
                timer: 1500,
                showConfirmButton: false,
            });
            router.replace({ path: '/dashboard', query: { e: t('api_errors.TWO_FACTOR_AUTH_ENABLED_TITLE') } });
            return;
        }
        error.value = t('api_errors.TWO_FACTOR_SETUP_FAILED') + ' ' + code;
    } finally {
        loading.value = false;
    }
});

function onDataUrlChange(dataUrl: string) {
    console.log(dataUrl);
}

async function verify2FA(e: Event) {
    e.preventDefault();
    error.value = '';
    success.value = '';
    loading.value = true;
    try {
        const res = await axios.put('/api/user/auth/two-factor', {
            code: code.value,
            secret: secret.value,
            turnstile_token: form.value.turnstile_token,
        });
        if (res.data && res.data.success) {
            success.value = t('api_errors.TWO_FACTOR_ENABLED_SUCCESS');
        } else {
            error.value = t(`api_errors.${res.data.code}`) || t('api_errors.INVALID_CODE');
        }
    } catch {
        error.value = t('api_errors.TWO_FACTOR_VERIFY_FAILED');
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
                                @change="onDataUrlChange"
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
                        <div class="grid gap-3">
                            <Turnstile v-model="form.turnstile_token" :site-key="turnstileKey" />
                        </div>
                        <Button type="submit" class="w-full" :disabled="loading">
                            <span v-if="loading">{{ t('api_errors.TWO_FACTOR_LOADING') }}</span>
                            <span v-else>{{ t('api_errors.TWO_FACTOR_VERIFY_BUTTON') }}</span>
                        </Button>
                        <div v-if="error" class="text-center text-sm text-red-500">{{ error }}</div>
                        <div v-if="success" class="text-center text-sm text-green-500">{{ success }}</div>
                    </div>
                </div>
            </form>
        </div>
    </div>
</template>
