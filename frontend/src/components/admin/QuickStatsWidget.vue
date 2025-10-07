<template>
    <div class="p-6 space-y-4">
        <h2 class="text-xl font-semibold">Quick Statistics</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card
                v-for="stat in quickStatsArr"
                :key="stat.label"
                class="flex flex-col items-center justify-center p-6 rounded-xl hover:shadow-md transition-shadow"
                :class="{ 'opacity-50': isLoading }"
            >
                <div class="text-3xl font-bold text-foreground mb-2">
                    <span v-if="isLoading" class="animate-pulse">...</span>
                    <span v-else-if="hasError" class="text-destructive">Error</span>
                    <span v-else>{{ stat.value }}</span>
                </div>
                <div class="text-muted-foreground text-sm mb-3">{{ stat.label }}</div>
                <div class="bg-primary/10 rounded-full p-3 flex items-center justify-center">
                    <component :is="stat.icon" :size="28" class="text-primary" />
                </div>
            </Card>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Card } from '@/components/ui/card';
import { Users, Server, Network, Sparkles } from 'lucide-vue-next';
import { useDashboardStore } from '@/stores/dashboard';

const dashboardStore = useDashboardStore();

const isLoading = computed(() => dashboardStore.isLoading);
const hasError = computed(() => dashboardStore.hasError);

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
</script>
