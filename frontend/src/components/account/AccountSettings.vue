<template>
    <div class="space-y-6">
        <div>
            <h3 class="text-lg font-semibold">{{ $t('account.securitySettings') }}</h3>
            <p class="text-sm text-muted-foreground">{{ $t('account.securitySettingsDescription') }}</p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="flex items-center gap-3">
                <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                <span class="text-muted-foreground">{{ $t('account.loadingSettings') }}</span>
            </div>
        </div>

        <div v-else class="space-y-6">
            <!-- Two-Factor Authentication -->
            <div class="space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div class="space-y-1 flex-1">
                        <h4 class="text-sm font-medium">{{ $t('account.twoFactorAuth') }}</h4>
                        <p class="text-sm text-muted-foreground">{{ $t('account.twoFactorHint') }}</p>
                    </div>
                    <div class="flex items-center space-x-2 shrink-0">
                        <Checkbox
                            id="two_fa_enabled"
                            :checked="user?.two_fa_enabled === 'true'"
                            :disabled="isSubmitting"
                            data-umami-event="2FA toggle"
                            @update:checked="handle2FAChange"
                        />
                        <Label for="two_fa_enabled">{{ $t('account.enabled') }}</Label>
                    </div>
                </div>

                <div
                    v-if="user?.two_fa_enabled === 'true'"
                    class="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800"
                >
                    <div class="flex items-center space-x-2">
                        <Check class="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span class="text-sm text-green-800 dark:text-green-200">{{
                            $t('account.twoFactorEnabled')
                        }}</span>
                    </div>
                </div>
            </div>

            <!-- Session Management -->
            <div class="space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div class="space-y-1 flex-1">
                        <h4 class="text-sm font-medium">{{ $t('account.sessionManagement') }}</h4>
                        <p class="text-sm text-muted-foreground">{{ $t('account.sessionManagementDescription') }}</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        class="w-full sm:w-auto"
                        :disabled="isSubmitting"
                        data-umami-event="Logout"
                        @click="handleLogout"
                    >
                        {{ $t('account.logout') }}
                    </Button>
                </div>
            </div>
        </div>
    </div>
</template>

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

import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSessionStore } from '@/stores/session';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Check } from 'lucide-vue-next';
import type { UserInfo } from '@/stores/session';

const { t: $t } = useI18n();
const sessionStore = useSessionStore();
const router = useRouter();
const toast = useToast();

// Form state
const isSubmitting = ref(false);
const loading = ref(true);

// Computed user data with proper typing
const user = computed<UserInfo | null>(() => sessionStore.user);

// Handle 2FA checkbox change
const handle2FAChange = (checked: boolean) => {
    if (checked) {
        router.push('/auth/setup-two-factor');
    }
};

// Handle logout
const handleLogout = async () => {
    try {
        isSubmitting.value = true;
        await sessionStore.logout();
        router.push('/auth/login');
    } catch (error) {
        console.error('Error during logout:', error);
        toast.error($t('account.logoutError'));
    } finally {
        isSubmitting.value = false;
    }
};

// Initialize on mount
onMounted(async () => {
    try {
        loading.value = true;
        await sessionStore.checkSessionOrRedirect();
    } finally {
        loading.value = false;
    }
});
</script>
