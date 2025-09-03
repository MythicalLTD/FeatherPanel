<script setup lang="ts">
import { ref, type HTMLAttributes } from 'vue';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Turnstile from 'vue-turnstile';
import { useSettingsStore } from '@/stores/settings';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const settingsStore = useSettingsStore();
const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();
const { t } = useI18n();
const router = useRouter();

const email = ref<string>((router.currentRoute.value.query.email as string) || '');
const code = ref('');
const loading = ref(false);
const error = ref('');
const success = ref('');
const form = ref({
    turnstile_token: '',
    code: '',
});

async function verify2FA(e: Event) {
    e.preventDefault();
    error.value = '';
    success.value = '';
    loading.value = true;
    try {
        const res = await axios.post('/api/user/auth/two-factor', {
            email: email.value,
            code: code.value,
            turnstile_token: form.value.turnstile_token,
        });
        if (res.data && res.data.success) {
            success.value = t('api_errors.TWO_FACTOR_ENABLED_SUCCESS');
            setTimeout(() => router.replace('/dashboard'), 1200);
        } else {
            error.value = t(`api_errors.${res.data.error_code}`) || t('api_errors.INVALID_CODE');
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
        <form @submit="verify2FA">
            <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-4">
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
</template>
