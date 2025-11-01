<template>
    <div class="space-y-6">
        <!-- Plugin Widgets: Settings Tab Top -->
        <WidgetRenderer v-if="widgetsTop.length > 0" :widgets="widgetsTop" />

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
                        <div
                            v-if="user?.two_fa_enabled === 'true'"
                            class="mt-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800"
                        >
                            <div class="flex items-center space-x-2">
                                <Check class="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span class="text-sm text-green-800 dark:text-green-200">{{
                                    $t('account.twoFactorEnabled')
                                }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <Button
                            v-if="user?.two_fa_enabled !== 'true'"
                            variant="outline"
                            size="sm"
                            class="w-full sm:w-auto"
                            :disabled="isSubmitting"
                            data-umami-event="Enable 2FA"
                            @click="handleEnable2FA"
                        >
                            Enable 2FA
                        </Button>
                        <Button
                            v-else
                            variant="destructive"
                            size="sm"
                            class="w-full sm:w-auto"
                            :disabled="isSubmitting"
                            data-umami-event="Disable 2FA"
                            @click="handleDisable2FA"
                        >
                            Disable 2FA
                        </Button>
                    </div>
                </div>
            </div>

            <!-- Discord OAuth -->
            <div v-if="settingsStore.discordOAuthEnabled" class="space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div class="space-y-1 flex-1">
                        <h4 class="text-sm font-medium">Discord Account</h4>
                        <p class="text-sm text-muted-foreground">Link or unlink your Discord account</p>
                        <div v-if="user?.discord_oauth2_linked === 'true'" class="mt-2">
                            <p class="text-sm text-muted-foreground">
                                <span class="font-medium">Linked as:</span>
                                {{ user?.discord_oauth2_name || 'Unknown' }}
                            </p>
                        </div>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <Button
                            v-if="user?.discord_oauth2_linked !== 'true'"
                            variant="outline"
                            size="sm"
                            class="w-full sm:w-auto"
                            :disabled="isSubmitting"
                            data-umami-event="Link Discord"
                            @click="handleLinkDiscord"
                        >
                            Link Discord
                        </Button>
                        <Button
                            v-else
                            variant="destructive"
                            size="sm"
                            class="w-full sm:w-auto"
                            :disabled="isSubmitting"
                            data-umami-event="Unlink Discord"
                            @click="handleUnlinkDiscord"
                        >
                            Unlink Discord
                        </Button>
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

        <!-- Plugin Widgets: Settings Tab Bottom -->
        <WidgetRenderer v-if="widgetsBottom.length > 0" :widgets="widgetsBottom" />
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
import { useSettingsStore } from '@/stores/settings';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-vue-next';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import type { UserInfo } from '@/stores/session';

const { t: $t } = useI18n();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();
const router = useRouter();
const toast = useToast();

// Form state
const isSubmitting = ref(false);
const loading = ref(true);

// Computed user data with proper typing
const user = computed<UserInfo | null>(() => sessionStore.user);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('account');
const widgetsTop = computed(() => getWidgets('account', 'settings-top'));
const widgetsBottom = computed(() => getWidgets('account', 'settings-bottom'));

// Handle Enable 2FA
const handleEnable2FA = () => {
    router.push('/auth/setup-two-factor');
};

// Handle Disable 2FA
const handleDisable2FA = async () => {
    try {
        isSubmitting.value = true;
        const response = await axios.patch('/api/user/session', {
            two_fa_enabled: false,
        });
        if (response.data && response.data.success) {
            toast.success('2FA disabled successfully');
            // Refresh session to update user data
            await sessionStore.checkSessionOrRedirect();
        } else {
            toast.error('Failed to disable 2FA');
        }
    } catch (error) {
        console.error('Error disabling 2FA:', error);
        toast.error('Failed to disable 2FA');
    } finally {
        isSubmitting.value = false;
    }
};

// Handle Discord link
const handleLinkDiscord = () => {
    window.location.href = '/api/user/auth/discord/login';
};

// Handle Discord unlink
const handleUnlinkDiscord = async () => {
    try {
        isSubmitting.value = true;
        const response = await axios.delete('/api/user/auth/discord/unlink');
        if (response.data && response.data.success) {
            toast.success('Discord account unlinked successfully');
            // Refresh session to update user data
            await sessionStore.checkSessionOrRedirect();
        } else {
            toast.error('Failed to unlink Discord account');
        }
    } catch (error) {
        console.error('Error unlinking Discord:', error);
        toast.error('Failed to unlink Discord account');
    } finally {
        isSubmitting.value = false;
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
        await settingsStore.fetchSettings();

        // Fetch plugin widgets
        await fetchPluginWidgets();
    } finally {
        loading.value = false;
    }
});
</script>
