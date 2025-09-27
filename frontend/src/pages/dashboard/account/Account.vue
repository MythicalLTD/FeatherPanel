<template>
    <DashboardLayout :breadcrumbs="[{ text: $t('account.title'), isCurrent: true, href: '/dashboard/account' }]">
        <div class="flex flex-col gap-6 mt-6">
            <div class="grid gap-6">
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

                <!-- Tabs -->
                <Card>
                    <div class="p-4 sm:p-6">
                        <Tabs v-model="activeTab" class="w-full">
                            <!-- Mobile: Use dropdown/select for tabs -->
                            <div class="block sm:hidden mb-4">
                                <select
                                    v-model="activeTab"
                                    class="w-full p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                                >
                                    <option value="profile">{{ $t('account.profile') }}</option>
                                    <option value="settings">{{ $t('account.settings') }}</option>
                                    <option value="appearance">{{ $t('account.appearance') }}</option>
                                    <option value="ssh-keys">{{ $t('account.sshKeys.title') }}</option>
                                    <option value="api-keys">{{ $t('account.apiKeys.title') }}</option>
                                    <option value="activity">{{ $t('account.activity.title') }}</option>
                                    <option value="mail">{{ $t('account.mail.title') }}</option>
                                </select>
                            </div>

                            <!-- Desktop: Use normal tabs -->
                            <div class="hidden sm:block">
                                <TabsList class="grid w-full grid-cols-7">
                                    <TabsTrigger value="profile">{{ $t('account.profile') }}</TabsTrigger>
                                    <TabsTrigger value="settings">{{ $t('account.settings') }}</TabsTrigger>
                                    <TabsTrigger value="appearance">{{ $t('account.appearance') }}</TabsTrigger>
                                    <TabsTrigger value="ssh-keys">{{ $t('account.sshKeys.title') }}</TabsTrigger>
                                    <TabsTrigger value="api-keys">{{ $t('account.apiKeys.title') }}</TabsTrigger>
                                    <TabsTrigger value="activity">{{ $t('account.activity.title') }}</TabsTrigger>
                                    <TabsTrigger value="mail">{{ $t('account.mail.title') }}</TabsTrigger>
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
                        </Tabs>
                    </div>
                </Card>
            </div>
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
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
import type { UserInfo } from '@/stores/session';

const { t: $t } = useI18n();
const sessionStore = useSessionStore();

// Active tab state
const activeTab = ref('profile');

// Computed user data with proper typing
const user = computed<UserInfo | null>(() => sessionStore.user);

onMounted(async () => {
    await sessionStore.checkSessionOrRedirect();
});

// Format date helper
const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        return 'Unknown';
    }
};
</script>
