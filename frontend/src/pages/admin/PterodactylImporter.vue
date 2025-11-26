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

import { ref, reactive } from 'vue';
import { useToast } from 'vue-toastification';
import axios from 'axios';
import DashboardLayout, { type BreadcrumbEntry } from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Database, FileText, AlertTriangle, CheckCircle, Loader2 } from 'lucide-vue-next';

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

const form = reactive({
    sqlDump: null as File | null,
    env: null as File | null,
});

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

async function handleImport(): Promise<void> {
    if (!form.sqlDump && !form.env) {
        toast.error('Please upload at least one file (SQL dump or .env file)');
        return;
    }

    isUploading.value = true;
    uploadProgress.value = 0;

    try {
        const formData = new FormData();

        if (form.sqlDump) {
            formData.append('sql_dump', form.sqlDump);
        }

        if (form.env) {
            formData.append('env_file', form.env);
        }

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
                            <Label for="sql-dump">SQL Dump File</Label>
                            <Input
                                id="sql-dump"
                                type="file"
                                accept=".sql,.gz"
                                :disabled="isUploading"
                                @change="handleSqlDumpSelect"
                            />
                            <p class="text-xs text-muted-foreground">
                                Supported formats: .sql, .sql.gz (compressed SQL dump)
                            </p>
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
                            Upload your Pterodactyl .env configuration file to import settings and configuration values.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div class="space-y-2">
                            <Label for="env-file">Environment File</Label>
                            <Input
                                id="env-file"
                                type="file"
                                accept=".env,text/plain"
                                :disabled="isUploading"
                                @change="handleEnvSelect"
                            />
                            <p class="text-xs text-muted-foreground">Upload your Pterodactyl .env configuration file</p>
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
                                <strong class="text-foreground">SQL Dump:</strong> The SQL dump should be from a
                                Pterodactyl panel database. Compressed (.gz) files are supported.
                            </span>
                        </li>
                        <li class="flex items-start gap-2">
                            <CheckCircle class="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>
                                <strong class="text-foreground">Environment File:</strong> The .env file should contain
                                your Pterodactyl configuration values. This helps map settings correctly.
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
                </CardContent>
            </Card>

            <!-- Action Section -->
            <Card class="border border-border/70 shadow-lg">
                <CardHeader>
                    <CardTitle>Ready to Import?</CardTitle>
                    <CardDescription>
                        Upload at least one file (SQL dump or .env file) to begin the import process
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

                    <div class="flex items-center gap-3">
                        <Button
                            size="lg"
                            :disabled="isUploading || (!form.sqlDump && !form.env)"
                            class="gap-2"
                            @click="handleImport"
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
                </CardContent>
            </Card>
        </div>
    </DashboardLayout>
</template>
