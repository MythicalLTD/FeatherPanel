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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';

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

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('auth-verify-two-factor');
const widgetsTopOfPage = computed(() => getWidgets('auth-verify-two-factor', 'top-of-page'));
const widgetsBeforeForm = computed(() => getWidgets('auth-verify-two-factor', 'before-form'));
const widgetsAfterForm = computed(() => getWidgets('auth-verify-two-factor', 'after-form'));
const widgetsBottomOfPage = computed(() => getWidgets('auth-verify-two-factor', 'bottom-of-page'));

onMounted(async () => {
    // Fetch plugin widgets
    await fetchPluginWidgets();
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
        });
        if (res.data && res.data.success) {
            success.value = t('api_errors.TWO_FACTOR_SUCCESS');
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
        <!-- Plugin Widgets: Top of Page -->
        <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

        <!-- Plugin Widgets: Before Form -->
        <WidgetRenderer v-if="widgetsBeforeForm.length > 0" :widgets="widgetsBeforeForm" />

        <form @submit="verify2FA">
            <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-4">
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
                    <Button
                        type="submit"
                        class="w-full"
                        :disabled="loading"
                        data-umami-event="2FA verification attempt"
                    >
                        <span v-if="loading">{{ t('api_errors.TWO_FACTOR_LOADING') }}</span>
                        <span v-else>{{ t('api_errors.TWO_FACTOR_VERIFY_BUTTON') }}</span>
                    </Button>
                    <div v-if="error" class="text-center text-sm text-red-500">{{ error }}</div>
                    <div v-if="success" class="text-center text-sm text-green-500">{{ success }}</div>
                </div>
            </div>
        </form>

        <!-- Plugin Widgets: After Form -->
        <WidgetRenderer v-if="widgetsAfterForm.length > 0" :widgets="widgetsAfterForm" />

        <!-- Plugin Widgets: Bottom of Page -->
        <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
    </div>
</template>
