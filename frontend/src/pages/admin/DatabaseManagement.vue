<script setup lang="ts">
import { ref } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database as DatabaseIcon, Activity, Wrench, AlertTriangle } from 'lucide-vue-next';

interface StatusResp {
    success: boolean;
    data: {
        engine: string;
        version: string;
        uptime_seconds: number;
        threads_connected: number;
        threads_running: number;
        connections_total: number;
        aborted_connects: number;
        queries_total: number;
        questions_total: number;
        qps: number;
        bytes_received: number;
        bytes_sent: number;
    };
}

const loading = ref(false);
const status = ref<StatusResp['data'] | null>(null);
const migRunning = ref(false);
const migOutput = ref('');

async function fetchStatus() {
    loading.value = true;
    try {
        const resp = await fetch('/api/admin/databases/management/status');
        const json: StatusResp = await resp.json();
        if (json.success) status.value = json.data;
    } finally {
        loading.value = false;
    }
}

async function runMigrations() {
    migRunning.value = true;
    migOutput.value = '';
    try {
        const resp = await fetch('/api/admin/databases/management/migrate', { method: 'POST' });
        const json = await resp.json();
        if (json.success) {
            migOutput.value = json.data.output ?? '';
        } else {
            migOutput.value = json.message ?? 'Failed to run migrations';
        }
    } catch (e: unknown) {
        migOutput.value = String(e);
    } finally {
        migRunning.value = false;
    }
}

fetchStatus();
</script>

<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Database', isCurrent: true, href: '/admin/databases/management' }]">
        <div class="min-h-screen bg-background">
            <div class="p-4 sm:p-6 space-y-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-bold text-foreground mb-1">Database Management</h1>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            Inspect database health and run migrations
                        </p>
                    </div>
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Button variant="outline" :disabled="loading" class="w-full sm:w-auto" @click="fetchStatus"
                            >Refresh</Button
                        >
                        <Button :disabled="migRunning" class="w-full sm:w-auto" @click="runMigrations">
                            <span
                                v-if="migRunning"
                                class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                            ></span>
                            Run Migrations
                        </Button>
                    </div>
                </div>

                <!-- Loading -->
                <div v-if="loading" class="flex items-center justify-center py-12">
                    <div class="flex items-center gap-3">
                        <div
                            class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"
                        ></div>
                        <span class="text-muted-foreground">Loading database status...</span>
                    </div>
                </div>

                <!-- Status Cards -->
                <div v-else-if="status" class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <Card class="p-4">
                        <div class="font-semibold mb-3">Overview</div>
                        <div class="text-sm text-muted-foreground space-y-1">
                            <div><span class="font-medium text-foreground">Engine:</span> {{ status.engine }}</div>
                            <div><span class="font-medium text-foreground">Version:</span> {{ status.version }}</div>
                            <div>
                                <span class="font-medium text-foreground">Uptime (s):</span> {{ status.uptime_seconds }}
                            </div>
                            <div><span class="font-medium text-foreground">QPS:</span> {{ status.qps.toFixed(2) }}</div>
                        </div>
                    </Card>
                    <Card class="p-4">
                        <div class="font-semibold mb-3">Connections</div>
                        <div class="text-sm text-muted-foreground space-y-1">
                            <div>
                                <span class="font-medium text-foreground">Threads connected:</span>
                                {{ status.threads_connected }}
                            </div>
                            <div>
                                <span class="font-medium text-foreground">Threads running:</span>
                                {{ status.threads_running }}
                            </div>
                            <div>
                                <span class="font-medium text-foreground">Total connections:</span>
                                {{ status.connections_total }}
                            </div>
                            <div>
                                <span class="font-medium text-foreground">Aborted connects:</span>
                                {{ status.aborted_connects }}
                            </div>
                        </div>
                    </Card>
                    <Card class="p-4">
                        <div class="font-semibold mb-3">Queries</div>
                        <div class="text-sm text-muted-foreground space-y-1">
                            <div>
                                <span class="font-medium text-foreground">Queries total:</span>
                                {{ status.queries_total }}
                            </div>
                            <div>
                                <span class="font-medium text-foreground">Questions total:</span>
                                {{ status.questions_total }}
                            </div>
                        </div>
                    </Card>
                    <Card class="p-4">
                        <div class="font-semibold mb-3">Network</div>
                        <div class="text-sm text-muted-foreground space-y-1">
                            <div>
                                <span class="font-medium text-foreground">Bytes received:</span>
                                {{ status.bytes_received }}
                            </div>
                            <div>
                                <span class="font-medium text-foreground">Bytes sent:</span> {{ status.bytes_sent }}
                            </div>
                        </div>
                    </Card>
                </div>

                <!-- Migration Output -->
                <Card class="p-0 overflow-hidden">
                    <div class="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div class="font-semibold">Migrations Output</div>
                        <Button variant="outline" size="sm" class="w-full sm:w-auto" @click="migOutput = ''"
                            >Clear</Button
                        >
                    </div>
                    <pre
                        class="text-xs whitespace-pre-wrap bg-black text-green-300 p-4 min-h-[150px] overflow-x-auto"
                        >{{ migOutput }}</pre
                    >
                </Card>

                <!-- Database Management help cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <DatabaseIcon class="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">What is this page?</div>
                                <p>
                                    View your database engine status and basic metrics. Useful for quick health checks
                                    and verifying connectivity.
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <Activity class="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Status & Metrics</div>
                                <p>
                                    Inspect engine/version, uptime, connections, QPS, and network I/O. Re‑check using
                                    the Refresh button when diagnosing issues.
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <Wrench class="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Migrations</div>
                                <p>
                                    Run database migrations when upgrading or installing plugins. Review output below
                                    and back up before major changes.
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card class="md:col-span-2 lg:col-span-3">
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <AlertTriangle class="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Safety & Backups</div>
                                <p>
                                    Always maintain recent backups before applying migrations or installing plugins that
                                    alter schemas. FeatherPanel and its developers are not liable for changes you make.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    </DashboardLayout>
</template>

<style scoped>
.min-h\[150px\] {
    min-height: 150px;
}
</style>
