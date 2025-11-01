<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Node Status Dashboard', isCurrent: true, href: '/admin/nodes/status' }]">
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Header -->
            <div class="p-6 border-b">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold">Node Status Dashboard</h1>
                        <p class="text-muted-foreground mt-2">Real-time monitoring of all infrastructure nodes</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        :loading="loading"
                        data-umami-event="Refresh node status"
                        @click="refreshData"
                    >
                        <RefreshCw :size="16" class="mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            <!-- Plugin Widgets: After Header -->
            <WidgetRenderer v-if="widgetsAfterHeader.length > 0" :widgets="widgetsAfterHeader" />

            <!-- Loading State -->
            <div v-if="loading && !globalStats" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading node status...</span>
                </div>
            </div>

            <!-- Dashboard Content -->
            <div v-else-if="globalStats" class="p-6">
                <!-- Plugin Widgets: Before Global Stats -->
                <WidgetRenderer v-if="widgetsBeforeGlobalStats.length > 0" :widgets="widgetsBeforeGlobalStats" />

                <!-- Global Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <!-- Total Nodes -->
                    <Card>
                        <CardContent class="p-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-muted-foreground">Total Nodes</p>
                                    <p class="text-3xl font-bold mt-2">{{ globalStats.total_nodes }}</p>
                                </div>
                                <Server class="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Healthy Nodes -->
                    <Card>
                        <CardContent class="p-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-muted-foreground">Healthy Nodes</p>
                                    <p class="text-3xl font-bold mt-2 text-green-600">
                                        {{ globalStats.healthy_nodes }}
                                    </p>
                                </div>
                                <div class="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                                    <Check class="h-5 w-5 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Unhealthy Nodes -->
                    <Card>
                        <CardContent class="p-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-muted-foreground">Unhealthy Nodes</p>
                                    <p class="text-3xl font-bold mt-2 text-red-600">
                                        {{ globalStats.unhealthy_nodes }}
                                    </p>
                                </div>
                                <div class="h-8 w-8 bg-red-500 rounded-full flex items-center justify-center">
                                    <AlertTriangle class="h-5 w-5 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Average CPU -->
                    <Card>
                        <CardContent class="p-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-muted-foreground">Avg CPU Usage</p>
                                    <p class="text-3xl font-bold mt-2">{{ globalStats.avg_cpu_percent.toFixed(1) }}%</p>
                                </div>
                                <Cpu class="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Plugin Widgets: After Global Stats -->
                <WidgetRenderer v-if="widgetsAfterGlobalStats.length > 0" :widgets="widgetsAfterGlobalStats" />

                <!-- Global Resource Usage Cards -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <!-- Global Memory Usage -->
                    <Card>
                        <CardHeader>
                            <CardTitle class="flex items-center gap-2">
                                <MemoryStick class="h-5 w-5" />
                                Global Memory Usage
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-muted-foreground">Used / Total</span>
                                    <span class="text-sm font-medium">
                                        {{ formatBytes(globalStats.used_memory) }} /
                                        {{ formatBytes(globalStats.total_memory) }}
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
                                    {{ getMemoryUsagePercent().toFixed(1) }}% used
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Global Disk Usage -->
                    <Card>
                        <CardHeader>
                            <CardTitle class="flex items-center gap-2">
                                <HardDrive class="h-5 w-5" />
                                Global Disk Usage
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-muted-foreground">Used / Total</span>
                                    <span class="text-sm font-medium">
                                        {{ formatBytes(globalStats.used_disk) }} /
                                        {{ formatBytes(globalStats.total_disk) }}
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
                                    {{ getDiskUsagePercent().toFixed(1) }}% used
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Plugin Widgets: After Resource Usage -->
                <WidgetRenderer v-if="widgetsAfterResourceUsage.length > 0" :widgets="widgetsAfterResourceUsage" />

                <!-- Individual Node Cards -->
                <div>
                    <h2 class="text-2xl font-bold mb-4">Individual Nodes</h2>
                    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <Card v-for="node in nodes" :key="node.id" class="overflow-hidden">
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
                                        <CardDescription class="mt-1 font-mono text-xs">
                                            {{ node.fqdn }}
                                        </CardDescription>
                                    </div>
                                    <Badge :variant="node.status === 'healthy' ? 'default' : 'destructive'">
                                        {{ node.status === 'healthy' ? 'Online' : 'Offline' }}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent v-if="node.status === 'healthy' && node.utilization" class="pt-6">
                                <!-- CPU Usage -->
                                <div class="mb-4">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="text-sm font-medium">CPU Usage</span>
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
                                    <div class="flex justify-between text-xs text-muted-foreground mt-1">
                                        <span>Load: {{ node.utilization.load_average1 }}</span>
                                        <span>{{ node.utilization.load_average5 }}</span>
                                        <span>{{ node.utilization.load_average15 }}</span>
                                    </div>
                                </div>

                                <!-- Memory Usage -->
                                <div class="mb-4">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="text-sm font-medium">Memory</span>
                                        <span class="text-sm text-muted-foreground">
                                            {{ formatBytes(node.utilization.memory_used) }} /
                                            {{ formatBytes(node.utilization.memory_total) }}
                                        </span>
                                    </div>
                                    <div class="w-full bg-muted rounded-full h-2">
                                        <div
                                            class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                            :style="{
                                                width: `${(node.utilization.memory_used / node.utilization.memory_total) * 100}%`,
                                            }"
                                        ></div>
                                    </div>
                                </div>

                                <!-- Disk Usage -->
                                <div class="mb-4">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="text-sm font-medium">Disk</span>
                                        <span class="text-sm text-muted-foreground">
                                            {{ formatBytes(node.utilization.disk_used) }} /
                                            {{ formatBytes(node.utilization.disk_total) }}
                                        </span>
                                    </div>
                                    <div class="w-full bg-muted rounded-full h-2">
                                        <div
                                            class="bg-green-500 h-2 rounded-full transition-all duration-300"
                                            :style="{
                                                width: `${(node.utilization.disk_used / node.utilization.disk_total) * 100}%`,
                                            }"
                                        ></div>
                                    </div>
                                </div>

                                <!-- Swap (if available) -->
                                <div v-if="node.utilization.swap_total && node.utilization.swap_total > 0">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="text-sm font-medium">Swap</span>
                                        <span class="text-sm text-muted-foreground">
                                            {{ formatBytes(node.utilization.swap_used) }} /
                                            {{ formatBytes(node.utilization.swap_total) }}
                                        </span>
                                    </div>
                                    <div class="w-full bg-muted rounded-full h-2">
                                        <div
                                            class="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                            :style="{
                                                width: `${(node.utilization.swap_used / node.utilization.swap_total) * 100}%`,
                                            }"
                                        ></div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardContent v-else class="pt-6">
                                <Alert variant="destructive">
                                    <AlertTriangle class="h-4 w-4" />
                                    <div class="ml-2">
                                        <div class="font-medium">Node Offline</div>
                                        <div class="text-sm mt-1">
                                            {{ node.error || 'Cannot connect to Wings daemon' }}
                                        </div>
                                    </div>
                                </Alert>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <!-- Plugin Widgets: After Individual Nodes -->
                <WidgetRenderer v-if="widgetsAfterIndividualNodes.length > 0" :widgets="widgetsAfterIndividualNodes" />
            </div>

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />

            <!-- Error State -->
            <div v-else-if="error" class="p-6">
                <Alert variant="destructive">
                    <AlertTriangle class="h-4 w-4" />
                    <div class="ml-2">
                        <div class="font-medium">Failed to Load Node Status</div>
                        <div class="text-sm mt-1">{{ error }}</div>
                    </div>
                </Alert>
                <Button class="mt-4" @click="refreshData">Try Again</Button>
            </div>
        </div>
    </DashboardLayout>
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

import { computed, onMounted, onUnmounted, ref } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { RefreshCw, Server, Check, AlertTriangle, Cpu, MemoryStick, HardDrive } from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';

const toast = useToast();

interface GlobalStats {
    total_nodes: number;
    healthy_nodes: number;
    unhealthy_nodes: number;
    total_memory: number;
    used_memory: number;
    total_disk: number;
    used_disk: number;
    avg_cpu_percent: number;
}

interface NodeUtilization {
    memory_total: number;
    memory_used: number;
    disk_total: number;
    disk_used: number;
    swap_total: number;
    swap_used: number;
    cpu_percent: number;
    load_average1: number;
    load_average5: number;
    load_average15: number;
}

interface NodeStatus {
    id: number;
    uuid: string;
    name: string;
    fqdn: string;
    location_id: number;
    status: 'healthy' | 'unhealthy';
    utilization: NodeUtilization | null;
    error: string | null;
}

const loading = ref(false);
const error = ref<string | null>(null);
const globalStats = ref<GlobalStats | null>(null);
const nodes = ref<NodeStatus[]>([]);
const autoRefreshInterval = ref<number | null>(null);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-nodes-status');
const widgetsTopOfPage = computed(() => getWidgets('admin-nodes-status', 'top-of-page'));
const widgetsAfterHeader = computed(() => getWidgets('admin-nodes-status', 'after-header'));
const widgetsBeforeGlobalStats = computed(() => getWidgets('admin-nodes-status', 'before-global-stats'));
const widgetsAfterGlobalStats = computed(() => getWidgets('admin-nodes-status', 'after-global-stats'));
const widgetsAfterResourceUsage = computed(() => getWidgets('admin-nodes-status', 'after-resource-usage'));
const widgetsAfterIndividualNodes = computed(() => getWidgets('admin-nodes-status', 'after-individual-nodes'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-nodes-status', 'bottom-of-page'));

async function fetchGlobalStatus() {
    loading.value = true;
    error.value = null;

    try {
        const { data } = await axios.get('/api/admin/nodes/status/global');

        if (data && data.success) {
            globalStats.value = data.data.global;
            nodes.value = data.data.nodes;
        } else {
            error.value = data?.message || 'Failed to fetch node status';
        }
    } catch (err) {
        const errorMessage =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to fetch node status';
        error.value = errorMessage;
        toast.error(errorMessage);
    } finally {
        loading.value = false;
    }
}

async function refreshData() {
    await fetchGlobalStatus();
    toast.success('Node status refreshed');
}

function getMemoryUsagePercent(): number {
    if (!globalStats.value || globalStats.value.total_memory === 0) return 0;
    return (globalStats.value.used_memory / globalStats.value.total_memory) * 100;
}

function getDiskUsagePercent(): number {
    if (!globalStats.value || globalStats.value.total_disk === 0) return 0;
    return (globalStats.value.used_disk / globalStats.value.total_disk) * 100;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

onMounted(async () => {
    // Fetch plugin widgets
    await fetchPluginWidgets();

    await fetchGlobalStatus();

    // Auto-refresh every 10 seconds
    autoRefreshInterval.value = window.setInterval(() => {
        fetchGlobalStatus();
    }, 10000);
});

onUnmounted(() => {
    if (autoRefreshInterval.value !== null) {
        clearInterval(autoRefreshInterval.value);
    }
});
</script>
