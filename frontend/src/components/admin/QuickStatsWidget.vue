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
