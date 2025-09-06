<template>
    <DashboardLayout :breadcrumbs="[{ text: $t('account.title'), isCurrent: true, href: '/dashboard/account' }]">
        <div class="flex flex-col gap-6">
            <div class="flex items-center gap-4">
                <h1 class="text-2xl font-bold">{{ $t('account.title') }}</h1>
            </div>

            <div class="grid gap-6">
                <!-- Profile Information Card -->
                <Card>
                    <div class="flex items-center gap-4 p-6">
                        <Avatar class="h-20 w-20">
                            <AvatarImage :src="user?.avatar || ''" :alt="user?.username || ''" />
                            <AvatarFallback>{{ user?.username?.charAt(0)?.toUpperCase() }}</AvatarFallback>
                        </Avatar>
                        <div class="flex flex-col gap-1">
                            <h2 class="text-xl font-semibold">{{ user?.username }}</h2>
                            <p class="text-muted-foreground">{{ user?.email }}</p>
                            <p class="text-sm text-muted-foreground">
                                {{ $t('account.memberSince') }} {{ formatDate(user?.first_seen) }}
                            </p>
                        </div>
                    </div>
                </Card>

                <!-- Tabs -->
                <Card>
                    <div class="p-6">
                        <Tabs v-model="activeTab" class="w-full">
                            <TabsList class="grid w-full grid-cols-6">
                                <TabsTrigger value="profile">{{ $t('account.profile') }}</TabsTrigger>
                                <TabsTrigger value="settings">{{ $t('account.settings') }}</TabsTrigger>
                                <TabsTrigger value="ssh-keys">{{ $t('account.sshKeys.title') }}</TabsTrigger>
                                <TabsTrigger value="api-keys">{{ $t('account.apiKeys.title') }}</TabsTrigger>
                                <TabsTrigger value="activity">{{ $t('account.activity.title') }}</TabsTrigger>
                                <TabsTrigger value="mail">{{ $t('account.mail.title') }}</TabsTrigger>
                            </TabsList>
                            <TabsContent value="profile" class="mt-6">
                                <AccountProfile />
                            </TabsContent>
                            <TabsContent value="settings" class="mt-6">
                                <AccountSettings />
                            </TabsContent>
                            <TabsContent value="ssh-keys" class="mt-6">
                                <SshKeys />
                            </TabsContent>
                            <TabsContent value="api-keys" class="mt-6">
                                <ApiKeys />
                            </TabsContent>
                            <TabsContent value="activity" class="mt-6">
                                <Activity />
                            </TabsContent>
                            <TabsContent value="mail" class="mt-6">
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
