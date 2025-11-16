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
import { Label } from '@/components/ui/label';
import TableComponent from '@/components/ui/feather-table/TableComponent.vue';
import SelectionModal from '@/components/ui/selection-modal/SelectionModal.vue';
import { useSelectionModal } from '@/composables/useSelectionModal';
import type { TableColumn } from '@/components/ui/feather-table/types';
import {
    ShieldCheck,
    Database,
    Server,
    AlertTriangle,
    TrendingUp,
    Search,
    CheckCircle,
    XCircle,
} from 'lucide-vue-next';
import axios from 'axios';
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

const toast = useToast();

interface HashRecord {
    hash: string;
    file_name: string;
    detection_type: string;
    times_detected: number;
    first_seen: string;
}

interface TISStats {
    nodes: Array<{
        node_id?: number;
        node_name: string;
        totalHashes: number;
        totalServers: number;
        unconfirmedHashes: number;
        recentDetections: number;
    }>;
    totals: {
        totalHashes: number;
        totalServers: number;
        unconfirmedHashes: number;
        recentDetections: number;
    };
}

const loading = ref(true);
const stats = ref<TISStats['nodes']>([]);
const hashes = ref<HashRecord[]>([]);
const totals = ref({
    totalHashes: 0,
    totalServers: 0,
    unconfirmedHashes: 0,
    recentDetections: 0,
});

// Hash checking
const hashCheckDialogOpen = ref(false);
const hashCheckInput = ref('');
const hashCheckResults = ref<Array<{ hash: string; found: boolean; details?: HashRecord }>>([]);
const checkingHashes = ref(false);

// Server status checking
const serverCheckDialogOpen = ref(false);
const selectedServer = ref<{ uuid: string; name: string; node?: { id: number; name: string } } | null>(null);
const serverCheckResults = ref<{ flagged: boolean; details?: Record<string, unknown> } | null>(null);
const checkingServer = ref(false);
const serverModal = useSelectionModal('/api/admin/servers', 20, 'search', 'page');

const breadcrumbs = computed(() => [{ text: 'TIS', isCurrent: true, href: '/admin/feathercloud/tis' }]);

const nodeStatsColumns: TableColumn[] = [
    { key: 'node_name', label: 'Node Name', searchable: true },
    { key: 'totalHashes', label: 'Total Hashes' },
    { key: 'totalServers', label: 'Total Servers' },
    { key: 'unconfirmedHashes', label: 'Unconfirmed' },
    { key: 'recentDetections', label: 'Recent Detections' },
];

const hashesColumns: TableColumn[] = [
    { key: 'hash', label: 'Hash', searchable: true },
    { key: 'file_name', label: 'File Name', searchable: true },
    { key: 'detection_type', label: 'Detection Type' },
    { key: 'times_detected', label: 'Times Detected' },
    { key: 'first_seen', label: 'First Seen' },
];

const nodeStats = computed(() => {
    return stats.value.map((node) => ({
        node_name: node.node_name || 'Unknown',
        totalHashes: node.totalHashes || 0,
        totalServers: node.totalServers || 0,
        unconfirmedHashes: node.unconfirmedHashes || 0,
        recentDetections: node.recentDetections || 0,
    }));
});

async function fetchStats(): Promise<void> {
    loading.value = true;
    try {
        const { data } = await axios.get<{ success: boolean; data: TISStats }>('/api/admin/tis/stats');
        if (data.success && data.data) {
            stats.value = data.data.nodes || [];
            totals.value = data.data.totals || totals.value;
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to fetch TIS statistics';
        toast.error(errorMessage);
    } finally {
        loading.value = false;
    }
}

async function fetchHashes(): Promise<void> {
    try {
        const { data } = await axios.get<{ success: boolean; data: HashRecord[] }>('/api/admin/tis/hashes');
        if (data.success && data.data) {
            hashes.value = data.data || [];
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to fetch hashes';
        toast.error(errorMessage);
    }
}

async function checkHashes(): Promise<void> {
    if (!hashCheckInput.value.trim()) {
        toast.error('Please enter at least one hash');
        return;
    }

    checkingHashes.value = true;
    hashCheckResults.value = [];

    try {
        const hashLines = hashCheckInput.value
            .split('\n')
            .map((h) => h.trim())
            .filter((h) => h.length > 0);

        if (hashLines.length > 1000) {
            toast.error('Maximum 1000 hashes per request');
            checkingHashes.value = false;
            return;
        }

        const { data } = await axios.post<{
            success: boolean;
            data: {
                matches: Array<{ hash: string; details: HashRecord }>;
                totalChecked: number;
            };
        }>('/api/admin/tis/check/hashes', {
            hashes: hashLines,
        });

        if (data.success && data.data) {
            const foundHashes = new Set(data.data.matches.map((m) => m.hash));
            hashCheckResults.value = hashLines.map((hash) => ({
                hash,
                found: foundHashes.has(hash),
                details: data.data.matches.find((m) => m.hash === hash)?.details,
            }));
            toast.success(`Checked ${hashLines.length} hashes, found ${data.data.matches.length} matches`);
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to check hashes';
        toast.error(errorMessage);
    } finally {
        checkingHashes.value = false;
    }
}

function selectServer() {
    serverModal.openModal();
}

function confirmServerSelection() {
    const server = serverModal.confirmSelection();
    if (server) {
        selectedServer.value = {
            uuid: server.uuid,
            name: server.name,
            node: server.node,
        };
    }
}

function clearServerSelection() {
    selectedServer.value = null;
    serverCheckResults.value = null;
}

async function checkServerStatus(): Promise<void> {
    if (!selectedServer.value || !selectedServer.value.node?.id) {
        toast.error('Please select a server');
        return;
    }

    checkingServer.value = true;
    serverCheckResults.value = null;

    try {
        const { data } = await axios.get<{
            success: boolean;
            data: Record<string, boolean>;
        }>(`/api/admin/tis/servers/${selectedServer.value.uuid}`, {
            params: {
                node_id: selectedServer.value.node.id,
            },
        });

        if (data.success && data.data) {
            serverCheckResults.value = {
                flagged: Object.values(data.data)[0] === true,
                details: data.data,
            };
            if (serverCheckResults.value.flagged) {
                toast.warning('Server is flagged in TIS');
            } else {
                toast.success('Server is not flagged');
            }
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to check server status';
        toast.error(errorMessage);
    } finally {
        checkingServer.value = false;
    }
}

onMounted(() => {
    void fetchStats();
    void fetchHashes();
});
</script>

<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading TIS statistics...</span>
                </div>
            </div>

            <!-- TIS Dashboard -->
            <div v-else class="space-y-6 p-6">
                <!-- Hero Section -->
                <div
                    class="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-8 shadow-xl shadow-primary/10"
                >
                    <div class="absolute inset-0 pointer-events-none">
                        <div
                            class="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent"
                        ></div>
                    </div>
                    <div class="relative z-10">
                        <div class="flex items-center gap-4 mb-6">
                            <div class="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                                <ShieldCheck class="h-10 w-10 text-primary" />
                            </div>
                            <div class="flex-1">
                                <Badge variant="secondary" class="mb-2 border-primary/30 bg-primary/10 text-primary">
                                    Thread Intelligence Server
                                </Badge>
                                <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">TIS Dashboard</h1>
                                <p class="text-muted-foreground mt-2">
                                    Real-time threat intelligence and malicious file hash tracking across your
                                    infrastructure
                                </p>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-3 mt-6">
                            <Dialog v-model:open="hashCheckDialogOpen">
                                <DialogTrigger as-child>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        class="hover:scale-105 hover:shadow-md transition-all duration-200"
                                        title="Check file hashes against threat intelligence"
                                    >
                                        <Search class="mr-2 h-4 w-4" />
                                        Check Hashes
                                    </Button>
                                </DialogTrigger>
                                <DialogContent class="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Check Hashes Against TIS</DialogTitle>
                                        <DialogDescription>
                                            Enter SHA-256 hashes (one per line, max 1000) to check against the confirmed
                                            malicious hash database
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div class="space-y-4">
                                        <div>
                                            <Label for="hashes">Hashes (SHA-256, one per line)</Label>
                                            <textarea
                                                id="hashes"
                                                v-model="hashCheckInput"
                                                class="w-full min-h-[200px] px-3 py-2 rounded-md border border-border bg-background font-mono text-sm"
                                                placeholder="Enter hashes here, one per line..."
                                            />
                                        </div>
                                        <Button
                                            class="hover:scale-105 hover:shadow-md transition-all duration-200"
                                            :loading="checkingHashes"
                                            title="Check entered hashes"
                                            @click="checkHashes"
                                        >
                                            Check Hashes
                                        </Button>
                                        <div
                                            v-if="hashCheckResults.length > 0"
                                            class="space-y-2 max-h-[300px] overflow-y-auto"
                                        >
                                            <div
                                                v-for="(result, index) in hashCheckResults"
                                                :key="index"
                                                class="p-3 rounded-lg border"
                                                :class="
                                                    result.found
                                                        ? 'border-destructive/50 bg-destructive/5'
                                                        : 'border-border'
                                                "
                                            >
                                                <div class="flex items-center justify-between">
                                                    <code class="text-xs font-mono">{{ result.hash }}</code>
                                                    <Badge :variant="result.found ? 'destructive' : 'default'">
                                                        {{ result.found ? 'Found' : 'Not Found' }}
                                                    </Badge>
                                                </div>
                                                <div
                                                    v-if="result.found && result.details"
                                                    class="mt-2 text-xs text-muted-foreground"
                                                >
                                                    <div>File: {{ result.details.file_name }}</div>
                                                    <div>Type: {{ result.details.detection_type }}</div>
                                                    <div>Detected: {{ result.details.times_detected }} times</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Dialog v-model:open="serverCheckDialogOpen">
                                <DialogTrigger as-child>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        class="hover:scale-105 hover:shadow-md transition-all duration-200"
                                        title="Check server status in threat intelligence system"
                                    >
                                        <ShieldCheck class="mr-2 h-4 w-4" />
                                        Check Server Status
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Check Server Status in TIS</DialogTitle>
                                        <DialogDescription>
                                            Check if a server has been flagged for submitting malicious hashes
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div class="space-y-4">
                                        <div>
                                            <Label>Server</Label>
                                            <div
                                                v-if="selectedServer"
                                                class="mt-2 p-3 rounded-lg border border-border bg-muted/50"
                                            >
                                                <div class="flex items-center justify-between">
                                                    <div>
                                                        <div class="font-medium">{{ selectedServer.name }}</div>
                                                        <div class="text-sm text-muted-foreground">
                                                            <code class="text-xs">{{ selectedServer.uuid }}</code>
                                                            <span v-if="selectedServer.node" class="ml-2">
                                                                · {{ selectedServer.node.name }}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                                        title="Clear server selection"
                                                        @click="clearServerSelection"
                                                    >
                                                        <X class="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <Button
                                                v-else
                                                variant="outline"
                                                class="w-full mt-2 hover:scale-105 hover:shadow-md transition-all duration-200"
                                                title="Select a server to check"
                                                @click="selectServer"
                                            >
                                                <Server class="mr-2 h-4 w-4" />
                                                Select Server
                                            </Button>
                                        </div>
                                        <Button
                                            class="w-full hover:scale-105 hover:shadow-md transition-all duration-200"
                                            :loading="checkingServer"
                                            :disabled="!selectedServer || !selectedServer.node?.id"
                                            title="Check selected server status"
                                            @click="checkServerStatus"
                                        >
                                            Check Server Status
                                        </Button>
                                        <div
                                            v-if="serverCheckResults"
                                            class="p-4 rounded-lg border"
                                            :class="
                                                serverCheckResults.flagged
                                                    ? 'border-destructive/50 bg-destructive/5'
                                                    : 'border-green-500/50 bg-green-500/5'
                                            "
                                        >
                                            <div class="flex items-center gap-2 mb-2">
                                                <component
                                                    :is="serverCheckResults.flagged ? XCircle : CheckCircle"
                                                    class="h-5 w-5"
                                                    :class="
                                                        serverCheckResults.flagged
                                                            ? 'text-destructive'
                                                            : 'text-green-500'
                                                    "
                                                />
                                                <span class="font-semibold">{{
                                                    serverCheckResults.flagged
                                                        ? 'Server is Flagged'
                                                        : 'Server is Not Flagged'
                                                }}</span>
                                            </div>
                                            <div
                                                v-if="serverCheckResults.details"
                                                class="text-sm text-muted-foreground"
                                            >
                                                <pre class="text-xs">{{
                                                    JSON.stringify(serverCheckResults.details, null, 2)
                                                }}</pre>
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>

                <!-- Server Selection Modal -->
                <SelectionModal
                    :is-open="serverModal.state.value.isOpen"
                    title="Select Server"
                    description="Choose a server to check its TIS status"
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
                                <CheckCircle class="h-5 w-5 text-primary" />
                            </div>
                        </div>
                    </template>
                </SelectionModal>

                <!-- Statistics Cards -->
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card
                        class="group relative overflow-hidden border border-border/70 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                    >
                        <div
                            class="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-blue-500/60 via-blue-500/20 to-transparent"
                        />
                        <CardHeader class="pb-3">
                            <div class="flex items-center justify-between">
                                <CardTitle class="text-sm font-medium text-muted-foreground">Total Hashes</CardTitle>
                                <Database class="h-5 w-5 text-blue-500/60" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div class="text-3xl font-bold">{{ totals.totalHashes.toLocaleString() }}</div>
                            <p class="text-xs text-muted-foreground mt-1">Confirmed malicious files</p>
                        </CardContent>
                    </Card>

                    <Card
                        class="group relative overflow-hidden border border-border/70 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                    >
                        <div
                            class="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-green-500/60 via-green-500/20 to-transparent"
                        />
                        <CardHeader class="pb-3">
                            <div class="flex items-center justify-between">
                                <CardTitle class="text-sm font-medium text-muted-foreground">Total Servers</CardTitle>
                                <Server class="h-5 w-5 text-green-500/60" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div class="text-3xl font-bold">{{ totals.totalServers.toLocaleString() }}</div>
                            <p class="text-xs text-muted-foreground mt-1">Monitored servers</p>
                        </CardContent>
                    </Card>

                    <Card
                        class="group relative overflow-hidden border border-border/70 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                    >
                        <div
                            class="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-orange-500/60 via-orange-500/20 to-transparent"
                        />
                        <CardHeader class="pb-3">
                            <div class="flex items-center justify-between">
                                <CardTitle class="text-sm font-medium text-muted-foreground"
                                    >Unconfirmed Hashes</CardTitle
                                >
                                <AlertTriangle class="h-5 w-5 text-orange-500/60" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div class="text-3xl font-bold">{{ totals.unconfirmedHashes.toLocaleString() }}</div>
                            <p class="text-xs text-muted-foreground mt-1">Pending verification</p>
                        </CardContent>
                    </Card>

                    <Card
                        class="group relative overflow-hidden border border-border/70 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                    >
                        <div
                            class="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-red-500/60 via-red-500/20 to-transparent"
                        />
                        <CardHeader class="pb-3">
                            <div class="flex items-center justify-between">
                                <CardTitle class="text-sm font-medium text-muted-foreground"
                                    >Recent Detections</CardTitle
                                >
                                <TrendingUp class="h-5 w-5 text-red-500/60" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div class="text-3xl font-bold">{{ totals.recentDetections.toLocaleString() }}</div>
                            <p class="text-xs text-muted-foreground mt-1">Last 24 hours</p>
                        </CardContent>
                    </Card>
                </div>

                <!-- Node Statistics -->
                <Card class="border border-border/70 shadow-lg">
                    <CardHeader>
                        <CardTitle>Node Statistics</CardTitle>
                        <CardDescription>TIS statistics per node across your infrastructure</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TableComponent
                            title="Node Statistics"
                            description="Threat intelligence statistics by node"
                            :columns="nodeStatsColumns"
                            :data="nodeStats as Record<string, unknown>[]"
                            search-placeholder="Search nodes..."
                        />
                    </CardContent>
                </Card>

                <!-- Confirmed Hashes -->
                <Card class="border border-border/70 shadow-lg">
                    <CardHeader>
                        <CardTitle>Confirmed Malicious Hashes</CardTitle>
                        <CardDescription
                            >List of confirmed malicious file hashes detected across your
                            infrastructure</CardDescription
                        >
                    </CardHeader>
                    <CardContent>
                        <TableComponent
                            title="Malicious Hashes"
                            description="Confirmed malicious file hashes"
                            :columns="hashesColumns"
                            :data="hashes as Record<string, unknown>[]"
                            search-placeholder="Search hashes..."
                            :server-side-pagination="false"
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    </DashboardLayout>
</template>
