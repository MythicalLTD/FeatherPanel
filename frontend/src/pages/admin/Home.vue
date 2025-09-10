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

            <!-- Cron Status -->
            <div v-if="cronRecent || cronSummary" class="space-y-3">
                <div class="flex items-center justify-between">
                    <h2 class="text-xl font-semibold">Cron Status</h2>
                    <div v-if="cronRecent" class="text-xs text-muted-foreground">Updated just now</div>
                </div>
                <div v-if="cronSummary" class="text-sm text-muted-foreground bg-muted/50 border rounded-md p-4">
                    {{ cronSummary }}
                </div>
                <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card v-for="item in cronRecent" :key="item.id" class="p-4 border">
                        <div class="flex items-start gap-3">
                            <div
                                class="h-9 w-9 rounded-full flex items-center justify-center"
                                :class="
                                    item.last_run_success
                                        ? 'bg-emerald-500/10 text-emerald-600'
                                        : 'bg-destructive/10 text-destructive'
                                "
                            >
                                <component :is="item.last_run_success ? CheckCircle2 : AlertTriangle" :size="18" />
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center justify-between">
                                    <div class="font-medium capitalize">{{ prettyTaskName(item.task_name) }}</div>
                                    <div class="flex items-center gap-2">
                                        <span
                                            class="text-xs px-2 py-0.5 rounded-full"
                                            :class="
                                                item.last_run_success
                                                    ? 'bg-emerald-500/10 text-emerald-600'
                                                    : 'bg-destructive/10 text-destructive'
                                            "
                                        >
                                            {{ item.last_run_success ? 'OK' : 'FAIL' }}
                                        </span>
                                        <span
                                            v-if="item.late"
                                            class="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600"
                                        >
                                            Late
                                        </span>
                                    </div>
                                </div>
                                <div class="mt-1 text-sm text-muted-foreground">
                                    Last run {{ formatAgo(item.last_run_at) }} • every ~{{
                                        formatEvery(item.expected_interval_seconds)
                                    }}
                                </div>
                                <div
                                    v-if="item.last_run_message"
                                    class="mt-2 text-xs rounded-md border bg-muted/40 p-2 text-muted-foreground"
                                    :title="item.last_run_message"
                                >
                                    {{ truncate(item.last_run_message, 120) }}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </main>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BookOpen,
    Users,
    Server,
    Network,
    Sparkles,
    MessageCircle as Discord,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-vue-next';
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

// Cron data from API
const cronRecent = computed(() => dashboardStore.cronRecent);
const cronSummary = computed(() => dashboardStore.cronSummary);

function formatAgo(dateStr: string | null): string {
    if (!dateStr) return 'never';
    const d = new Date(dateStr.replace(' ', 'T'));
    const diffMs = Date.now() - d.getTime();
    if (Number.isNaN(diffMs)) return dateStr;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function formatEvery(seconds: number): string {
    if (!seconds || seconds <= 0) return 'n/a';
    if (seconds < 90) return `${Math.max(1, Math.round(seconds / 60))}m`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
}

function truncate(text: string, maxLen = 120): string {
    if (!text) return '';
    return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
}

function prettyTaskName(name: string): string {
    switch (name) {
        case 'server-schedule-processor':
            return 'Server Schedule Processor';
        case 'mail-sender':
            return 'Mail Sender';
        case 'update-env':
            return 'Update Env';
        default:
            return name.replace(/[-_]/g, ' ');
    }
}

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
