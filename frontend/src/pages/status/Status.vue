<!-- eslint-disable vue/no-v-html -->
<template>
    <PublicLayout>
        <div class="min-h-screen">
            <!-- Header -->
            <div class="mb-6 border-b pb-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold">{{ t('dashboard.status.title') }}</h1>
                        <p class="text-muted-foreground mt-2">{{ t('dashboard.status.description') }}</p>
                    </div>
                    <Button variant="outline" size="sm" :loading="loading" @click="refreshData">
                        <RefreshCw :size="16" class="mr-2" />
                        {{ t('dashboard.status.refresh') }}
                    </Button>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="loading && !statusData" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">{{ t('dashboard.status.loading') }}</span>
                </div>
            </div>

            <!-- Status Content -->
            <div v-else-if="statusData && statusData.enabled" class="space-y-6">
                <!-- Global Stats Cards -->
                <div v-if="statusData.data?.global" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <!-- Total Nodes -->
                    <Card v-if="statusData.data.global.total_nodes !== undefined">
                        <CardContent class="p-4">
                            <div class="flex flex-col gap-2">
                                <p class="text-xs font-medium text-muted-foreground">
                                    {{ t('dashboard.status.totalNodes') }}
                                </p>
                                <div class="flex items-center justify-between">
                                    <p class="text-2xl font-bold">{{ statusData.data.global.total_nodes }}</p>
                                    <Server class="h-6 w-6 text-muted-foreground shrink-0" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Healthy Nodes -->
                    <Card v-if="statusData.data.global.healthy_nodes !== undefined">
                        <CardContent class="p-4">
                            <div class="flex flex-col gap-2">
                                <p class="text-xs font-medium text-muted-foreground">
                                    {{ t('dashboard.status.healthyNodes') }}
                                </p>
                                <div class="flex items-center justify-between">
                                    <p class="text-2xl font-bold text-green-600">
                                        {{ statusData.data.global.healthy_nodes }}
                                    </p>
                                    <div
                                        class="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center shrink-0"
                                    >
                                        <Check class="h-4 w-4 text-white" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Unhealthy Nodes -->
                    <Card v-if="statusData.data.global.unhealthy_nodes !== undefined">
                        <CardContent class="p-4">
                            <div class="flex flex-col gap-2">
                                <p class="text-xs font-medium text-muted-foreground">
                                    {{ t('dashboard.status.unhealthyNodes') }}
                                </p>
                                <div class="flex items-center justify-between">
                                    <p class="text-2xl font-bold text-red-600">
                                        {{ statusData.data.global.unhealthy_nodes }}
                                    </p>
                                    <div
                                        class="h-6 w-6 bg-red-500 rounded-full flex items-center justify-center shrink-0"
                                    >
                                        <AlertTriangle class="h-4 w-4 text-white" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Average CPU -->
                    <Card v-if="statusData.data.global.avg_cpu_percent !== undefined">
                        <CardContent class="p-4">
                            <div class="flex flex-col gap-2">
                                <p class="text-xs font-medium text-muted-foreground">
                                    {{ t('dashboard.status.avgCpuUsage') }}
                                </p>
                                <div class="flex items-center justify-between">
                                    <p class="text-2xl font-bold">
                                        {{ statusData.data.global.avg_cpu_percent.toFixed(1) }}%
                                    </p>
                                    <Cpu class="h-6 w-6 text-muted-foreground shrink-0" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Total Servers -->
                    <Card v-if="statusData.data.total_servers !== undefined">
                        <CardContent class="p-4">
                            <div class="flex flex-col gap-2">
                                <p class="text-xs font-medium text-muted-foreground">
                                    {{ t('dashboard.status.totalServers') }}
                                </p>
                                <div class="flex items-center justify-between">
                                    <p class="text-2xl font-bold">{{ statusData.data.total_servers }}</p>
                                    <Server class="h-6 w-6 text-muted-foreground shrink-0" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Global Resource Usage Cards -->
                <div
                    v-if="
                        statusData.data?.global &&
                        (statusData.data.global.total_memory || statusData.data.global.total_disk)
                    "
                    class="grid grid-cols-1 lg:grid-cols-2 gap-6"
                >
                    <!-- Global Memory Usage -->
                    <Card v-if="statusData.data.global.total_memory">
                        <CardHeader>
                            <CardTitle class="flex items-center gap-2">
                                <MemoryStick class="h-5 w-5" />
                                {{ t('dashboard.status.globalMemoryUsage') }}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-muted-foreground">{{
                                        t('dashboard.status.usedTotal')
                                    }}</span>
                                    <span class="text-sm font-medium">
                                        {{ formatBytes(statusData.data.global.used_memory || 0, true) }} /
                                        {{ formatBytes(statusData.data.global.total_memory || 0, true) }}
                                    </span>
                                </div>
                                <div class="w-full bg-muted rounded-full h-3">
                                    <div
                                        :class="[
                                            'h-3 rounded-full transition-all duration-300',
                                            getMemoryUsagePercent() > 90
                                                ? 'bg-red-500'
                                                : getMemoryUsagePercent() > 75
                                                  ? 'bg-orange-500'
                                                  : 'bg-blue-500',
                                        ]"
                                        :style="{ width: `${getMemoryUsagePercent()}%` }"
                                    ></div>
                                </div>
                                <div class="text-sm text-center text-muted-foreground">
                                    {{ getMemoryUsagePercent().toFixed(1) }}% {{ t('dashboard.status.used') }}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Global Disk Usage -->
                    <Card v-if="statusData.data.global.total_disk">
                        <CardHeader>
                            <CardTitle class="flex items-center gap-2">
                                <HardDrive class="h-5 w-5" />
                                {{ t('dashboard.status.globalDiskUsage') }}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-muted-foreground">{{
                                        t('dashboard.status.usedTotal')
                                    }}</span>
                                    <span class="text-sm font-medium">
                                        {{ formatBytes(statusData.data.global.used_disk || 0, true) }} /
                                        {{ formatBytes(statusData.data.global.total_disk || 0, true) }}
                                    </span>
                                </div>
                                <div class="w-full bg-muted rounded-full h-3">
                                    <div
                                        :class="[
                                            'h-3 rounded-full transition-all duration-300',
                                            getDiskUsagePercent() > 90
                                                ? 'bg-red-500'
                                                : getDiskUsagePercent() > 75
                                                  ? 'bg-orange-500'
                                                  : 'bg-green-500',
                                        ]"
                                        :style="{ width: `${getDiskUsagePercent()}%` }"
                                    ></div>
                                </div>
                                <div class="text-sm text-center text-muted-foreground">
                                    {{ getDiskUsagePercent().toFixed(1) }}% {{ t('dashboard.status.used') }}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Individual Node Cards -->
                <div v-if="statusData.data?.nodes && statusData.data.nodes.length > 0">
                    <h2 class="text-2xl font-bold mb-4">{{ t('dashboard.status.individualNodes') }}</h2>
                    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <Card v-for="node in statusData.data.nodes" :key="node.id" class="overflow-hidden">
                            <CardHeader
                                :class="[
                                    'border-l-4',
                                    node.status === 'healthy' ? 'border-l-green-500' : 'border-l-red-500',
                                ]"
                            >
                                <div class="flex items-center justify-between">
                                    <div>
                                        <CardTitle class="flex items-center gap-2">
                                            <div
                                                :class="[
                                                    'h-3 w-3 rounded-full',
                                                    node.status === 'healthy'
                                                        ? 'bg-green-500 animate-pulse'
                                                        : 'bg-red-500 animate-pulse',
                                                ]"
                                            ></div>
                                            {{ node.name }}
                                        </CardTitle>
                                        <CardDescription v-if="node.fqdn" class="mt-1 font-mono text-xs">
                                            {{ node.fqdn }}
                                        </CardDescription>
                                    </div>
                                    <Badge :variant="node.status === 'healthy' ? 'default' : 'destructive'">
                                        {{
                                            node.status === 'healthy'
                                                ? t('dashboard.status.online')
                                                : t('dashboard.status.offline')
                                        }}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent v-if="node.status === 'healthy' && node.utilization" class="pt-6">
                                <!-- Server Count -->
                                <div v-if="node.server_count !== undefined" class="mb-4 pb-4 border-b">
                                    <div class="flex justify-between items-center">
                                        <span class="text-sm font-medium">{{
                                            t('dashboard.status.serversOnNode')
                                        }}</span>
                                        <span class="text-sm font-bold text-primary">
                                            {{ node.server_count || 0 }}
                                        </span>
                                    </div>
                                </div>

                                <!-- CPU Usage -->
                                <div v-if="node.utilization.cpu_percent !== undefined" class="mb-4">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="text-sm font-medium">{{ t('dashboard.status.cpuUsage') }}</span>
                                        <span class="text-sm text-muted-foreground">
                                            {{ node.utilization.cpu_percent?.toFixed(1) }}%
                                        </span>
                                    </div>
                                    <div class="w-full bg-muted rounded-full h-2">
                                        <div
                                            class="bg-primary h-2 rounded-full transition-all duration-300"
                                            :style="{ width: `${Math.min(100, node.utilization.cpu_percent || 0)}%` }"
                                        ></div>
                                    </div>
                                </div>

                                <!-- Memory Usage -->
                                <div v-if="node.utilization.memory_total" class="mb-4">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="text-sm font-medium">{{ t('dashboard.status.memory') }}</span>
                                        <span class="text-sm text-muted-foreground">
                                            {{ formatBytes(node.utilization.memory_used || 0, true) }} /
                                            {{ formatBytes(node.utilization.memory_total || 0, true) }}
                                        </span>
                                    </div>
                                    <div class="w-full bg-muted rounded-full h-2">
                                        <div
                                            class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                            :style="{
                                                width: `${node.utilization.memory_total ? ((node.utilization.memory_used || 0) / node.utilization.memory_total) * 100 : 0}%`,
                                            }"
                                        ></div>
                                    </div>
                                </div>

                                <!-- Disk Usage -->
                                <div v-if="node.utilization.disk_total" class="mb-4">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="text-sm font-medium">{{ t('dashboard.status.disk') }}</span>
                                        <span class="text-sm text-muted-foreground">
                                            {{ formatBytes(node.utilization.disk_used || 0, true) }} /
                                            {{ formatBytes(node.utilization.disk_total || 0, true) }}
                                        </span>
                                    </div>
                                    <div class="w-full bg-muted rounded-full h-2">
                                        <div
                                            class="bg-green-500 h-2 rounded-full transition-all duration-300"
                                            :style="{
                                                width: `${node.utilization.disk_total ? ((node.utilization.disk_used || 0) / node.utilization.disk_total) * 100 : 0}%`,
                                            }"
                                        ></div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardContent v-else class="pt-6">
                                <Alert variant="destructive">
                                    <AlertTriangle class="h-4 w-4" />
                                    <div class="ml-2">
                                        <div class="font-medium">{{ t('dashboard.status.nodeOffline') }}</div>
                                        <div class="text-sm mt-1">{{ t('dashboard.status.cannotConnectToNode') }}</div>
                                    </div>
                                </Alert>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="space-y-4">
                <Alert variant="destructive">
                    <AlertTriangle class="h-4 w-4" />
                    <div class="ml-2">
                        <div class="font-medium">{{ t('dashboard.status.failedToLoadStatus') }}</div>
                        <div class="text-sm mt-1">{{ error }}</div>
                    </div>
                </Alert>
                <Button @click="refreshData">{{ t('dashboard.status.tryAgain') }}</Button>
            </div>

            <!-- Disabled State -->
            <div v-else-if="statusData && !statusData.enabled" class="space-y-4">
                <Alert>
                    <AlertTriangle class="h-4 w-4" />
                    <div class="ml-2">
                        <div class="font-medium">{{ t('dashboard.status.statusPageDisabled') }}</div>
                        <div class="text-sm mt-1">{{ t('dashboard.status.statusPageDisabledDescription') }}</div>
                    </div>
                </Alert>
            </div>
        </div>
    </PublicLayout>
</template>

<script setup lang="ts">
/*
MIT License

Copyright (c) 2025 MythicalSystems
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { onMounted, onUnmounted, ref } from 'vue';
import PublicLayout from '@/layouts/PublicLayout.vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { RefreshCw, Server, Check, AlertTriangle, Cpu, MemoryStick, HardDrive } from 'lucide-vue-next';
import axios from 'axios';
import { useI18n } from 'vue-i18n';
import { formatBytes } from '@/lib/format';

const { t } = useI18n();

interface StatusData {
    enabled: boolean;
    data?: {
        global?: {
            total_nodes?: number;
            healthy_nodes?: number;
            unhealthy_nodes?: number;
            total_memory?: number;
            used_memory?: number;
            total_disk?: number;
            used_disk?: number;
            avg_cpu_percent?: number;
        };
        total_servers?: number;
        nodes?: Array<{
            id: number;
            name: string;
            fqdn?: string;
            status: 'healthy' | 'unhealthy';
            server_count?: number;
            utilization?: {
                memory_total?: number;
                memory_used?: number;
                disk_total?: number;
                disk_used?: number;
                cpu_percent?: number;
            };
        }>;
    };
}

const loading = ref(true);
const error = ref<string | null>(null);
const statusData = ref<StatusData | null>(null);
const autoRefreshInterval = ref<number | null>(null);

async function fetchStatus() {
    loading.value = true;
    error.value = null;

    try {
        const { data } = await axios.get('/api/status');

        if (data && data.success) {
            statusData.value = data.data;
        } else {
            error.value = data?.message || t('dashboard.status.failedToFetchStatus');
        }
    } catch (err) {
        const errorMessage =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            t('dashboard.status.failedToFetchStatus');
        error.value = errorMessage;
    } finally {
        loading.value = false;
    }
}

async function refreshData() {
    await fetchStatus();
}

function getMemoryUsagePercent(): number {
    if (!statusData.value?.data?.global?.total_memory || statusData.value.data.global.total_memory === 0) {
        return 0;
    }
    return ((statusData.value.data.global.used_memory || 0) / statusData.value.data.global.total_memory) * 100;
}

function getDiskUsagePercent(): number {
    if (!statusData.value?.data?.global?.total_disk || statusData.value.data.global.total_disk === 0) {
        return 0;
    }
    return ((statusData.value.data.global.used_disk || 0) / statusData.value.data.global.total_disk) * 100;
}

onMounted(async () => {
    await fetchStatus();

    // Auto-refresh every 30 seconds
    autoRefreshInterval.value = window.setInterval(() => {
        fetchStatus();
    }, 30000);
});

onUnmounted(() => {
    if (autoRefreshInterval.value !== null) {
        clearInterval(autoRefreshInterval.value);
    }
});
</script>

