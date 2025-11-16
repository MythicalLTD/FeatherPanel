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

import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import TableComponent from '@/components/ui/feather-table/TableComponent.vue';
import type { TableColumn } from '@/components/ui/feather-table/types';
import { Clock, Server, AlertTriangle, CheckCircle, XCircle, ArrowLeft, FileText } from 'lucide-vue-next';
import axios from 'axios';
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useRouter, useRoute } from 'vue-router';

const toast = useToast();
const router = useRouter();
const route = useRoute();

interface CronLog {
    id: number;
    execution_id: string;
    started_at: string;
    completed_at: string | null;
    status: 'running' | 'completed' | 'failed';
    total_servers_scanned: number;
    total_detections: number;
    total_errors: number;
    summary: string | null;
    details: {
        duration_seconds?: number;
        nodes?: Array<{
            node_id: number;
            node_name: string;
            servers_scanned: number;
            detections: number;
            errors: number;
            error?: string;
        }>;
        total_nodes?: number;
    } | null;
    error_message: string | null;
}

interface ScanLog {
    id: number;
    execution_id: string;
    server_uuid: string;
    server_name: string | null;
    node_id: number | null;
    node_name: string | null;
    status: 'completed' | 'failed' | 'skipped';
    files_scanned: number;
    detections_count: number;
    errors_count: number;
    duration_seconds: number | string | null;
    detections: Array<Record<string, unknown>> | null;
    error_message: string | null;
    scanned_at: string;
}

const loading = ref(true);
const executionLog = ref<CronLog | null>(null);
const scanLogs = ref<ScanLog[]>([]);

const executionId = computed(() => route.params.executionId as string);

const breadcrumbs = computed(() => [
    { text: 'FeatherZeroTrust', href: '/admin/feathercloud/featherzerotrust' },
    { text: 'Execution Logs', href: '/admin/feathercloud/featherzerotrust/logs' },
    { text: 'Details', isCurrent: true },
]);

const scanLogsColumns: TableColumn[] = [
    { key: 'server_name', label: 'Server', searchable: true },
    { key: 'node_name', label: 'Node', searchable: true },
    { key: 'status', label: 'Status' },
    { key: 'files_scanned', label: 'Files Scanned' },
    { key: 'detections_count', label: 'Detections' },
    { key: 'duration', label: 'Duration' },
];

async function fetchLogDetails(): Promise<void> {
    loading.value = true;
    try {
        const { data } = await axios.get<{
            success: boolean;
            data: {
                execution: CronLog;
                scan_logs: ScanLog[];
            };
        }>(`/api/admin/featherzerotrust/logs/${executionId.value}`);

        if (data.success && data.data) {
            executionLog.value = data.data.execution;
            scanLogs.value = data.data.scan_logs || [];
        } else {
            toast.error('Failed to load execution log details');
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to fetch execution log details';
        toast.error(errorMessage);
        router.push('/admin/feathercloud/featherzerotrust/logs');
    } finally {
        loading.value = false;
    }
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' {
    switch (status) {
        case 'completed':
            return 'default';
        case 'running':
            return 'secondary';
        case 'failed':
            return 'destructive';
        default:
            return 'secondary';
    }
}

function getStatusIcon(status: string) {
    switch (status) {
        case 'completed':
            return CheckCircle;
        case 'running':
            return Clock;
        case 'failed':
            return XCircle;
        default:
            return Clock;
    }
}

function formatDuration(seconds: number | string | null | undefined): string {
    if (!seconds) return 'N/A';
    const numSeconds = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
    if (isNaN(numSeconds)) return 'N/A';
    if (numSeconds < 60) return `${numSeconds.toFixed(1)}s`;
    const minutes = Math.floor(numSeconds / 60);
    const secs = numSeconds % 60;
    return `${minutes}m ${secs.toFixed(0)}s`;
}

function formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
}

onMounted(() => {
    void fetchLogDetails();
});
</script>

<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen bg-background">
            <div class="space-y-6 p-6">
                <!-- Hero Section -->
                <div
                    class="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-8 sm:p-10 shadow-xl shadow-primary/10"
                >
                    <div class="absolute inset-0 pointer-events-none">
                        <div
                            class="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent"
                        ></div>
                    </div>
                    <div class="relative z-10">
                        <div class="flex items-center gap-4 mb-6">
                            <Button
                                variant="ghost"
                                size="sm"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Return to logs list"
                                @click="router.push('/admin/feathercloud/featherzerotrust/logs')"
                            >
                                <ArrowLeft class="h-4 w-4 mr-2" />
                                Back to Logs
                            </Button>
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                                <FileText class="h-10 w-10 text-primary" />
                            </div>
                            <div class="flex-1">
                                <Badge variant="secondary" class="mb-2 border-primary/30 bg-primary/10 text-primary">
                                    Execution Details
                                </Badge>
                                <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Execution Log</h1>
                                <p class="text-muted-foreground mt-2">
                                    Detailed execution log for:
                                    <code class="text-xs font-mono bg-muted px-2 py-1 rounded">{{ executionId }}</code>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Loading State -->
                <div v-if="loading" class="flex items-center justify-center py-12">
                    <div class="flex items-center gap-3">
                        <div
                            class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"
                        ></div>
                        <span class="text-muted-foreground">Loading execution details...</span>
                    </div>
                </div>

                <!-- Error State -->
                <div v-else-if="!executionLog" class="text-center py-12">
                    <p class="text-muted-foreground mb-4">No execution log found</p>
                    <Button
                        variant="outline"
                        class="hover:scale-110 hover:shadow-md transition-all duration-200"
                        title="Return to logs list"
                        @click="router.push('/admin/feathercloud/featherzerotrust/logs')"
                    >
                        <ArrowLeft class="h-4 w-4 mr-2" />
                        Back to Logs
                    </Button>
                </div>

                <!-- Execution Details -->
                <div v-else class="space-y-6">
                    <!-- Summary Card -->
                    <Card class="border border-border/70 shadow-lg">
                        <CardHeader>
                            <CardTitle>Execution Summary</CardTitle>
                            <CardDescription>Overview of the cron job execution</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                <div class="p-4 bg-muted/50 rounded-lg border border-border/50">
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="text-sm font-medium text-muted-foreground">Status</div>
                                        <component :is="getStatusIcon(executionLog.status)" class="h-4 w-4" />
                                    </div>
                                    <Badge :variant="getStatusVariant(executionLog.status)" class="mt-1">
                                        {{ executionLog.status }}
                                    </Badge>
                                </div>
                                <div class="p-4 bg-muted/50 rounded-lg border border-border/50">
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="text-sm font-medium text-muted-foreground">Servers Scanned</div>
                                        <Server class="h-4 w-4 text-blue-500/60" />
                                    </div>
                                    <div class="text-2xl font-bold">{{ executionLog.total_servers_scanned }}</div>
                                </div>
                                <div class="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="text-sm font-medium text-muted-foreground">Detections</div>
                                        <AlertTriangle class="h-4 w-4 text-destructive" />
                                    </div>
                                    <div class="text-2xl font-bold text-destructive">
                                        {{ executionLog.total_detections }}
                                    </div>
                                </div>
                                <div class="p-4 bg-muted/50 rounded-lg border border-border/50">
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="text-sm font-medium text-muted-foreground">Duration</div>
                                        <Clock class="h-4 w-4 text-green-500/60" />
                                    </div>
                                    <div class="text-2xl font-bold">
                                        {{ formatDuration(executionLog.details?.duration_seconds) }}
                                    </div>
                                </div>
                            </div>

                            <div class="mt-6 space-y-3 pt-6 border-t">
                                <div class="flex justify-between text-sm">
                                    <span class="text-muted-foreground">Started At:</span>
                                    <span class="font-medium">{{ formatDate(executionLog.started_at) }}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-muted-foreground">Completed At:</span>
                                    <span class="font-medium">{{ formatDate(executionLog.completed_at) }}</span>
                                </div>
                                <div v-if="executionLog.summary" class="pt-3 border-t">
                                    <div class="text-sm font-medium text-muted-foreground mb-2">Summary</div>
                                    <p class="text-sm">{{ executionLog.summary }}</p>
                                </div>
                                <div v-if="executionLog.error_message" class="pt-3 border-t">
                                    <div class="text-sm font-medium text-destructive mb-2">Error Message</div>
                                    <p class="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                                        {{ executionLog.error_message }}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Node Breakdown -->
                    <Card
                        v-if="executionLog.details?.nodes && executionLog.details.nodes.length > 0"
                        class="border border-border/70 shadow-lg"
                    >
                        <CardHeader>
                            <CardTitle>Node Breakdown</CardTitle>
                            <CardDescription>Statistics per node</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-3">
                                <div
                                    v-for="(node, index) in executionLog.details.nodes"
                                    :key="index"
                                    class="p-4 border rounded-lg"
                                    :class="
                                        node.errors > 0 ? 'border-destructive/50 bg-destructive/5' : 'border-border'
                                    "
                                >
                                    <div class="flex items-start justify-between mb-3">
                                        <div>
                                            <div class="font-semibold">{{ node.node_name }}</div>
                                            <div class="text-xs text-muted-foreground">Node ID: {{ node.node_id }}</div>
                                        </div>
                                        <Badge v-if="node.errors > 0" variant="destructive">
                                            {{ node.errors }} error{{ node.errors !== 1 ? 's' : '' }}
                                        </Badge>
                                    </div>
                                    <div class="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <div class="text-muted-foreground">Servers</div>
                                            <div class="font-semibold">{{ node.servers_scanned }}</div>
                                        </div>
                                        <div>
                                            <div class="text-muted-foreground">Detections</div>
                                            <div class="font-semibold text-destructive">{{ node.detections }}</div>
                                        </div>
                                        <div>
                                            <div class="text-muted-foreground">Errors</div>
                                            <div class="font-semibold text-orange-500">{{ node.errors }}</div>
                                        </div>
                                    </div>
                                    <div
                                        v-if="node.error"
                                        class="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive"
                                    >
                                        {{ node.error }}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Server Scan Logs -->
                    <Card class="border border-border/70 shadow-lg">
                        <CardHeader>
                            <CardTitle>Server Scan Logs</CardTitle>
                            <CardDescription>
                                Individual server scan results ({{ scanLogs.length }} server{{ scanLogs.length !== 1 ? 's' : '' }})
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TableComponent
                                title="Server Scans"
                                description="Individual server scan results"
                                :columns="scanLogsColumns"
                                :data="
                                    (scanLogs.map((log) => ({
                                        ...log,
                                        duration: formatDuration(log.duration_seconds),
                                    })) as unknown) as Record<string, unknown>[]
                                "
                                :server-side-pagination="false"
                            >
                                <template #cell-server_name="{ item }">
                                    <div>
                                        <div class="font-medium">{{ (item as Record<string, unknown>).server_name || 'Unknown' }}</div>
                                        <code class="text-xs text-muted-foreground">{{
                                            (item as Record<string, unknown>).server_uuid
                                        }}</code>
                                    </div>
                                </template>

                                <template #cell-status="{ item }">
                                    <Badge
                                        :variant="getStatusVariant((item as Record<string, unknown>).status as string)"
                                        class="flex items-center gap-1.5 w-fit"
                                    >
                                        <component :is="getStatusIcon((item as Record<string, unknown>).status as string)" class="h-3 w-3" />
                                        {{ (item as Record<string, unknown>).status }}
                                    </Badge>
                                </template>

                                <template #cell-files_scanned="{ item }">
                                    <div class="text-sm font-mono">
                                        {{ ((item as Record<string, unknown>).files_scanned || 0).toLocaleString() }}
                                    </div>
                                </template>

                                <template #cell-detections_count="{ item }">
                                    <div
                                        class="text-sm font-semibold"
                                        :class="((item as Record<string, unknown>).detections_count as number) > 0 ? 'text-destructive' : ''"
                                    >
                                        {{ (item as Record<string, unknown>).detections_count }}
                                    </div>
                                </template>

                                <template #cell-duration="{ item }">
                                    <div class="text-sm font-mono">{{ (item as Record<string, unknown>).duration }}</div>
                                </template>
                            </TableComponent>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    </DashboardLayout>
</template>
