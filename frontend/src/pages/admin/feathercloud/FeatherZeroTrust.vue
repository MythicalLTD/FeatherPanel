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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import TableComponent from '@/components/ui/feather-table/TableComponent.vue';
import SelectionModal from '@/components/ui/selection-modal/SelectionModal.vue';
import { useSelectionModal } from '@/composables/useSelectionModal';
import type { TableColumn } from '@/components/ui/feather-table/types';
import {
    Shield,
    Settings,
    Scan,
    Server,
    Check,
    X,
    AlertTriangle,
    Lock,
    Activity,
    Zap,
    Radar,
    ShieldCheck,
    Eye,
} from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { ref, computed } from 'vue';
import { useToast } from 'vue-toastification';
import { useRouter } from 'vue-router';

const toast = useToast();
const router = useRouter();

const scanning = ref(false);
const scanMode = ref<'single' | 'batch'>('single');
const scanProgress = ref({
    message: '',
    filesScanned: 0,
    currentDirectory: '',
});
const progressInterval = ref<ReturnType<typeof setInterval> | null>(null);
interface ScanResult {
    files_scanned?: number;
    detections_count?: number;
    errors?: Array<{ message: string; directory?: string; file?: string }>;
    duration?: string;
    detections?: Array<Record<string, unknown>>;
}

interface BatchScanResult {
    server_uuid: string;
    server_name?: string;
    result?: ScanResult;
    error?: string;
    detections?: Array<Record<string, unknown>>;
    detections_count?: number;
}

const scanResults = ref<ScanResult | null>(null);
const selectedServers = ref<Array<{ uuid: string; name: string; node?: { name: string } }>>([]);
const batchScanResults = ref<BatchScanResult[]>([]);

const scanForm = ref({
    directory: '/',
    max_depth: 10,
});

const serverModal = useSelectionModal('/api/admin/servers', 20, 'search', 'page');

const breadcrumbs = computed(() => [
    { text: 'FeatherZeroTrust', isCurrent: true, href: '/admin/feathercloud/featherzerotrust' },
]);

const detectionsColumns: TableColumn[] = [
    { key: 'file_path', label: 'File Path', searchable: true },
    { key: 'file_name', label: 'File Name', searchable: true },
    { key: 'detection_type', label: 'Detection Type' },
    { key: 'reason', label: 'Reason' },
    { key: 'detected_at', label: 'Detected At' },
];

function selectServer() {
    serverModal.openModal();
}

function confirmServerSelection() {
    const server = serverModal.confirmSelection();
    if (server) {
        if (scanMode.value === 'single') {
            selectedServers.value = [{ uuid: server.uuid, name: server.name, node: server.node }];
        } else {
            // Check if already selected
            if (!selectedServers.value.find((s) => s.uuid === server.uuid)) {
                selectedServers.value.push({ uuid: server.uuid, name: server.name, node: server.node });
            }
        }
    }
}

function removeServer(uuid: string) {
    selectedServers.value = selectedServers.value.filter((s) => s.uuid !== uuid);
}

function clearSelection() {
    selectedServers.value = [];
}

function goToConfig() {
    router.push('/admin/feathercloud/featherzerotrust/config');
}

function startFakeProgress() {
    scanProgress.value = {
        message: 'Initializing scan...',
        filesScanned: 0,
        currentDirectory: scanForm.value.directory || '/',
    };

    const messages = [
        'Scanning directory structure...',
        'Analyzing file system...',
        'Checking file permissions...',
        'Calculating file hashes...',
        'Comparing against threat database...',
        'Validating file signatures...',
        'Scanning for suspicious patterns...',
        'Finalizing scan results...',
    ];

    let messageIndex = 0;
    let fileCount = 0;
    const directories = ['/', '/home', '/var', '/usr', '/etc', '/opt', '/tmp', '/root', '/srv', '/lib'];

    progressInterval.value = setInterval(() => {
        // Update message every 1.5 seconds
        if (messageIndex < messages.length) {
            scanProgress.value.message = messages[messageIndex] || 'Scanning...';
            messageIndex++;
        }

        // Increment file count (simulate progress)
        fileCount += Math.floor(Math.random() * 50) + 10;
        scanProgress.value.filesScanned = fileCount;

        // Update current directory
        const dirIndex = Math.floor((fileCount / 100) % directories.length);
        scanProgress.value.currentDirectory = directories[dirIndex] || '/';
    }, 1500);
}

function stopFakeProgress() {
    if (progressInterval.value) {
        clearInterval(progressInterval.value);
        progressInterval.value = null;
    }
    scanProgress.value = {
        message: '',
        filesScanned: 0,
        currentDirectory: '',
    };
}

async function performScan() {
    if (selectedServers.value.length === 0) {
        toast.error('Please select at least one server');
        return;
    }

    scanning.value = true;
    scanResults.value = null;
    batchScanResults.value = [];
    startFakeProgress();

    try {
        if (scanMode.value === 'single' && selectedServers.value.length === 1) {
            const server = selectedServers.value[0];
            if (!server) {
                toast.error('No server selected');
                return;
            }
            const { data } = await axios.post('/api/admin/featherzerotrust/scan', {
                server_uuid: server.uuid,
                directory: scanForm.value.directory,
                max_depth: scanForm.value.max_depth,
            });
            stopFakeProgress();
            scanResults.value = data.data;
            toast.success(`Scan completed. Found ${data.data.detections_count || 0} detections.`);
        } else {
            // Batch scan
            const serverUuids = selectedServers.value.map((s) => s.uuid);
            const { data } = await axios.post('/api/admin/featherzerotrust/scan/batch', {
                server_uuids: serverUuids,
                directory: scanForm.value.directory,
                max_depth: scanForm.value.max_depth,
            });

            stopFakeProgress();

            batchScanResults.value = (data.data.results || []).map(
                (result: BatchScanResult & Record<string, unknown>) => {
                    const server = selectedServers.value.find((s) => s.uuid === result.server_uuid);
                    return {
                        server_uuid: result.server_uuid,
                        server_name: server?.name || 'Unknown',
                        result: result.detections || result.detections_count ? (result as ScanResult) : null,
                        error: result.error || null,
                    };
                },
            );

            const totalDetections = batchScanResults.value.reduce(
                (sum, r) => sum + (r.result?.detections_count || 0),
                0,
            );
            const errors = batchScanResults.value.filter((r) => r.error).length;

            toast.success(
                `Batch scan completed. ${batchScanResults.value.length - errors} servers scanned, ${totalDetections} total detections found.`,
            );
        }
    } catch (error: unknown) {
        stopFakeProgress();
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to scan server(s)';
        toast.error(errorMessage);
    } finally {
        scanning.value = false;
    }
}
</script>

<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen bg-background">
            <div class="space-y-6 p-6">
                <!-- Hero Section -->
                <div
                    class="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-8 sm:p-10 shadow-xl shadow-primary/10 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20"
                >
                    <!-- Animated Background -->
                    <div class="absolute inset-0 pointer-events-none">
                        <div
                            class="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent animate-pulse"
                        ></div>
                        <div
                            class="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000"
                        ></div>
                        <div
                            class="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-2000"
                        ></div>
                        <!-- Scanning Radar Effect -->
                        <div
                            v-if="scanning"
                            class="absolute inset-0 bg-radial-gradient from-primary/10 via-transparent to-transparent animate-spin"
                            style="animation-duration: 3s; animation-timing-function: linear"
                        ></div>
                    </div>
                    <div class="relative z-10">
                        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                            <div
                                class="p-4 rounded-2xl bg-primary/10 border border-primary/20 transition-all duration-300 hover:scale-110 hover:rotate-3 hover:bg-primary/20"
                            >
                                <ShieldCheck
                                    class="h-10 w-10 text-primary transition-all duration-300"
                                    :class="{ 'animate-pulse': scanning }"
                                />
                            </div>
                            <div class="flex-1">
                                <Badge
                                    variant="secondary"
                                    class="mb-3 border-primary/30 bg-primary/10 text-primary animate-pulse"
                                >
                                    <Lock class="h-3 w-3 mr-1 inline" />
                                    Zero Trust Security
                                </Badge>
                                <h1
                                    class="text-3xl font-bold tracking-tight sm:text-4xl bg-linear-to-r from-foreground to-foreground/70 bg-clip-text"
                                >
                                    FeatherZeroTrust Scanner
                                </h1>
                                <p class="text-muted-foreground mt-2 max-w-2xl">
                                    Protect your infrastructure with automated threat detection and malicious file
                                    scanning
                                </p>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-3">
                            <Button
                                variant="outline"
                                size="lg"
                                class="transition-all duration-300 hover:scale-105 hover:shadow-lg"
                                @click="goToConfig"
                            >
                                <Settings
                                    class="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-90"
                                />
                                Configuration
                            </Button>
                            <div
                                v-if="scanning"
                                class="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 animate-pulse"
                            >
                                <Radar class="h-4 w-4 text-primary animate-spin" />
                                <span class="text-sm font-medium text-primary">Scanning in progress...</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Scan Mode Selection -->
                <Card class="border border-border/70 shadow-lg transition-all duration-300 hover:shadow-xl">
                    <CardHeader>
                        <div class="flex items-center gap-2">
                            <Radar class="h-5 w-5 text-primary animate-pulse" />
                            <CardTitle>Scan Configuration</CardTitle>
                        </div>
                        <CardDescription>Choose scan mode and select servers to scan for threats</CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-6">
                        <!-- Scan Mode -->
                        <div>
                            <label class="flex items-center gap-2 text-sm font-medium mb-4">
                                <Activity class="h-4 w-4 text-primary" />
                                Scan Mode
                            </label>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    :class="[
                                        'group relative p-6 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden',
                                        scanMode === 'single'
                                            ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 scale-105'
                                            : 'border-border hover:border-primary/50 hover:bg-muted/50 hover:scale-102',
                                    ]"
                                    @click="
                                        scanMode = 'single';
                                        selectedServers = [];
                                    "
                                >
                                    <!-- Animated background effect -->
                                    <div
                                        v-if="scanMode === 'single'"
                                        class="absolute inset-0 bg-linear-to-r from-primary/10 via-transparent to-transparent animate-pulse"
                                    ></div>
                                    <div class="relative z-10 flex items-start gap-4">
                                        <div
                                            :class="[
                                                'p-3 rounded-lg transition-all duration-300',
                                                scanMode === 'single'
                                                    ? 'bg-primary/10 text-primary animate-pulse'
                                                    : 'bg-muted text-muted-foreground group-hover:bg-primary/5',
                                            ]"
                                        >
                                            <Scan
                                                class="h-6 w-6 transition-transform duration-300"
                                                :class="{ 'animate-pulse': scanMode === 'single' }"
                                            />
                                        </div>
                                        <div class="flex-1">
                                            <div class="font-semibold mb-1 flex items-center gap-2">
                                                Single Server
                                                <Shield
                                                    v-if="scanMode === 'single'"
                                                    class="h-4 w-4 text-primary animate-pulse"
                                                />
                                            </div>
                                            <div class="text-sm text-muted-foreground">
                                                Scan one server at a time with detailed results
                                            </div>
                                        </div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    :class="[
                                        'group relative p-6 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden',
                                        scanMode === 'batch'
                                            ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 scale-105'
                                            : 'border-border hover:border-primary/50 hover:bg-muted/50 hover:scale-102',
                                    ]"
                                    @click="
                                        scanMode = 'batch';
                                        selectedServers = [];
                                    "
                                >
                                    <!-- Animated background effect -->
                                    <div
                                        v-if="scanMode === 'batch'"
                                        class="absolute inset-0 bg-linear-to-r from-primary/10 via-transparent to-transparent animate-pulse"
                                    ></div>
                                    <div class="relative z-10 flex items-start gap-4">
                                        <div
                                            :class="[
                                                'p-3 rounded-lg transition-all duration-300',
                                                scanMode === 'batch'
                                                    ? 'bg-primary/10 text-primary animate-pulse'
                                                    : 'bg-muted text-muted-foreground group-hover:bg-primary/5',
                                            ]"
                                        >
                                            <Server
                                                class="h-6 w-6 transition-transform duration-300"
                                                :class="{ 'animate-pulse': scanMode === 'batch' }"
                                            />
                                        </div>
                                        <div class="flex-1">
                                            <div class="font-semibold mb-1 flex items-center gap-2">
                                                Batch Scan
                                                <Zap
                                                    v-if="scanMode === 'batch'"
                                                    class="h-4 w-4 text-primary animate-pulse"
                                                />
                                            </div>
                                            <div class="text-sm text-muted-foreground">
                                                Scan multiple servers simultaneously
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <!-- Server Selection -->
                        <div>
                            <label class="flex items-center gap-2 text-sm font-medium mb-3">
                                <Eye class="h-4 w-4 text-primary" />
                                {{ scanMode === 'single' ? 'Selected Server' : 'Selected Servers' }}
                                <span class="text-destructive animate-pulse">*</span>
                            </label>
                            <div class="space-y-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    class="w-full justify-start h-auto py-3 transition-all duration-300 hover:scale-102 hover:shadow-md hover:border-primary/50 group"
                                    @click="selectServer"
                                >
                                    <Server
                                        class="mr-2 h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
                                    />
                                    <div class="text-left">
                                        <div class="font-medium">
                                            {{ scanMode === 'single' ? 'Select Server' : 'Add Server' }}
                                        </div>
                                        <div class="text-xs text-muted-foreground font-normal">
                                            {{
                                                scanMode === 'single'
                                                    ? 'Choose a server to scan'
                                                    : 'Add servers to scan batch'
                                            }}
                                        </div>
                                    </div>
                                    <ShieldCheck
                                        class="ml-auto h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    />
                                </Button>

                                <!-- Selected Servers List -->
                                <transition-group
                                    v-if="selectedServers.length > 0"
                                    name="server-list"
                                    tag="div"
                                    class="space-y-2"
                                >
                                    <div
                                        v-for="(server, index) in selectedServers"
                                        :key="server.uuid"
                                        class="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-lg hover:bg-muted transition-all duration-300 hover:scale-102 hover:shadow-md hover:border-primary/30 group"
                                        :style="{ 'animation-delay': `${index * 50}ms` }"
                                    >
                                        <div class="flex items-center gap-3 flex-1 min-w-0">
                                            <div
                                                class="p-2 rounded-lg bg-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
                                            >
                                                <Server class="h-4 w-4 text-primary animate-pulse" />
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <div class="font-medium truncate flex items-center gap-2">
                                                    {{ server.name }}
                                                    <ShieldCheck class="h-3 w-3 text-green-500 animate-pulse" />
                                                </div>
                                                <div class="text-xs text-muted-foreground truncate">
                                                    {{ server.node?.name || 'Unknown Node' }} • {{ server.uuid }}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            class="ml-2 shrink-0 transition-all duration-300 hover:scale-110 hover:text-destructive"
                                            @click="removeServer(server.uuid)"
                                        >
                                            <X class="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Button
                                        key="clear-all"
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        class="w-full transition-all duration-300 hover:scale-105 hover:text-destructive"
                                        @click="clearSelection"
                                    >
                                        <X class="h-4 w-4 mr-2" />
                                        Clear All
                                    </Button>
                                </transition-group>
                            </div>
                        </div>

                        <!-- Scan Options -->
                        <div
                            class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-border/50"
                        >
                            <div>
                                <label class="block text-sm font-medium mb-2">Directory</label>
                                <Input v-model="scanForm.directory" placeholder="/" class="bg-background" />
                                <p class="text-xs text-muted-foreground mt-1.5">Directory to scan (default: /)</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-2">Max Depth</label>
                                <Input
                                    v-model.number="scanForm.max_depth"
                                    type="number"
                                    min="1"
                                    max="20"
                                    class="bg-background"
                                />
                                <p class="text-xs text-muted-foreground mt-1.5">Maximum directory depth (1-20)</p>
                            </div>
                        </div>

                        <!-- Scan Progress Indicator -->
                        <div
                            v-if="scanning"
                            class="w-full p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3 animate-pulse"
                        >
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <Radar class="h-4 w-4 text-primary animate-spin" />
                                    <span class="text-sm font-medium text-primary">{{ scanProgress.message }}</span>
                                </div>
                                <Badge variant="secondary" class="font-mono">
                                    {{ scanProgress.filesScanned.toLocaleString() }} files
                                </Badge>
                            </div>
                            <div class="space-y-1">
                                <div class="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Current directory:</span>
                                    <code class="font-mono text-primary">{{ scanProgress.currentDirectory }}</code>
                                </div>
                                <div class="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        class="h-full bg-primary transition-all duration-500 ease-out"
                                        :style="{ width: `${Math.min((scanProgress.filesScanned / 1000) * 100, 95)}%` }"
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <!-- Scan Button -->
                        <Button
                            :loading="scanning"
                            :disabled="selectedServers.length === 0"
                            class="w-full transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:hover:scale-100 disabled:hover:shadow-none relative overflow-hidden group"
                            size="lg"
                            @click="performScan"
                        >
                            <div
                                v-if="scanning"
                                class="absolute inset-0 bg-linear-to-r from-primary/20 via-transparent to-transparent animate-pulse"
                            ></div>
                            <Scan
                                class="mr-2 h-4 w-4 transition-transform duration-300"
                                :class="{ 'animate-spin': scanning, 'group-hover:rotate-12': !scanning }"
                            />
                            <span class="relative z-10">
                                {{
                                    scanning ? 'Scanning...' : scanMode === 'single' ? 'Start Scan' : 'Start Batch Scan'
                                }}
                            </span>
                            <Radar
                                v-if="scanning"
                                class="ml-2 h-4 w-4 animate-spin relative z-10"
                                style="animation-duration: 1s"
                            />
                        </Button>
                    </CardContent>
                </Card>

                <!-- Single Scan Results -->
                <transition name="fade-slide">
                    <Card
                        v-if="scanResults && scanMode === 'single'"
                        class="border border-border/70 shadow-lg transition-all duration-500 hover:shadow-xl"
                    >
                        <CardHeader>
                            <div class="flex items-center gap-2">
                                <ShieldCheck class="h-5 w-5 text-primary animate-pulse" />
                                <CardTitle>Scan Results</CardTitle>
                            </div>
                            <CardDescription>Detailed results from the last scan operation</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-6">
                                <!-- Statistics -->
                                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <Card
                                        class="border border-border/70 transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-blue-500/50 group"
                                    >
                                        <CardContent class="pt-6">
                                            <div class="flex items-center justify-between mb-2">
                                                <div class="text-sm font-medium text-muted-foreground">
                                                    Files Scanned
                                                </div>
                                                <Scan
                                                    class="h-4 w-4 text-blue-500/60 transition-transform duration-300 group-hover:rotate-12"
                                                />
                                            </div>
                                            <div
                                                class="text-3xl font-bold transition-all duration-300 group-hover:text-blue-500"
                                            >
                                                {{ (scanResults.files_scanned || 0).toLocaleString() }}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card
                                        class="border border-destructive/50 bg-destructive/5 transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-destructive/70 group animate-pulse"
                                    >
                                        <CardContent class="pt-6">
                                            <div class="flex items-center justify-between mb-2">
                                                <div class="text-sm font-medium text-muted-foreground">Detections</div>
                                                <AlertTriangle
                                                    class="h-4 w-4 text-destructive transition-transform duration-300 group-hover:scale-125 group-hover:animate-bounce"
                                                />
                                            </div>
                                            <div
                                                class="text-3xl font-bold text-destructive transition-all duration-300 group-hover:scale-110"
                                            >
                                                {{ (scanResults.detections_count || 0).toLocaleString() }}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card
                                        class="border border-border/70 transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-orange-500/50 group"
                                    >
                                        <CardContent class="pt-6">
                                            <div class="flex items-center justify-between mb-2">
                                                <div class="text-sm font-medium text-muted-foreground">Errors</div>
                                                <X
                                                    class="h-4 w-4 text-orange-500/60 transition-transform duration-300 group-hover:rotate-90"
                                                />
                                            </div>
                                            <div
                                                class="text-3xl font-bold transition-all duration-300 group-hover:text-orange-500"
                                            >
                                                {{ (scanResults.errors?.length || 0).toLocaleString() }}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card
                                        class="border border-border/70 transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-green-500/50 group"
                                    >
                                        <CardContent class="pt-6">
                                            <div class="flex items-center justify-between mb-2">
                                                <div class="text-sm font-medium text-muted-foreground">Duration</div>
                                                <ShieldCheck
                                                    class="h-4 w-4 text-green-500/60 transition-transform duration-300 group-hover:scale-110"
                                                />
                                            </div>
                                            <div
                                                class="text-3xl font-bold transition-all duration-300 group-hover:text-green-500"
                                            >
                                                {{ scanResults.duration || 'N/A' }}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <!-- Detections Table -->
                                <transition name="fade-slide">
                                    <div
                                        v-if="scanResults.detections && scanResults.detections.length > 0"
                                        key="detections"
                                    >
                                        <div
                                            class="mb-4 flex items-center gap-2 p-4 bg-destructive/5 border border-destructive/20 rounded-lg animate-pulse"
                                        >
                                            <AlertTriangle class="h-5 w-5 text-destructive animate-bounce" />
                                            <h3 class="text-lg font-semibold text-destructive">Detections Found</h3>
                                            <Badge variant="destructive" class="ml-auto animate-pulse">
                                                {{ scanResults.detections.length }} threat{{
                                                    scanResults.detections.length !== 1 ? 's' : ''
                                                }}
                                            </Badge>
                                        </div>
                                        <TableComponent
                                            title="Detections"
                                            description="Suspicious files detected during scan"
                                            :columns="detectionsColumns"
                                            :data="(scanResults.detections || []) as Record<string, unknown>[]"
                                            search-placeholder="Search detections..."
                                        />
                                    </div>
                                    <!-- No Detections -->
                                    <div v-else key="no-detections" class="text-center py-12">
                                        <div
                                            class="inline-flex p-4 rounded-full bg-green-500/10 mb-4 animate-pulse transition-transform duration-300 hover:scale-110"
                                        >
                                            <ShieldCheck class="h-12 w-12 text-green-500" />
                                        </div>
                                        <h3 class="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
                                            <Check class="h-5 w-5 text-green-500" />
                                            No Threats Detected
                                        </h3>
                                        <p class="text-muted-foreground">
                                            The scan completed successfully with no suspicious files found
                                        </p>
                                    </div>
                                </transition>

                                <!-- Errors -->
                                <div v-if="scanResults.errors && scanResults.errors.length > 0">
                                    <h3 class="text-lg font-semibold mb-2 text-destructive">Errors</h3>
                                    <div class="space-y-2">
                                        <Alert
                                            v-for="(error, index) in scanResults.errors"
                                            :key="index"
                                            variant="destructive"
                                        >
                                            {{ error.message }} - {{ error.directory || error.file }}
                                        </Alert>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </transition>

                <!-- Batch Scan Results -->
                <transition name="fade-slide">
                    <Card
                        v-if="batchScanResults.length > 0 && scanMode === 'batch'"
                        class="border border-border/70 shadow-lg transition-all duration-500 hover:shadow-xl"
                    >
                        <CardHeader>
                            <div class="flex items-center gap-2">
                                <Radar class="h-5 w-5 text-primary animate-pulse" />
                                <CardTitle>Batch Scan Results</CardTitle>
                            </div>
                            <CardDescription
                                >Results from batch scan across {{ batchScanResults.length }} server(s)</CardDescription
                            >
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-4">
                                <transition-group name="server-result" tag="div">
                                    <div
                                        v-for="(result, index) in batchScanResults"
                                        :key="result.server_uuid"
                                        class="border rounded-xl p-5 transition-all duration-300 hover:scale-102 hover:shadow-lg"
                                        :class="
                                            result.error
                                                ? 'border-destructive/50 bg-destructive/5 animate-pulse'
                                                : 'border-border hover:border-primary/30 hover:bg-muted/30'
                                        "
                                        :style="{ 'animation-delay': `${index * 100}ms` }"
                                    >
                                        <div class="flex items-start justify-between mb-4">
                                            <div class="flex items-start gap-3 flex-1 min-w-0">
                                                <div
                                                    :class="[
                                                        'p-2 rounded-lg shrink-0',
                                                        result.error ? 'bg-destructive/10' : 'bg-primary/10',
                                                    ]"
                                                >
                                                    <Server
                                                        :class="[
                                                            'h-5 w-5',
                                                            result.error ? 'text-destructive' : 'text-primary',
                                                        ]"
                                                    />
                                                </div>
                                                <div class="flex-1 min-w-0">
                                                    <div class="font-semibold truncate">
                                                        {{ result.server_name || result.server_uuid }}
                                                    </div>
                                                    <div class="text-xs text-muted-foreground truncate mt-1">
                                                        {{ result.server_uuid }}
                                                    </div>
                                                </div>
                                            </div>
                                            <div v-if="result.error">
                                                <Badge variant="destructive">Error</Badge>
                                            </div>
                                            <div v-else>
                                                <Badge variant="secondary" class="font-semibold">
                                                    {{ result.result?.detections_count || 0 }} detection{{
                                                        (result.result?.detections_count || 0) !== 1 ? 's' : ''
                                                    }}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div
                                            v-if="result.error"
                                            class="p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                                        >
                                            <p class="text-sm text-destructive font-medium">{{ result.error }}</p>
                                        </div>
                                        <div
                                            v-else-if="result.result?.detections && result.result.detections.length > 0"
                                            class="mt-4"
                                        >
                                            <TableComponent
                                                title="Detections"
                                                description="Suspicious files detected"
                                                :columns="detectionsColumns"
                                                :data="result.result.detections as Record<string, unknown>[]"
                                                search-placeholder="Search detections..."
                                            />
                                        </div>
                                        <div
                                            v-else
                                            class="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                                        >
                                            <p
                                                class="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-2"
                                            >
                                                <Shield class="h-4 w-4" />
                                                No detections found - server is clean
                                            </p>
                                        </div>
                                    </div>
                                </transition-group>
                            </div>
                        </CardContent>
                    </Card>
                </transition>
            </div>
        </div>

        <!-- Server Selection Modal -->
        <SelectionModal
            :is-open="serverModal.state.value.isOpen"
            title="Select Server"
            description="Choose a server to scan"
            item-type="server"
            search-placeholder="Search servers by name..."
            :items="serverModal.state.value.items"
            :loading="serverModal.state.value.loading"
            :current-page="serverModal.state.value.currentPage"
            :total-pages="serverModal.state.value.totalPages"
            :total-items="serverModal.state.value.totalItems"
            :page-size="20"
            :selected-item="serverModal.state.value.selectedItem"
            :search-query="serverModal.state.value.searchQuery"
            @update:open="serverModal.closeModal"
            @search="serverModal.handleSearch"
            @search-query-update="serverModal.handleSearchQueryUpdate"
            @page-change="serverModal.handlePageChange"
            @select="serverModal.selectItem"
            @confirm="confirmServerSelection"
        >
            <template #default="{ item, isSelected }">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium truncate">{{ item.name }}</h4>
                        <p class="text-sm text-muted-foreground truncate">
                            {{ item.node?.name || 'Unknown Node' }} • {{ item.uuidShort }}
                        </p>
                    </div>
                    <div v-if="isSelected" class="shrink-0 ml-4">
                        <Check class="h-5 w-5 text-primary" />
                    </div>
                </div>
            </template>
        </SelectionModal>
    </DashboardLayout>
</template>
