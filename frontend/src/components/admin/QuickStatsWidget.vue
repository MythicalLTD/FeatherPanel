<template>
    <div class="p-6 space-y-4">
        <h2 class="text-xl font-semibold flex items-center gap-2">
            <ChartSpline :size="20" class="text-primary" />
            Quick Statistics
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
                v-for="(stat, index) in quickStatsArr"
                :key="stat.label"
                class="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50"
                :class="{ 'opacity-50': isLoading }"
            >
                <!-- Gradient Background Accent -->
                <div
                    class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    :class="getGradientClass(index)"
                ></div>

                <!-- Content -->
                <div class="relative p-5 flex items-center gap-4">
                    <!-- Icon Section -->
                    <div
                        class="shrink-0 rounded-xl p-3.5 transition-transform duration-300 group-hover:scale-110"
                        :class="getIconBgClass(index)"
                    >
                        <component :is="stat.icon" :size="26" :class="getIconColorClass(index)" />
                    </div>

                    <!-- Stats Section -->
                    <div class="flex-1 min-w-0">
                        <div class="text-sm text-muted-foreground mb-1 font-medium">{{ stat.label }}</div>
                        <div class="text-3xl font-bold text-foreground tracking-tight">
                            <span v-if="isLoading" class="animate-pulse text-muted-foreground">...</span>
                            <span v-else-if="hasError" class="text-destructive">—</span>
                            <span v-else :class="getValueColorClass(index)">{{ stat.value }}</span>
                        </div>
                    </div>

                    <!-- Decorative Element -->
                    <div
                        class="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 group-hover:opacity-10 transition-opacity duration-300"
                        :class="getDecorationClass(index)"
                    ></div>
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
import { Users, Server, Network, Sparkles, ChartSpline } from 'lucide-vue-next';
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

// Color scheme helpers for each stat
const getIconBgClass = (index: number): string => {
    const classes: string[] = [
        'bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10',
        'bg-gradient-to-br from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10',
        'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-600/10',
        'bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10',
    ];
    const normalizedIndex = index % classes.length;
    return classes[normalizedIndex] ?? classes[0] ?? '';
};

const getIconColorClass = (index: number): string => {
    const classes: string[] = [
        'text-blue-600 dark:text-blue-400',
        'text-purple-600 dark:text-purple-400',
        'text-emerald-600 dark:text-emerald-400',
        'text-amber-600 dark:text-amber-400',
    ];
    const normalizedIndex = index % classes.length;
    return classes[normalizedIndex] ?? classes[0] ?? '';
};

const getValueColorClass = (index: number): string => {
    const classes: string[] = [
        'group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300',
        'group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300',
        'group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300',
        'group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300',
    ];
    const normalizedIndex = index % classes.length;
    return classes[normalizedIndex] ?? classes[0] ?? '';
};

const getGradientClass = (index: number): string => {
    const classes: string[] = [
        'bg-gradient-to-br from-blue-500/5 to-transparent',
        'bg-gradient-to-br from-purple-500/5 to-transparent',
        'bg-gradient-to-br from-emerald-500/5 to-transparent',
        'bg-gradient-to-br from-amber-500/5 to-transparent',
    ];
    const normalizedIndex = index % classes.length;
    return classes[normalizedIndex] ?? classes[0] ?? '';
};

const getDecorationClass = (index: number): string => {
    const classes: string[] = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500'];
    const normalizedIndex = index % classes.length;
    return classes[normalizedIndex] ?? classes[0] ?? '';
};
</script>
