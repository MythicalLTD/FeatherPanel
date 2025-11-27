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
import { useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import TableComponent from '@/components/ui/feather-table/TableComponent.vue';
import {
    Database as DatabaseIcon,
    Download,
    Trash2,
    RotateCcw,
    Plus,
    AlertTriangle,
    HardDrive,
    Clock,
} from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { useSettingsStore } from '@/stores/settings';

interface Snapshot {
    filename: string;
    size: number;
    size_formatted: string;
    created_at: string;
}

interface SnapshotsResponse {
    success: boolean;
    data: {
        snapshots: Snapshot[];
    };
}

const toast = useToast();
const router = useRouter();
const settingsStore = useSettingsStore();
const loading = ref(true);
const creating = ref(false);
const restoring = ref(false);
const deleting = ref(false);
const snapshots = ref<Snapshot[]>([]);
const confirmDeleteRow = ref<string | null>(null);
const restoreDialogOpen = ref(false);
const restoreSnapshot = ref<Snapshot | null>(null);
const restoreConfirmText = ref('');
const restoreFromUpload = ref(false);
const uploadedFile = ref<File | null>(null);
const restoreConfirmWipeTables = ref(false);
const restoreConfirmUnsyncWings = ref(false);
const restoreConfirmDataLoss = ref(false);
const restorePassword = ref('');
const deletePassword = ref('');
const createPassword = ref('');
const downloadPassword = ref('');
const createDialogOpen = ref(false);
const downloadDialogOpen = ref(false);
const downloadSnapshotForDialog = ref<Snapshot | null>(null);
const freshRestoreDialogOpen = ref(false);
const freshRestorePassword = ref('');
const freshRestoreConfirmText = ref('');
const freshRestoreConfirmDataLoss = ref(false);
const freshRestoreConfirmWipeEverything = ref(false);
const freshRestoring = ref(false);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-database-snapshots');
const widgetsTopOfPage = computed(() => getWidgets('admin-database-snapshots', 'top-of-page'));
const widgetsAfterHeader = computed(() => getWidgets('admin-database-snapshots', 'after-header'));
const widgetsBeforeTable = computed(() => getWidgets('admin-database-snapshots', 'before-table'));
const widgetsAfterTable = computed(() => getWidgets('admin-database-snapshots', 'after-table'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-database-snapshots', 'bottom-of-page'));

const tableColumns = [
    {
        key: 'filename',
        label: 'Filename',
        sortable: true,
    },
    {
        key: 'size_formatted',
        label: 'Size',
        sortable: true,
    },
    {
        key: 'created_at',
        label: 'Created At',
        sortable: true,
    },
    {
        key: 'actions',
        label: 'Actions',
        sortable: false,
    },
];

async function fetchSnapshots() {
    loading.value = true;
    try {
        const response = await axios.get<SnapshotsResponse>('/api/admin/database-snapshots');
        if (response.data && response.data.success) {
            snapshots.value = response.data.data.snapshots;
        } else {
            toast.error('Failed to fetch snapshots');
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to fetch snapshots';
        toast.error(errorMessage);
        console.error('Error fetching snapshots:', error);
    } finally {
        loading.value = false;
    }
}

function openCreateDialog() {
    createPassword.value = '';
    createDialogOpen.value = true;
}

function closeCreateDialog() {
    createDialogOpen.value = false;
    createPassword.value = '';
}

async function confirmCreateSnapshot() {
    if (!createPassword.value || createPassword.value.trim() === '') {
        toast.error('Password is required to perform this action');
        return;
    }

    creating.value = true;
    try {
        const response = await axios.post('/api/admin/database-snapshots', {
            password: createPassword.value,
        });
        if (response.data && response.data.success) {
            toast.success('Snapshot created successfully');
            closeCreateDialog();
            await fetchSnapshots();
        } else {
            toast.error(response.data?.message || 'Failed to create snapshot');
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to create snapshot';
        toast.error(errorMessage);
        console.error('Error creating snapshot:', error);
    } finally {
        creating.value = false;
    }
}

function openDownloadDialog(snapshot: Snapshot) {
    downloadSnapshotForDialog.value = snapshot;
    downloadPassword.value = '';
    downloadDialogOpen.value = true;
}

function closeDownloadDialog() {
    downloadDialogOpen.value = false;
    downloadSnapshotForDialog.value = null;
    downloadPassword.value = '';
}

async function confirmDownloadSnapshot() {
    if (!downloadSnapshotForDialog.value) {
        toast.error('No snapshot selected');
        return;
    }

    if (!downloadPassword.value || downloadPassword.value.trim() === '') {
        toast.error('Password is required to perform this action');
        return;
    }

    try {
        const url = `/api/admin/database-snapshots/${encodeURIComponent(downloadSnapshotForDialog.value.filename)}/download?password=${encodeURIComponent(downloadPassword.value)}`;
        const response = await axios.get(url, {
            responseType: 'blob',
        });

        // Create blob and download
        const blob = new Blob([response.data], { type: 'application/sql' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = downloadSnapshotForDialog.value.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        toast.success('Download started');
        closeDownloadDialog();
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to download snapshot';
        toast.error(errorMessage);
        console.error('Error downloading snapshot:', error);
    }
}

function openRestoreDialog(snapshot: Snapshot) {
    restoreSnapshot.value = snapshot;
    restoreFromUpload.value = false;
    restoreConfirmText.value = '';
    restoreConfirmWipeTables.value = false;
    restoreConfirmUnsyncWings.value = false;
    restoreConfirmDataLoss.value = false;
    restorePassword.value = '';
    restoreDialogOpen.value = true;
}

function openUploadRestoreDialog() {
    uploadedFile.value = null;
    restoreSnapshot.value = null;
    restoreFromUpload.value = true;
    restoreConfirmText.value = '';
    restoreConfirmWipeTables.value = false;
    restoreConfirmUnsyncWings.value = false;
    restoreConfirmDataLoss.value = false;
    restorePassword.value = '';
    restoreDialogOpen.value = true;
}

function closeRestoreDialog() {
    restoreDialogOpen.value = false;
    restoreSnapshot.value = null;
    uploadedFile.value = null;
    restoreFromUpload.value = false;
    restoreConfirmText.value = '';
    restoreConfirmWipeTables.value = false;
    restoreConfirmUnsyncWings.value = false;
    restoreConfirmDataLoss.value = false;
    restorePassword.value = '';
}

function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] || null;
    if (file) {
        // Validate file extension
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension !== 'fpb') {
            toast.error('Invalid file type. Only .fpb (FeatherPanel Backup) files are allowed');
            target.value = '';
            uploadedFile.value = null;
            return;
        }
        uploadedFile.value = file;
    } else {
        uploadedFile.value = null;
    }
}

async function confirmRestore() {
    // Validate all confirmations
    if (!restoreConfirmWipeTables.value) {
        toast.error('You must acknowledge that all tables will be wiped');
        return;
    }
    if (!restoreConfirmUnsyncWings.value) {
        toast.error('You must acknowledge that Wings may become unsynced');
        return;
    }
    if (!restoreConfirmDataLoss.value) {
        toast.error('You must acknowledge that current data will be lost');
        return;
    }
    if (restoreConfirmText.value !== 'RESTORE') {
        toast.error('Please type "RESTORE" to confirm');
        return;
    }
    if (!restorePassword.value || restorePassword.value.trim() === '') {
        toast.error('Password is required to perform this action');
        return;
    }

    restoring.value = true;
    try {
        let response;
        if (restoreFromUpload.value && uploadedFile.value) {
            // Restore from uploaded file
            const formData = new FormData();
            formData.append('file', uploadedFile.value);
            formData.append('confirm', 'true');
            formData.append('password', restorePassword.value);

            response = await axios.post('/api/admin/database-snapshots/restore-upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
        } else if (restoreSnapshot.value) {
            // Restore from existing snapshot
            response = await axios.post(
                `/api/admin/database-snapshots/${encodeURIComponent(restoreSnapshot.value.filename)}/restore`,
                { confirm: true, password: restorePassword.value },
            );
        } else {
            toast.error('No snapshot selected');
            return;
        }

        if (response.data && response.data.success) {
            toast.success('Database restored successfully');
            closeRestoreDialog();
            await fetchSnapshots();
        } else {
            toast.error(response.data?.message || 'Failed to restore database');
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to restore database';
        toast.error(errorMessage);
        console.error('Error restoring database:', error);
    } finally {
        restoring.value = false;
    }
}

function onDelete(snapshot: Snapshot) {
    confirmDeleteRow.value = snapshot.filename;
    deletePassword.value = '';
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
    deletePassword.value = '';
}

async function confirmDelete(snapshot: Snapshot) {
    if (!deletePassword.value || deletePassword.value.trim() === '') {
        toast.error('Password is required to perform this action');
        return;
    }

    deleting.value = true;
    let success = false;
    try {
        const response = await axios.delete(`/api/admin/database-snapshots/${encodeURIComponent(snapshot.filename)}`, {
            data: { password: deletePassword.value },
        });
        if (response.data && response.data.success) {
            toast.success('Snapshot deleted successfully');
            await fetchSnapshots();
            success = true;
        } else {
            toast.error(response.data?.message || 'Failed to delete snapshot');
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to delete snapshot';
        toast.error(errorMessage);
        console.error('Error deleting snapshot:', error);
    } finally {
        deleting.value = false;
        if (success) {
            confirmDeleteRow.value = null;
            deletePassword.value = '';
        }
    }
}

function openFreshRestoreDialog() {
    freshRestoreDialogOpen.value = true;
    freshRestorePassword.value = '';
    freshRestoreConfirmText.value = '';
    freshRestoreConfirmDataLoss.value = false;
    freshRestoreConfirmWipeEverything.value = false;
}

function closeFreshRestoreDialog() {
    freshRestoreDialogOpen.value = false;
    freshRestorePassword.value = '';
    freshRestoreConfirmText.value = '';
    freshRestoreConfirmDataLoss.value = false;
    freshRestoreConfirmWipeEverything.value = false;
}

async function confirmFreshRestore() {
    if (!freshRestoreConfirmWipeEverything.value) {
        toast.error('You must acknowledge that everything will be wiped');
        return;
    }
    if (!freshRestoreConfirmDataLoss.value) {
        toast.error('You must acknowledge that all data will be lost');
        return;
    }
    if (freshRestoreConfirmText.value !== 'WIPE EVERYTHING') {
        toast.error('Please type "WIPE EVERYTHING" to confirm');
        return;
    }
    if (!freshRestorePassword.value || freshRestorePassword.value.trim() === '') {
        toast.error('Password is required to perform this action');
        return;
    }

    freshRestoring.value = true;
    try {
        const response = await axios.post('/api/admin/database-snapshots/fresh-restore', {
            confirm: true,
            password: freshRestorePassword.value,
        });

        if (response.data && response.data.success) {
            toast.success('Database has been wiped clean and restored to fresh state. You should remain logged in.');
            closeFreshRestoreDialog();
            // Don't fetch snapshots as they're all gone
            // Refresh the page after a delay to ensure the user stays logged in
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            toast.error(response.data?.message || 'Failed to perform fresh restore');
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to perform fresh restore';
        toast.error(errorMessage);
        console.error('Error performing fresh restore:', error);
    } finally {
        freshRestoring.value = false;
    }
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
}

onMounted(async () => {
    // Ensure settings are loaded
    await settingsStore.fetchSettings();

    // Check if developer mode is enabled
    if (!settingsStore.appDeveloperMode) {
        toast.error('Database snapshots are only available in developer mode');
        router.push('/admin');
        return;
    }

    // Fetch plugin widgets
    await fetchPluginWidgets();

    // Fetch snapshots
    await fetchSnapshots();
});
</script>

<template>
    <DashboardLayout
        :breadcrumbs="[{ text: 'Database Snapshots', isCurrent: true, href: '/admin/database-snapshots' }]"
    >
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <div class="p-4 sm:p-6 space-y-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-bold text-foreground mb-1">Database Snapshots</h1>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            Create, download, and restore database backups
                        </p>
                    </div>
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Button
                            variant="outline"
                            :disabled="loading"
                            class="w-full sm:w-auto"
                            data-umami-event="Refresh snapshots"
                            @click="fetchSnapshots"
                            >Refresh</Button
                        >
                        <Button
                            :disabled="creating || loading"
                            class="w-full sm:w-auto"
                            data-umami-event="Create database snapshot"
                            @click="openCreateDialog"
                        >
                            <span
                                v-if="creating"
                                class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                            ></span>
                            <Plus v-else class="h-4 w-4 mr-2" />
                            Create Snapshot
                        </Button>
                        <Button
                            variant="outline"
                            :disabled="loading || restoring"
                            class="w-full sm:w-auto"
                            data-umami-event="Upload and restore snapshot"
                            @click="openUploadRestoreDialog"
                        >
                            <RotateCcw class="h-4 w-4 mr-2" />
                            Restore from Upload
                        </Button>
                        <Button
                            variant="destructive"
                            :disabled="loading || restoring || freshRestoring"
                            class="w-full sm:w-auto"
                            data-umami-event="Fresh restore database"
                            @click="openFreshRestoreDialog"
                        >
                            <AlertTriangle class="h-4 w-4 mr-2" />
                            Fresh Restore
                        </Button>
                    </div>
                </div>

                <!-- Plugin Widgets: After Header -->
                <WidgetRenderer v-if="widgetsAfterHeader.length > 0" :widgets="widgetsAfterHeader" />

                <!-- Warning Alert -->
                <div
                    class="rounded-lg border-2 border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-950/20 p-5 shadow-lg"
                >
                    <div class="flex gap-4">
                        <div class="shrink-0">
                            <div
                                class="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40"
                            >
                                <AlertTriangle class="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <div class="flex-1 space-y-4">
                            <div>
                                <h3 class="text-lg font-bold text-red-900 dark:text-red-100">
                                    Critical Warning: Database Restoration
                                </h3>
                            </div>
                            <div class="space-y-3 text-sm leading-relaxed text-red-800 dark:text-red-200">
                                <p class="font-semibold">
                                    Database snapshots are complete SQL dumps of your FeatherPanel database saved as
                                    FeatherPanel Backup (.fpb) files. Restoring from a backup will completely wipe all
                                    existing database tables and replace them with the backup data.
                                </p>
                                <div class="space-y-2">
                                    <div
                                        class="rounded-lg border-2 border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-950/20 p-3 mb-3"
                                    >
                                        <p class="text-sm font-semibold text-green-800 dark:text-green-200">
                                            ✅ <strong>Wings & Servers Are Safe:</strong> Only the database is affected.
                                            Wings daemon, server files, server data, and all information stored outside
                                            the database remain completely untouched and safe.
                                        </p>
                                    </div>
                                    <p>
                                        <strong class="text-red-900 dark:text-red-100">⚠️ What This Means:</strong>
                                    </p>
                                    <ul class="list-disc list-inside space-y-1.5 ml-2">
                                        <li>
                                            <strong>All tables will be wiped:</strong> Every single table in your
                                            database will be dropped and recreated from the backup. This includes users,
                                            servers, nodes, and all other data.
                                        </li>
                                        <li>
                                            <strong>Current data will be lost:</strong> Any data created or modified
                                            after the backup was created will be permanently deleted and cannot be
                                            recovered.
                                        </li>
                                        <li>
                                            <strong>Wings synchronization issues:</strong> If servers, nodes, or other
                                            resources were created, modified, or deleted in Wings after the backup was
                                            created, your panel database may become out of sync with Wings, causing
                                            corruption and errors.
                                        </li>
                                        <li>
                                            <strong>No file protection:</strong> This only restores database integrity.
                                            It does NOT restore server files, Wings configuration, or any data stored
                                            outside the database.
                                        </li>
                                        <li>
                                            <strong>Potential corruption:</strong> Restoring from an outdated backup can
                                            corrupt your database if Wings has made changes that the backup doesn't
                                            reflect.
                                        </li>
                                    </ul>
                                </div>
                                <p class="font-semibold text-red-900 dark:text-red-100">
                                    Always create a new snapshot before restoring, and ensure you understand the risks
                                    involved. This action cannot be undone!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Plugin Widgets: Before Table -->
                <WidgetRenderer v-if="widgetsBeforeTable.length > 0" :widgets="widgetsBeforeTable" />

                <!-- Loading State -->
                <div v-if="loading" class="flex items-center justify-center py-12">
                    <div class="flex items-center gap-3">
                        <div
                            class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"
                        ></div>
                        <span class="text-muted-foreground">Loading snapshots...</span>
                    </div>
                </div>

                <!-- Snapshots Table -->
                <div v-else>
                    <TableComponent
                        title="Database Snapshots"
                        description="Manage your database backup snapshots"
                        :columns="tableColumns"
                        :data="snapshots"
                        :search-placeholder="'Search by filename...'"
                        :server-side-pagination="false"
                    >
                        <template #cell-filename="{ item }">
                            <div class="flex items-center gap-2">
                                <DatabaseIcon class="h-4 w-4 text-muted-foreground" />
                                <span class="font-mono text-sm">{{ (item as unknown as Snapshot).filename }}</span>
                            </div>
                        </template>

                        <template #cell-size_formatted="{ item }">
                            <div class="flex items-center gap-2">
                                <HardDrive class="h-4 w-4 text-muted-foreground" />
                                <span>{{ (item as unknown as Snapshot).size_formatted }}</span>
                            </div>
                        </template>

                        <template #cell-created_at="{ item }">
                            <div class="flex items-center gap-2">
                                <Clock class="h-4 w-4 text-muted-foreground" />
                                <span>{{ formatDate((item as unknown as Snapshot).created_at) }}</span>
                            </div>
                        </template>

                        <template #cell-actions="{ item }">
                            <div class="flex justify-end gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    title="Download snapshot"
                                    data-umami-event="Download snapshot"
                                    @click="openDownloadDialog(item as unknown as Snapshot)"
                                >
                                    <Download :size="16" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    title="Restore from snapshot"
                                    data-umami-event="Restore snapshot"
                                    @click="openRestoreDialog(item as unknown as Snapshot)"
                                >
                                    <RotateCcw :size="16" />
                                </Button>
                                <template v-if="confirmDeleteRow === (item as unknown as Snapshot).filename">
                                    <div class="flex items-center gap-2 min-w-[300px]">
                                        <input
                                            v-model="deletePassword"
                                            type="password"
                                            placeholder="Enter password"
                                            class="flex-1 px-2 py-1 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                                            autocomplete="current-password"
                                            @keyup.enter="confirmDelete(item as unknown as Snapshot)"
                                        />
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                            :loading="deleting"
                                            :disabled="!deletePassword || deletePassword.trim() === ''"
                                            title="Confirm deletion"
                                            data-umami-event="Confirm delete snapshot"
                                            @click="confirmDelete(item as unknown as Snapshot)"
                                        >
                                            Confirm
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                            :disabled="deleting"
                                            title="Cancel deletion"
                                            @click="onCancelDelete"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </template>
                                <template v-else>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                        title="Delete snapshot"
                                        data-umami-event="Delete snapshot"
                                        @click="onDelete(item as unknown as Snapshot)"
                                    >
                                        <Trash2 :size="16" />
                                    </Button>
                                </template>
                            </div>
                        </template>
                    </TableComponent>
                </div>

                <!-- Plugin Widgets: After Table -->
                <WidgetRenderer v-if="widgetsAfterTable.length > 0" :widgets="widgetsAfterTable" />

                <!-- Help Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <DatabaseIcon class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">What are snapshots?</div>
                                    <p>
                                        Database snapshots are complete SQL dumps of your entire database saved as
                                        FeatherPanel Backup (.fpb) files. They allow you to restore your database to a
                                        previous state if needed.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Download class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Download & Backup</div>
                                    <p>
                                        Download snapshots to keep local backups. Store them securely as they contain
                                        all your database data.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <RotateCcw class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Restore Database</div>
                                    <p>
                                        Restore your database from a snapshot. This will wipe all current data and
                                        replace it with the snapshot data. Use with extreme caution!
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
                                    <div class="font-semibold text-foreground mb-1">Important Limitations</div>
                                    <ul class="list-disc list-inside space-y-1">
                                        <li>
                                            <strong>Wings & Servers Are Safe:</strong> Only the database is affected.
                                            Wings daemon, server files, and server data remain untouched.
                                        </li>
                                        <li>
                                            Snapshots only protect database integrity, not server files or Wings state
                                        </li>
                                        <li>Restoring may cause database corruption if Wings state has changed</li>
                                        <li>Restoring may unsync your panel with Wings daemon</li>
                                        <li>Always create a new snapshot before restoring</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>

        <!-- Restore Confirmation Dialog -->
        <Dialog v-model:open="restoreDialogOpen">
            <DialogContent class="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle class="text-xl font-bold text-red-600 dark:text-red-400">
                        {{
                            restoreFromUpload
                                ? 'Restore Database from Uploaded Backup'
                                : 'Restore Database from Snapshot'
                        }}
                    </DialogTitle>
                    <DialogDescription class="text-base">
                        {{
                            restoreFromUpload
                                ? 'Upload a FeatherPanel Backup (.fpb) file to restore your database. This action will'
                                : 'This action will'
                        }}
                        <strong class="text-red-700 dark:text-red-400"> completely wipe all database tables</strong>
                        and replace them with the backup data. This action <strong>cannot be undone</strong> and may
                        result in data loss and system corruption!
                    </DialogDescription>
                </DialogHeader>

                <div
                    class="mt-4 rounded-lg border-2 border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-950/20 p-4 shadow-md"
                >
                    <div class="flex gap-3">
                        <div class="shrink-0">
                            <div
                                class="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40"
                            >
                                <AlertTriangle class="h-4 w-4 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <div class="flex-1">
                            <div
                                class="rounded-lg border-2 border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-950/20 p-3 mb-3"
                            >
                                <p class="text-sm font-semibold text-green-800 dark:text-green-200">
                                    ✅ <strong>Wings & Servers Are Safe:</strong> Only the database is affected. Wings
                                    daemon, server files, server data, and all information stored outside the database
                                    remain completely untouched and safe.
                                </p>
                            </div>
                            <h4 class="font-bold text-red-900 dark:text-red-100 mb-2">Critical Warnings</h4>
                            <ul class="list-disc list-inside space-y-1.5 text-sm text-red-800 dark:text-red-200">
                                <li>All existing database tables will be dropped and recreated</li>
                                <li>All current data will be permanently lost</li>
                                <li>Your panel may become unsynced with Wings daemon</li>
                                <li>This only protects database integrity, not server files</li>
                                <li>Restoring from an outdated backup may corrupt your database</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="mt-4 space-y-2">
                    <label class="text-sm font-medium">Backup to restore:</label>
                    <div class="p-3 bg-muted rounded-md font-mono text-sm border">
                        {{ restoreSnapshot?.filename || uploadedFile?.name || 'No file selected' }}
                    </div>
                </div>

                <!-- Upload file selection (only shown for upload restore) -->
                <div v-if="restoreFromUpload" class="mt-4 space-y-2">
                    <label class="text-sm font-medium">Select .fpb backup file:</label>
                    <input
                        type="file"
                        accept=".fpb"
                        class="w-full px-3 py-2 border border-input bg-background rounded-md text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                        @change="handleFileSelect"
                    />
                    <p class="text-xs text-muted-foreground">
                        Only FeatherPanel Backup (.fpb) files are accepted. Maximum file size: 1GB
                    </p>
                    <div v-if="uploadedFile" class="p-3 bg-muted rounded-md font-mono text-sm border mt-2">
                        Selected: {{ uploadedFile.name }} ({{ (uploadedFile.size / 1024 / 1024).toFixed(2) }} MB)
                    </div>
                </div>

                <!-- Confirmation checkboxes -->
                <div class="mt-6 space-y-4 border-t pt-4">
                    <div class="space-y-3">
                        <label class="flex items-start gap-3 cursor-pointer">
                            <input
                                v-model="restoreConfirmWipeTables"
                                type="checkbox"
                                class="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 focus:ring-2 dark:border-gray-600 dark:bg-gray-700"
                            />
                            <span class="text-sm">
                                I understand that <strong>all database tables will be completely wiped</strong> and
                                recreated from the backup. This includes users, servers, nodes, and all other data.
                            </span>
                        </label>

                        <label class="flex items-start gap-3 cursor-pointer">
                            <input
                                v-model="restoreConfirmDataLoss"
                                type="checkbox"
                                class="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 focus:ring-2 dark:border-gray-600 dark:bg-gray-700"
                            />
                            <span class="text-sm">
                                I understand that <strong>all current data will be permanently lost</strong> and cannot
                                be recovered. Any data created or modified after the backup was created will be deleted.
                            </span>
                        </label>

                        <label class="flex items-start gap-3 cursor-pointer">
                            <input
                                v-model="restoreConfirmUnsyncWings"
                                type="checkbox"
                                class="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 focus:ring-2 dark:border-gray-600 dark:bg-gray-700"
                            />
                            <span class="text-sm">
                                I understand that my panel <strong>may become unsynced with Wings</strong> and this may
                                cause database corruption, errors, and system instability. I have verified that Wings
                                state matches the backup.
                            </span>
                        </label>
                    </div>
                </div>

                <div class="mt-4 space-y-2">
                    <label class="text-sm font-medium">
                        Type <strong class="text-red-600">RESTORE</strong> to confirm:
                    </label>
                    <input
                        v-model="restoreConfirmText"
                        type="text"
                        class="w-full px-3 py-2 border border-input bg-background rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        placeholder="RESTORE"
                    />
                </div>

                <div class="mt-4 space-y-2">
                    <label class="text-sm font-medium">
                        Enter your password <strong class="text-red-600">*</strong>:
                    </label>
                    <input
                        v-model="restorePassword"
                        type="password"
                        class="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        placeholder="Your account password"
                        autocomplete="current-password"
                    />
                    <p class="text-xs text-muted-foreground">
                        Your password is required to verify your identity before performing this risky action.
                    </p>
                </div>

                <DialogFooter class="mt-6">
                    <Button variant="outline" :disabled="restoring" @click="closeRestoreDialog">Cancel</Button>
                    <Button
                        variant="destructive"
                        :disabled="
                            restoreConfirmText !== 'RESTORE' ||
                            !restoreConfirmWipeTables ||
                            !restoreConfirmDataLoss ||
                            !restoreConfirmUnsyncWings ||
                            !restorePassword ||
                            restoring ||
                            (restoreFromUpload && !uploadedFile)
                        "
                        :loading="restoring"
                        @click="confirmRestore"
                    >
                        <AlertTriangle v-if="!restoring" class="h-4 w-4 mr-2" />
                        Restore Database
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Create Snapshot Password Dialog -->
        <Dialog v-model:open="createDialogOpen">
            <DialogContent class="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Database Snapshot</DialogTitle>
                    <DialogDescription>
                        Enter your password to create a new database snapshot. This will generate a complete SQL dump of
                        your database.
                    </DialogDescription>
                </DialogHeader>

                <div class="mt-4 space-y-2">
                    <label class="text-sm font-medium">
                        Enter your password <strong class="text-red-600">*</strong>:
                    </label>
                    <input
                        v-model="createPassword"
                        type="password"
                        class="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        placeholder="Your account password"
                        autocomplete="current-password"
                        @keyup.enter="confirmCreateSnapshot"
                    />
                    <p class="text-xs text-muted-foreground">
                        Your password is required to verify your identity before creating a snapshot.
                    </p>
                </div>

                <DialogFooter class="mt-6">
                    <Button variant="outline" :disabled="creating" @click="closeCreateDialog">Cancel</Button>
                    <Button
                        :disabled="!createPassword || createPassword.trim() === '' || creating"
                        :loading="creating"
                        @click="confirmCreateSnapshot"
                    >
                        Create Snapshot
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Download Snapshot Password Dialog -->
        <Dialog v-model:open="downloadDialogOpen">
            <DialogContent class="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Download Database Snapshot</DialogTitle>
                    <DialogDescription>
                        Enter your password to download the snapshot file. This will allow you to save a local copy of
                        the database backup.
                    </DialogDescription>
                </DialogHeader>

                <div v-if="downloadSnapshotForDialog" class="mt-4 space-y-2">
                    <label class="text-sm font-medium">Snapshot to download:</label>
                    <div class="p-3 bg-muted rounded-md font-mono text-sm border">
                        {{ downloadSnapshotForDialog.filename }}
                    </div>
                </div>

                <div class="mt-4 space-y-2">
                    <label class="text-sm font-medium">
                        Enter your password <strong class="text-red-600">*</strong>:
                    </label>
                    <input
                        v-model="downloadPassword"
                        type="password"
                        class="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        placeholder="Your account password"
                        autocomplete="current-password"
                        @keyup.enter="confirmDownloadSnapshot"
                    />
                    <p class="text-xs text-muted-foreground">
                        Your password is required to verify your identity before downloading the snapshot.
                    </p>
                </div>

                <DialogFooter class="mt-6">
                    <Button variant="outline" @click="closeDownloadDialog">Cancel</Button>
                    <Button
                        :disabled="!downloadPassword || downloadPassword.trim() === ''"
                        @click="confirmDownloadSnapshot"
                    >
                        Download
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Fresh Restore Dialog -->
        <Dialog v-model:open="freshRestoreDialogOpen">
            <DialogContent class="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle class="text-2xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle class="h-6 w-6" />
                        Fresh Database Restore
                    </DialogTitle>
                    <DialogDescription class="text-base">
                        <strong class="text-red-700 dark:text-red-400">
                            THIS WILL COMPLETELY WIPE YOUR ENTIRE DATABASE AND RESTORE IT TO A FRESH STATE.
                        </strong>
                        All tables will be dropped, migrations will be run, and only your user account will be recreated
                        with the same session token so you stay logged in.
                    </DialogDescription>
                </DialogHeader>

                <div
                    class="mt-4 rounded-lg border-4 border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-950/30 p-5 shadow-xl"
                >
                    <div class="flex gap-3">
                        <div class="shrink-0">
                            <div
                                class="flex h-10 w-10 items-center justify-center rounded-full bg-red-200 dark:bg-red-900/60"
                            >
                                <AlertTriangle class="h-6 w-6 text-red-700 dark:text-red-300" />
                            </div>
                        </div>
                        <div class="flex-1">
                            <div
                                class="rounded-lg border-2 border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-950/20 p-3 mb-3"
                            >
                                <p class="text-sm font-semibold text-green-800 dark:text-green-200">
                                    ✅ <strong>Wings & Servers Are Safe:</strong> Only the database is affected. Wings
                                    daemon, server files, server data, and all information stored outside the database
                                    remain completely untouched and safe. Your servers will continue running normally.
                                </p>
                            </div>
                            <h4 class="font-bold text-lg text-red-900 dark:text-red-100 mb-3">⚠️ EXTREME WARNING ⚠️</h4>
                            <ul class="list-disc list-inside space-y-2 text-sm text-red-800 dark:text-red-200">
                                <li>
                                    <strong>ALL DATABASE TABLES WILL BE DROPPED</strong> - Every single table will be
                                    deleted, including users, servers, nodes, locations, realms, spells, and all other
                                    data.
                                </li>
                                <li>
                                    <strong>ALL DATA WILL BE PERMANENTLY LOST</strong> - This includes all users (except
                                    you), servers, nodes, databases, backups, settings, and everything else. This cannot
                                    be undone.
                                </li>
                                <li>
                                    <strong>MIGRATIONS WILL RUN</strong> - The database will be restored to a fresh
                                    state with only the base schema from migrations.
                                </li>
                                <li>
                                    <strong>ONLY YOUR ACCOUNT WILL BE RECREATED</strong> - Your user account will be
                                    recreated with the same credentials and session token so you remain logged in.
                                </li>
                                <li>
                                    <strong>NO SNAPSHOTS OR BACKUPS ARE USED</strong> - This is a complete wipe, not a
                                    restore from a backup.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="mt-6 space-y-4 border-t pt-4">
                    <div class="space-y-3">
                        <label class="flex items-start gap-3 cursor-pointer">
                            <input
                                v-model="freshRestoreConfirmWipeEverything"
                                type="checkbox"
                                class="mt-1 h-5 w-5 rounded border-red-600 text-red-600 focus:ring-red-500 focus:ring-2 dark:border-red-500 dark:bg-gray-700"
                            />
                            <span class="text-sm">
                                I understand that
                                <strong class="text-red-600">ALL database tables will be completely wiped</strong> and
                                the database will be restored to a fresh state. This includes ALL users (except me),
                                servers, nodes, locations, realms, spells, databases, backups, settings, and every other
                                piece of data.
                            </span>
                        </label>

                        <label class="flex items-start gap-3 cursor-pointer">
                            <input
                                v-model="freshRestoreConfirmDataLoss"
                                type="checkbox"
                                class="mt-1 h-5 w-5 rounded border-red-600 text-red-600 focus:ring-red-500 focus:ring-2 dark:border-red-500 dark:bg-gray-700"
                            />
                            <span class="text-sm">
                                I understand that
                                <strong class="text-red-600">ALL current data will be permanently lost</strong> and
                                cannot be recovered. Only my user account will be recreated with the same session token
                                so I stay logged in. Everything else will be gone forever.
                            </span>
                        </label>
                    </div>
                </div>

                <div class="mt-6 space-y-2">
                    <label class="text-sm font-medium">
                        Type <strong class="text-red-600 font-bold text-lg">WIPE EVERYTHING</strong> to confirm:
                    </label>
                    <input
                        v-model="freshRestoreConfirmText"
                        type="text"
                        class="w-full px-3 py-2 border-2 border-red-500 bg-background rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        placeholder="WIPE EVERYTHING"
                    />
                    <p class="text-xs text-muted-foreground">
                        You must type exactly "WIPE EVERYTHING" to proceed with this destructive action.
                    </p>
                </div>

                <div class="mt-4 space-y-2">
                    <label class="text-sm font-medium">
                        Enter your password <strong class="text-red-600">*</strong>:
                    </label>
                    <input
                        v-model="freshRestorePassword"
                        type="password"
                        class="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        placeholder="Your account password"
                        autocomplete="current-password"
                    />
                    <p class="text-xs text-muted-foreground">
                        Your password is required to verify your identity before performing this extremely risky action.
                    </p>
                </div>

                <DialogFooter class="mt-6">
                    <Button variant="outline" :disabled="freshRestoring" @click="closeFreshRestoreDialog">
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        class="bg-red-600 hover:bg-red-700 text-white"
                        :disabled="
                            freshRestoreConfirmText !== 'WIPE EVERYTHING' ||
                            !freshRestoreConfirmWipeEverything ||
                            !freshRestoreConfirmDataLoss ||
                            !freshRestorePassword ||
                            freshRestoring
                        "
                        :loading="freshRestoring"
                        @click="confirmFreshRestore"
                    >
                        <AlertTriangle v-if="!freshRestoring" class="h-4 w-4 mr-2" />
                        Wipe Database & Fresh Restore
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </DashboardLayout>
</template>
