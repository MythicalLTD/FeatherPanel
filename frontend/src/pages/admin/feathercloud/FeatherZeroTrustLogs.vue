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
import TableComponent from '@/kit/TableComponent.vue';
import type { TableColumn } from '@/kit/types';
import { Clock, Server, AlertTriangle, CheckCircle, XCircle, FileText, Eye } from 'lucide-vue-next';
import axios from 'axios';
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useRouter } from 'vue-router';

const toast = useToast();
const router = useRouter();

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
        }>;
    } | null;
    error_message: string | null;
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
const statusFilter = ref<string | null>(null);

const breadcrumbs = computed(() => [
    { text: 'FeatherZeroTrust', href: '/admin/feathercloud/featherzerotrust' },
    { text: 'Execution Logs', isCurrent: true, href: '/admin/feathercloud/featherzerotrust/logs' },
]);

const tableColumns: TableColumn[] = [
    { key: 'execution_id', label: 'Execution ID', searchable: true },
    { key: 'started_at', label: 'Started At' },
    { key: 'completed_at', label: 'Completed At' },
    { key: 'status', label: 'Status' },
    { key: 'stats', label: 'Statistics' },
    { key: 'duration', label: 'Duration' },
    { key: 'actions', label: 'Actions' },
];

async function fetchLogs(): Promise<void> {
    loading.value = true;
    try {
        const params: Record<string, string | number> = {
            page: pagination.value.page,
            limit: pagination.value.pageSize,
        };
        if (statusFilter.value) {
            params.status = statusFilter.value;
        }

        const { data } = await axios.get<{
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
        }>('/api/admin/featherzerotrust/logs', { params });

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

function formatDuration(seconds: number | null | undefined): string {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs.toFixed(0)}s`;
}

function formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
}

function viewDetails(executionId: string): void {
    router.push(`/admin/feathercloud/featherzerotrust/logs/${executionId}`);
}

onMounted(() => {
    void fetchLogs();
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
                            <div class="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                                <FileText class="h-10 w-10 text-primary" />
                            </div>
                            <div class="flex-1">
                                <Badge variant="secondary" class="mb-2 border-primary/30 bg-primary/10 text-primary">
                                    Execution History
                                </Badge>
                                <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">FeatherZeroTrust Logs</h1>
                                <p class="text-muted-foreground mt-2">
                                    View detailed execution logs and scan history from automated cron jobs
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Filters -->
                <Card class="border border-border/70 shadow-lg">
                    <CardContent class="pt-6">
                        <div class="flex flex-wrap items-center gap-4">
                            <div class="flex items-center gap-2">
                                <label class="text-sm font-medium">Status:</label>
                                <select
                                    v-model="statusFilter"
                                    class="px-3 py-1.5 rounded-md border border-border bg-background text-sm"
                                    @change="pagination.page = 1; fetchLogs()"
                                >
                                    <option :value="null">All</option>
                                    <option value="completed">Completed</option>
                                    <option value="running">Running</option>
                                    <option value="failed">Failed</option>
                                </select>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Refresh logs"
                                @click="fetchLogs"
                            >
                                Refresh
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <!-- Loading State -->
                <div v-if="loading" class="flex items-center justify-center py-12">
                    <div class="flex items-center gap-3">
                        <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                        <span class="text-muted-foreground">Loading execution logs...</span>
                    </div>
                </div>

                <!-- Logs Table -->
                <Card v-else class="border border-border/70 shadow-lg">
                    <CardHeader>
                        <CardTitle>Execution Logs</CardTitle>
                        <CardDescription>
                            {{ pagination.total }} total execution{{ pagination.total !== 1 ? 's' : '' }} recorded
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TableComponent
                            title="Execution Logs"
                            description="Cron job execution history"
                            :columns="tableColumns"
                            :data="logs as Record<string, unknown>[]"
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
                                <code class="text-xs font-mono bg-muted px-2 py-1 rounded">
                                    {{ (item as Record<string, unknown>).execution_id }}
                                </code>
                            </template>

                            <template #cell-started_at="{ item }">
                                <div class="text-sm">{{ formatDate((item as Record<string, unknown>).started_at as string) }}</div>
                            </template>

                            <template #cell-completed_at="{ item }">
                                <div class="text-sm">{{ formatDate((item as Record<string, unknown>).completed_at as string) }}</div>
                            </template>

                            <template #cell-status="{ item }">
                                <Badge
                                    :variant="getStatusVariant((item as Record<string, unknown>).status as string)"
                                    class="flex items-center gap-1.5 w-fit"
                                >
                                    <component
                                        :is="getStatusIcon((item as Record<string, unknown>).status as string)"
                                        class="h-3 w-3"
                                    />
                                    {{ (item as Record<string, unknown>).status }}
                                </Badge>
                            </template>

                            <template #cell-stats="{ item }">
                                <div class="flex flex-col gap-1 text-sm">
                                    <div class="flex items-center gap-2">
                                        <Server class="h-3 w-3 text-muted-foreground" />
                                        <span>{{ (item as Record<string, unknown>).total_servers_scanned }} servers</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <AlertTriangle class="h-3 w-3 text-destructive" />
                                        <span class="text-destructive">{{ (item as Record<string, unknown>).total_detections }} detections</span>
                                    </div>
                                    <div v-if="((item as Record<string, unknown>).total_errors as number) > 0" class="flex items-center gap-2">
                                        <XCircle class="h-3 w-3 text-orange-500" />
                                        <span class="text-orange-500">{{ (item as Record<string, unknown>).total_errors }} errors</span>
                                    </div>
                                </div>
                            </template>

                            <template #cell-duration="{ item }">
                                <div class="text-sm font-mono">
                                    {{ formatDuration(((item as Record<string, unknown>).details as Record<string, unknown>)?.duration_seconds as number) }}
                                </div>
                            </template>

                            <template #cell-actions="{ item }">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    title="View log details"
                                    @click="viewDetails((item as Record<string, unknown>).execution_id as string)"
                                >
                                    <Eye class="h-4 w-4 mr-1" />
                                    View Details
                                </Button>
                            </template>
                        </TableComponent>
                    </CardContent>
                </Card>
            </div>
        </div>
    </DashboardLayout>
</template>

