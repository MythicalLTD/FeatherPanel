<!--
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
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
-->

<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading node...</span>
                </div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="p-6">
                <Card>
                    <CardHeader>
                        <CardTitle class="text-lg flex items-center gap-2">
                            <div class="h-3 w-3 bg-red-500 rounded-full"></div>
                            Failed to Load Node
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <div class="space-y-3">
                                <div class="font-medium">{{ error }}</div>
                                <Button size="sm" variant="outline" @click="fetchNode">Retry</Button>
                            </div>
                        </Alert>
                    </CardContent>
                </Card>
            </div>

            <!-- Node View Content -->
            <div v-else-if="node" class="flex flex-col lg:flex-row gap-6 p-6">
                <!-- Main Content Area -->
                <div class="flex-1 min-w-0">
                    <!-- Header -->
                    <NodeHeader
                        :node="node"
                        :location-name="getLocationName(node.location_id)"
                        :system-info-data="systemInfoData"
                        :system-info-error="systemInfoError"
                        @databases="router.push(`/admin/nodes/${node.id}/databases`)"
                        @allocations="router.push(`/admin/nodes/${node.id}/allocations`)"
                        @back="router.push(`/admin/nodes?location_id=${node.location_id}`)"
                    />

                    <!-- Quick Stats Cards -->
                    <QuickStatsCards
                        :node="node"
                        :system-info-data="systemInfoData"
                        :system-info-error="systemInfoError"
                    />

                    <!-- Plugin Widgets: Before Tabs -->
                    <WidgetRenderer v-if="widgetsBeforeTabs.length > 0" :widgets="widgetsBeforeTabs" />

                    <!-- Tabs -->
                    <Tabs v-model="activeTab" class="w-full">
                        <TabsList class="w-full flex flex-wrap gap-1 mb-4">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="system">System</TabsTrigger>
                            <TabsTrigger value="utilization">Utilization</TabsTrigger>
                            <TabsTrigger value="docker">Docker</TabsTrigger>
                            <TabsTrigger value="network">Network</TabsTrigger>
                            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
                            <TabsTrigger value="self-update">Self-Update</TabsTrigger>
                            <TabsTrigger value="terminal">Terminal</TabsTrigger>
                            <TabsTrigger value="wings-config">Config</TabsTrigger>
                            <TabsTrigger value="modules">Modules</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" class="space-y-4 mt-4">
                            <OverviewTab :node="node" :location-name="getLocationName(node.location_id)" />
                        </TabsContent>

                        <TabsContent value="system" class="space-y-4 mt-4">
                            <SystemInfoTab
                                :loading="systemInfoLoading"
                                :data="systemInfoData"
                                :error="systemInfoError"
                                :node-id="nodeId"
                                @retry="fetchSystemInfo"
                            />
                        </TabsContent>

                        <TabsContent value="utilization" class="space-y-4 mt-4">
                            <UtilizationTab
                                :loading="utilizationLoading"
                                :data="utilizationData"
                                :error="utilizationError"
                            />
                        </TabsContent>

                        <TabsContent value="docker" class="space-y-4 mt-4">
                            <DockerTab
                                :loading="dockerLoading"
                                :data="dockerData"
                                :error="dockerError"
                                :pruning="dockerPruning"
                                @prune="pruneDockerImages"
                            />
                        </TabsContent>

                        <TabsContent value="network" class="space-y-4 mt-4">
                            <NetworkTab
                                :node="node"
                                :loading="networkLoading"
                                :data="networkData"
                                :error="networkError"
                                @copy="copyToClipboard"
                            />
                        </TabsContent>

                        <TabsContent value="diagnostics" class="space-y-4 mt-4">
                            <DiagnosticsTab
                                ref="diagnosticsTabRef"
                                :loading="diagnosticsLoading"
                                :result="diagnosticsResult"
                                :error="diagnosticsError"
                                @generate="fetchDiagnostics"
                                @copy="copyDiagnostics"
                            />
                        </TabsContent>

                        <TabsContent value="self-update" class="space-y-4 mt-4">
                            <SelfUpdateTab
                                ref="selfUpdateTabRef"
                                :loading="selfUpdateLoading"
                                :result="selfUpdateResult"
                                :message="selfUpdateMessage"
                                :error="selfUpdateError"
                                @submit="submitSelfUpdate"
                            />
                        </TabsContent>

                        <TabsContent value="terminal" class="space-y-4 mt-4">
                            <TerminalTab
                                ref="terminalTabRef"
                                :is-executing="systemTerminalComposable.isExecuting.value"
                                @execute="executeTerminalCommand"
                                @clear="clearTerminal"
                            />
                        </TabsContent>

                        <TabsContent value="wings-config" class="space-y-4 mt-4">
                            <WingsConfigTab
                                :loading="wingsConfigLoading"
                                :error="wingsConfigError"
                                :content="wingsConfigContent"
                                :dirty="wingsConfigDirty"
                                :saving="wingsConfigSaving"
                                :restart="wingsConfigRestart"
                                @update:content="handleWingsConfigContentUpdate"
                                @update:restart="wingsConfigRestart = $event"
                                @reload="fetchWingsConfig"
                                @reset="resetWingsConfig"
                                @save="saveWingsConfig"
                            />
                        </TabsContent>

                        <TabsContent value="modules" class="space-y-4 mt-4">
                            <ModulesTab
                                ref="modulesTabRef"
                                :loading="modulesLoading"
                                :error="modulesError"
                                :modules="modules"
                                @retry="fetchModules"
                                @enable="enableModule"
                                @disable="disableModule"
                                @configure="configureModule"
                                @update-config="updateModuleConfig"
                            />
                        </TabsContent>
                    </Tabs>

                    <!-- Plugin Widgets: After Tabs -->
                    <WidgetRenderer v-if="widgetsAfterTabs.length > 0" :widgets="widgetsAfterTabs" />
                </div>
            </div>

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from 'vue-toastification';
import { formatBytes } from '@/lib/format';
import { useSystemTerminal } from '@/composables/useSystemTerminal';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import axios from 'axios';

// Import tab components
import OverviewTab from './components/OverviewTab.vue';
import SystemInfoTab from './components/SystemInfoTab.vue';
import UtilizationTab from './components/UtilizationTab.vue';
import DockerTab from './components/DockerTab.vue';
import NetworkTab from './components/NetworkTab.vue';
import DiagnosticsTab from './components/DiagnosticsTab.vue';
import SelfUpdateTab from './components/SelfUpdateTab.vue';
import TerminalTab from './components/TerminalTab.vue';
import WingsConfigTab from './components/WingsConfigTab.vue';
import ModulesTab from './components/ModulesTab.vue';
import QuickStatsCards from './components/QuickStatsCards.vue';
import NodeHeader from './components/NodeHeader.vue';

// Import types
import type {
    UtilizationResponse,
    DockerResponse,
    NetworkResponse,
    DiagnosticsResult,
    SystemInfoResponse,
    Node,
    Module,
    ModuleConfig,
} from './types';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const nodeId = computed(() => Number(route.params.nodeId));

// Loading and error states
const loading = ref(true);
const error = ref<string | null>(null);
const node = ref<Node | null>(null);

// Locations
const locations = ref<{ id: number; name: string }[]>([]);

// Active tab
const activeTab = ref('overview');

// System info state
const systemInfoLoading = ref(false);
const systemInfoData = ref<SystemInfoResponse | null>(null);
const systemInfoError = ref<string | null>(null);

// Utilization state
const utilizationLoading = ref(false);
const utilizationData = ref<UtilizationResponse | null>(null);
const utilizationError = ref<string | null>(null);

// Docker state
const dockerLoading = ref(false);
const dockerData = ref<DockerResponse | null>(null);
const dockerError = ref<string | null>(null);
const dockerPruning = ref(false);

// Network state
const networkLoading = ref(false);
const networkData = ref<NetworkResponse | null>(null);
const networkError = ref<string | null>(null);

// Wings Config state
const wingsConfigLoading = ref(false);
const wingsConfigContent = ref<string | null>(null);
const wingsConfigOriginalContent = ref<string | null>(null);
const wingsConfigError = ref<string | null>(null);
const wingsConfigSaving = ref(false);
const wingsConfigDirty = computed(() => {
    return (
        wingsConfigContent.value !== null &&
        wingsConfigOriginalContent.value !== null &&
        wingsConfigContent.value !== wingsConfigOriginalContent.value
    );
});
const wingsConfigRestart = ref(false);

// Diagnostics state
const diagnosticsLoading = ref(false);
const diagnosticsResult = ref<DiagnosticsResult | null>(null);
const diagnosticsError = ref<string | null>(null);
const diagnosticsTabRef = ref<InstanceType<typeof DiagnosticsTab> | null>(null);

// Self Update state
const selfUpdateLoading = ref(false);
const selfUpdateResult = ref<Record<string, unknown> | null>(null);
const selfUpdateMessage = ref<string | null>(null);
const selfUpdateError = ref<string | null>(null);
const selfUpdateTabRef = ref<InstanceType<typeof SelfUpdateTab> | null>(null);

// Terminal state
const terminalTabRef = ref<InstanceType<typeof TerminalTab> | null>(null);
let systemTerminal: XTerm | null = null;
let systemTerminalFitAddon: FitAddon | null = null;
const systemTerminalComposable = useSystemTerminal(node);

// Modules state
const modulesLoading = ref(false);
const modules = ref<Module[] | null>(null);
const modulesError = ref<string | null>(null);
const modulesTabRef = ref<InstanceType<typeof ModulesTab> | null>(null);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-node-view');
const widgetsTopOfPage = computed(() => getWidgets('admin-node-view', 'top-of-page'));
const widgetsBeforeTabs = computed(() => getWidgets('admin-node-view', 'before-tabs'));
const widgetsAfterTabs = computed(() => getWidgets('admin-node-view', 'after-tabs'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-node-view', 'bottom-of-page'));

// Breadcrumbs
const breadcrumbs = computed(() => [
    { text: 'Admin', href: '/admin' },
    { text: 'Locations', href: '/admin/locations' },
    { text: 'Nodes', href: `/admin/nodes?location_id=${node.value?.location_id || ''}` },
    { text: node.value?.name || 'Node', href: `/admin/nodes/${nodeId.value}/view` },
]);

// Watch for terminal tab to initialize terminal
watch(
    () => activeTab.value,
    (newTab) => {
        if (newTab === 'terminal' && terminalTabRef.value && !systemTerminal) {
            setTimeout(() => {
                initializeSystemTerminal();
            }, 100);
        }
        if (newTab === 'modules' && !modules.value && !modulesLoading.value) {
            fetchModules();
        }
    },
);

// Watch for terminal execution results
watch(
    () => systemTerminalComposable.lastResult.value,
    (result) => {
        if (result && systemTerminal) {
            if (result.stdout) {
                systemTerminal.write(result.stdout);
            }
            if (result.stderr) {
                systemTerminal.write('\x1b[31m' + result.stderr + '\x1b[0m');
            }
            if (!result.stdout && !result.stderr) {
                systemTerminal.write('\r\n');
            }
            const statusColor = result.exit_code === 0 ? '\x1b[32m' : '\x1b[31m';
            const statusSymbol = result.exit_code === 0 ? '✓' : '✗';
            const statusText = result.exit_code === 0 ? 'Success' : 'Failed (exit code: ' + result.exit_code + ')';
            systemTerminal.write(
                '\x1b[90m[' +
                    statusColor +
                    statusSymbol +
                    ' ' +
                    statusText +
                    '\x1b[90m | ' +
                    result.duration_ms +
                    'ms' +
                    (result.timed_out ? ' | ⚠ Timed out' : '') +
                    ']\x1b[0m\r\n',
            );
        }
    },
);

// Watch for terminal errors
watch(
    () => systemTerminalComposable.error.value,
    (err) => {
        if (err && systemTerminal) {
            systemTerminal.write('\x1b[31m✗ Error: ' + err + '\x1b[0m\r\n');
        }
    },
);

// Functions
async function fetchLocations() {
    try {
        const { data } = await axios.get('/api/admin/locations', { params: { limit: 1000 } });
        locations.value = data.data.locations || [];
    } catch {
        locations.value = [];
    }
}

function getLocationName(id: number | undefined): string {
    if (typeof id !== 'number') return '';
    return locations.value.find((l) => l.id === id)?.name || '';
}

async function fetchNode() {
    loading.value = true;
    error.value = null;
    try {
        const { data } = await axios.get(`/api/admin/nodes/${nodeId.value}`);
        node.value = data.data.node;
        // Fetch all node information
        await Promise.all([
            fetchSystemInfo(),
            fetchUtilizationInfo(),
            fetchDockerInfo(),
            fetchNetworkInfo(),
            fetchWingsConfig(),
        ]);
    } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } };
        error.value = err?.response?.data?.message || 'Failed to fetch node';
        toast.error(error.value);
    } finally {
        loading.value = false;
    }
}

async function fetchSystemInfo() {
    if (!node.value) return;
    systemInfoLoading.value = true;
    systemInfoError.value = null;
    systemInfoData.value = null;
    try {
        const response = await axios.get(`/api/wings/admin/node/${node.value.id}/system`);
        if (response.data.success) {
            systemInfoData.value = response.data.data;
        } else {
            systemInfoError.value = response.data.message || 'Failed to fetch system information';
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        systemInfoError.value = error?.response?.data?.message || 'Failed to fetch system information';
    } finally {
        systemInfoLoading.value = false;
    }
}

async function fetchUtilizationInfo() {
    if (!node.value) return;
    utilizationLoading.value = true;
    utilizationError.value = null;
    utilizationData.value = null;
    try {
        const response = await axios.get(`/api/wings/admin/node/${node.value.id}/utilization`);
        if (response.data.success) {
            utilizationData.value = response.data.data;
        } else {
            utilizationError.value = response.data.message || 'Failed to fetch utilization information';
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        utilizationError.value = error?.response?.data?.message || 'Failed to fetch utilization information';
    } finally {
        utilizationLoading.value = false;
    }
}

async function fetchDockerInfo() {
    if (!node.value) return;
    dockerLoading.value = true;
    dockerError.value = null;
    dockerData.value = null;
    try {
        const response = await axios.get(`/api/wings/admin/node/${node.value.id}/docker/disk`);
        if (response.data.success) {
            dockerData.value = response.data.data;
        } else {
            dockerError.value = response.data.message || 'Failed to fetch Docker information';
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        dockerError.value = error?.response?.data?.message || 'Failed to fetch Docker information';
    } finally {
        dockerLoading.value = false;
    }
}

async function pruneDockerImages() {
    if (!node.value) return;
    dockerPruning.value = true;
    try {
        const response = await axios.delete(`/api/wings/admin/node/${node.value.id}/docker/prune`);
        if (response.data.success) {
            const spaceReclaimed = response.data.data.dockerPrune.SpaceReclaimed || 0;
            const imagesDeleted = response.data.data.dockerPrune.ImagesDeleted || [];
            toast.success(
                `Docker prune completed. Space reclaimed: ${formatBytes(spaceReclaimed, true)}. Images deleted: ${imagesDeleted ? imagesDeleted.length : 0}`,
            );
            await fetchDockerInfo();
        } else {
            toast.error(response.data.message || 'Failed to prune Docker images');
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        toast.error(error?.response?.data?.message || 'Failed to prune Docker images');
    } finally {
        dockerPruning.value = false;
    }
}

async function fetchNetworkInfo() {
    if (!node.value) return;
    networkLoading.value = true;
    networkError.value = null;
    networkData.value = null;
    try {
        const response = await axios.get(`/api/wings/admin/node/${node.value.id}/network`);
        if (response.data.success) {
            networkData.value = response.data.data;
        } else {
            networkError.value = response.data.message || 'Failed to fetch network information';
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        networkError.value = error?.response?.data?.message || 'Failed to fetch network information';
    } finally {
        networkLoading.value = false;
    }
}

function copyToClipboard(text: string) {
    navigator.clipboard
        .writeText(text)
        .then(() => {
            toast.success(`IP address ${text} copied to clipboard`);
        })
        .catch(() => {
            toast.error('Failed to copy to clipboard');
        });
}

async function fetchDiagnostics() {
    if (!node.value || !diagnosticsTabRef.value) return;

    diagnosticsLoading.value = true;
    diagnosticsError.value = null;
    diagnosticsResult.value = null;

    const options = diagnosticsTabRef.value.options;
    const params: Record<string, string | number> = {
        format: options.format,
    };

    if (options.includeEndpoints) {
        params.include_endpoints = 'true';
    }

    if (options.includeLogs) {
        params.include_logs = 'true';
    }

    if (options.includeLogs && options.logLines) {
        params.log_lines = options.logLines;
    }

    if (options.format === 'url' && options.uploadApiUrl.trim() !== '') {
        params.upload_api_url = options.uploadApiUrl.trim();
    }

    try {
        const response = await axios.get<{
            success: boolean;
            data?: { diagnostics: DiagnosticsResult };
            message?: string;
        }>(`/api/admin/nodes/${node.value.id}/diagnostics`, { params });

        if (!response.data.success || !response.data.data) {
            const message = response.data.message || 'Failed to generate diagnostics';
            diagnosticsError.value = message;
            toast.error(message);
            return;
        }

        diagnosticsResult.value = response.data.data.diagnostics;
        toast.success(
            diagnosticsResult.value.format === 'url'
                ? 'Diagnostics link generated successfully'
                : 'Diagnostics generated successfully',
        );
    } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        const message = err?.response?.data?.message || 'Failed to generate diagnostics';
        diagnosticsError.value = message;
        toast.error(message);
    } finally {
        diagnosticsLoading.value = false;
    }
}

function copyDiagnostics(value: string | null) {
    if (!value) {
        toast.error('Nothing to copy');
        return;
    }

    navigator.clipboard
        .writeText(value)
        .then(() => {
            toast.success('Copied to clipboard');
        })
        .catch(() => {
            toast.error('Failed to copy to clipboard');
        });
}

function validateSelfUpdate(): string | null {
    if (!selfUpdateTabRef.value) return 'Self-update tab not initialized';

    const options = selfUpdateTabRef.value.options;

    if (options.source === 'github') {
        if (!options.repoOwner.trim()) {
            return 'Repository owner is required when using GitHub.';
        }
        if (!options.repoName.trim()) {
            return 'Repository name is required when using GitHub.';
        }
    }

    if (options.source === 'url') {
        if (!options.url.trim()) {
            return 'A download URL is required when using the direct URL source.';
        }

        const urlPattern = /^(https?:\/\/).+/i;
        if (!urlPattern.test(options.url.trim())) {
            return 'Download URL must start with http:// or https://';
        }

        if (!options.disableChecksum && !options.sha256.trim()) {
            return 'Provide a SHA256 checksum or disable checksum validation for direct URL updates.';
        }
    }

    return null;
}

async function submitSelfUpdate() {
    if (!node.value || !selfUpdateTabRef.value) return;

    if (selfUpdateLoading.value) return;

    const validationError = validateSelfUpdate();
    if (validationError) {
        selfUpdateError.value = validationError;
        toast.error(validationError);
        return;
    }

    selfUpdateLoading.value = true;
    selfUpdateError.value = null;
    selfUpdateResult.value = null;
    selfUpdateMessage.value = null;

    const options = selfUpdateTabRef.value.options;
    const payload: Record<string, unknown> = {
        source: options.source,
        force: options.force,
    };

    const trimmedVersion = options.version.trim();
    if (trimmedVersion !== '') {
        payload.version = trimmedVersion;
    }

    if (options.source === 'github') {
        payload.repo_owner = options.repoOwner.trim();
        payload.repo_name = options.repoName.trim();
    } else if (options.source === 'url') {
        payload.url = options.url.trim();
        payload.disable_checksum = options.disableChecksum;

        const trimmedSha = options.sha256.trim();
        if (trimmedSha !== '') {
            payload.sha256 = trimmedSha;
        }
    }

    try {
        const response = await axios.post<{
            success: boolean;
            data?: { result: Record<string, unknown> };
            message?: string;
        }>(`/api/admin/nodes/${node.value.id}/self-update`, payload);

        if (!response.data.success) {
            throw new Error(response.data.message || 'Self-update request failed');
        }

        selfUpdateResult.value = response.data.data?.result ?? null;
        selfUpdateMessage.value =
            response.data.message || 'Self-update requested successfully. Wings will apply the update shortly.';
        toast.success(selfUpdateMessage.value);
    } catch (e) {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        const message = err.response?.data?.message || err.message || 'Failed to trigger self-update';
        selfUpdateError.value = message;
        toast.error(message);
    } finally {
        selfUpdateLoading.value = false;
    }
}

// Terminal functions
function initializeSystemTerminal(): void {
    if (!terminalTabRef.value || systemTerminal) return;

    const containerRef = terminalTabRef.value.terminalContainer;
    if (!containerRef) return;

    // Handle ref access - terminalContainer is a Ref<HTMLElement | null>
    const container =
        containerRef && typeof containerRef === 'object' && 'value' in containerRef
            ? (containerRef.value as HTMLElement | null)
            : (containerRef as HTMLElement | null);

    if (!container || !(container instanceof HTMLElement)) return;

    systemTerminal = new XTerm({
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 14,
        theme: {
            background: '#000000',
            foreground: '#d1d5db',
            cursor: '#ffffff',
            black: '#000000',
            red: '#e74c3c',
            green: '#2ecc71',
            yellow: '#f39c12',
            blue: '#3498db',
            magenta: '#9b59b6',
            cyan: '#1abc9c',
            white: '#ecf0f1',
            brightBlack: '#95a5a6',
            brightRed: '#ff6b6b',
            brightGreen: '#51cf66',
            brightYellow: '#ffd43b',
            brightBlue: '#74c0fc',
            brightMagenta: '#da77f2',
            brightCyan: '#3bc9db',
            brightWhite: '#ffffff',
        },
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 10000,
        convertEol: true,
        allowTransparency: false,
        cols: 80,
        rows: 24,
        lineHeight: 1.2,
        letterSpacing: 0,
        allowProposedApi: false,
        disableStdin: true,
    });

    systemTerminalFitAddon = new FitAddon();
    systemTerminal.loadAddon(systemTerminalFitAddon);
    systemTerminal.loadAddon(new WebLinksAddon());

    systemTerminal.open(container);
    systemTerminalFitAddon.fit();

    const resizeObserver = new ResizeObserver(() => {
        if (systemTerminalFitAddon && systemTerminal) {
            systemTerminalFitAddon.fit();
        }
    });

    resizeObserver.observe(container);

    systemTerminal.writeln('\x1b[1;36m╔' + '═'.repeat(58) + '╗\x1b[0m');
    systemTerminal.writeln('\x1b[1;36m║       Welcome to FeatherPanel Host Terminal            ║\x1b[0m');
    systemTerminal.writeln('\x1b[1;36m╚' + '═'.repeat(58) + '╝\x1b[0m');
    systemTerminal.writeln('');
    systemTerminal.writeln('\x1b[90mHost: ' + (node.value?.fqdn || 'Unknown') + '\x1b[0m');
    systemTerminal.writeln('\x1b[90mCommands execute with system privileges - use with caution.\x1b[0m');
    systemTerminal.writeln('');
}

async function executeTerminalCommand(command: string): Promise<void> {
    if (!node.value) {
        toast.error('No node selected');
        return;
    }

    if (!command.trim()) {
        toast.error('Please enter a command');
        return;
    }

    if (!systemTerminal) {
        initializeSystemTerminal();
    }

    if (systemTerminal) {
        systemTerminal.write('\r\n\x1b[1;36m❯\x1b[0m \x1b[37m' + command + '\x1b[0m\r\n');
    }

    await systemTerminalComposable.executeCommand({
        command: command,
        timeout_seconds: 60,
    });

    if (terminalTabRef.value) {
        terminalTabRef.value.commandInput = '';
    }
}

function clearTerminal(): void {
    if (systemTerminal) {
        systemTerminal.clear();
        systemTerminal.writeln('\x1b[32mTerminal cleared\x1b[0m');
        systemTerminal.writeln('');
    }
}

async function fetchWingsConfig() {
    if (!node.value) return;
    wingsConfigLoading.value = true;
    wingsConfigError.value = null;
    try {
        const response = await axios.get(`/api/admin/nodes/${node.value.id}/wings/config`);
        if (response.data.success) {
            const configContent = response.data.data.config || '';
            wingsConfigContent.value = configContent;
            wingsConfigOriginalContent.value = configContent;
        } else {
            wingsConfigError.value = response.data.message || 'Failed to load Wings configuration';
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        wingsConfigError.value = error?.response?.data?.message || 'Failed to load Wings configuration';
    } finally {
        wingsConfigLoading.value = false;
    }
}

function handleWingsConfigContentUpdate(value: string) {
    wingsConfigContent.value = value;
}

function resetWingsConfig() {
    fetchWingsConfig();
}

async function saveWingsConfig() {
    if (!node.value || wingsConfigContent.value === null) return;
    wingsConfigSaving.value = true;
    try {
        const response = await axios.put(`/api/admin/nodes/${node.value.id}/wings/config`, {
            config: wingsConfigContent.value,
            restart: wingsConfigRestart.value,
        });
        if (response.data.success) {
            wingsConfigOriginalContent.value = wingsConfigContent.value;
            toast.success('Wings configuration saved successfully');
            if (wingsConfigRestart.value) {
                toast.info('Wings will restart shortly');
            }
        } else {
            toast.error(response.data.message || 'Failed to save Wings configuration');
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        toast.error(error?.response?.data?.message || 'Failed to save Wings configuration');
    } finally {
        wingsConfigSaving.value = false;
    }
}

// Module functions
async function fetchModules() {
    if (!node.value) return;
    modulesLoading.value = true;
    modulesError.value = null;
    try {
        const response = await axios.get(`/api/wings/admin/node/${node.value.id}/modules`);
        if (response.data.success) {
            modules.value = response.data.data?.data || response.data.data || [];
        } else {
            modulesError.value = response.data.message || 'Failed to fetch modules';
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        modulesError.value = error?.response?.data?.message || 'Failed to fetch modules';
    } finally {
        modulesLoading.value = false;
    }
}

async function enableModule(moduleName: string) {
    if (!node.value || !modulesTabRef.value) return;
    modulesTabRef.value.setActionLoading(`enable-${moduleName}`);
    try {
        const response = await axios.post(`/api/wings/admin/node/${node.value.id}/modules/${moduleName}/enable`);
        if (response.data.success) {
            toast.success(`Module "${moduleName}" enabled successfully`);
            await fetchModules();
        } else {
            toast.error(response.data.message || `Failed to enable module "${moduleName}"`);
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        toast.error(error?.response?.data?.message || `Failed to enable module "${moduleName}"`);
    } finally {
        modulesTabRef.value.setActionLoading(null);
    }
}

async function disableModule(moduleName: string) {
    if (!node.value || !modulesTabRef.value) return;
    modulesTabRef.value.setActionLoading(`disable-${moduleName}`);
    try {
        const response = await axios.post(`/api/wings/admin/node/${node.value.id}/modules/${moduleName}/disable`);
        if (response.data.success) {
            toast.success(`Module "${moduleName}" disabled successfully`);
            await fetchModules();
        } else {
            toast.error(response.data.message || `Failed to disable module "${moduleName}"`);
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        toast.error(error?.response?.data?.message || `Failed to disable module "${moduleName}"`);
    } finally {
        modulesTabRef.value.setActionLoading(null);
    }
}

async function configureModule(moduleName: string) {
    if (!node.value || !modulesTabRef.value) return;
    modulesTabRef.value.setConfigLoading(moduleName, true);
    modulesTabRef.value.setConfigError(moduleName, null);
    try {
        const response = await axios.get(`/api/wings/admin/node/${node.value.id}/modules/${moduleName}/config`);
        if (response.data.success) {
            const config: ModuleConfig = response.data.data || {};
            modulesTabRef.value.setModuleConfig(moduleName, config);
        } else {
            modulesTabRef.value.setConfigError(
                moduleName,
                response.data.message || 'Failed to load module configuration',
            );
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        modulesTabRef.value.setConfigError(
            moduleName,
            error?.response?.data?.message || 'Failed to load module configuration',
        );
    } finally {
        modulesTabRef.value.setConfigLoading(moduleName, false);
    }
}

async function updateModuleConfig(moduleName: string, config: Record<string, unknown>) {
    if (!node.value || !modulesTabRef.value) return;
    modulesTabRef.value.setConfigSaving(moduleName, true);
    try {
        const response = await axios.put(`/api/wings/admin/node/${node.value.id}/modules/${moduleName}/config`, {
            config,
        });
        if (response.data.success) {
            toast.success(`Module "${moduleName}" configuration saved successfully`);
            modulesTabRef.value.setConfigSaving(moduleName, false);
            await fetchModules();
        } else {
            toast.error(response.data.message || `Failed to save module "${moduleName}" configuration`);
            modulesTabRef.value.setConfigSaving(moduleName, false);
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        toast.error(error?.response?.data?.message || `Failed to save module "${moduleName}" configuration`);
        modulesTabRef.value.setConfigSaving(moduleName, false);
    }
}

onMounted(async () => {
    await fetchLocations();
    await fetchNode();
    await fetchPluginWidgets();
});

onUnmounted(() => {
    if (systemTerminal) {
        systemTerminal.dispose();
        systemTerminal = null;
    }
    systemTerminalFitAddon = null;
    systemTerminalComposable.reset();
});
</script>
