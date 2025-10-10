<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <!-- Backup Limit Warning -->
            <div
                v-if="serverInfo && backups.length >= serverInfo.backup_limit"
                class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-950/30 dark:border-yellow-800"
            >
                <div class="flex items-center gap-3">
                    <div class="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span class="text-white text-xs font-bold">!</span>
                    </div>
                    <div>
                        <h3 class="text-yellow-800 dark:text-yellow-200 font-medium">
                            {{ t('serverBackups.backupLimitReached') }}
                        </h3>
                        <p class="text-yellow-700 dark:text-yellow-300 text-sm">
                            {{ t('serverBackups.backupLimitReachedDescription', { limit: serverInfo.backup_limit }) }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div
                v-if="!loading && backups.length === 0 && !searchQuery"
                class="flex flex-col items-center justify-center py-16 px-4"
            >
                <div class="text-center max-w-md space-y-6">
                    <div class="flex justify-center">
                        <div class="relative">
                            <div class="absolute inset-0 animate-ping opacity-20">
                                <div class="w-32 h-32 rounded-full bg-primary/20"></div>
                            </div>
                            <div class="relative p-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                                <Archive class="h-16 w-16 text-primary" />
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h3 class="text-2xl sm:text-3xl font-bold text-foreground">
                            {{ t('serverBackups.noBackups') }}
                        </h3>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            {{
                                serverInfo && serverInfo.backup_limit === 0
                                    ? t('serverBackups.noBackupsNoLimit')
                                    : t('serverBackups.noBackupsDescription')
                            }}
                        </p>
                    </div>
                    <Button
                        v-if="serverInfo && serverInfo.backup_limit > 0"
                        size="lg"
                        class="gap-2 shadow-lg"
                        @click="showCreateBackupDrawer = true"
                    >
                        <Plus class="h-5 w-5" />
                        {{ t('serverBackups.createBackup') }}
                    </Button>
                </div>
            </div>

            <!-- Table Component -->
            <TableComponent
                v-else
                :title="t('serverBackups.title')"
                :description="
                    t('serverBackups.description') +
                    (serverInfo ? ` (${backups.length}/${serverInfo.backup_limit})` : '')
                "
                :columns="tableColumns"
                :data="backups"
                :search-placeholder="t('serverBackups.searchPlaceholder')"
                :server-side-pagination="false"
                :total-records="pagination.total_records"
                :total-pages="pagination.total_pages"
                :current-page="pagination.current_page"
                :has-next="pagination.has_next"
                :has-prev="pagination.has_prev"
                :from="pagination.from"
                :to="pagination.to"
                local-storage-key="featherpanel-server-backups-columns"
                @search="handleSearch"
                @page-change="changePage"
            >
                <template #header-actions>
                    <Button
                        variant="default"
                        size="sm"
                        :disabled="loading || (serverInfo && backups.length >= serverInfo.backup_limit)"
                        @click="showCreateBackupDrawer = true"
                    >
                        <Plus class="h-4 w-4 mr-2" />
                        {{ t('serverBackups.createBackup') }}
                    </Button>
                </template>

                <template #cell-name="{ item }">
                    <div class="font-medium">{{ (item as BackupItem).name }}</div>
                </template>

                <template #cell-status="{ item }">
                    <div class="flex items-center gap-2">
                        <Badge
                            :variant="
                                getStatusVariant(
                                    (item as BackupItem).is_successful,
                                    (item as BackupItem).is_locked,
                                ) as any
                            "
                        >
                            {{ getStatusText((item as BackupItem).is_successful, (item as BackupItem).is_locked) }}
                        </Badge>
                        <Button
                            v-if="(item as BackupItem).is_locked"
                            variant="ghost"
                            size="sm"
                            class="h-6 w-6 p-0"
                            :disabled="loading"
                            title="Unlock backup"
                            @click="unlockBackup(item as BackupItem)"
                        >
                            <Lock class="h-3 w-3" />
                        </Button>
                        <Button
                            v-else
                            variant="ghost"
                            size="sm"
                            class="h-6 w-6 p-0"
                            :disabled="loading"
                            title="Lock backup"
                            @click="lockBackup(item as BackupItem)"
                        >
                            <Unlock class="h-3 w-3" />
                        </Button>
                    </div>
                </template>

                <template #cell-size="{ item }">
                    <span class="text-sm text-muted-foreground">
                        {{ formatBytes((item as BackupItem).bytes) }}
                    </span>
                </template>

                <template #cell-created_at="{ item }">
                    <span class="text-sm">{{ formatDate((item as BackupItem).created_at) }}</span>
                </template>

                <template #cell-actions="{ item }">
                    <div class="flex items-center space-x-2">
                        <Button
                            v-if="(item as BackupItem).is_successful && !(item as BackupItem).is_locked"
                            variant="outline"
                            size="sm"
                            :disabled="loading"
                            @click="openRestoreBackupDrawer(item as BackupItem)"
                        >
                            <RotateCcw class="h-4 w-4 mr-2" />
                            {{ t('serverBackups.restore') }}
                        </Button>
                        <Button
                            v-if="(item as BackupItem).is_successful"
                            variant="outline"
                            size="sm"
                            :disabled="loading"
                            @click="downloadBackup(item as BackupItem)"
                        >
                            <Download class="h-4 w-4 mr-2" />
                            {{ t('serverBackups.download') }}
                        </Button>
                        <Button
                            v-if="!(item as BackupItem).is_locked"
                            variant="destructive"
                            size="sm"
                            :disabled="loading"
                            @click="deleteBackup(item as BackupItem)"
                        >
                            <Trash2 class="h-4 w-4 mr-2" />
                            {{ t('serverBackups.delete') }}
                        </Button>
                        <div v-if="(item as BackupItem).is_locked" class="text-xs text-muted-foreground px-2 py-1">
                            {{ t('serverBackups.backupLocked') }}
                        </div>
                    </div>
                </template>
            </TableComponent>
        </div>

        <!-- Confirm Dialog -->
        <Dialog v-model:open="showConfirmDialog">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{{ confirmDialog.title }}</DialogTitle>
                    <DialogDescription>
                        {{ confirmDialog.description }}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" :disabled="confirmLoading" @click="showConfirmDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button :variant="confirmDialog.variant" :disabled="confirmLoading" @click="onConfirmDialog">
                        <Loader2 v-if="confirmLoading" class="h-4 w-4 mr-2 animate-spin" />
                        {{ confirmDialog.confirmText || t('common.confirm') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Create Backup Drawer -->
        <Drawer
            :open="showCreateBackupDrawer"
            @update:open="
                (val: boolean) => {
                    if (!val) showCreateBackupDrawer = false;
                }
            "
        >
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{{ t('serverBackups.createBackup') }}</DrawerTitle>
                    <DrawerDescription>
                        {{ t('serverBackups.createBackupDescription') }}
                    </DrawerDescription>
                </DrawerHeader>
                <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="createBackup">
                    <label for="backup-name" class="block mb-1 font-medium">{{ t('serverBackups.name') }}</label>
                    <Input
                        id="backup-name"
                        v-model="newBackup.name"
                        :placeholder="t('serverBackups.namePlaceholder')"
                        required
                    />

                    <label for="backup-ignore" class="block mb-1 font-medium">{{
                        t('serverBackups.ignoreFiles')
                    }}</label>
                    <div class="space-y-3">
                        <div class="flex gap-2">
                            <Input
                                v-model="newIgnoreFile"
                                :placeholder="t('serverBackups.addIgnoreFile')"
                                class="flex-1"
                                @keyup.enter="addIgnoreFile"
                            />
                            <Button type="button" variant="outline" size="sm" @click="addIgnoreFile">
                                <Plus class="h-4 w-4" />
                            </Button>
                        </div>

                        <div v-if="ignoreFilesList.length > 0" class="space-y-2">
                            <div class="text-sm text-muted-foreground">{{ t('serverBackups.ignoreFilesList') }}</div>
                            <div class="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                                <div
                                    v-for="(file, index) in ignoreFilesList"
                                    :key="index"
                                    class="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md"
                                >
                                    <span class="text-sm font-mono">{{ file }}</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        class="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                        @click="removeIgnoreFile(index)"
                                    >
                                        <Trash2 class="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <p class="text-xs text-muted-foreground">
                            {{ t('serverBackups.ignoreFilesHelp') }}
                        </p>
                    </div>

                    <div class="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" @click="showCreateBackupDrawer = false">
                            {{ t('common.cancel') }}
                        </Button>
                        <Button type="submit" :disabled="creatingBackup">
                            <Loader2 v-if="creatingBackup" class="h-4 w-4 mr-2 animate-spin" />
                            {{ t('serverBackups.create') }}
                        </Button>
                    </div>
                </form>
            </DrawerContent>
        </Drawer>

        <!-- Restore Backup Drawer -->
        <Drawer
            :open="showRestoreBackupDrawer"
            @update:open="
                (val: boolean) => {
                    if (!val) showRestoreBackupDrawer = false;
                }
            "
        >
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{{ t('serverBackups.restoreBackup') }}</DrawerTitle>
                    <DrawerDescription>
                        {{ t('serverBackups.restoreBackupDescription') }}
                    </DrawerDescription>
                </DrawerHeader>
                <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="confirmRestoreBackup">
                    <div class="flex items-center space-x-2">
                        <Checkbox id="truncate-directory" v-model:checked="restoreBackup.truncate_directory" />
                        <label for="truncate-directory" class="text-sm font-medium">
                            {{ t('serverBackups.truncateDirectory') }}
                        </label>
                    </div>
                    <p class="text-sm text-muted-foreground">
                        {{ t('serverBackups.truncateDirectoryHelp') }}
                    </p>

                    <div class="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" @click="showRestoreBackupDrawer = false">
                            {{ t('common.cancel') }}
                        </Button>
                        <Button type="submit" variant="destructive" :disabled="restoringBackup">
                            <Loader2 v-if="restoringBackup" class="h-4 w-4 mr-2 animate-spin" />
                            {{ t('serverBackups.confirmRestore') }}
                        </Button>
                    </div>
                </form>
            </DrawerContent>
        </Drawer>
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
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

import { Plus, RotateCcw, Download, Trash2, Loader2, Lock, Unlock, Archive } from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import TableComponent from '@/kit/TableComponent.vue';
import type { TableColumn } from '@/kit/types';

type BackupItem = {
    id: number;
    server_id: number;
    uuid: string;
    name: string;
    ignored_files: string;
    disk: string;
    is_successful: number;
    is_locked: number;
    bytes: number;
    created_at: string;
    updated_at: string;
    completed_at?: string;
};

const route = useRoute();
const { t } = useI18n();
const toast = useToast();

const backups = ref<BackupItem[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const server = ref<{ name: string } | null>(null);
const serverInfo = ref<{ backup_limit: number } | null>(null);
const pagination = ref({
    current_page: 1,
    per_page: 20,
    total_records: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false,
    from: 0,
    to: 0,
});

// Drawer states
const showCreateBackupDrawer = ref(false);
const showRestoreBackupDrawer = ref(false);
const creatingBackup = ref(false);
const restoringBackup = ref(false);

// Confirm dialog state
const showConfirmDialog = ref(false);
const confirmDialog = ref({
    title: '' as string,
    description: '' as string,
    confirmText: '' as string,
    variant: 'default' as 'default' | 'destructive',
});
const confirmAction = ref<null | (() => Promise<void> | void)>(null);
const confirmLoading = ref(false);

// Form data
const newBackup = ref({
    name: '',
    ignore: '',
});

const newIgnoreFile = ref('');
const ignoreFilesList = ref<string[]>([]);

const restoreBackup = ref({
    backup: null as BackupItem | null,
    truncate_directory: false,
});

const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverBackups.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/backups` },
]);

onMounted(async () => {
    await fetchBackups();
});

const tableColumns: TableColumn[] = [
    { key: 'name', label: t('serverBackups.name'), searchable: true },
    { key: 'status', label: t('serverBackups.status') },
    { key: 'size', label: t('serverBackups.size') },
    { key: 'disk', label: t('serverBackups.disk') },
    { key: 'created_at', label: t('serverBackups.createdAt') },
    { key: 'actions', label: t('common.actions') },
];

async function fetchBackups(page = pagination.value.current_page) {
    try {
        loading.value = true;

        // Fetch both backups and server info
        const [backupsResponse, serverResponse] = await Promise.all([
            axios.get(`/api/user/servers/${route.params.uuidShort}/backups`, {
                params: { page, per_page: pagination.value.per_page, search: searchQuery.value || undefined },
            }),
            axios.get(`/api/user/servers/${route.params.uuidShort}`),
        ]);

        if (!backupsResponse.data.success) {
            toast.error(backupsResponse.data.message || t('serverBackups.failedToFetch'));
            return;
        }

        if (serverResponse.data.success) {
            serverInfo.value = {
                backup_limit: serverResponse.data.data.backup_limit,
            };
            server.value = { name: serverResponse.data.data.name };
        }

        backups.value = backupsResponse.data.data.data || [];

        const p = backupsResponse.data.data.pagination;
        pagination.value = {
            current_page: p.current_page,
            per_page: p.per_page,
            total_records: p.total,
            total_pages: p.last_page,
            has_next: p.current_page < p.last_page,
            has_prev: p.current_page > 1,
            from: p.from,
            to: p.to,
        };
    } catch {
        toast.error(t('serverBackups.failedToFetch'));
    } finally {
        loading.value = false;
    }
}

async function createBackup() {
    try {
        creatingBackup.value = true;
        const { data } = await axios.post(`/api/user/servers/${route.params.uuidShort}/backups`, {
            name: newBackup.value.name,
            ignore: JSON.stringify(ignoreFilesList.value),
        });

        if (!data.success) {
            toast.error(data.message || t('serverBackups.createFailed'));
            return;
        }

        toast.success(t('serverBackups.createSuccess'));
        showCreateBackupDrawer.value = false;

        // Reset form
        newBackup.value = {
            name: '',
            ignore: '',
        };
        newIgnoreFile.value = '';
        ignoreFilesList.value = [];

        // Refresh list
        await fetchBackups();
    } catch {
        toast.error(t('serverBackups.createFailed'));
    } finally {
        creatingBackup.value = false;
    }
}

function openRestoreBackupDrawer(backup: BackupItem) {
    restoreBackup.value.backup = backup;
    restoreBackup.value.truncate_directory = false;
    showRestoreBackupDrawer.value = true;
}

async function confirmRestoreBackup() {
    if (!restoreBackup.value.backup) return;

    try {
        restoringBackup.value = true;
        const { data } = await axios.post(
            `/api/user/servers/${route.params.uuidShort}/backups/${restoreBackup.value.backup.uuid}/restore`,
            {
                truncate_directory: restoreBackup.value.truncate_directory,
            },
        );

        if (!data.success) {
            if (data.error === 'BACKUP_LOCKED') {
                toast.error(t('serverBackups.restoreLockedError'));
            } else {
                toast.error(data.message || t('serverBackups.restoreFailed'));
            }
            return;
        }

        toast.success(t('serverBackups.restoreSuccess'));
        showRestoreBackupDrawer.value = false;
    } catch (error: unknown) {
        if (
            error &&
            typeof error === 'object' &&
            'response' in error &&
            error.response &&
            typeof error.response === 'object' &&
            'data' in error.response &&
            error.response.data &&
            typeof error.response.data === 'object' &&
            'error' in error.response.data &&
            error.response.data.error === 'BACKUP_LOCKED'
        ) {
            toast.error(t('serverBackups.restoreLockedError'));
        } else {
            toast.error(t('serverBackups.restoreFailed'));
        }
    } finally {
        restoringBackup.value = false;
    }
}

async function downloadBackup(backup: BackupItem) {
    try {
        const { data } = await axios.get(`/api/user/servers/${route.params.uuidShort}/backups/${backup.uuid}/download`);

        if (!data.success) {
            toast.error(data.message || t('serverBackups.downloadFailed'));
            return;
        }

        // Open download URL in new tab
        window.open(data.data.download_url, '_blank');
        toast.success(t('serverBackups.downloadSuccess'));
    } catch {
        toast.error(t('serverBackups.downloadFailed'));
    }
}

async function deleteBackup(backup: BackupItem) {
    confirmDialog.value = {
        title: t('serverBackups.delete'),
        description: t('serverBackups.deleteConfirm'),
        confirmText: t('serverBackups.delete'),
        variant: 'destructive',
    };
    showConfirmDialog.value = true;
    confirmAction.value = async () => {
        try {
            const { data } = await axios.delete(`/api/user/servers/${route.params.uuidShort}/backups/${backup.uuid}`);

            if (!data.success) {
                if (data.error === 'BACKUP_LOCKED') {
                    toast.error(t('serverBackups.deleteLockedError'));
                } else {
                    toast.error(data.message || t('serverBackups.deleteFailed'));
                }
                return;
            }

            toast.success(t('serverBackups.deleteSuccess'));
            await fetchBackups();
        } catch (error: unknown) {
            if (
                error &&
                typeof error === 'object' &&
                'response' in error &&
                (error as unknown as { response: { data: { error: string } } }).response &&
                typeof (error as unknown as { response: { data: { error: string } } }).response === 'object' &&
                'data' in (error as unknown as { response: { data: { error: string } } }).response &&
                (error as unknown as { response: { data: { error: string } } }).response.data &&
                typeof (error as unknown as { response: { data: { error: string } } }).response.data === 'object' &&
                'error' in (error as unknown as { response: { data: { error: string } } }).response.data &&
                (error as unknown as { response: { data: { error: string } } }).response.data.error === 'BACKUP_LOCKED'
            ) {
                toast.error(t('serverBackups.deleteLockedError'));
            } else {
                toast.error(t('serverBackups.deleteFailed'));
            }
        }
    };
}

async function lockBackup(backup: BackupItem) {
    confirmDialog.value = {
        title: t('serverBackups.lock'),
        description: t('serverBackups.lockConfirm'),
        confirmText: t('serverBackups.lock'),
        variant: 'default',
    };
    showConfirmDialog.value = true;
    confirmAction.value = async () => {
        try {
            loading.value = true;
            const { data } = await axios.post(
                `/api/user/servers/${route.params.uuidShort}/backups/${backup.uuid}/lock`,
            );

            if (!data.success) {
                toast.error(data.message || t('serverBackups.lockFailed'));
                return;
            }

            toast.success(t('serverBackups.lockSuccess'));
            await fetchBackups();
        } catch {
            toast.error(t('serverBackups.lockFailed'));
        } finally {
            loading.value = false;
        }
    };
}

async function unlockBackup(backup: BackupItem) {
    confirmDialog.value = {
        title: t('serverBackups.unlock'),
        description: t('serverBackups.unlockConfirm'),
        confirmText: t('serverBackups.unlock'),
        variant: 'default',
    };
    showConfirmDialog.value = true;
    confirmAction.value = async () => {
        try {
            loading.value = true;
            const { data } = await axios.post(
                `/api/user/servers/${route.params.uuidShort}/backups/${backup.uuid}/unlock`,
            );

            if (!data.success) {
                toast.error(data.message || t('serverBackups.unlockFailed'));
                return;
            }

            toast.success(t('serverBackups.unlockSuccess'));
            await fetchBackups();
        } catch {
            toast.error(t('serverBackups.unlockFailed'));
        } finally {
            loading.value = false;
        }
    };
}

function changePage(page: number) {
    if (page < 1) return;
    fetchBackups(page);
}

function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.current_page = 1;
    fetchBackups(1);
}

function formatDate(value?: string) {
    if (!value) return '';
    return new Date(value).toLocaleString();
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusVariant(isSuccessful: number, isLocked: number): string {
    if (isLocked) return 'secondary';
    if (isSuccessful) return 'default';
    return 'destructive';
}

function getStatusText(isSuccessful: number, isLocked: number): string {
    if (isLocked) return t('serverBackups.statusLocked');
    if (isSuccessful) return t('serverBackups.statusSuccessful');
    return t('serverBackups.statusFailed');
}

function addIgnoreFile() {
    if (newIgnoreFile.value.trim() && !ignoreFilesList.value.includes(newIgnoreFile.value.trim())) {
        ignoreFilesList.value.push(newIgnoreFile.value.trim());
        newIgnoreFile.value = '';
    }
}

function removeIgnoreFile(index: number) {
    ignoreFilesList.value.splice(index, 1);
}

async function onConfirmDialog() {
    if (!confirmAction.value) return;
    confirmLoading.value = true;
    try {
        await confirmAction.value();
        showConfirmDialog.value = false;
    } finally {
        confirmLoading.value = false;
        confirmAction.value = null;
    }
}
</script>
