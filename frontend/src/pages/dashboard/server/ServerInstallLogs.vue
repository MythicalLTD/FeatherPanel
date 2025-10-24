<!-- eslint-disable vue/no-v-html -->
<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6 pb-8">
            <!-- Header Section -->
            <div class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
                            {{ t('serverInstallLogs.title') }}
                        </h1>
                        <p class="text-sm text-muted-foreground">{{ t('serverInstallLogs.description') }}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="loading"
                            class="flex items-center gap-2 min-w-[100px]"
                            @click="refreshLogs"
                        >
                            <RefreshCw :class="['h-3.5 w-3.5', loading && 'animate-spin']" />
                            <span class="text-xs sm:text-sm">{{ t('serverInstallLogs.refresh') }}</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="loading || logs.length === 0"
                            class="flex items-center gap-2 min-w-[100px]"
                            @click="downloadLogs"
                        >
                            <Download class="h-3.5 w-3.5" />
                            <span class="text-xs sm:text-sm">{{ t('serverInstallLogs.download') }}</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="loading || uploading || logs.length === 0"
                            class="flex items-center gap-2 min-w-[140px] sm:min-w-[160px]"
                            @click="uploadLogs"
                        >
                            <Upload :class="['h-3.5 w-3.5', uploading && 'animate-pulse']" />
                            <span class="text-xs sm:text-sm">{{
                                uploading ? t('serverInstallLogs.uploading') : t('serverInstallLogs.uploadToMcloGs')
                            }}</span>
                        </Button>
                    </div>
                </div>
            </div>

            <!-- Navigation Tabs -->
            <div class="border-b">
                <nav class="flex space-x-4 sm:space-x-8 overflow-x-auto">
                    <router-link
                        :to="`/server/${route.params.uuidShort}/logs`"
                        class="border-b-2 border-transparent py-2 px-1 text-xs sm:text-sm font-medium transition-colors hover:text-foreground whitespace-nowrap shrink-0"
                        :class="{
                            'border-primary text-foreground': $route.path === `/server/${route.params.uuidShort}/logs`,
                            'text-muted-foreground': $route.path !== `/server/${route.params.uuidShort}/logs`,
                        }"
                    >
                        {{ t('serverLogs.title') }}
                    </router-link>
                    <router-link
                        :to="`/server/${route.params.uuidShort}/logs/install`"
                        class="border-b-2 border-transparent py-2 px-1 text-xs sm:text-sm font-medium transition-colors hover:text-foreground whitespace-nowrap shrink-0"
                        :class="{
                            'border-primary text-foreground':
                                $route.path === `/server/${route.params.uuidShort}/logs/install`,
                            'text-muted-foreground': $route.path !== `/server/${route.params.uuidShort}/logs/install`,
                        }"
                    >
                        {{ t('serverInstallLogs.title') }}
                    </router-link>
                </nav>
            </div>

            <!-- Install Logs Display -->
            <Card class="border-2 hover:border-primary/50 transition-colors overflow-hidden">
                <CardHeader class="border-b">
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Download class="h-5 w-5 text-primary" />
                        </div>
                        <div class="flex-1">
                            <CardTitle class="text-lg">{{ t('serverInstallLogs.installLogs') }}</CardTitle>
                            <CardDescription class="text-sm">
                                {{ t('serverInstallLogs.lastUpdated') }}: {{ lastUpdated }}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent class="overflow-x-auto p-4">
                    <div v-if="loading" class="flex flex-col items-center justify-center py-16">
                        <div
                            class="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"
                        ></div>
                        <span class="mt-4 text-muted-foreground">{{ t('common.loading') }}</span>
                    </div>

                    <div v-else-if="logs.length === 0" class="flex flex-col items-center justify-center py-16">
                        <div class="p-4 rounded-full bg-muted/50 mb-4">
                            <Download class="h-12 w-12 text-muted-foreground" />
                        </div>
                        <p class="text-base font-medium text-muted-foreground">{{ t('serverInstallLogs.noLogs') }}</p>
                    </div>

                    <div v-else class="space-y-2 min-w-0">
                        <div
                            v-for="(log, index) in logs"
                            :key="index"
                            class="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-xs sm:text-sm min-w-0"
                        >
                            <div
                                class="break-all whitespace-pre-wrap overflow-x-auto max-w-full min-w-0"
                                v-html="log"
                            ></div>
                        </div>
                    </div>
                </CardContent>
            </Card>
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

import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { RefreshCw, Download, Upload } from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import type { Server } from '@/types/server';
import Convert from 'ansi-to-html';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const toast = useToast();

const server = ref<Server | null>(null);
const loading = ref(false);
const uploading = ref(false);
const logs = ref<string[]>([]);
const lastUpdated = ref<string>('');

// ANSI to HTML converter
const ansiConverter = new Convert({
    fg: '#d1d5db', // Default text color (gray-300)
    bg: '#000000', // Default background color (black)
    newline: false,
    escapeXML: true,
    stream: true,
});

const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('common.logs'), isCurrent: true, href: `/server/${route.params.uuidShort}/logs/install` },
]);

onMounted(async () => {
    await sessionStore.checkSessionOrRedirect(router);
    await settingsStore.fetchSettings();
    await fetchServer();
    await fetchLogs();
});

async function fetchServer(): Promise<void> {
    try {
        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}`);
        if (response.data.success) {
            server.value = response.data.data;
        } else {
            toast.error(t('serverInstallLogs.failedToFetchServer'));
            router.push('/dashboard');
        }
    } catch {
        toast.error(t('serverInstallLogs.failedToFetchServer'));
        router.push('/dashboard');
    }
}

async function fetchLogs(): Promise<void> {
    try {
        loading.value = true;
        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}/install-logs`);

        if (response.data.success) {
            const logData = response.data.data?.response?.data;
            if (Array.isArray(logData)) {
                logs.value = logData.map((line: string) => processAnsiContent(line));
            } else if (typeof logData === 'string') {
                // Split by newlines if it's a single string
                logs.value = logData.split('\n').map((line: string) => processAnsiContent(line));
            } else {
                logs.value = [];
            }
            lastUpdated.value = new Date().toLocaleString();
        } else {
            toast.error(t('serverInstallLogs.failedToFetchLogs'));
        }
    } catch (error) {
        console.error('Error fetching install logs:', error);
        toast.error(t('serverInstallLogs.failedToFetchLogs'));
    } finally {
        loading.value = false;
    }
}

function processAnsiContent(content: string): string {
    try {
        // Replace brand names with custom app name
        const brandReplacedContent = replaceBrandNames(content);
        // Convert ANSI escape codes to HTML
        return ansiConverter.toHtml(brandReplacedContent);
    } catch (error) {
        console.warn('Failed to parse ANSI content:', error);
        return replaceBrandNames(content);
    }
}

/**
 * Replace Pterodactyl/Pelican references with custom app name from settings
 */
function replaceBrandNames(content: string): string {
    if (!content || !settingsStore.appName) return content;

    const customAppName = String(settingsStore.appName);

    // Create replacement patterns with proper case handling
    const replacements = [
        // Exact case matches
        { pattern: /\bPterodactyl\b/g, replacement: customAppName },
        { pattern: /\bpterodactyl\b/g, replacement: customAppName.toLowerCase() },
        { pattern: /\bPTERODACTYL\b/g, replacement: customAppName.toUpperCase() },
        { pattern: /\bPelican\b/g, replacement: customAppName },
        { pattern: /\bpelican\b/g, replacement: customAppName.toLowerCase() },
        { pattern: /\bPELICAN\b/g, replacement: customAppName.toUpperCase() },
    ];

    let result = content;
    for (const { pattern, replacement } of replacements) {
        result = result.replace(pattern, replacement);
    }

    return result;
}

async function refreshLogs(): Promise<void> {
    await fetchLogs();
    toast.success(t('serverInstallLogs.logsRefreshed'));
}

async function uploadLogs(): Promise<void> {
    if (logs.value.length === 0) {
        toast.warning(t('serverInstallLogs.noLogsToUpload'));
        return;
    }

    try {
        uploading.value = true;
        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/install-logs/upload`);

        if (response.data && response.data.success) {
            const mclogsUrl = response.data.data.url;

            // Copy URL to clipboard
            try {
                await navigator.clipboard.writeText(mclogsUrl);
                toast.success(t('serverInstallLogs.logsUploaded'));
            } catch {
                toast.success(`Install logs uploaded: ${mclogsUrl}`);
            }
        } else {
            toast.error(t('serverInstallLogs.failedToUpload'));
        }
    } catch (error) {
        console.error('Error uploading install logs:', error);
        toast.error(t('serverInstallLogs.failedToUpload'));
    } finally {
        uploading.value = false;
    }
}

function downloadLogs(): void {
    if (logs.value.length === 0) {
        toast.warning(t('serverInstallLogs.noLogsToDownload'));
        return;
    }

    try {
        // Convert HTML back to plain text for download
        const plainTextLogs = logs.value
            .map((log) => {
                // Remove HTML tags
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = log;
                return tempDiv.textContent || tempDiv.innerText || '';
            })
            .join('\n');

        const blob = new Blob([plainTextLogs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `install-logs-${route.params.uuidShort}-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(t('serverInstallLogs.logsDownloaded'));
    } catch (error) {
        console.error('Error downloading install logs:', error);
        toast.error(t('serverInstallLogs.failedToDownload'));
    }
}
</script>
