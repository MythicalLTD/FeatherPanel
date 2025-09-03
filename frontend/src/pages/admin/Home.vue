<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Dashboard', isCurrent: true, href: '/admin' }]">
        <main class="p-6 space-y-8 bg-background min-h-screen">
            <!-- Header & Actions -->
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 class="text-3xl font-bold text-foreground mb-1">Welcome Back, {{ userName }}</h1>
                    <p class="text-muted-foreground">Here's what's happening with your panel today.</p>
                </div>
                <div class="flex gap-2 flex-wrap md:justify-end">
                    <Button variant="secondary" class="flex items-center gap-2" @click="openDocumentation">
                        <BookOpen :size="16" /> Documentation
                    </Button>
                    <Button variant="outline" class="flex items-center gap-2" @click="openDiscord">
                        <Discord :size="16" /> Discord (MythicalSystems)
                    </Button>
                </div>
            </div>

            <!-- Quick Stats -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <Card
                    v-for="stat in quickStatsArr"
                    :key="stat.label"
                    class="flex flex-col items-center justify-center p-6 rounded-xl"
                    :class="{ 'opacity-50': dashboardStore.isLoading }"
                >
                    <div class="text-2xl font-bold text-foreground mb-1">
                        <span v-if="dashboardStore.isLoading" class="animate-pulse">...</span>
                        <span v-else-if="dashboardStore.hasError" class="text-destructive">Error</span>
                        <span v-else>{{ stat.value }}</span>
                    </div>
                    <div class="text-muted-foreground text-sm mb-3">{{ stat.label }}</div>
                    <div class="bg-primary/10 rounded-full p-2 flex items-center justify-center">
                        <component :is="stat.icon" :size="28" class="text-primary" />
                    </div>
                </Card>
            </div>

            <!-- Error Message -->
            <div v-if="dashboardStore.hasError" class="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div class="flex items-center gap-2 text-destructive">
                    <span class="font-medium">Failed to load dashboard statistics</span>
                </div>
                <p class="text-sm text-muted-foreground mt-1">{{ dashboardStore.error }}</p>
                <Button variant="outline" size="sm" class="mt-2" @click="dashboardStore.fetchDashboardStats()">
                    Retry
                </Button>
            </div>

            <!-- System Updates -->
            <Card class="rounded-xl">
                <CardHeader class="flex flex-row items-center justify-between pb-2">
                    <CardTitle class="text-base">System Updates</CardTitle>
                    <Badge variant="secondary" class="text-xs">{{ systemUpdates.length }} new updates</Badge>
                </CardHeader>
                <CardContent class="pt-0">
                    <ul class="space-y-4">
                        <li v-for="update in systemUpdates" :key="update.title" class="p-3 rounded-lg bg-muted">
                            <div class="flex items-center justify-between mb-1">
                                <span class="font-semibold text-primary">{{ update.title }}</span>
                                <span class="text-xs text-muted-foreground">{{ update.date }}</span>
                            </div>
                            <div class="text-muted-foreground text-sm mb-2">{{ update.description }}</div>
                            <div class="flex gap-2">
                                <Button
                                    v-for="link in update.links"
                                    :key="link.label"
                                    variant="link"
                                    size="sm"
                                    class="p-0 h-auto"
                                >
                                    {{ link.label }}
                                </Button>
                            </div>
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </main>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Server, Network, Sparkles, MessageCircle as Discord } from 'lucide-vue-next';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import { useDashboardStore } from '@/stores/dashboard';

const settingsStore = useSettingsStore();
const sessionStore = useSessionStore();
const dashboardStore = useDashboardStore();

onMounted(async () => {
    await settingsStore.fetchSettings();
    await sessionStore.checkSessionOrRedirect();
    await dashboardStore.fetchDashboardStats();
});

// User name
const userName = computed(() => sessionStore.user?.first_name + ' ' + sessionStore.user?.last_name);

// Dashboard stats from API
const quickStatsArr = computed(() => {
    const stats = dashboardStore.stats;
    if (!stats) {
        return [
            { label: 'Total Servers', value: '...', icon: Server },
            { label: 'Total Users', value: '...', icon: Users },
            { label: 'Active Nodes', value: '...', icon: Network },
            { label: 'Server Spells', value: '...', icon: Sparkles },
        ];
    }

    return [
        { label: 'Total Servers', value: stats.servers, icon: Server },
        { label: 'Total Users', value: stats.users, icon: Users },
        { label: 'Active Nodes', value: stats.nodes, icon: Network },
        { label: 'Server Spells', value: stats.spells, icon: Sparkles },
    ];
});

const systemUpdates = ref([
    {
        title: 'Security Patch 3.2',
        description:
            'A critical security patch has been applied to address recent vulnerabilities. Please review the changelog for details.',
        date: '2025-03-10',
        links: [
            { label: 'View changelog', url: '#' },
            { label: 'Security notice', url: '#' },
        ],
    },
    {
        title: 'API Rate Limits Increased',
        description:
            'API rate limits have been increased for all users. This should improve integration performance for most clients.',
        date: '2025-03-05',
        links: [{ label: 'API Docs', url: '#' }],
    },
    {
        title: 'Maintenance Scheduled',
        description:
            'Scheduled maintenance will occur on March 15th, 2025, from 2:00 AM to 4:00 AM UTC. Expect brief downtime during this window.',
        date: '2025-03-01',
        links: [{ label: 'Maintenance details', url: '#' }],
    },
    {
        title: 'New Feature: Dark Mode',
        description:
            'Dark mode is now available! Switch themes in your profile settings for a more comfortable viewing experience.',
        date: '2025-02-28',
        links: [{ label: 'How to use', url: '#' }],
    },
]);

const openDocumentation = () => {
    window.open('https://docs.mythical.systems', '_blank');
};
const openDiscord = () => {
    window.open('https://discord.mythical.systems', '_blank');
};
</script>

<style scoped>
.text-gradient {
    background: linear-gradient(90deg, #a78bfa 0%, #f472b6 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}
.bg-muted {
    background-color: hsl(var(--muted));
}
</style>
