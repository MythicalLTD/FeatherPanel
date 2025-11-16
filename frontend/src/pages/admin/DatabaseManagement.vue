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

import { computed, onMounted, ref } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { Card, CardContent } from '@/components/ui/card';
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

const loading = ref(true);
const status = ref<StatusResp['data'] | null>(null);
const migRunning = ref(false);
const migOutput = ref('');

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-database-management');
const widgetsTopOfPage = computed(() => getWidgets('admin-database-management', 'top-of-page'));
const widgetsAfterHeader = computed(() => getWidgets('admin-database-management', 'after-header'));
const widgetsBeforeStatusCards = computed(() => getWidgets('admin-database-management', 'before-status-cards'));
const widgetsAfterStatusCards = computed(() => getWidgets('admin-database-management', 'after-status-cards'));
const widgetsAfterMigrationOutput = computed(() => getWidgets('admin-database-management', 'after-migration-output'));
const widgetsAfterHelpCards = computed(() => getWidgets('admin-database-management', 'after-help-cards'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-database-management', 'bottom-of-page'));

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

onMounted(async () => {
    // Fetch plugin widgets
    await fetchPluginWidgets();

    await fetchStatus();
});
</script>

<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Database', isCurrent: true, href: '/admin/databases/management' }]">
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

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
                        <Button
                            variant="outline"
                            :disabled="loading"
                            class="w-full sm:w-auto"
                            data-umami-event="Refresh database status"
                            @click="fetchStatus"
                            >Refresh</Button
                        >
                        <Button
                            :disabled="migRunning"
                            class="w-full sm:w-auto"
                            data-umami-event="Run database migrations"
                            @click="runMigrations"
                        >
                            <span
                                v-if="migRunning"
                                class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                            ></span>
                            Run Migrations
                        </Button>
                    </div>
                </div>

                <!-- Plugin Widgets: After Header -->
                <WidgetRenderer v-if="widgetsAfterHeader.length > 0" :widgets="widgetsAfterHeader" />

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
                <template v-if="!loading && status">
                    <!-- Plugin Widgets: Before Status Cards -->
                    <WidgetRenderer v-if="widgetsBeforeStatusCards.length > 0" :widgets="widgetsBeforeStatusCards" />

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <Card class="p-4">
                            <div class="font-semibold mb-3">Overview</div>
                            <div class="text-sm text-muted-foreground space-y-1">
                                <div><span class="font-medium text-foreground">Engine:</span> {{ status.engine }}</div>
                                <div>
                                    <span class="font-medium text-foreground">Version:</span> {{ status.version }}
                                </div>
                                <div>
                                    <span class="font-medium text-foreground">Uptime (s):</span>
                                    {{ status.uptime_seconds }}
                                </div>
                                <div>
                                    <span class="font-medium text-foreground">QPS:</span> {{ status.qps.toFixed(2) }}
                                </div>
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

                    <!-- Plugin Widgets: After Status Cards -->
                    <WidgetRenderer v-if="widgetsAfterStatusCards.length > 0" :widgets="widgetsAfterStatusCards" />
                </template>

                <!-- Migration Output -->
                <Card class="p-0 overflow-hidden">
                    <div class="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div class="font-semibold">Migrations Output</div>
                        <Button
                            variant="outline"
                            size="sm"
                            class="w-full sm:w-auto"
                            data-umami-event="Clear migration output"
                            @click="migOutput = ''"
                            >Clear</Button
                        >
                    </div>
                    <pre
                        class="text-xs whitespace-pre-wrap bg-black text-green-300 p-4 min-h-[150px] overflow-x-auto"
                        >{{ migOutput }}</pre
                    >
                </Card>

                <!-- Plugin Widgets: After Migration Output -->
                <WidgetRenderer v-if="widgetsAfterMigrationOutput.length > 0" :widgets="widgetsAfterMigrationOutput" />

                <!-- Database Management help cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <DatabaseIcon class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">What is this page?</div>
                                    <p>
                                        View your database engine status and basic metrics. Useful for quick health
                                        checks and verifying connectivity.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Activity class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Status & Metrics</div>
                                    <p>
                                        Inspect engine/version, uptime, connections, QPS, and network I/O. Re‑check
                                        using the Refresh button when diagnosing issues.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Wrench class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Migrations</div>
                                    <p>
                                        Run database migrations when upgrading or installing plugins. Review output
                                        below and back up before major changes.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card class="md:col-span-2 lg:col-span-3">
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <AlertTriangle class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Safety & Backups</div>
                                    <p>
                                        Always maintain recent backups before applying migrations or installing plugins
                                        that alter schemas. FeatherPanel and its developers are not liable for changes
                                        you make.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Plugin Widgets: After Help Cards -->
                <WidgetRenderer v-if="widgetsAfterHelpCards.length > 0" :widgets="widgetsAfterHelpCards" />
            </div>

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>
    </DashboardLayout>
</template>

<style scoped>
.min-h\[150px\] {
    min-height: 150px;
}
</style>
