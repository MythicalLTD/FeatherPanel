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

import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LogFile {
    name: string;
    size: number;
    modified: number;
    type: string;
}

interface LogResponse {
    success: boolean;
    data: {
        logs: string;
        file: string;
        type: string;
        lines_count: number;
    };
}

interface LogFilesResponse {
    success: boolean;
    data: {
        files: LogFile[];
    };
}

const loading = ref(true);
const logs = ref('');
const currentLogType = ref('app');
const lines = ref(100);
const logFiles = ref<LogFile[]>([]);
const autoRefresh = ref(false);
const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null);
const logsContainer = ref<HTMLElement | null>(null);

async function fetchLogFiles() {
    try {
        const resp = await fetch('/api/admin/log-viewer/files');
        const json: LogFilesResponse = await resp.json();
        if (json.success) {
            logFiles.value = json.data.files;
        }
    } catch (e) {
        console.error('Failed to fetch log files:', e);
    }
}

async function fetchLogs() {
    loading.value = true;
    try {
        const params = new URLSearchParams({
            type: currentLogType.value,
            lines: lines.value.toString(),
        });
        const resp = await fetch(`/api/admin/log-viewer/get?${params}`);
        const json: LogResponse = await resp.json();
        if (json.success) {
            logs.value = json.data.logs;
            // Scroll to bottom after logs are updated
            nextTick(() => {
                scrollToBottom();
            });
        }
    } catch (e) {
        console.error('Failed to fetch logs:', e);
    } finally {
        loading.value = false;
    }
}

async function clearLogs() {
    try {
        const resp = await fetch('/api/admin/log-viewer/clear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: currentLogType.value,
            }),
        });
        const json = await resp.json();
        if (json.success) {
            logs.value = '';
        }
    } catch (e) {
        console.error('Failed to clear logs:', e);
    }
}

function toggleAutoRefresh() {
    autoRefresh.value = !autoRefresh.value;

    if (autoRefresh.value) {
        refreshInterval.value = setInterval(() => {
            fetchLogs();
        }, 10000); // 10 seconds
    } else {
        if (refreshInterval.value) {
            clearInterval(refreshInterval.value);
            refreshInterval.value = null;
        }
    }
}

function formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
}

function scrollToBottom() {
    if (logsContainer.value) {
        logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
    }
}

onMounted(() => {
    fetchLogFiles();
    fetchLogs();
});

onUnmounted(() => {
    if (refreshInterval.value) {
        clearInterval(refreshInterval.value);
    }
});
</script>

<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Dev', href: '/admin/dev' },
            { text: 'Log Viewer', isCurrent: true, href: '/admin/dev/logs' },
        ]"
    >
        <div class="min-h-screen bg-background">
            <div class="p-6 space-y-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-bold text-foreground mb-1">Log Viewer</h1>
                        <p class="text-muted-foreground">View and manage application logs</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Button variant="outline" :disabled="loading" data-umami-event="Refresh logs" @click="fetchLogs"
                            >Refresh</Button
                        >
                        <Button
                            :variant="autoRefresh ? 'default' : 'outline'"
                            :disabled="loading"
                            data-umami-event="Toggle auto refresh"
                            @click="toggleAutoRefresh"
                        >
                            <span
                                v-if="autoRefresh"
                                class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                            ></span>
                            {{ autoRefresh ? 'Stop Auto' : 'Auto Refresh' }}
                        </Button>
                        <Button
                            variant="destructive"
                            :disabled="loading"
                            data-umami-event="Clear logs"
                            @click="clearLogs"
                            >Clear Logs</Button
                        >
                    </div>
                </div>

                <!-- Controls -->
                <Card class="p-4">
                    <div class="flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <div class="flex items-center gap-2">
                            <label class="text-sm font-medium">Log Type:</label>
                            <select v-model="currentLogType" class="px-3 py-1 border rounded" @change="fetchLogs">
                                <option value="app">App Logs</option>
                                <option value="web">Web Logs</option>
                            </select>
                        </div>
                        <div class="flex items-center gap-2">
                            <label class="text-sm font-medium">Lines:</label>
                            <select v-model="lines" class="px-3 py-1 border rounded" @change="fetchLogs">
                                <option value="50">50</option>
                                <option value="100">100</option>
                                <option value="200">200</option>
                                <option value="500">500</option>
                            </select>
                        </div>
                    </div>
                </Card>

                <!-- Loading -->
                <div v-if="loading" class="flex items-center justify-center py-12">
                    <div class="flex items-center gap-3">
                        <div
                            class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"
                        ></div>
                        <span class="text-muted-foreground">Loading logs...</span>
                    </div>
                </div>

                <!-- Log Files Info -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card v-for="file in logFiles" :key="file.name" class="p-4">
                        <div class="flex items-center justify-between mb-2">
                            <div class="font-semibold text-sm">{{ file.type.toUpperCase() }}</div>
                            <div class="text-xs text-muted-foreground">{{ formatFileSize(file.size) }}</div>
                        </div>
                        <div class="text-xs text-muted-foreground">
                            <div>{{ file.name }}</div>
                            <div>Modified: {{ formatDate(file.modified) }}</div>
                        </div>
                    </Card>
                </div>

                <!-- Logs Output -->
                <Card class="p-0 overflow-hidden">
                    <div class="p-4 flex items-center justify-between">
                        <div class="font-semibold">Logs Output</div>
                        <div class="flex items-center gap-2">
                            <span class="text-sm text-muted-foreground">{{ logs.split('\n').length }} lines</span>
                            <Button variant="outline" size="sm" @click="logs = ''">Clear</Button>
                        </div>
                    </div>
                    <pre
                        ref="logsContainer"
                        class="text-xs whitespace-pre-wrap bg-black text-green-300 p-4 min-h-[400px] max-h-[600px] overflow-auto"
                        >{{ logs || 'No logs available' }}</pre
                    >
                </Card>
            </div>
        </div>
    </DashboardLayout>
</template>

<style scoped>
.min-h-\[400px\] {
    min-height: 400px;
}
.max-h-\[600px\] {
    max-height: 600px;
}
</style>
