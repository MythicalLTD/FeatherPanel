<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6 pb-8">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Header Section -->
            <div class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">{{ t('serverBackups.title') }}</h1>
                        <p class="text-sm text-muted-foreground">
                            {{ t('serverBackups.description') }}
                            <span v-if="serverInfo" class="font-medium">
                                ({{ backups.length }}/{{ serverInfo.backup_limit }})
                            </span>
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="loading"
                            class="flex items-center gap-2"
                            @click="refresh"
                        >
                            <RefreshCw :class="['h-4 w-4', loading && 'animate-spin']" />
                            <span>{{ t('serverBackups.refresh') }}</span>
                        </Button>
                        <Button
                            v-if="canCreateBackups"
                            size="sm"
                            :disabled="loading || (serverInfo && backups.length >= serverInfo.backup_limit)"
                            class="flex items-center gap-2"
                            data-umami-event="Create backup"
                            @click="openCreateBackupDrawer"
                        >
                            <Plus class="h-4 w-4" />
                            <span>{{ t('serverBackups.createBackup') }}</span>
                        </Button>
                    </div>
                </div>

                <!-- Backup Limit Warning -->
                <div
                    v-if="serverInfo && backups.length >= serverInfo.backup_limit"
                    class="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 border-2 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800"
                >
                    <div class="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                        <AlertTriangle class="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                            {{ t('serverBackups.backupLimitReached') }}
                        </h3>
                        <p class="text-sm text-yellow-700 dark:text-yellow-300">
                            {{ t('serverBackups.backupLimitReachedDescription', { limit: serverInfo.backup_limit }) }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Plugin Widgets: After Warning Banner -->
            <WidgetRenderer v-if="widgetsAfterWarning.length > 0" :widgets="widgetsAfterWarning" />

            <!-- Loading State -->
            <div v-if="loading && backups.length === 0" class="flex flex-col items-center justify-center py-16">
                <div class="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"></div>
                <span class="mt-4 text-muted-foreground">{{ t('common.loading') }}</span>
            </div>

            <!-- Empty State -->
            <div
                v-else-if="!loading && backups.length === 0 && !searchQuery"
                class="flex flex-col items-center justify-center py-16 px-4"
            >
                <div class="text-center max-w-md space-y-6">
                    <div class="flex justify-center">
                        <div class="relative">
                            <div class="absolute inset-0 animate-ping opacity-20">
                                <div class="w-32 h-32 rounded-full bg-primary/20"></div>
                            </div>
                            <div class="relative p-8 rounded-full bg-linear-to-br from-primary/20 to-primary/5">
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
                        v-if="canCreateBackups && serverInfo && serverInfo.backup_limit > 0"
                        size="lg"
                        class="gap-2 shadow-lg"
                        data-umami-event="Create backup"
                        @click="openCreateBackupDrawer"
                    >
                        <Plus class="h-5 w-5" />
                        {{ t('serverBackups.createBackup') }}
                    </Button>
                </div>
            </div>

            <!-- Plugin Widgets: Before Backups List -->
            <WidgetRenderer
                v-if="!loading && backups.length > 0 && widgetsBeforeBackups.length > 0"
                :widgets="widgetsBeforeBackups"
            />

            <!-- Backups List -->
            <Card v-if="!loading && backups.length > 0" class="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Archive class="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle class="text-lg">{{ t('serverBackups.backups') }}</CardTitle>
                                <CardDescription class="text-sm">
                                    {{ t('serverBackups.backupsDescription') }}
                                </CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div class="space-y-3">
                        <div
                            v-for="backup in backups"
                            :key="backup.id"
                            class="group relative rounded-lg border-2 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex flex-col gap-3"
                        >
                            <!-- Backup Header and Actions (Stacked on mobile, side by side on sm+) -->
                            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                                <div class="flex items-start gap-3 flex-1 min-w-0">
                                    <div
                                        class="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                                        :class="[backup.is_successful ? 'bg-green-500/10' : 'bg-red-500/10']"
                                    >
                                        <Archive
                                            class="h-5 w-5"
                                            :class="[backup.is_successful ? 'text-green-500' : 'text-red-500']"
                                        />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex flex-wrap items-center gap-2 mb-1">
                                            <h3 class="font-semibold text-sm truncate max-w-48 sm:max-w-none">
                                                {{ backup.name }}
                                            </h3>
                                            <Badge
                                                :variant="getStatusVariant(backup.is_successful, backup.is_locked)"
                                                class="text-xs shrink-0"
                                            >
                                                {{ getStatusText(backup.is_successful, backup.is_locked) }}
                                            </Badge>
                                        </div>
                                        <div
                                            class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
                                        >
                                            <span class="flex items-center gap-1">
                                                <HardDrive class="h-3 w-3" />
                                                {{ formatBytes(backup.bytes) }}
                                            </span>
                                            <span class="flex items-center gap-1">
                                                <Database class="h-3 w-3" />
                                                {{ backup.disk }}
                                            </span>
                                            <span class="flex items-center gap-1">
                                                <Calendar class="h-3 w-3" />
                                                {{ formatDate(backup.created_at) }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <!-- Lock/Unlock Button (float right on desktop, below on mobile) -->
                                <div
                                    v-if="canViewBackups"
                                    class="flex flex-row sm:flex-col items-center gap-1 mt-2 sm:mt-0 self-end sm:self-start"
                                >
                                    <Button
                                        v-if="backup.is_locked"
                                        variant="ghost"
                                        size="sm"
                                        class="h-8 w-8 p-0"
                                        :disabled="loading"
                                        @click="unlockBackup(backup)"
                                    >
                                        <Lock class="h-4 w-4" />
                                    </Button>
                                    <Button
                                        v-else
                                        variant="ghost"
                                        size="sm"
                                        class="h-8 w-8 p-0"
                                        :disabled="loading"
                                        @click="lockBackup(backup)"
                                    >
                                        <Unlock class="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <!-- Backup Actions: Responsive grid for mobile friendliness -->
                            <div
                                v-if="canRestoreBackups || canDownloadBackups || canDeleteBackups"
                                class="flex flex-wrap gap-2 justify-start sm:justify-between"
                            >
                                <div class="flex flex-wrap gap-2 flex-1">
                                    <Button
                                        v-if="canRestoreBackups && backup.is_successful && !backup.is_locked"
                                        variant="outline"
                                        size="sm"
                                        :disabled="loading"
                                        class="flex items-center gap-2"
                                        data-umami-event="Restore backup"
                                        :data-umami-event-backup="backup.name"
                                        @click="openRestoreBackupDrawer(backup)"
                                    >
                                        <RotateCcw class="h-3.5 w-3.5" />
                                        <span class="hidden xs:inline">{{ t('serverBackups.restore') }}</span>
                                    </Button>
                                    <Button
                                        v-if="canDownloadBackups && backup.is_successful"
                                        variant="outline"
                                        size="sm"
                                        :disabled="loading"
                                        class="flex items-center gap-2"
                                        data-umami-event="Download backup"
                                        :data-umami-event-backup="backup.name"
                                        @click="downloadBackup(backup)"
                                    >
                                        <Download class="h-3.5 w-3.5" />
                                        <span class="hidden xs:inline">{{ t('serverBackups.download') }}</span>
                                    </Button>
                                    <Button
                                        v-if="canDeleteBackups && !backup.is_locked"
                                        variant="destructive"
                                        size="sm"
                                        :disabled="loading"
                                        class="flex items-center gap-2"
                                        data-umami-event="Delete backup"
                                        :data-umami-event-backup="backup.name"
                                        @click="deleteBackup(backup)"
                                    >
                                        <Trash2 class="h-3.5 w-3.5" />
                                        <span class="hidden xs:inline">{{ t('serverBackups.delete') }}</span>
                                    </Button>
                                </div>
                                <div
                                    v-if="backup.is_locked"
                                    class="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 mt-1 sm:mt-0"
                                >
                                    <Lock class="h-3 w-3" />
                                    <span>{{ t('serverBackups.backupLocked') }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Empty Search Result -->
                        <div v-if="backups.length === 0 && searchQuery" class="text-center py-8 text-muted-foreground">
                            <p class="text-sm">{{ t('serverBackups.noResultsFound') }}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Plugin Widgets: After Backups List -->
            <WidgetRenderer
                v-if="!loading && backups.length > 0 && widgetsAfterBackups.length > 0"
                :widgets="widgetsAfterBackups"
            />

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>

        <!-- Confirm Dialog -->
        <Dialog v-model:open="showConfirmDialog">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle class="flex items-center gap-2">
                        <div
                            class="h-10 w-10 rounded-lg flex items-center justify-center"
                            :class="[confirmDialog.variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10']"
                        >
                            <AlertTriangle
                                v-if="confirmDialog.variant === 'destructive'"
                                class="h-5 w-5 text-destructive"
                            />
                            <Info v-else class="h-5 w-5 text-primary" />
                        </div>
                        <span>{{ confirmDialog.title }}</span>
                    </DialogTitle>
                    <DialogDescription class="text-sm">
                        {{ confirmDialog.description }}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter class="gap-2">
                    <Button variant="outline" size="sm" :disabled="confirmLoading" @click="showConfirmDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button
                        :variant="confirmDialog.variant"
                        size="sm"
                        :disabled="confirmLoading"
                        @click="onConfirmDialog"
                    >
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
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Plus class="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DrawerTitle>{{ t('serverBackups.createBackup') }}</DrawerTitle>
                            <DrawerDescription>
                                {{ t('serverBackups.createBackupDescription') }}
                            </DrawerDescription>
                        </div>
                    </div>
                </DrawerHeader>
                <form class="space-y-5 px-6 pb-6 pt-2" @submit.prevent="createBackup">
                    <div class="space-y-2">
                        <Label for="backup-name" class="text-sm font-medium">{{ t('serverBackups.name') }}</Label>
                        <Input
                            id="backup-name"
                            v-model="newBackup.name"
                            :placeholder="t('serverBackups.namePlaceholder')"
                            required
                            class="text-sm"
                        />
                    </div>

                    <div class="space-y-3">
                        <Label class="text-sm font-medium">{{ t('serverBackups.ignoreFiles') }}</Label>
                        <div class="flex gap-2">
                            <Input
                                v-model="newIgnoreFile"
                                :placeholder="t('serverBackups.addIgnoreFile')"
                                class="flex-1 text-sm font-mono"
                                @keyup.enter="addIgnoreFile"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                class="flex items-center gap-2"
                                @click="addIgnoreFile"
                            >
                                <Plus class="h-4 w-4" />
                                <span>Add</span>
                            </Button>
                        </div>

                        <div v-if="ignoreFilesList.length > 0" class="space-y-2">
                            <div class="text-xs text-muted-foreground flex items-center gap-1.5">
                                <FileX class="h-3 w-3" />
                                {{ t('serverBackups.ignoreFilesList') }}
                            </div>
                            <div class="space-y-2 max-h-40 overflow-y-auto border-2 rounded-lg p-2">
                                <div
                                    v-for="(file, index) in ignoreFilesList"
                                    :key="index"
                                    class="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md hover:bg-muted transition-colors"
                                >
                                    <span class="text-sm font-mono flex-1 truncate">{{ file }}</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        class="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        @click="removeIgnoreFile(index)"
                                    >
                                        <Trash2 class="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-start gap-2 p-3 bg-muted/30 rounded-lg border">
                            <Info class="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <p class="text-xs text-muted-foreground">
                                {{ t('serverBackups.ignoreFilesHelp') }}
                            </p>
                        </div>
                    </div>

                    <div class="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" size="sm" @click="showCreateBackupDrawer = false">
                            {{ t('common.cancel') }}
                        </Button>
                        <Button type="submit" size="sm" :disabled="creatingBackup" class="flex items-center gap-2">
                            <Loader2 v-if="creatingBackup" class="h-4 w-4 animate-spin" />
                            <span>{{ t('serverBackups.create') }}</span>
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
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <RotateCcw class="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                            <DrawerTitle>{{ t('serverBackups.restoreBackup') }}</DrawerTitle>
                            <DrawerDescription>
                                {{ t('serverBackups.restoreBackupDescription') }}
                            </DrawerDescription>
                        </div>
                    </div>
                </DrawerHeader>
                <form class="space-y-5 px-6 pb-6 pt-2" @submit.prevent="confirmRestoreBackup">
                    <div
                        class="p-4 bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg"
                    >
                        <div class="flex items-start gap-3">
                            <AlertTriangle class="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                            <div>
                                <p class="font-semibold text-orange-800 dark:text-orange-200 mb-1 text-sm">Warning</p>
                                <p class="text-sm text-orange-700 dark:text-orange-300">
                                    {{ t('serverBackups.truncateDirectoryHelp') }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border">
                        <Checkbox id="truncate-directory" v-model:checked="restoreBackup.truncate_directory" />
                        <label for="truncate-directory" class="text-sm font-medium cursor-pointer">
                            {{ t('serverBackups.truncateDirectory') }}
                        </label>
                    </div>

                    <div class="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" size="sm" @click="showRestoreBackupDrawer = false">
                            {{ t('common.cancel') }}
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            size="sm"
                            :disabled="restoringBackup"
                            class="flex items-center gap-2"
                        >
                            <Loader2 v-if="restoringBackup" class="h-4 w-4 animate-spin" />
                            <span>{{ t('serverBackups.confirmRestore') }}</span>
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
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BadgeVariants } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useServerPermissions } from '@/composables/useServerPermissions';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';

import {
    Plus,
    RotateCcw,
    Download,
    Trash2,
    Loader2,
    Lock,
    Unlock,
    Archive,
    AlertTriangle,
    Info,
    HardDrive,
    Database,
    Calendar,
    FileX,
    RefreshCw,
} from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';

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
const router = useRouter();
const { t } = useI18n();
const toast = useToast();

// Check server permissions
const { hasPermission: hasServerPermission, isLoading: permissionsLoading } = useServerPermissions();

// Permission checks
const canViewBackups = computed(() => hasServerPermission('backup.read'));
const canCreateBackups = computed(() => hasServerPermission('backup.create'));
const canRestoreBackups = computed(() => hasServerPermission('backup.restore'));
const canDownloadBackups = computed(() => hasServerPermission('backup.download'));
const canDeleteBackups = computed(() => hasServerPermission('backup.delete'));

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

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('server-backups');
const widgetsTopOfPage = computed(() => getWidgets('server-backups', 'top-of-page'));
const widgetsAfterWarning = computed(() => getWidgets('server-backups', 'after-warning-banner'));
const widgetsBeforeBackups = computed(() => getWidgets('server-backups', 'before-backups-list'));
const widgetsAfterBackups = computed(() => getWidgets('server-backups', 'after-backups-list'));
const widgetsBottomOfPage = computed(() => getWidgets('server-backups', 'bottom-of-page'));

const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverBackups.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/backups` },
]);

onMounted(async () => {
    // Wait for permission check to complete
    while (permissionsLoading.value) {
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Check if user has permission to view backups
    if (!canViewBackups.value) {
        toast.error(t('serverBackups.noBackupPermission'));
        await router.push(`/server/${route.params.uuidShort}`);
        return;
    }

    await fetchBackups();

    // Fetch plugin widgets
    await fetchPluginWidgets();
});

function refresh() {
    fetchBackups(pagination.value.current_page || 1);
}

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

function openCreateBackupDrawer() {
    // Generate a new backup name with timestamp
    newBackup.value.name = generateBackupName();
    newBackup.value.ignore = '';
    newIgnoreFile.value = '';
    ignoreFilesList.value = [];
    showCreateBackupDrawer.value = true;
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

function generateBackupName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `Backup-${year}-${month}-${day}-${hours}${minutes}`;
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

function getStatusVariant(isSuccessful: number, isLocked: number): BadgeVariants['variant'] {
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
