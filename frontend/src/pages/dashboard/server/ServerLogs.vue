<!-- eslint-disable vue/no-v-html -->
<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <!-- Header Section -->
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold">{{ t('serverLogs.title') }}</h1>
                    <p class="text-muted-foreground">{{ t('serverLogs.description') }}</p>
                </div>
                <div class="flex gap-2">
                    <Button variant="outline" :disabled="loading" @click="refreshLogs">
                        <RefreshCw class="h-4 w-4 mr-2" />
                        {{ t('serverLogs.refresh') }}
                    </Button>
                    <Button variant="outline" :disabled="loading" @click="downloadLogs">
                        <Download class="h-4 w-4 mr-2" />
                        {{ t('serverLogs.download') }}
                    </Button>
                </div>
            </div>

            <!-- Navigation Tabs -->
            <div class="border-b">
                <nav class="flex space-x-8">
                    <router-link
                        :to="`/server/${route.params.uuidShort}/logs`"
                        class="border-b-2 border-transparent py-2 px-1 text-sm font-medium transition-colors hover:text-foreground"
                        :class="{
                            'border-primary text-foreground': $route.path === `/server/${route.params.uuidShort}/logs`,
                            'text-muted-foreground': $route.path !== `/server/${route.params.uuidShort}/logs`,
                        }"
                    >
                        {{ t('serverLogs.title') }}
                    </router-link>
                    <router-link
                        :to="`/server/${route.params.uuidShort}/logs/install`"
                        class="border-b-2 border-transparent py-2 px-1 text-sm font-medium transition-colors hover:text-foreground"
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

            <!-- Logs Display -->
            <Card>
                <CardHeader>
                    <CardTitle class="flex items-center gap-2">
                        <FileText class="h-5 w-5" />
                        {{ t('serverLogs.serverLogs') }}
                    </CardTitle>
                    <CardDescription> {{ t('serverLogs.lastUpdated') }}: {{ lastUpdated }} </CardDescription>
                </CardHeader>
                <CardContent>
                    <div v-if="loading" class="flex items-center justify-center py-8">
                        <div
                            class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
                        ></div>
                        <span class="ml-2">{{ t('serverLogs.loading') }}</span>
                    </div>

                    <div v-else-if="logs.length === 0" class="text-center py-8 text-muted-foreground">
                        {{ t('serverLogs.noLogs') }}
                    </div>

                    <div v-else class="space-y-2">
                        <div
                            v-for="(log, index) in logs"
                            :key="index"
                            class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-sm"
                        >
                            <div v-html="log"></div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { RefreshCw, Download, FileText } from 'lucide-vue-next';
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
    { text: 'Dashboard', href: '/dashboard' },
    { text: 'Servers', href: '/dashboard' },
    { text: server.value?.name || 'Server', href: `/server/${route.params.uuidShort}` },
    { text: 'Logs', isCurrent: true, href: `/server/${route.params.uuidShort}/logs` },
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
            toast.error(t('serverLogs.failedToFetchServer'));
            router.push('/dashboard');
        }
    } catch {
        toast.error(t('serverLogs.failedToFetchServer'));
        router.push('/dashboard');
    }
}

async function fetchLogs(): Promise<void> {
    try {
        loading.value = true;
        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}/logs`);

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
            toast.error(t('serverLogs.failedToFetchLogs'));
        }
    } catch (error) {
        console.error('Error fetching logs:', error);
        toast.error(t('serverLogs.failedToFetchLogs'));
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
    toast.success(t('serverLogs.logsRefreshed'));
}

function downloadLogs(): void {
    if (logs.value.length === 0) {
        toast.warning(t('serverLogs.noLogsToDownload'));
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
        a.download = `server-logs-${route.params.uuidShort}-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(t('serverLogs.logsDownloaded'));
    } catch (error) {
        console.error('Error downloading logs:', error);
        toast.error(t('serverLogs.failedToDownload'));
    }
}
</script>
