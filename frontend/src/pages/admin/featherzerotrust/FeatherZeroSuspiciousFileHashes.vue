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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TableComponent from '@/components/ui/feather-table/TableComponent.vue';
import type { TableColumn } from '@/components/ui/feather-table/types';
import { ShieldCheck, Database, AlertTriangle, TrendingUp, Search, Trash2, CheckSquare, Plus } from 'lucide-vue-next';
import axios from 'axios';
import { ref, computed, onMounted, watch } from 'vue';
import { useToast } from 'vue-toastification';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const toast = useToast();

interface HashRecord {
    id: number;
    hash: string;
    file_name: string;
    detection_type: string;
    server_uuid: string | null;
    server_name: string | null;
    node_id: number | null;
    file_path: string | null;
    file_size: number | null;
    times_detected: number;
    confirmed_malicious: 'true' | 'false';
    metadata: Record<string, unknown>;
    first_seen: string;
    last_seen: string;
}

interface HashStats {
    totalHashes: number;
    confirmedHashes: number;
    unconfirmedHashes: number;
    recentDetections: number;
    totalServers: number;
    topDetectionTypes: Array<{ detection_type: string; count: number }>;
}

const loading = ref(true);
const stats = ref<HashStats>({
    totalHashes: 0,
    confirmedHashes: 0,
    unconfirmedHashes: 0,
    recentDetections: 0,
    totalServers: 0,
    topDetectionTypes: [],
});
const hashes = ref<HashRecord[]>([]);
const confirmedOnly = ref(false);
const selectedHashes = ref<Set<string>>(new Set());
const selectAll = ref(false);

// Hash checking
const hashCheckDialogOpen = ref(false);
const hashCheckInput = ref('');
const hashCheckResults = ref<Array<{ hash: string; found: boolean; details?: HashRecord }>>([]);
const checkingHashes = ref(false);

// Add hash dialog
const addHashDialogOpen = ref(false);
const addingHash = ref(false);
const newHash = ref({
    hash: '',
    file_name: '',
    detection_type: 'suspicious',
    confirmed_malicious: false,
    server_uuid: '',
    file_path: '',
    file_size: null as number | null,
});

// Bulk actions
const bulkDeleting = ref(false);
const bulkConfirming = ref(false);

const hashesColumns: TableColumn[] = [
    { key: 'select', label: '', searchable: false },
    { key: 'hash', label: 'Hash', searchable: true },
    { key: 'file_name', label: 'File Name', searchable: true },
    { key: 'detection_type', label: 'Detection Type' },
    { key: 'confirmed_malicious', label: 'Status' },
    { key: 'times_detected', label: 'Times Detected' },
    { key: 'server_name', label: 'Server' },
    { key: 'first_seen', label: 'First Seen' },
    { key: 'last_seen', label: 'Last Seen' },
    { key: 'actions', label: 'Actions' },
];

async function fetchStats(): Promise<void> {
    try {
        const { data } = await axios.get<{ success: boolean; data: HashStats }>(
            '/api/admin/featherzerotrust/hashes/stats',
        );
        if (data.success && data.data) {
            stats.value = data.data;
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to fetch hash statistics';
        toast.error(errorMessage);
    }
}

async function fetchHashes(): Promise<void> {
    loading.value = true;
    try {
        const { data } = await axios.get<{ success: boolean; data: HashRecord[] }>(
            '/api/admin/featherzerotrust/hashes',
            {
                params: {
                    confirmed_only: confirmedOnly.value ? 'true' : 'false',
                },
            },
        );
        if (data.success && data.data) {
            hashes.value = data.data || [];
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to fetch hashes';
        toast.error(errorMessage);
    } finally {
        loading.value = false;
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
                matches: HashRecord[];
                totalChecked: number;
                matchesFound: number;
            };
        }>('/api/admin/featherzerotrust/hashes/check', {
            hashes: hashLines,
            confirmed_only: confirmedOnly.value,
        });

        if (data.success && data.data) {
            const foundHashes = new Set(data.data.matches.map((m) => m.hash));
            hashCheckResults.value = hashLines.map((hash) => ({
                hash,
                found: foundHashes.has(hash),
                details: data.data.matches.find((m) => m.hash === hash),
            }));
            toast.success(`Checked ${hashLines.length} hashes, found ${data.data.matchesFound} matches`);
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

async function confirmHash(hash: string): Promise<void> {
    try {
        const { data } = await axios.put<{ success: boolean }>(`/api/admin/featherzerotrust/hashes/${hash}/confirm`);
        if (data.success) {
            toast.success('Hash confirmed as malicious');
            await fetchHashes();
            await fetchStats();
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to confirm hash';
        toast.error(errorMessage);
    }
}

async function deleteHash(hash: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this hash?')) {
        return;
    }

    try {
        const { data } = await axios.delete<{ success: boolean }>(`/api/admin/featherzerotrust/hashes/${hash}`);
        if (data.success) {
            toast.success('Hash deleted successfully');
            await fetchHashes();
            await fetchStats();
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to delete hash';
        toast.error(errorMessage);
    }
}

const formattedHashes = computed(() => {
    return hashes.value;
});

function toggleHashSelection(hash: string): void {
    if (selectedHashes.value.has(hash)) {
        selectedHashes.value.delete(hash);
    } else {
        selectedHashes.value.add(hash);
    }
    selectAll.value = selectedHashes.value.size === hashes.value.length && hashes.value.length > 0;
}

function toggleSelectAll(): void {
    if (selectAll.value) {
        selectedHashes.value.clear();
    } else {
        selectedHashes.value = new Set(hashes.value.map((h) => h.hash));
    }
    selectAll.value = !selectAll.value;
}

watch(hashes, () => {
    selectAll.value = false;
    selectedHashes.value.clear();
});

async function addHash(): Promise<void> {
    if (!newHash.value.hash.trim() || !newHash.value.file_name.trim()) {
        toast.error('Hash and file name are required');
        return;
    }

    // Validate hash format (SHA-256 should be 64 hex characters)
    if (!/^[a-f0-9]{64}$/i.test(newHash.value.hash.trim())) {
        toast.error('Invalid hash format. Must be a valid SHA-256 hash (64 hexadecimal characters)');
        return;
    }

    addingHash.value = true;
    try {
        const { data } = await axios.post<{ success: boolean }>('/api/admin/featherzerotrust/hashes', {
            hash: newHash.value.hash.trim(),
            file_name: newHash.value.file_name.trim(),
            detection_type: newHash.value.detection_type,
            confirmed_malicious: newHash.value.confirmed_malicious,
            server_uuid: newHash.value.server_uuid || null,
            file_path: newHash.value.file_path || null,
            file_size: newHash.value.file_size || null,
        });

        if (data.success) {
            toast.success('Hash added successfully');
            addHashDialogOpen.value = false;
            // Reset form
            newHash.value = {
                hash: '',
                file_name: '',
                detection_type: 'suspicious',
                confirmed_malicious: false,
                server_uuid: '',
                file_path: '',
                file_size: null,
            };
            await fetchHashes();
            await fetchStats();
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add hash';
        toast.error(errorMessage);
    } finally {
        addingHash.value = false;
    }
}

async function bulkConfirmHashes(): Promise<void> {
    if (selectedHashes.value.size === 0) {
        toast.error('Please select at least one hash');
        return;
    }

    if (!confirm(`Are you sure you want to confirm ${selectedHashes.value.size} hash(es) as malicious?`)) {
        return;
    }

    bulkConfirming.value = true;
    try {
        const { data } = await axios.post<{
            success: boolean;
            data: { confirmed: number; failed: string[]; total: number };
        }>('/api/admin/featherzerotrust/hashes/bulk/confirm', {
            hashes: Array.from(selectedHashes.value),
        });

        if (data.success && data.data) {
            toast.success(`Confirmed ${data.data.confirmed} out of ${data.data.total} hash(es)`);
            selectedHashes.value.clear();
            selectAll.value = false;
            await fetchHashes();
            await fetchStats();
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to confirm hashes';
        toast.error(errorMessage);
    } finally {
        bulkConfirming.value = false;
    }
}

async function bulkDeleteHashes(): Promise<void> {
    if (selectedHashes.value.size === 0) {
        toast.error('Please select at least one hash');
        return;
    }

    if (
        !confirm(`Are you sure you want to delete ${selectedHashes.value.size} hash(es)? This action cannot be undone.`)
    ) {
        return;
    }

    bulkDeleting.value = true;
    try {
        const { data } = await axios.post<{
            success: boolean;
            data: { deleted: number; failed: string[]; total: number };
        }>('/api/admin/featherzerotrust/hashes/bulk/delete', {
            hashes: Array.from(selectedHashes.value),
        });

        if (data.success && data.data) {
            toast.success(`Deleted ${data.data.deleted} out of ${data.data.total} hash(es)`);
            selectedHashes.value.clear();
            selectAll.value = false;
            await fetchHashes();
            await fetchStats();
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to delete hashes';
        toast.error(errorMessage);
    } finally {
        bulkDeleting.value = false;
    }
}

onMounted(() => {
    void fetchStats();
    void fetchHashes();
});
</script>

<template>
    <div class="space-y-6 p-6">
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="flex items-center gap-3">
                <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                <span class="text-muted-foreground">Loading suspicious file hashes...</span>
            </div>
        </div>

        <!-- Hash Dashboard -->
        <div v-else class="space-y-6">
            <!-- Action Bar -->
            <div class="flex flex-wrap items-center justify-between gap-4">
                <Dialog v-model:open="addHashDialogOpen">
                    <DialogTrigger as-child>
                        <Button
                            variant="default"
                            size="lg"
                            class="transition-all duration-300 hover:scale-105 hover:shadow-lg"
                            title="Add a new hash manually"
                        >
                            <Plus class="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                            Add Hash
                        </Button>
                    </DialogTrigger>
                    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add Suspicious File Hash</DialogTitle>
                            <DialogDescription> Manually add a suspicious file hash to the database </DialogDescription>
                        </DialogHeader>
                        <div class="space-y-4">
                            <div>
                                <Label for="new-hash">Hash (SHA-256) <span class="text-destructive">*</span></Label>
                                <Input
                                    id="new-hash"
                                    v-model="newHash.hash"
                                    placeholder="Enter 64-character SHA-256 hash"
                                    class="font-mono"
                                    maxlength="64"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    Must be a valid SHA-256 hash (64 hexadecimal characters)
                                </p>
                            </div>
                            <div>
                                <Label for="new-file-name">File Name <span class="text-destructive">*</span></Label>
                                <Input
                                    id="new-file-name"
                                    v-model="newHash.file_name"
                                    placeholder="e.g., malicious.exe"
                                />
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <Label for="new-detection-type"
                                        >Detection Type <span class="text-destructive">*</span></Label
                                    >
                                    <Select v-model="newHash.detection_type">
                                        <SelectTrigger id="new-detection-type">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="suspicious">Suspicious</SelectItem>
                                            <SelectItem value="trojan">Trojan</SelectItem>
                                            <SelectItem value="virus">Virus</SelectItem>
                                            <SelectItem value="known_malicious">Known Malicious</SelectItem>
                                            <SelectItem value="malware">Malware</SelectItem>
                                            <SelectItem value="ransomware">Ransomware</SelectItem>
                                            <SelectItem value="backdoor">Backdoor</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label for="new-file-size">File Size (bytes)</Label>
                                    <Input
                                        id="new-file-size"
                                        :model-value="newHash.file_size?.toString() ?? ''"
                                        type="number"
                                        placeholder="Optional"
                                        @update:model-value="
                                            (val: string | number | undefined) =>
                                                (newHash.file_size = val && val !== '' ? Number(val) : null)
                                        "
                                    />
                                </div>
                            </div>
                            <div>
                                <Label for="new-file-path">File Path</Label>
                                <Input
                                    id="new-file-path"
                                    v-model="newHash.file_path"
                                    placeholder="e.g., /path/to/file.exe"
                                />
                            </div>
                            <div>
                                <Label for="new-server-uuid">Server UUID</Label>
                                <Input
                                    id="new-server-uuid"
                                    v-model="newHash.server_uuid"
                                    placeholder="Optional - Server UUID where hash was detected"
                                />
                            </div>
                            <div class="flex items-center gap-2">
                                <Checkbox
                                    id="new-confirmed"
                                    :checked="newHash.confirmed_malicious"
                                    @update:checked="
                                        (val: boolean | 'indeterminate') => (newHash.confirmed_malicious = val === true)
                                    "
                                />
                                <Label for="new-confirmed" class="cursor-pointer"> Mark as confirmed malicious </Label>
                            </div>
                            <div class="flex gap-2 pt-4">
                                <Button variant="outline" class="flex-1" @click="addHashDialogOpen = false">
                                    Cancel
                                </Button>
                                <Button
                                    class="flex-1 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                                    :loading="addingHash"
                                    @click="addHash"
                                >
                                    <Plus class="mr-2 h-4 w-4" />
                                    Add Hash
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog v-model:open="hashCheckDialogOpen">
                    <DialogTrigger as-child>
                        <Button
                            variant="outline"
                            size="lg"
                            class="transition-all duration-300 hover:scale-105 hover:shadow-lg"
                            title="Check file hashes against threat database"
                        >
                            <Search class="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
                            Check Hashes
                        </Button>
                    </DialogTrigger>
                    <DialogContent class="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Check Hashes Against Database</DialogTitle>
                            <DialogDescription>
                                Enter SHA-256 hashes (one per line, max 1000) to check against the suspicious file hash
                                database
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
                                class="w-full transition-all duration-300 hover:scale-105 hover:shadow-lg"
                                :loading="checkingHashes"
                                title="Check entered hashes"
                                @click="checkHashes"
                            >
                                <Search class="mr-2 h-4 w-4" />
                                Check Hashes
                            </Button>
                            <div v-if="hashCheckResults.length > 0" class="space-y-2 max-h-[300px] overflow-y-auto">
                                <div
                                    v-for="(result, index) in hashCheckResults"
                                    :key="index"
                                    class="p-3 rounded-lg border"
                                    :class="result.found ? 'border-destructive/50 bg-destructive/5' : 'border-border'"
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
            </div>
        </div>

        <!-- Statistics Cards -->

        <!-- Statistics Cards -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card
                class="group relative overflow-hidden border border-border/70 transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-blue-500/50"
            >
                <div
                    class="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-blue-500/60 via-blue-500/20 to-transparent"
                />
                <CardHeader class="pb-3">
                    <div class="flex items-center justify-between">
                        <CardTitle class="text-sm font-medium text-muted-foreground">Total Hashes</CardTitle>
                        <Database
                            class="h-5 w-5 text-blue-500/60 transition-transform duration-300 group-hover:rotate-12"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div class="text-3xl font-bold transition-all duration-300 group-hover:text-blue-500">
                        {{ stats.totalHashes.toLocaleString() }}
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">All suspicious file hashes</p>
                </CardContent>
            </Card>

            <Card
                class="group relative overflow-hidden border border-green-500/50 bg-green-500/5 transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-green-500/70"
            >
                <div
                    class="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-green-500/60 via-green-500/20 to-transparent"
                />
                <CardHeader class="pb-3">
                    <div class="flex items-center justify-between">
                        <CardTitle class="text-sm font-medium text-muted-foreground">Confirmed Malicious</CardTitle>
                        <ShieldCheck
                            class="h-5 w-5 text-green-500/60 transition-transform duration-300 group-hover:scale-110"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div
                        class="text-3xl font-bold text-green-600 dark:text-green-400 transition-all duration-300 group-hover:scale-110"
                    >
                        {{ stats.confirmedHashes.toLocaleString() }}
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">Verified threats</p>
                </CardContent>
            </Card>

            <Card
                class="group relative overflow-hidden border border-orange-500/50 bg-orange-500/5 transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-orange-500/70"
            >
                <div
                    class="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-orange-500/60 via-orange-500/20 to-transparent"
                />
                <CardHeader class="pb-3">
                    <div class="flex items-center justify-between">
                        <CardTitle class="text-sm font-medium text-muted-foreground">Unconfirmed Hashes</CardTitle>
                        <AlertTriangle
                            class="h-5 w-5 text-orange-500/60 transition-transform duration-300 group-hover:scale-125 group-hover:animate-bounce"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div class="text-3xl font-bold transition-all duration-300 group-hover:text-orange-500">
                        {{ stats.unconfirmedHashes.toLocaleString() }}
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">Pending verification</p>
                </CardContent>
            </Card>

            <Card
                class="group relative overflow-hidden border border-red-500/50 bg-red-500/5 transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-red-500/70 animate-pulse"
            >
                <div
                    class="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-red-500/60 via-red-500/20 to-transparent"
                />
                <CardHeader class="pb-3">
                    <div class="flex items-center justify-between">
                        <CardTitle class="text-sm font-medium text-muted-foreground">Recent Detections</CardTitle>
                        <TrendingUp
                            class="h-5 w-5 text-red-500/60 transition-transform duration-300 group-hover:scale-110"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div
                        class="text-3xl font-bold text-red-600 dark:text-red-400 transition-all duration-300 group-hover:scale-110"
                    >
                        {{ stats.recentDetections.toLocaleString() }}
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">Last 24 hours</p>
                </CardContent>
            </Card>
        </div>

        <!-- Hashes Table -->
        <Card class="border border-border/70 shadow-lg transition-all duration-300 hover:shadow-xl">
            <CardHeader>
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-2 mb-2">
                            <Database class="h-5 w-5 text-primary" />
                            <CardTitle class="text-xl">Suspicious File Hashes</CardTitle>
                            <Badge v-if="selectedHashes.size > 0" variant="secondary" class="ml-2 animate-pulse">
                                {{ selectedHashes.size }} selected
                            </Badge>
                        </div>
                        <CardDescription
                            >List of suspicious file hashes detected across your infrastructure</CardDescription
                        >
                    </div>
                    <div class="flex items-center gap-3 flex-wrap">
                        <div class="flex items-center gap-2">
                            <Switch v-model:checked="confirmedOnly" @update:checked="fetchHashes" />
                            <Label class="text-sm">Confirmed Only</Label>
                        </div>
                        <div
                            v-if="selectedHashes.size > 0"
                            class="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-lg"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                :loading="bulkConfirming"
                                class="transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400"
                                @click="bulkConfirmHashes"
                            >
                                <CheckSquare class="mr-2 h-4 w-4" />
                                Confirm ({{ selectedHashes.size }})
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                :loading="bulkDeleting"
                                class="transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-destructive/10 hover:text-destructive"
                                @click="bulkDeleteHashes"
                            >
                                <Trash2 class="mr-2 h-4 w-4" />
                                Delete ({{ selectedHashes.size }})
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                @click="
                                    () => {
                                        selectedHashes.clear();
                                        selectAll = false;
                                    }
                                "
                            >
                                Clear
                            </Button>
                        </div>
                        <Button
                            variant="outline"
                            class="transition-all duration-300 hover:scale-105 hover:shadow-md"
                            @click="fetchHashes"
                        >
                            <Database class="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <TableComponent
                    title="Suspicious File Hashes"
                    description="Detected suspicious file hashes from security scans"
                    :columns="hashesColumns"
                    :data="formattedHashes as Record<string, unknown>[]"
                    search-placeholder="Search hashes, file names, or detection types..."
                    :server-side-pagination="false"
                >
                    <template #cell-select="{ item }">
                        <Checkbox
                            :checked="selectedHashes.has((item as unknown as HashRecord).hash)"
                            @update:checked="() => toggleHashSelection((item as unknown as HashRecord).hash)"
                        />
                    </template>
                    <template #header-select>
                        <Checkbox :checked="selectAll" @update:checked="toggleSelectAll" />
                    </template>
                    <template #cell-confirmed_malicious="{ item }">
                        <Badge
                            :variant="
                                (item as unknown as HashRecord).confirmed_malicious === 'true'
                                    ? 'destructive'
                                    : 'secondary'
                            "
                            class="capitalize"
                        >
                            {{
                                (item as unknown as HashRecord).confirmed_malicious === 'true'
                                    ? 'Confirmed Malicious'
                                    : 'Unconfirmed'
                            }}
                        </Badge>
                    </template>
                    <template #cell-actions="{ item }">
                        <div class="flex items-center gap-2">
                            <Button
                                v-if="(item as unknown as HashRecord).confirmed_malicious === 'false'"
                                variant="ghost"
                                size="sm"
                                class="transition-all duration-300 hover:scale-110 hover:shadow-md hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400"
                                title="Confirm as malicious"
                                @click="confirmHash((item as unknown as HashRecord).hash)"
                            >
                                <CheckSquare class="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                class="transition-all duration-300 hover:scale-110 hover:shadow-md hover:bg-destructive/10 hover:text-destructive"
                                title="Delete hash"
                                @click="deleteHash((item as unknown as HashRecord).hash)"
                            >
                                <Trash2 class="h-4 w-4" />
                            </Button>
                        </div>
                    </template>
                    <template #cell-hash="{ item }">
                        <code class="text-xs font-mono bg-muted/50 px-2 py-1 rounded border border-border">
                            {{ (item as unknown as HashRecord).hash }}
                        </code>
                    </template>
                    <template #cell-file_name="{ item }">
                        <div class="font-medium">{{ (item as unknown as HashRecord).file_name }}</div>
                        <div
                            v-if="(item as unknown as HashRecord).file_path"
                            class="text-xs text-muted-foreground truncate max-w-xs"
                        >
                            {{ (item as unknown as HashRecord).file_path }}
                        </div>
                    </template>
                    <template #cell-detection_type="{ item }">
                        <Badge
                            variant="outline"
                            class="capitalize"
                            :class="{
                                'border-destructive/50 text-destructive bg-destructive/10':
                                    (item as unknown as HashRecord).detection_type === 'trojan' ||
                                    (item as unknown as HashRecord).detection_type === 'virus',
                                'border-orange-500/50 text-orange-600 bg-orange-500/10':
                                    (item as unknown as HashRecord).detection_type === 'suspicious',
                                'border-yellow-500/50 text-yellow-600 bg-yellow-500/10':
                                    (item as unknown as HashRecord).detection_type === 'known_malicious',
                            }"
                        >
                            {{ (item as unknown as HashRecord).detection_type }}
                        </Badge>
                    </template>
                </TableComponent>
            </CardContent>
        </Card>
    </div>
</template>
