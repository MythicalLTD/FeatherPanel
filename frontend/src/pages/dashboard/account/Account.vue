<template>
    <DashboardLayout :breadcrumbs="[{ text: $t('account.title'), isCurrent: true, href: '/dashboard/account' }]">
        <div class="flex flex-col gap-6 mt-6">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <div class="grid gap-6">
                <!-- Plugin Widgets: Before Profile Card -->
                <WidgetRenderer v-if="widgetsBeforeProfileCard.length > 0" :widgets="widgetsBeforeProfileCard" />

                <!-- Profile Information Card -->
                <Card>
                    <div class="p-4 sm:p-6">
                        <div class="flex flex-col items-center text-center gap-4">
                            <Avatar class="h-20 w-20 sm:h-24 sm:w-24">
                                <AvatarImage :src="user?.avatar || ''" :alt="user?.username || ''" />
                                <AvatarFallback class="text-lg sm:text-xl font-semibold">{{
                                    user?.username?.charAt(0)?.toUpperCase()
                                }}</AvatarFallback>
                            </Avatar>
                            <div class="space-y-2">
                                <h2 class="text-xl sm:text-2xl font-bold">{{ user?.username }}</h2>
                                <p class="text-muted-foreground text-sm sm:text-base">{{ user?.email }}</p>
                                <p class="text-xs sm:text-sm text-muted-foreground">
                                    {{ $t('account.memberSince') }} {{ formatDate(user?.first_seen) }}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                <!-- Plugin Widgets: After Profile Card -->
                <WidgetRenderer v-if="widgetsAfterProfileCard.length > 0" :widgets="widgetsAfterProfileCard" />

                <!-- Plugin Widgets: Before Tabs -->
                <WidgetRenderer v-if="widgetsBeforeTabs.length > 0" :widgets="widgetsBeforeTabs" />

                <!-- Tabs -->
                <Card>
                    <div class="p-4 sm:p-6">
                        <Tabs v-model="activeTab" class="w-full">
                            <!-- Mobile: Use dropdown/select for tabs -->
                            <div class="block sm:hidden mb-4">
                                <select
                                    v-model="activeTab"
                                    class="w-full p-3 rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                                >
                                    <option value="profile">{{ $t('account.profile') }}</option>
                                    <option value="settings">{{ $t('account.settings') }}</option>
                                    <option value="appearance">{{ $t('account.appearance') }}</option>
                                    <option value="ssh-keys">{{ $t('account.sshKeys.title') }}</option>
                                    <option value="api-keys">{{ $t('account.apiKeys.title') }}</option>
                                    <option value="activity">{{ $t('account.activity.title') }}</option>
                                    <option value="mail">{{ $t('account.mail.title') }}</option>
                                    <option value="licenses">Licenses & Third Party</option>
                                </select>
                            </div>

                            <!-- Desktop: Use normal tabs -->
                            <div class="hidden sm:block">
                                <TabsList class="grid w-full grid-cols-8">
                                    <TabsTrigger value="profile">{{ $t('account.profile') }}</TabsTrigger>
                                    <TabsTrigger value="settings">{{ $t('account.settings') }}</TabsTrigger>
                                    <TabsTrigger value="appearance">{{ $t('account.appearance') }}</TabsTrigger>
                                    <TabsTrigger value="ssh-keys">{{ $t('account.sshKeys.title') }}</TabsTrigger>
                                    <TabsTrigger value="api-keys">{{ $t('account.apiKeys.title') }}</TabsTrigger>
                                    <TabsTrigger value="activity">{{ $t('account.activity.title') }}</TabsTrigger>
                                    <TabsTrigger value="mail">{{ $t('account.mail.title') }}</TabsTrigger>
                                    <TabsTrigger value="licenses">Licenses</TabsTrigger>
                                </TabsList>
                            </div>
                            <TabsContent value="profile" class="mt-4 sm:mt-6">
                                <AccountProfile />
                            </TabsContent>
                            <TabsContent value="settings" class="mt-4 sm:mt-6">
                                <AccountSettings />
                            </TabsContent>
                            <TabsContent value="appearance" class="mt-4 sm:mt-6">
                                <AppearanceSettings />
                            </TabsContent>
                            <TabsContent value="ssh-keys" class="mt-4 sm:mt-6">
                                <SshKeys />
                            </TabsContent>
                            <TabsContent value="api-keys" class="mt-4 sm:mt-6">
                                <ApiKeys />
                            </TabsContent>
                            <TabsContent value="activity" class="mt-4 sm:mt-6">
                                <Activity />
                            </TabsContent>
                            <TabsContent value="mail" class="mt-4 sm:mt-6">
                                <MailList />
                            </TabsContent>
                            <TabsContent value="licenses" class="mt-4 sm:mt-6">
                                <LicensesAndThirdParty />
                            </TabsContent>
                        </Tabs>
                    </div>
                </Card>

                <!-- Plugin Widgets: After Tabs -->
                <WidgetRenderer v-if="widgetsAfterTabs.length > 0" :widgets="widgetsAfterTabs" />
            </div>

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>
    </DashboardLayout>
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

import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import AccountProfile from '@/components/account/AccountProfile.vue';
import AccountSettings from '@/components/account/AccountSettings.vue';
import AppearanceSettings from '@/components/account/AppearanceSettings.vue';
import Activity from '@/components/account/Activity.vue';
import MailList from '@/components/account/MailList.vue';
import SshKeys from '@/components/account/SshKeys.vue';
import ApiKeys from '@/components/account/ApiKeys.vue';
import LicensesAndThirdParty from '@/components/account/LicensesAndThirdParty.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import type { UserInfo } from '@/stores/session';

const { t: $t } = useI18n();
const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();

// Valid tab values
const validTabs = ['profile', 'settings', 'appearance', 'ssh-keys', 'api-keys', 'activity', 'mail', 'licenses'];

// Active tab state - initialize from URL query parameter or default to 'profile'
const activeTab = ref(validTabs.includes(route.query.tab as string) ? (route.query.tab as string) : 'profile');

// Computed user data with proper typing
const user = computed<UserInfo | null>(() => sessionStore.user);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('account');
const widgetsTopOfPage = computed(() => getWidgets('account', 'top-of-page'));
const widgetsBeforeProfileCard = computed(() => getWidgets('account', 'before-profile-card'));
const widgetsAfterProfileCard = computed(() => getWidgets('account', 'after-profile-card'));
const widgetsBeforeTabs = computed(() => getWidgets('account', 'before-tabs'));
const widgetsAfterTabs = computed(() => getWidgets('account', 'after-tabs'));
const widgetsBottomOfPage = computed(() => getWidgets('account', 'bottom-of-page'));

onMounted(async () => {
    await sessionStore.checkSessionOrRedirect();

    // Fetch plugin widgets
    await fetchPluginWidgets();
});

// Watch for URL query parameter changes and update active tab
watch(
    () => route.query.tab,
    (newTab) => {
        if (newTab && validTabs.includes(newTab as string)) {
            activeTab.value = newTab as string;
        }
    },
);

// Watch for active tab changes and update URL query parameter
watch(activeTab, (newTab) => {
    if (route.query.tab !== newTab) {
        router.replace({ query: { tab: newTab } });
    }
});

// Format date helper
const formatDate = (dateString?: string) => {
    if (!dateString) return $t('account.unknown');
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        return $t('account.unknown');
    }
};
</script>
