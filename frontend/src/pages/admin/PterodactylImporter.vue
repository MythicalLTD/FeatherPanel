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

import { ref, reactive, onMounted, computed } from 'vue';
import { useToast } from 'vue-toastification';
import axios from 'axios';
import DashboardLayout, { type BreadcrumbEntry } from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Database, FileText, AlertTriangle, CheckCircle, Loader2, XCircle, RefreshCw } from 'lucide-vue-next';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const toast = useToast();

const breadcrumbs: BreadcrumbEntry[] = [
    { text: 'Dashboard', href: '/admin' },
    {
        text: 'Pterodactyl Importer',
        href: '/admin/pterodactyl-importer',
        isCurrent: true,
    },
];

const sqlDumpFile = ref<File | null>(null);
const envFile = ref<File | null>(null);
const isUploading = ref(false);
const uploadProgress = ref(0);
const isCheckingPrerequisites = ref(false);
const showConfirmDialog = ref(false);

interface PrerequisitesCheck {
    users_count: number;
    nodes_count: number;
    locations_count: number;
    realms_count: number;
    spells_count: number;
    servers_count: number;
    databases_count: number;
    allocations_count: number;
    panel_clean: boolean;
}

const prerequisites = ref<PrerequisitesCheck | null>(null);

const form = reactive({
    sqlDump: null as File | null,
    env: null as File | null,
});

const prerequisitesPassed = computed(() => {
    if (!prerequisites.value) return false;
    return (
        prerequisites.value.users_count <= 1 &&
        prerequisites.value.nodes_count === 0 &&
        prerequisites.value.locations_count === 0 &&
        prerequisites.value.realms_count === 0 &&
        prerequisites.value.spells_count === 0 &&
        prerequisites.value.servers_count === 0 &&
        prerequisites.value.databases_count === 0 &&
        prerequisites.value.allocations_count === 0 &&
        prerequisites.value.panel_clean
    );
});

async function fetchPrerequisites(): Promise<void> {
    isCheckingPrerequisites.value = true;
    try {
        const response = await axios.get<{ success: boolean; data: PrerequisitesCheck }>(
            '/api/admin/pterodactyl-importer/prerequisites',
        );
        if (response.data && response.data.success) {
            prerequisites.value = response.data.data;
        } else {
            toast.error('Failed to check prerequisites');
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to check prerequisites';
        toast.error(errorMessage);
    } finally {
        isCheckingPrerequisites.value = false;
    }
}

function handleSqlDumpSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
        sqlDumpFile.value = input.files[0];
        form.sqlDump = input.files[0];
    }
}

function handleEnvSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
        envFile.value = input.files[0];
        form.env = input.files[0];
    }
}

function handleImportClick(): void {
    if (!form.sqlDump) {
        toast.error('Please upload an SQL dump file (.sql)');
        return;
    }

    if (!form.env) {
        toast.error('Please upload a .env configuration file');
        return;
    }

    if (!prerequisitesPassed.value) {
        toast.error('Please ensure all prerequisites are met before importing');
        return;
    }

    // Show confirmation dialog
    showConfirmDialog.value = true;
}

async function handleImport(): Promise<void> {
    if (!form.sqlDump) {
        toast.error('Please upload an SQL dump file (.sql)');
        showConfirmDialog.value = false;
        return;
    }

    if (!form.env) {
        toast.error('Please upload a .env configuration file');
        showConfirmDialog.value = false;
        return;
    }

    if (!prerequisitesPassed.value) {
        toast.error('Please ensure all prerequisites are met before importing');
        showConfirmDialog.value = false;
        return;
    }

    showConfirmDialog.value = false;
    isUploading.value = true;
    uploadProgress.value = 0;

    try {
        const formData = new FormData();
        formData.append('sql_dump', form.sqlDump);
        formData.append('env_file', form.env);

        const response = await axios.post('/api/admin/pterodactyl-importer/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total) {
                    uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                }
            },
        });

        if (response.data && response.data.success) {
            toast.success('Pterodactyl data imported successfully!');
            // Reset form
            sqlDumpFile.value = null;
            envFile.value = null;
            form.sqlDump = null;
            form.env = null;
            uploadProgress.value = 0;
            // Reset file inputs
            if (typeof window !== 'undefined') {
                const sqlInput = document.getElementById('sql-dump') as HTMLInputElement;
                const envInput = document.getElementById('env-file') as HTMLInputElement;
                if (sqlInput) sqlInput.value = '';
                if (envInput) envInput.value = '';
            }
            // Refresh prerequisites after import
            await fetchPrerequisites();
        } else {
            toast.error(response.data?.message || 'Failed to import Pterodactyl data');
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to import Pterodactyl data';
        toast.error(errorMessage);
    } finally {
        isUploading.value = false;
        uploadProgress.value = 0;
    }
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function clearFiles(): void {
    sqlDumpFile.value = null;
    envFile.value = null;
    form.sqlDump = null;
    form.env = null;
    // Reset file inputs via DOM (file inputs require direct DOM manipulation)
    if (typeof window !== 'undefined') {
        const sqlInput = document.getElementById('sql-dump') as HTMLInputElement;
        const envInput = document.getElementById('env-file') as HTMLInputElement;
        if (sqlInput) sqlInput.value = '';
        if (envInput) envInput.value = '';
    }
}

onMounted(() => {
    void fetchPrerequisites();
});
</script>

<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen space-y-10 pb-12">
            <!-- Hero Section -->
            <section
                class="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 sm:p-10 shadow-xl shadow-primary/10"
            >
                <div class="absolute inset-0 pointer-events-none">
                    <div class="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent"></div>
                </div>
                <div class="relative z-10">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                            <Database class="h-10 w-10 text-primary" />
                        </div>
                        <div class="flex-1">
                            <Badge variant="secondary" class="mb-3 border-primary/30 bg-primary/10 text-primary">
                                Data Migration
                            </Badge>
                            <h1 class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                                Pterodactyl Importer
                            </h1>
                            <p class="max-w-2xl text-base text-muted-foreground sm:text-lg mt-2">
                                Import Pterodactyl data inside FeatherPanel. Upload your SQL dump and .env file to
                                migrate your existing Pterodactyl installation.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Prerequisites Checklist -->
            <Card class="border border-border/70 shadow-lg">
                <CardHeader>
                    <div class="flex items-center justify-between">
                        <div>
                            <CardTitle>Prerequisites Checklist</CardTitle>
                            <CardDescription>
                                Verify that your panel meets the requirements before importing Pterodactyl data
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="isCheckingPrerequisites"
                            class="gap-2"
                            @click="fetchPrerequisites"
                        >
                            <RefreshCw :class="['h-4 w-4', isCheckingPrerequisites && 'animate-spin']" />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div v-if="isCheckingPrerequisites" class="flex items-center justify-center py-8">
                        <div class="flex items-center gap-3">
                            <Loader2 class="h-5 w-5 animate-spin text-primary" />
                            <span class="text-muted-foreground">Checking prerequisites...</span>
                        </div>
                    </div>
                    <div v-else-if="prerequisites" class="space-y-4">
                        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <!-- Users Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.users_count <= 1
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle v-if="prerequisites.users_count <= 1" class="h-5 w-5 text-green-500" />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Users Count</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.users_count <= 1
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                        "
                                    >
                                        Current: {{ prerequisites.users_count }} user{{
                                            prerequisites.users_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="prerequisites.users_count <= 1" class="block mt-1">
                                            ✓ Must have no more than 1 user
                                        </span>
                                        <span v-else class="block mt-1 font-semibold">
                                            ✗ Must have no more than 1 user
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Nodes Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.nodes_count === 0
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle
                                        v-if="prerequisites.nodes_count === 0"
                                        class="h-5 w-5 text-green-500"
                                    />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Nodes Count</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.nodes_count === 0
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                        "
                                    >
                                        Current: {{ prerequisites.nodes_count }} node{{
                                            prerequisites.nodes_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="prerequisites.nodes_count === 0" class="block mt-1">
                                            ✓ Must have no nodes
                                        </span>
                                        <span v-else class="block mt-1 font-semibold">✗ Must have no nodes</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Locations Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.locations_count === 0
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle
                                        v-if="prerequisites.locations_count === 0"
                                        class="h-5 w-5 text-green-500"
                                    />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Locations Count</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.locations_count === 0
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                        "
                                    >
                                        Current: {{ prerequisites.locations_count }} location{{
                                            prerequisites.locations_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="prerequisites.locations_count === 0" class="block mt-1">
                                            ✓ Must have no locations
                                        </span>
                                        <span v-else class="block mt-1 font-semibold">✗ Must have no locations</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Realms Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.realms_count === 0
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle
                                        v-if="prerequisites.realms_count === 0"
                                        class="h-5 w-5 text-green-500"
                                    />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Realms Count</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.realms_count === 0
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                        "
                                    >
                                        Current: {{ prerequisites.realms_count }} realm{{
                                            prerequisites.realms_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="prerequisites.realms_count === 0" class="block mt-1">
                                            ✓ Must have no realms
                                        </span>
                                        <span v-else class="block mt-1 font-semibold">✗ Must have no realms</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Spells Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.spells_count === 0
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle
                                        v-if="prerequisites.spells_count === 0"
                                        class="h-5 w-5 text-green-500"
                                    />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Spells Count</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.spells_count === 0
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                        "
                                    >
                                        Current: {{ prerequisites.spells_count }} spell{{
                                            prerequisites.spells_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="prerequisites.spells_count === 0" class="block mt-1">
                                            ✓ Must have no spells
                                        </span>
                                        <span v-else class="block mt-1 font-semibold">✗ Must have no spells</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Servers Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.servers_count === 0
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle
                                        v-if="prerequisites.servers_count === 0"
                                        class="h-5 w-5 text-green-500"
                                    />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Servers Count</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.servers_count === 0
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                        "
                                    >
                                        Current: {{ prerequisites.servers_count }} server{{
                                            prerequisites.servers_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="prerequisites.servers_count === 0" class="block mt-1">
                                            ✓ Must have no servers
                                        </span>
                                        <span v-else class="block mt-1 font-semibold">✗ Must have no servers</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Databases Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.databases_count === 0
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle
                                        v-if="prerequisites.databases_count === 0"
                                        class="h-5 w-5 text-green-500"
                                    />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Databases Count</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.databases_count === 0
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                        "
                                    >
                                        Current: {{ prerequisites.databases_count }} database{{
                                            prerequisites.databases_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="prerequisites.databases_count === 0" class="block mt-1">
                                            ✓ Must have no databases
                                        </span>
                                        <span v-else class="block mt-1 font-semibold">✗ Must have no databases</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Allocations Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.allocations_count === 0
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle
                                        v-if="prerequisites.allocations_count === 0"
                                        class="h-5 w-5 text-green-500"
                                    />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Allocations Count</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.allocations_count === 0
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                        "
                                    >
                                        Current: {{ prerequisites.allocations_count }} allocation{{
                                            prerequisites.allocations_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="prerequisites.allocations_count === 0" class="block mt-1">
                                            ✓ Must have no allocations
                                        </span>
                                        <span v-else class="block mt-1 font-semibold">✗ Must have no allocations</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Panel Clean Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.panel_clean
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle v-if="prerequisites.panel_clean" class="h-5 w-5 text-green-500" />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Panel Status</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.panel_clean ? 'text-muted-foreground' : 'text-destructive'
                                        "
                                    >
                                        <span v-if="prerequisites.panel_clean" class="block">
                                            ✓ Panel is clean and ready
                                        </span>
                                        <span v-else class="block font-semibold">✗ Panel must be clean</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Overall Status -->
                        <div
                            class="p-4 rounded-lg border"
                            :class="
                                prerequisitesPassed
                                    ? 'bg-green-500/10 border-green-500/30'
                                    : 'bg-amber-500/10 border-amber-500/30'
                            "
                        >
                            <div class="flex items-center gap-3">
                                <CheckCircle v-if="prerequisitesPassed" class="h-5 w-5 text-green-500 shrink-0" />
                                <AlertTriangle v-else class="h-5 w-5 text-amber-500 shrink-0" />
                                <div class="flex-1">
                                    <div
                                        class="font-semibold text-sm mb-1"
                                        :class="
                                            prerequisitesPassed
                                                ? 'text-green-600 dark:text-green-500'
                                                : 'text-amber-600 dark:text-amber-500'
                                        "
                                    >
                                        {{ prerequisitesPassed ? 'All prerequisites met!' : 'Prerequisites not met' }}
                                    </div>
                                    <div class="text-xs text-muted-foreground">
                                        {{
                                            prerequisitesPassed
                                                ? 'Your panel is ready for Pterodactyl data import.'
                                                : 'Please ensure all checks above pass before proceeding with the import.'
                                        }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-center py-8 text-muted-foreground">
                        Failed to load prerequisites. Please refresh the page.
                    </div>
                </CardContent>
            </Card>

            <!-- Import Form -->
            <section class="grid gap-6 lg:grid-cols-2">
                <Card class="border border-border/70 shadow-lg">
                    <CardHeader>
                        <div class="flex items-center gap-2">
                            <Database class="h-5 w-5 text-primary" />
                            <CardTitle>SQL Dump File</CardTitle>
                        </div>
                        <CardDescription>
                            Upload your Pterodactyl database SQL dump file (.sql) to import users, servers, and other
                            data.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div class="space-y-2">
                            <Label for="sql-dump">SQL Dump File <span class="text-destructive">*</span></Label>
                            <Input
                                id="sql-dump"
                                type="file"
                                accept=".sql"
                                :disabled="isUploading"
                                @change="handleSqlDumpSelect"
                            />
                            <p class="text-xs text-muted-foreground">Required: .sql format (SQL dump file)</p>
                        </div>
                        <div v-if="sqlDumpFile" class="p-3 bg-muted/50 rounded-lg border border-border/50">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <FileText class="h-4 w-4 text-primary" />
                                    <span class="text-sm font-medium">{{ sqlDumpFile.name }}</span>
                                </div>
                                <Badge variant="outline" class="text-xs">
                                    {{ formatFileSize(sqlDumpFile.size) }}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card class="border border-border/70 shadow-lg">
                    <CardHeader>
                        <div class="flex items-center gap-2">
                            <FileText class="h-5 w-5 text-primary" />
                            <CardTitle>Environment File (.env)</CardTitle>
                        </div>
                        <CardDescription>
                            Upload your Pterodactyl .env configuration file. Required for database encryption key and
                            other configuration values.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div class="space-y-2">
                            <Label for="env-file">Environment File <span class="text-destructive">*</span></Label>
                            <Input
                                id="env-file"
                                type="file"
                                accept=".env,text/plain"
                                :disabled="isUploading"
                                @change="handleEnvSelect"
                            />
                            <p class="text-xs text-muted-foreground">
                                Required: .env file (contains database encryption key)
                            </p>
                        </div>
                        <div v-if="envFile" class="p-3 bg-muted/50 rounded-lg border border-border/50">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <FileText class="h-4 w-4 text-primary" />
                                    <span class="text-sm font-medium">{{ envFile.name }}</span>
                                </div>
                                <Badge variant="outline" class="text-xs">
                                    {{ formatFileSize(envFile.size) }}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <!-- Information Card -->
            <Card class="border border-amber-500/50 bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent">
                <CardHeader>
                    <div class="flex items-center gap-2">
                        <AlertTriangle class="h-5 w-5 text-amber-500" />
                        <CardTitle class="text-amber-600 dark:text-amber-500">Important Information</CardTitle>
                    </div>
                    <CardDescription>
                        Please read the following information before importing your Pterodactyl data
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-3">
                    <ul class="space-y-2 text-sm text-muted-foreground">
                        <li class="flex items-start gap-2">
                            <CheckCircle class="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>
                                <strong class="text-foreground">Backup First:</strong> Make sure you have a backup of
                                your current FeatherPanel database before importing.
                            </span>
                        </li>
                        <li class="flex items-start gap-2">
                            <CheckCircle class="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>
                                <strong class="text-foreground">SQL Dump:</strong> The SQL dump must be from a
                                Pterodactyl panel database in .sql format. Only uncompressed .sql files are supported.
                            </span>
                        </li>
                        <li class="flex items-start gap-2">
                            <CheckCircle class="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>
                                <strong class="text-foreground">Environment File:</strong> The .env file is
                                <strong class="text-destructive">required</strong> as it contains the database
                                encryption key and other critical configuration values needed to decrypt imported data.
                            </span>
                        </li>
                        <li class="flex items-start gap-2">
                            <CheckCircle class="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>
                                <strong class="text-foreground">Empty Panel:</strong> The panel must be completely empty
                                before importing. All checks above must pass before proceeding.
                            </span>
                        </li>
                        <li class="flex items-start gap-2">
                            <AlertTriangle class="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <span>
                                <strong class="text-foreground">Data Conflicts:</strong> Importing may overwrite
                                existing data. Ensure you've backed up your current installation.
                            </span>
                        </li>
                    </ul>
                    <div class="pt-4 border-t border-amber-500/30">
                        <div class="flex items-start gap-2 mb-2">
                            <AlertTriangle class="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <strong class="text-foreground">Data Not Imported:</strong>
                        </div>
                        <p class="text-sm text-muted-foreground ml-6">
                            To save time and storage, and to reduce unnecessary data, the following items will
                            <strong class="text-foreground">not</strong> be imported:
                        </p>
                        <ul class="mt-2 ml-6 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                            <li>Server activity logs and audit logs</li>
                            <li>API keys and API tokens</li>
                            <li>Activity logs and activity tracking data</li>
                            <li>Temporary session data</li>
                            <li>Cache and queue data</li>
                        </ul>
                        <p class="text-xs text-muted-foreground mt-3 ml-6 italic">
                            This helps ensure a cleaner import process and reduces storage usage for non-essential data.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <!-- Action Section -->
            <Card class="border border-border/70 shadow-lg">
                <CardHeader>
                    <CardTitle>Ready to Import?</CardTitle>
                    <CardDescription>
                        Upload both SQL dump (.sql) and .env files to begin the import process. The .env file is
                        required for database encryption key.
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div v-if="isUploading" class="space-y-2">
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">Uploading files...</span>
                            <span class="font-medium">{{ uploadProgress }}%</span>
                        </div>
                        <div class="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                class="h-full bg-primary transition-all duration-300"
                                :style="{ width: `${uploadProgress}%` }"
                            ></div>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <div class="flex items-center gap-3">
                            <Button
                                size="lg"
                                :disabled="isUploading || !form.sqlDump || !form.env || !prerequisitesPassed"
                                class="gap-2"
                                @click="handleImportClick"
                            >
                                <Loader2 v-if="isUploading" class="h-4 w-4 animate-spin" />
                                <Upload v-else class="h-4 w-4" />
                                {{ isUploading ? 'Importing...' : 'Import Pterodactyl Data' }}
                            </Button>
                            <Button
                                v-if="sqlDumpFile || envFile"
                                variant="outline"
                                size="lg"
                                :disabled="isUploading"
                                @click="clearFiles"
                            >
                                Clear Files
                            </Button>
                        </div>
                        <div
                            v-if="!prerequisitesPassed && prerequisites"
                            class="text-xs text-muted-foreground flex items-center gap-2"
                        >
                            <AlertTriangle class="h-3 w-3 text-amber-500" />
                            <span>All prerequisites must be met before importing</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Confirmation Dialog -->
            <AlertDialog :open="showConfirmDialog" @update:open="showConfirmDialog = $event">
                <AlertDialogContent class="bg-background">
                    <AlertDialogHeader>
                        <AlertDialogTitle class="flex items-center gap-2">
                            <AlertTriangle class="h-5 w-5 text-amber-500" />
                            Confirm Import
                        </AlertDialogTitle>
                        <AlertDialogDescription class="space-y-3 pt-4">
                            <p class="text-base font-semibold text-foreground">
                                Are you absolutely sure you want to import Pterodactyl data?
                            </p>
                            <div class="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
                                <p class="text-sm font-semibold text-destructive">
                                    Warning: This action is irreversible!
                                </p>
                                <ul class="text-sm text-muted-foreground list-disc list-inside space-y-1">
                                    <li>All existing data in your panel will be replaced with imported data</li>
                                    <li>This will overwrite users, servers, nodes, locations, realms, and spells</li>
                                    <li>Make sure you have a complete backup before proceeding</li>
                                    <li>The import process may take several minutes depending on data size</li>
                                </ul>
                            </div>
                            <div class="space-y-3">
                                <div v-if="sqlDumpFile" class="bg-muted/50 rounded-lg p-3 border border-border/50">
                                    <p class="text-sm font-medium text-foreground mb-1">SQL Dump File:</p>
                                    <p class="text-sm text-muted-foreground font-mono">{{ sqlDumpFile.name }}</p>
                                    <p class="text-xs text-muted-foreground mt-1">
                                        {{ formatFileSize(sqlDumpFile.size) }}
                                    </p>
                                </div>
                                <div v-if="envFile" class="bg-muted/50 rounded-lg p-3 border border-border/50">
                                    <p class="text-sm font-medium text-foreground mb-1">Environment File:</p>
                                    <p class="text-sm text-muted-foreground font-mono">{{ envFile.name }}</p>
                                    <p class="text-xs text-muted-foreground mt-1">{{ formatFileSize(envFile.size) }}</p>
                                    <p class="text-xs text-amber-600 dark:text-amber-500 mt-2">
                                        ⚠️ Contains sensitive data (database encryption key)
                                    </p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel as-child>
                            <Button variant="outline">Cancel</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction as-child>
                            <Button variant="destructive" @click="handleImport">Yes, Import Now</Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    </DashboardLayout>
</template>
