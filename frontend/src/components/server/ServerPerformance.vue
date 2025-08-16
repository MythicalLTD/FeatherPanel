<template>
    <div class="grid gap-4" :class="gridColsClass">
        <Card v-if="showCpu !== false">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium">{{ t('serverConsole.cpuLoad') }}</CardTitle>
                <Cpu class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div class="text-2xl font-bold">{{ server?.cpu || 0 }}%</div>
                <div class="text-xs text-muted-foreground">/ ∞</div>
                <PerformanceChart :data="cpuData" :color="dataColors.cpu" unit="%" class="mt-2" />
            </CardContent>
        </Card>

        <Card v-if="showMemory !== false">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium">{{ t('serverConsole.memory') }}</CardTitle>
                <MemoryStick class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div class="text-2xl font-bold">{{ formatMemory(server?.memory || 0) }}</div>
                <div class="text-xs text-muted-foreground">/ {{ formatMemory(server?.memoryLimit || 0) }}</div>
                <PerformanceChart
                    :data="memoryData"
                    :color="dataColors.memory"
                    unit="MiB"
                    :max-value="server?.memoryLimit || 100"
                    class="mt-2"
                />
            </CardContent>
        </Card>

        <Card v-if="showDisk !== false">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium">{{ t('serverConsole.disk') }}</CardTitle>
                <HardDrive class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div class="text-2xl font-bold">{{ formatDisk(server?.disk || 0) }}</div>
                <div class="text-xs text-muted-foreground">/ {{ formatDisk(server?.disk || 0) }}</div>
                <PerformanceChart :data="diskData" :color="dataColors.disk" unit="MiB" class="mt-2" />
            </CardContent>
        </Card>

        <Card v-if="showNetwork !== false">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium">{{ t('serverConsole.network') }}</CardTitle>
                <Globe class="h-4 w-4 text-muted-foreground" />
                <div class="flex gap-1">
                    <div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
            </CardHeader>
            <CardContent>
                <div class="space-y-1">
                    <div class="text-sm font-medium text-yellow-500">{{ networkStats.upload }}</div>
                    <div class="text-sm font-medium text-blue-500">{{ networkStats.download }}</div>
                </div>
                <PerformanceChart :data="networkData" :color="dataColors.network" unit="B" class="mt-2" />
            </CardContent>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu, MemoryStick, HardDrive, Globe } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import PerformanceChart from '@/components/charts/PerformanceChart.vue';
import type { Server, NetworkStats } from '@/types/server';

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

// Compute grid columns based on visible charts
const gridColsClass = computed(() => {
    const visibleCharts = [
        props.showCpu !== false,
        props.showMemory !== false,
        props.showDisk !== false,
        props.showNetwork !== false,
    ].filter(Boolean).length;

    if (visibleCharts === 1) return 'grid-cols-1';
    if (visibleCharts === 2) return 'md:grid-cols-2';
    if (visibleCharts === 3) return 'md:grid-cols-3';
    return 'md:grid-cols-4';
});

const dataColors = {
    cpu: '#ef4444',
    memory: '#3b82f6',
    disk: '#10b981',
    network: '#f59e0b',
};

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
</script>
