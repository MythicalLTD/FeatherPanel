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

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import TableComponent from '@/components/ui/feather-table/TableComponent.vue';
import type { TableColumn } from '@/components/ui/feather-table/types';
import { Clock, Server, AlertTriangle, CheckCircle, XCircle, Eye, FileText } from 'lucide-vue-next';
import axios from 'axios';
import { ref, onMounted } from 'vue';
import { useToast } from 'vue-toastification';

const toast = useToast();

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

interface ApiResponse {
    success: boolean;
    data: {
        logs: CronLog[];
        pagination: {
            current_page: number;
            per_page: number;
            total_records: number;
            total_pages: number;
            has_next: boolean;
            has_prev: boolean;
            from: number;
            to: number;
        };
    };
}

interface LogDetailsResponse {
    success: boolean;
    data: {
        execution: CronLog;
        scan_logs: ScanLog[];
    };
}

const loading = ref(true);
const logs = ref<CronLog[]>([]);
const pagination = ref({
    page: 1,
    pageSize: 25,
    total: 0,
    hasNext: false,
    hasPrev: false,
    from: 0,
    to: 0,
});

const drawerOpen = ref(false);
const detailsLoading = ref(false);
const executionLog = ref<CronLog | null>(null);
const scanLogs = ref<ScanLog[]>([]);

const tableColumns: TableColumn[] = [
    { key: 'execution_id', label: 'Execution ID', searchable: true },
    { key: 'started_at', label: 'Started At' },
    { key: 'completed_at', label: 'Completed At' },
    { key: 'status', label: 'Status' },
    { key: 'stats', label: 'Statistics' },
    { key: 'duration', label: 'Duration' },
    { key: 'actions', label: 'Actions' },
];

const scanLogsColumns: TableColumn[] = [
    { key: 'server_name', label: 'Server', searchable: true },
    { key: 'node_name', label: 'Node', searchable: true },
    { key: 'status', label: 'Status' },
    { key: 'files_scanned', label: 'Files Scanned' },
    { key: 'detections_count', label: 'Detections' },
    { key: 'duration', label: 'Duration' },
];

async function fetchLogs(): Promise<void> {
    loading.value = true;
    try {
        const params: Record<string, string | number> = {
            page: pagination.value.page,
            limit: pagination.value.pageSize,
        };

        const { data } = await axios.get<ApiResponse>('/api/admin/featherzerotrust/logs', { params });

        if (data.success && data.data) {
            logs.value = data.data.logs;
            const pag = data.data.pagination;
            pagination.value = {
                page: pag.current_page,
                pageSize: pag.per_page,
                total: pag.total_records,
                hasNext: pag.has_next,
                hasPrev: pag.has_prev,
                from: pag.from,
                to: pag.to,
            };
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to fetch execution logs';
        toast.error(errorMessage);
    } finally {
        loading.value = false;
    }
}

async function fetchLogDetails(executionId: string): Promise<void> {
    detailsLoading.value = true;
    drawerOpen.value = true;
    try {
        const { data } = await axios.get<LogDetailsResponse>(`/api/admin/featherzerotrust/logs/${executionId}`);

        if (data.success && data.data) {
            executionLog.value = data.data.execution;
            scanLogs.value = data.data.scan_logs || [];
        } else {
            toast.error('Failed to load execution log details');
            drawerOpen.value = false;
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to fetch execution log details';
        toast.error(errorMessage);
        drawerOpen.value = false;
    } finally {
        detailsLoading.value = false;
    }
}

function changePage(page: number): void {
    pagination.value.page = page;
    void fetchLogs();
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

function getDuration(item: Record<string, unknown>): string {
    return (item.duration as string) || 'N/A';
}

function viewDetails(executionId: string): void {
    void fetchLogDetails(executionId);
}

function closeDrawer(): void {
    drawerOpen.value = false;
    executionLog.value = null;
    scanLogs.value = [];
}

onMounted(() => {
    void fetchLogs();
});
</script>

<template>
    <div class="space-y-6">
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="flex items-center gap-3">
                <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                <span class="text-muted-foreground">Loading execution logs...</span>
            </div>
        </div>

        <!-- Logs Table -->
        <div v-else>
            <TableComponent
                title="Execution Logs"
                description="Cron job execution history"
                :columns="tableColumns"
                :data="logs as unknown as Record<string, unknown>[]"
                :server-side-pagination="true"
                :total-records="pagination.total"
                :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                :current-page="pagination.page"
                :has-next="pagination.hasNext"
                :has-prev="pagination.hasPrev"
                :from="pagination.from"
                :to="pagination.to"
                @page-change="changePage"
            >
                <template #cell-execution_id="{ item }">
                    <span class="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {{ (item as unknown as CronLog).execution_id }}
                    </span>
                </template>

                <template #cell-started_at="{ item }">
                    <div class="text-sm">{{ formatDate((item as unknown as CronLog).started_at) }}</div>
                </template>

                <template #cell-completed_at="{ item }">
                    <div class="text-sm">{{ formatDate((item as unknown as CronLog).completed_at) }}</div>
                </template>

                <template #cell-status="{ item }">
                    <Badge
                        :variant="getStatusVariant((item as unknown as CronLog).status)"
                        class="flex items-center gap-1.5 w-fit"
                    >
                        <component :is="getStatusIcon((item as unknown as CronLog).status)" class="h-3 w-3" />
                        {{ (item as unknown as CronLog).status }}
                    </Badge>
                </template>

                <template #cell-stats="{ item }">
                    <div class="flex flex-col gap-1 text-sm">
                        <div class="flex items-center gap-2">
                            <Server class="h-3 w-3 text-muted-foreground" />
                            <span>{{ (item as unknown as CronLog).total_servers_scanned }} servers</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <AlertTriangle class="h-3 w-3 text-destructive" />
                            <span class="text-destructive"
                                >{{ (item as unknown as CronLog).total_detections }} detections</span
                            >
                        </div>
                        <div v-if="(item as unknown as CronLog).total_errors > 0" class="flex items-center gap-2">
                            <XCircle class="h-3 w-3 text-orange-500" />
                            <span class="text-orange-500">{{ (item as unknown as CronLog).total_errors }} errors</span>
                        </div>
                    </div>
                </template>

                <template #cell-duration="{ item }">
                    <div class="text-sm font-mono">
                        {{ formatDuration((item as unknown as CronLog).details?.duration_seconds) }}
                    </div>
                </template>

                <template #cell-actions="{ item }">
                    <Button
                        variant="outline"
                        size="sm"
                        class="hover:scale-110 hover:shadow-md transition-all duration-200"
                        title="View log details"
                        @click="viewDetails((item as unknown as CronLog).execution_id)"
                    >
                        <Eye class="h-4 w-4 mr-1" />
                        View Details
                    </Button>
                </template>
            </TableComponent>
        </div>
    </div>

    <!-- Log Details Drawer -->
    <Drawer :open="drawerOpen" @update:open="(val: boolean) => !val && closeDrawer()">
        <DrawerContent class="max-h-[90vh] overflow-hidden flex flex-col">
            <DrawerHeader class="border-b">
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-primary/10">
                        <FileText class="h-5 w-5 text-primary" />
                    </div>
                    <div class="flex-1">
                        <DrawerTitle>Execution Log Details</DrawerTitle>
                        <DrawerDescription v-if="executionLog">
                            Execution ID: {{ executionLog.execution_id }}
                        </DrawerDescription>
                    </div>
                </div>
            </DrawerHeader>

            <div class="flex-1 overflow-y-auto p-6 space-y-6">
                <!-- Loading State -->
                <div v-if="detailsLoading" class="flex items-center justify-center py-12">
                    <div class="flex items-center gap-3">
                        <div
                            class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"
                        ></div>
                        <span class="text-muted-foreground">Loading execution details...</span>
                    </div>
                </div>

                <!-- Execution Details -->
                <div v-else-if="executionLog" class="space-y-6">
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
                                Individual server scan results ({{ scanLogs.length }} server{{
                                    scanLogs.length !== 1 ? 's' : ''
                                }})
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TableComponent
                                title="Server Scans"
                                description="Individual server scan results"
                                :columns="scanLogsColumns"
                                :data="
                                    scanLogs.map((log) => ({
                                        ...log,
                                        duration: formatDuration(log.duration_seconds),
                                    })) as unknown as Record<string, unknown>[]
                                "
                                :server-side-pagination="false"
                            >
                                <template #cell-server_name="{ item }">
                                    <div>
                                        <div class="font-medium">
                                            {{ (item as unknown as ScanLog).server_name || 'Unknown' }}
                                        </div>
                                        <span class="text-xs font-mono text-muted-foreground">
                                            {{ (item as unknown as ScanLog).server_uuid }}
                                        </span>
                                    </div>
                                </template>

                                <template #cell-status="{ item }">
                                    <Badge
                                        :variant="getStatusVariant((item as unknown as ScanLog).status)"
                                        class="flex items-center gap-1.5 w-fit"
                                    >
                                        <component
                                            :is="getStatusIcon((item as unknown as ScanLog).status)"
                                            class="h-3 w-3"
                                        />
                                        {{ (item as unknown as ScanLog).status }}
                                    </Badge>
                                </template>

                                <template #cell-files_scanned="{ item }">
                                    <div class="text-sm font-mono">
                                        {{ ((item as unknown as ScanLog).files_scanned || 0).toLocaleString() }}
                                    </div>
                                </template>

                                <template #cell-detections_count="{ item }">
                                    <div
                                        class="text-sm font-semibold"
                                        :class="
                                            ((item as unknown as ScanLog).detections_count as number) > 0
                                                ? 'text-destructive'
                                                : ''
                                        "
                                    >
                                        {{ (item as unknown as ScanLog).detections_count }}
                                    </div>
                                </template>

                                <template #cell-duration="{ item }">
                                    <span class="text-sm font-mono">{{ getDuration(item) }}</span>
                                </template>
                            </TableComponent>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div class="border-t p-4 flex justify-end">
                <DrawerClose as-child>
                    <Button variant="outline" @click="closeDrawer">Close</Button>
                </DrawerClose>
            </div>
        </DrawerContent>
    </Drawer>
</template>
