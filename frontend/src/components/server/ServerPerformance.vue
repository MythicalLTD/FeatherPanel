<template>
    <div class="grid gap-4" :class="gridColsClass">
        <Card v-if="showCpu !== false" class="relative overflow-hidden">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle class="text-sm font-medium text-gray-900 dark:text-white">{{
                    t('serverConsole.cpuLoad')
                }}</CardTitle>
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <Cpu class="h-4 w-4 text-muted-foreground" />
                </div>
            </CardHeader>
            <CardContent class="space-y-3">
                <div class="flex justify-between items-center">
                    <span class="text-xs text-muted-foreground">Limit: {{ server?.cpu || 0 }}%</span>
                    <span class="text-xs font-medium text-red-600 dark:text-red-400"
                        >{{ getCurrentValue(cpuData, 'percentage') }}%</span
                    >
                </div>
                <div class="w-full h-[200px]">
                    <Line v-if="cpuChartData" :data="cpuChartData" :options="cpuChartOptions" />
                </div>
            </CardContent>
        </Card>

        <Card v-if="showMemory !== false" class="relative overflow-hidden">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle class="text-sm font-medium text-gray-900 dark:text-white">{{
                    t('serverConsole.memory')
                }}</CardTitle>
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <MemoryStick class="h-4 w-4 text-muted-foreground" />
                </div>
            </CardHeader>
            <CardContent class="space-y-3">
                <div class="flex justify-between items-center">
                    <span class="text-xs text-muted-foreground">Limit: {{ formatMemory(server?.memory || 0) }}</span>
                    <span class="text-xs font-medium text-blue-600 dark:text-blue-400">{{
                        getCurrentValue(memoryData, 'mib')
                    }}</span>
                </div>
                <div class="w-full h-[200px]">
                    <Line v-if="memoryChartData" :data="memoryChartData" :options="memoryChartOptions" />
                </div>
            </CardContent>
        </Card>

        <Card v-if="showDisk !== false" class="relative overflow-hidden">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle class="text-sm font-medium text-gray-900 dark:text-white">{{
                    t('serverConsole.disk')
                }}</CardTitle>
                <div class="flex items-center gap-2">
                    <div :class="getDiskStatusColor()" class="w-2 h-2 rounded-full animate-pulse"></div>
                    <HardDrive class="h-4 w-4 text-muted-foreground" />
                </div>
            </CardHeader>
            <CardContent class="space-y-3">
                <div class="flex justify-between items-center">
                    <div class="flex flex-col">
                        <span class="text-xs text-muted-foreground">
                            Limit: {{ formatDisk(server?.disk || 0) }}
                            <span v-if="server?.disk === 0" class="text-yellow-500">(unlimited)</span>
                            <span v-else-if="getDiskUsagePercentage() > 95" class="text-red-500">(critical!)</span>
                            <span v-else-if="getDiskUsagePercentage() > 80" class="text-yellow-500">(warning)</span>
                        </span>
                    </div>
                    <span class="text-xs font-medium" :class="getDiskValueColor()">{{
                        getCurrentValue(diskData, 'mib')
                    }}</span>
                </div>
                <div class="w-full h-[200px]">
                    <Line v-if="diskChartData" :data="diskChartData" :options="diskChartOptions" />
                </div>
            </CardContent>
        </Card>

        <Card v-if="showNetwork !== false" class="relative overflow-hidden">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle class="text-sm font-medium text-gray-900 dark:text-white">{{
                    t('serverConsole.network')
                }}</CardTitle>
                <div class="flex items-center gap-2">
                    <div class="flex gap-1">
                        <div class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                        <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                    <Globe class="h-4 w-4 text-muted-foreground" />
                </div>
            </CardHeader>
            <CardContent class="space-y-3">
                <div class="flex justify-between items-center">
                    <div class="flex gap-4 text-xs text-muted-foreground">
                        <span class="flex items-center gap-1">
                            <span class="w-1 h-1 bg-yellow-500 rounded-full"></span>
                            ↑ {{ networkStats.upload }}
                        </span>
                        <span class="flex items-center gap-1">
                            <span class="w-1 h-1 bg-blue-500 rounded-full"></span>
                            ↓ {{ networkStats.download }}
                        </span>
                    </div>
                    <span class="text-xs font-medium text-orange-600 dark:text-orange-400">{{
                        getCurrentValue(networkData, 'bytes')
                    }}</span>
                </div>
                <div class="w-full h-[200px]">
                    <Line v-if="networkChartData" :data="networkChartData" :options="networkChartOptions" />
                </div>
            </CardContent>
        </Card>
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu, MemoryStick, HardDrive, Globe } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { Line } from 'vue-chartjs';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    type TooltipItem,
} from 'chart.js';
import type { Server, NetworkStats } from '@/types/server';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const { t } = useI18n();

interface Props {
    server: Server | null;
    cpuData: Array<{ timestamp: number; value: number }>;
    memoryData: Array<{ timestamp: number; value: number }>;
    diskData: Array<{ timestamp: number; value: number }>;
    networkData: Array<{ timestamp: number; value: number }>;
    networkStats: NetworkStats;
    showCpu?: boolean;
    showMemory?: boolean;
    showDisk?: boolean;
    showNetwork?: boolean;
}

const props = defineProps<Props>();

// Compute grid columns based on visible charts with better responsive design
const gridColsClass = computed(() => {
    const visibleCharts = [
        props.showCpu !== false,
        props.showMemory !== false,
        props.showDisk !== false,
        props.showNetwork !== false,
    ].filter(Boolean).length;

    if (visibleCharts === 1) return 'grid-cols-1';
    if (visibleCharts === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (visibleCharts === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
});

const dataColors = {
    cpu: '#ef4444',
    memory: '#3b82f6',
    disk: '#10b981',
    network: '#f59e0b',
};

type UsageUnit = 'raw' | 'percentage' | 'mib' | 'bytes';

function formatMemory(memory: number): string {
    if (memory >= 1024) {
        return `${(memory / 1024).toFixed(1)} GiB`;
    }
    return `${memory} MiB`;
}

function formatDisk(disk: number): string {
    if (disk >= 1024) {
        return `${(disk / 1024).toFixed(1)} GiB`;
    }
    return `${disk} MiB`;
}

function getDiskUsagePercentage(): number {
    const diskLimit = props.server?.disk || 0;
    const currentUsage = props.server?.diskUsage || 0;

    if (diskLimit === 0) return 0; // Unlimited disk

    return (currentUsage / diskLimit) * 100;
}

function getDiskChartColor(): string {
    const usagePercentage = getDiskUsagePercentage();

    if (usagePercentage > 95) return '#ef4444'; // Red for critical
    if (usagePercentage > 80) return '#f59e0b'; // Yellow for warning
    return '#10b981'; // Green for normal
}

function getDiskStatusColor(): string {
    const usagePercentage = getDiskUsagePercentage();

    if (usagePercentage > 95) return 'bg-red-500'; // Red for critical
    if (usagePercentage > 80) return 'bg-yellow-500'; // Yellow for warning
    return 'bg-green-500'; // Green for normal
}

function getDiskValueColor(): string {
    const usagePercentage = getDiskUsagePercentage();

    if (usagePercentage > 95) return 'text-red-600 dark:text-red-400'; // Red for critical
    if (usagePercentage > 80) return 'text-yellow-600 dark:text-yellow-400'; // Yellow for warning
    return 'text-green-600 dark:text-green-400'; // Green for normal
}

function getLastNumericValue(data: Array<{ timestamp: number; value: number }>): number | null {
    if (!data.length) return null;
    const lastEntry = data[data.length - 1];
    if (!lastEntry || typeof lastEntry.value !== 'number') {
        return null;
    }
    return lastEntry.value;
}

function formatBytes(value: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = value;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatMebibytes(value: number): string {
    if (value >= 1024) {
        return `${(value / 1024).toFixed(1)} GiB`;
    }
    if (value >= 1) {
        return `${value.toFixed(1)} MiB`;
    }
    return `${(value * 1024).toFixed(1)} KiB`;
}

function getCurrentValue(data: Array<{ timestamp: number; value: number }>, unit: UsageUnit = 'raw'): string {
    const numericValue = getLastNumericValue(data);
    if (numericValue === null) {
        return '0';
    }

    switch (unit) {
        case 'percentage':
            return numericValue.toFixed(1);
        case 'mib':
            return formatMebibytes(numericValue);
        case 'bytes':
            return formatBytes(numericValue);
        case 'raw':
        default:
            return numericValue.toFixed(1);
    }
}

// Chart Data Computed Properties
const cpuChartData = computed(() => {
    if (!props.cpuData.length) return null;

    return {
        labels: props.cpuData.map(() => ''),
        datasets: [
            {
                label: 'CPU Usage',
                data: props.cpuData.map((d) => d.value),
                borderColor: dataColors.cpu,
                backgroundColor: dataColors.cpu + '20',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2,
            },
        ],
    };
});

const memoryChartData = computed(() => {
    if (!props.memoryData.length) return null;

    return {
        labels: props.memoryData.map(() => ''),
        datasets: [
            {
                label: 'Memory Usage',
                data: props.memoryData.map((d) => d.value),
                borderColor: dataColors.memory,
                backgroundColor: dataColors.memory + '20',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2,
            },
        ],
    };
});

const diskChartData = computed(() => {
    if (!props.diskData.length) return null;

    const diskColor = getDiskChartColor();

    return {
        labels: props.diskData.map(() => ''),
        datasets: [
            {
                label: 'Disk Usage',
                data: props.diskData.map((d) => d.value),
                borderColor: diskColor,
                backgroundColor: diskColor + '20',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2,
            },
        ],
    };
});

const networkChartData = computed(() => {
    if (!props.networkData.length) return null;

    return {
        labels: props.networkData.map(() => ''),
        datasets: [
            {
                label: 'Network Usage',
                data: props.networkData.map((d) => d.value),
                borderColor: dataColors.network,
                backgroundColor: dataColors.network + '20',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2,
            },
        ],
    };
});

// Chart Options
const cpuChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 0,
    },
    plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            enabled: true,
            mode: 'index' as const,
            intersect: false,
            callbacks: {
                label: (context: TooltipItem<'line'>) => {
                    const value = context.parsed.y;
                    if (value === null) return '';
                    return `${value.toFixed(1)}%`;
                },
            },
        },
    },
    scales: {
        x: {
            display: false,
            grid: {
                display: false,
            },
        },
        y: {
            beginAtZero: true,
            max: props.server?.cpu && props.server.cpu > 0 ? props.server.cpu : undefined,
            grid: {
                color: 'rgba(148, 163, 184, 0.1)',
            },
            ticks: {
                precision: 0,
                callback: (tickValue: string | number) => {
                    if (typeof tickValue === 'string') return tickValue;
                    return `${tickValue}%`;
                },
            },
        },
    },
}));

const memoryChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 0,
    },
    plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            enabled: true,
            mode: 'index' as const,
            intersect: false,
            callbacks: {
                label: (context: TooltipItem<'line'>) => {
                    const value = context.parsed.y;
                    if (value === null) return '';
                    if (value >= 1024) {
                        return `${(value / 1024).toFixed(1)} GiB`;
                    }
                    return `${value.toFixed(1)} MiB`;
                },
            },
        },
    },
    scales: {
        x: {
            display: false,
            grid: {
                display: false,
            },
        },
        y: {
            beginAtZero: true,
            max: props.server?.memory && props.server.memory > 0 ? props.server.memory : undefined,
            grid: {
                color: 'rgba(148, 163, 184, 0.1)',
            },
            ticks: {
                precision: 0,
                callback: (tickValue: string | number) => {
                    if (typeof tickValue === 'string') return tickValue;
                    if (tickValue >= 1024) {
                        return `${(tickValue / 1024).toFixed(1)} GiB`;
                    }
                    return `${tickValue} MiB`;
                },
            },
        },
    },
}));

const diskChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 0,
    },
    plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            enabled: true,
            mode: 'index' as const,
            intersect: false,
            callbacks: {
                label: (context: TooltipItem<'line'>) => {
                    const value = context.parsed.y;
                    if (value === null) return '';
                    if (value >= 1024) {
                        return `${(value / 1024).toFixed(1)} GiB`;
                    }
                    return `${value.toFixed(1)} MiB`;
                },
            },
        },
    },
    scales: {
        x: {
            display: false,
            grid: {
                display: false,
            },
        },
        y: {
            beginAtZero: true,
            max: props.server?.disk && props.server.disk > 0 ? props.server.disk : undefined,
            grid: {
                color: 'rgba(148, 163, 184, 0.1)',
            },
            ticks: {
                precision: 0,
                callback: (tickValue: string | number) => {
                    if (typeof tickValue === 'string') return tickValue;
                    if (tickValue >= 1024) {
                        return `${(tickValue / 1024).toFixed(1)} GiB`;
                    }
                    return `${tickValue} MiB`;
                },
            },
        },
    },
}));

const networkChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 0,
    },
    plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            enabled: true,
            mode: 'index' as const,
            intersect: false,
            callbacks: {
                label: (context: TooltipItem<'line'>) => {
                    const value = context.parsed.y;
                    if (value === null) return '';
                    if (value >= 1024 * 1024 * 1024) {
                        return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
                    } else if (value >= 1024 * 1024) {
                        return `${(value / (1024 * 1024)).toFixed(2)} MB`;
                    } else if (value >= 1024) {
                        return `${(value / 1024).toFixed(2)} KB`;
                    }
                    return `${value.toFixed(2)} B`;
                },
            },
        },
    },
    scales: {
        x: {
            display: false,
            grid: {
                display: false,
            },
        },
        y: {
            beginAtZero: true,
            grid: {
                color: 'rgba(148, 163, 184, 0.1)',
            },
            ticks: {
                precision: 0,
                callback: (tickValue: string | number) => {
                    if (typeof tickValue === 'string') return tickValue;
                    if (tickValue >= 1024 * 1024 * 1024) {
                        return `${(tickValue / (1024 * 1024 * 1024)).toFixed(2)} GB`;
                    } else if (tickValue >= 1024 * 1024) {
                        return `${(tickValue / (1024 * 1024)).toFixed(2)} MB`;
                    } else if (tickValue >= 1024) {
                        return `${(tickValue / 1024).toFixed(2)} KB`;
                    }
                    return `${tickValue} B`;
                },
            },
        },
    },
}));
</script>

<style scoped>
/* Card hover effects */
.relative:hover {
    transform: translateY(-1px);
    transition: transform 0.2s ease-in-out;
}

/* Pulse animation for status indicators */
@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Chart container styling */
.w-full.h-20 {
    min-height: 80px;
    position: relative;
}

/* Responsive text sizing */
@media (max-width: 640px) {
    .text-xs {
        font-size: 0.75rem;
    }

    .text-sm {
        font-size: 0.875rem;
    }
}
</style>
