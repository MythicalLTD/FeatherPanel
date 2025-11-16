<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Analytics', href: '/admin/kpi/analytics' },
            { text: 'Infrastructure', isCurrent: true },
        ]"
    >
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading infrastructure analytics...</span>
                </div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="text-center py-12">
                <p class="text-red-500">{{ error }}</p>
                <Button class="mt-4" data-umami-event="Retry infrastructure analytics" @click="fetchAnalytics"
                    >Try Again</Button
                >
            </div>

            <!-- Content -->
            <div v-else class="p-6 space-y-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-bold text-foreground mb-1">Infrastructure Analytics</h1>
                        <p class="text-muted-foreground">Monitor locations, nodes, allocations, and databases</p>
                    </div>
                    <div class="flex gap-2">
                        <Button
                            variant="outline"
                            data-umami-event="Refresh infrastructure analytics"
                            @click="fetchAnalytics"
                        >
                            <RefreshCw :size="16" class="mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>

                <!-- Overview Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Locations</CardTitle>
                            <Globe class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ locationsOverview.total_locations }}</div>
                            <p class="text-xs text-muted-foreground mt-1">
                                {{ locationsOverview.with_nodes }} with nodes
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Nodes</CardTitle>
                            <Server class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ nodesOverview.total_nodes }}</div>
                            <p class="text-xs text-muted-foreground mt-1">
                                {{ nodesOverview.percentage_public }}% public
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Allocations</CardTitle>
                            <Network class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ allocationsOverview.total_allocations }}</div>
                            <p class="text-xs text-muted-foreground mt-1">
                                {{ allocationsOverview.percentage_used }}% in use
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Database Hosts</CardTitle>
                            <Database class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ databasesOverview.total_databases }}</div>
                            <p class="text-xs text-muted-foreground mt-1">Across all nodes</p>
                        </CardContent>
                    </Card>
                </div>

                <!-- Charts Row 1 -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Nodes by Location Chart -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Nodes by Location</CardTitle>
                            <CardDescription>Distribution of nodes across locations</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px] flex items-center justify-center">
                                <Doughnut
                                    v-if="nodesByLocationChartData"
                                    :data="nodesByLocationChartData"
                                    :options="doughnutChartOptions"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Allocation Usage Chart -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Allocation Usage</CardTitle>
                            <CardDescription>Assigned vs available allocations</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px] flex items-center justify-center">
                                <Pie
                                    v-if="allocationUsageChartData"
                                    :data="allocationUsageChartData"
                                    :options="pieChartOptions"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Charts Row 2 -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Servers by Node Chart -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Servers by Node</CardTitle>
                            <CardDescription>Server distribution across nodes</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px]">
                                <Bar
                                    v-if="serversByNodeChartData"
                                    :data="serversByNodeChartData"
                                    :options="barChartOptions"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Database Types Chart -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Database Types</CardTitle>
                            <CardDescription>Distribution of database host types</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px] flex items-center justify-center">
                                <Doughnut
                                    v-if="databaseTypesChartData"
                                    :data="databaseTypesChartData"
                                    :options="doughnutChartOptions"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Node Resources Table -->
                <Card>
                    <CardHeader>
                        <CardTitle>Node Resource Allocation</CardTitle>
                        <CardDescription>Memory and disk usage across all nodes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="space-y-3">
                            <div
                                v-for="node in nodeResources"
                                :key="node.id"
                                class="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                            >
                                <div class="flex items-center justify-between mb-3">
                                    <div>
                                        <p class="font-semibold">{{ node.name }}</p>
                                        <p class="text-sm text-muted-foreground">{{ node.server_count }} servers</p>
                                    </div>
                                </div>

                                <!-- Memory Bar -->
                                <div class="space-y-1 mb-3">
                                    <div class="flex items-center justify-between text-xs">
                                        <span class="text-muted-foreground">Memory</span>
                                        <span class="font-medium">
                                            {{ node.allocated_memory.toLocaleString() }} /
                                            {{ node.memory.toLocaleString() }} MB ({{ node.memory_usage_percentage }}%)
                                        </span>
                                    </div>
                                    <div class="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            class="h-full bg-blue-500 transition-all"
                                            :style="{ width: `${Math.min(node.memory_usage_percentage, 100)}%` }"
                                        ></div>
                                    </div>
                                </div>

                                <!-- Disk Bar -->
                                <div class="space-y-1">
                                    <div class="flex items-center justify-between text-xs">
                                        <span class="text-muted-foreground">Disk</span>
                                        <span class="font-medium">
                                            {{ node.allocated_disk.toLocaleString() }} /
                                            {{ node.disk.toLocaleString() }} MB ({{ node.disk_usage_percentage }}%)
                                        </span>
                                    </div>
                                    <div class="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            class="h-full bg-green-500 transition-all"
                                            :style="{ width: `${Math.min(node.disk_usage_percentage, 100)}%` }"
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Bottom Row -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Allocations by Node -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Allocations by Node</CardTitle>
                            <CardDescription>Network allocation distribution</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-3">
                                <div
                                    v-for="node in allocationsByNode.slice(0, 10)"
                                    :key="node.node_id"
                                    class="flex items-center justify-between p-3 rounded-lg border border-border"
                                >
                                    <div class="flex-1">
                                        <p class="font-medium text-sm">{{ node.node_name }}</p>
                                        <p class="text-xs text-muted-foreground">{{ node.usage_percentage }}% in use</p>
                                    </div>
                                    <div class="flex gap-2">
                                        <Badge variant="default" class="text-xs">
                                            {{ node.assigned_allocations }} used
                                        </Badge>
                                        <Badge variant="secondary" class="text-xs">
                                            {{ node.available_allocations }} free
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Top Ports -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Most Used Ports</CardTitle>
                            <CardDescription>Top 10 most allocated ports</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-2">
                                <div
                                    v-for="(port, index) in portUsage"
                                    :key="port.port"
                                    class="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs"
                                        >
                                            {{ index + 1 }}
                                        </div>
                                        <span class="font-mono font-medium">{{ port.port }}</span>
                                    </div>
                                    <div class="flex gap-2 text-xs">
                                        <span class="text-green-600 dark:text-green-400">{{ port.assigned }} used</span>
                                        <span class="text-muted-foreground">{{ port.available }} free</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Database Usage Per Server -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Database Usage Per Server</CardTitle>
                            <CardDescription>How many databases servers typically have</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-4">
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground">Servers with Databases</span>
                                    <span class="font-semibold">{{ databaseUsage.servers_with_databases }}</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground">Servers without Databases</span>
                                    <span class="font-semibold">{{ databaseUsage.servers_without_databases }}</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground">Average DBs per Server</span>
                                    <Badge variant="default">{{ databaseUsage.avg_databases_per_server }}</Badge>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground">Max DBs per Server</span>
                                    <Badge variant="secondary">{{ databaseUsage.max_databases_per_server }}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Server Allocation Stats -->
                <Card>
                    <CardHeader>
                        <CardTitle>Server Allocation Patterns</CardTitle>
                        <CardDescription>Top 20 servers by allocation count</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="space-y-2">
                            <div
                                v-for="server in allocationUsage.slice(0, 20)"
                                :key="server.server_id"
                                class="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                            >
                                <div class="flex-1 min-w-0">
                                    <p class="font-medium text-sm truncate">{{ server.server_name }}</p>
                                    <p class="text-xs text-muted-foreground">
                                        {{ server.allocation_count }} allocation{{
                                            server.allocation_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="server.allocation_limit">
                                            / {{ server.allocation_limit }} limit
                                        </span>
                                        <span v-else> (unlimited)</span>
                                    </p>
                                </div>
                                <Badge variant="outline" class="font-mono text-xs">
                                    {{ server.allocation_count }}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </DashboardLayout>
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

import { ref, onMounted, computed } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Server, Network, Database, RefreshCw } from 'lucide-vue-next';
import axios from 'axios';
import { Doughnut, Pie, Bar } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// Types
interface LocationOverview {
    total_locations: number;
    with_nodes: number;
    empty_locations: number;
}

interface NodeOverview {
    total_nodes: number;
    public_nodes: number;
    private_nodes: number;
    maintenance_nodes: number;
    proxy_nodes: number;
    percentage_public: number;
}

interface AllocationOverview {
    total_allocations: number;
    assigned: number;
    available: number;
    percentage_used: number;
}

interface DatabaseOverview {
    total_databases: number;
    by_type: { database_type: string; count: number }[];
    by_node: { node_name: string; count: number }[];
}

interface NodeResource {
    id: number;
    name: string;
    memory: number;
    disk: number;
    allocated_memory: number;
    allocated_disk: number;
    server_count: number;
    memory_usage_percentage: number;
    disk_usage_percentage: number;
}

interface AllocationByNode {
    node_id: number;
    node_name: string;
    total_allocations: number;
    assigned_allocations: number;
    available_allocations: number;
    usage_percentage: number;
}

interface PortUsage {
    port: number;
    count: number;
    assigned: number;
    available: number;
}

interface DatabaseUsage {
    total_servers: number;
    servers_with_databases: number;
    servers_without_databases: number;
    avg_databases_per_server: number;
    max_databases_per_server: number;
    distribution: { db_count: number; server_count: number }[];
}

interface AllocationUsageServer {
    server_id: number;
    server_name: string;
    allocation_limit: number | null;
    allocation_count: number;
}

// State
const loading = ref(true);
const error = ref<string | null>(null);
const locationsOverview = ref<LocationOverview>({
    total_locations: 0,
    with_nodes: 0,
    empty_locations: 0,
});
const nodesOverview = ref<NodeOverview>({
    total_nodes: 0,
    public_nodes: 0,
    private_nodes: 0,
    maintenance_nodes: 0,
    proxy_nodes: 0,
    percentage_public: 0,
});
const allocationsOverview = ref<AllocationOverview>({
    total_allocations: 0,
    assigned: 0,
    available: 0,
    percentage_used: 0,
});
const databasesOverview = ref<DatabaseOverview>({
    total_databases: 0,
    by_type: [],
    by_node: [],
});
const nodesByLocation = ref<{ location_id: number; location_name: string; node_count: number }[]>([]);
const serversByNode = ref<{ node_id: number; node_name: string; server_count: number }[]>([]);
const nodeResources = ref<NodeResource[]>([]);
const allocationsByNode = ref<AllocationByNode[]>([]);
const portUsage = ref<PortUsage[]>([]);
const databaseUsage = ref<DatabaseUsage>({
    total_servers: 0,
    servers_with_databases: 0,
    servers_without_databases: 0,
    avg_databases_per_server: 0,
    max_databases_per_server: 0,
    distribution: [],
});
const allocationUsage = ref<AllocationUsageServer[]>([]);

// Chart Data
const nodesByLocationChartData = computed(() => {
    if (!nodesByLocation.value.length) return null;

    const colors = [
        'rgb(99, 102, 241)',
        'rgb(59, 130, 246)',
        'rgb(139, 92, 246)',
        'rgb(168, 85, 247)',
        'rgb(236, 72, 153)',
        'rgb(251, 146, 60)',
        'rgb(34, 197, 94)',
        'rgb(16, 185, 129)',
    ];

    return {
        labels: nodesByLocation.value.map((l) => l.location_name),
        datasets: [
            {
                label: 'Nodes',
                data: nodesByLocation.value.map((l) => l.node_count),
                backgroundColor: colors,
            },
        ],
    };
});

const allocationUsageChartData = computed(() => {
    if (!allocationsOverview.value.total_allocations) return null;

    return {
        labels: ['Assigned', 'Available'],
        datasets: [
            {
                data: [allocationsOverview.value.assigned, allocationsOverview.value.available],
                backgroundColor: ['rgb(239, 68, 68)', 'rgb(34, 197, 94)'],
            },
        ],
    };
});

const serversByNodeChartData = computed(() => {
    if (!serversByNode.value.length) return null;

    return {
        labels: serversByNode.value.map((n) => n.node_name),
        datasets: [
            {
                label: 'Servers',
                data: serversByNode.value.map((n) => n.server_count),
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderRadius: 4,
            },
        ],
    };
});

const databaseTypesChartData = computed(() => {
    if (!databasesOverview.value.by_type.length) return null;

    const colors = [
        'rgb(59, 130, 246)',
        'rgb(139, 92, 246)',
        'rgb(236, 72, 153)',
        'rgb(251, 146, 60)',
        'rgb(34, 197, 94)',
    ];

    return {
        labels: databasesOverview.value.by_type.map((d) => d.database_type.toUpperCase()),
        datasets: [
            {
                data: databasesOverview.value.by_type.map((d) => d.count),
                backgroundColor: colors,
            },
        ],
    };
});

// Chart Options
const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom' as const,
        },
    },
};

const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom' as const,
        },
    },
};

const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false,
        },
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                precision: 0,
            },
        },
    },
};

// Fetch analytics data
const fetchAnalytics = async () => {
    loading.value = true;
    error.value = null;

    try {
        const [
            locationsRes,
            nodesRes,
            allocationsRes,
            databasesRes,
            nodesByLocRes,
            serversByNodeRes,
            nodeResourcesRes,
            allocationsByNodeRes,
            portUsageRes,
            databaseUsageRes,
            allocationUsageRes,
        ] = await Promise.all([
            axios.get('/api/admin/analytics/locations/overview'),
            axios.get('/api/admin/analytics/nodes/overview'),
            axios.get('/api/admin/analytics/allocations/overview'),
            axios.get('/api/admin/analytics/databases/overview'),
            axios.get('/api/admin/analytics/nodes/by-location'),
            axios.get('/api/admin/analytics/servers/by-node'),
            axios.get('/api/admin/analytics/nodes/resources'),
            axios.get('/api/admin/analytics/allocations/by-node'),
            axios.get('/api/admin/analytics/ports/usage?limit=10'),
            axios.get('/api/admin/analytics/servers/database-usage'),
            axios.get('/api/admin/analytics/servers/allocation-usage'),
        ]);

        if (locationsRes.data?.success) {
            locationsOverview.value = locationsRes.data.data;
        }

        if (nodesRes.data?.success) {
            nodesOverview.value = nodesRes.data.data;
        }

        if (allocationsRes.data?.success) {
            allocationsOverview.value = allocationsRes.data.data;
        }

        if (databasesRes.data?.success) {
            databasesOverview.value = databasesRes.data.data;
        }

        if (nodesByLocRes.data?.success) {
            nodesByLocation.value = nodesByLocRes.data.data.locations;
        }

        if (serversByNodeRes.data?.success) {
            serversByNode.value = serversByNodeRes.data.data.nodes;
        }

        if (nodeResourcesRes.data?.success) {
            nodeResources.value = nodeResourcesRes.data.data.nodes;
        }

        if (allocationsByNodeRes.data?.success) {
            allocationsByNode.value = allocationsByNodeRes.data.data.nodes;
        }

        if (portUsageRes.data?.success) {
            portUsage.value = portUsageRes.data.data.ports;
        }

        if (databaseUsageRes.data?.success) {
            databaseUsage.value = databaseUsageRes.data.data;
        }

        if (allocationUsageRes.data?.success) {
            allocationUsage.value = allocationUsageRes.data.data.top_servers;
        }
    } catch (err) {
        console.error('Failed to fetch infrastructure analytics:', err);
        error.value = 'Failed to load infrastructure analytics data';
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchAnalytics();
});
</script>
