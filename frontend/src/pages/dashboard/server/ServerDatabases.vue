<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <TableComponent
                :title="t('serverDatabases.title')"
                :description="t('serverDatabases.description')"
                :columns="tableColumns"
                :data="databases"
                :search-placeholder="t('serverDatabases.searchPlaceholder')"
                :server-side-pagination="true"
                :total-records="pagination.total"
                :total-pages="pagination.last_page"
                :current-page="pagination.current_page"
                :has-next="pagination.current_page < pagination.last_page"
                :has-prev="pagination.current_page > 1"
                :from="pagination.from"
                :to="pagination.to"
                local-storage-key="featherpanel-server-databases-columns"
                @search="handleSearch"
                @page-change="changePage"
                @column-toggle="handleColumnToggle"
            >
                <template #header-actions>
                    <Button variant="outline" size="sm" :disabled="loading" @click="refresh">
                        <RefreshCw class="h-4 w-4 mr-2" />
                        {{ t('common.refresh') }}
                    </Button>
                    <Button @click="openCreateDatabaseDrawer">
                        <Plus class="h-4 w-4 mr-2" />
                        {{ t('serverDatabases.createDatabase') }}
                    </Button>
                </template>

                <template #cell-database="{ item }">
                    <div class="font-medium">{{ (item as DatabaseItem).database }}</div>
                </template>

                <template #cell-username="{ item }">
                    <div class="text-sm text-muted-foreground">{{ (item as DatabaseItem).username }}</div>
                </template>

                <template #cell-host="{ item }">
                    <div class="text-sm text-muted-foreground">{{ (item as DatabaseItem).host_name }}</div>
                </template>

                <template #cell-remote="{ item }">
                    <Badge variant="outline" class="text-xs">
                        {{ (item as DatabaseItem).remote }}
                    </Badge>
                </template>

                <template #cell-connections="{ item }">
                    <span class="text-sm">{{ (item as DatabaseItem).max_connections || 0 }}</span>
                </template>

                <template #cell-created="{ item }">
                    <span class="text-sm">{{ formatDate((item as DatabaseItem).created_at) }}</span>
                </template>

                <template #cell-actions="{ item }">
                    <div class="flex gap-2">
                        <Button size="sm" variant="outline" @click="openViewDatabaseDrawer(item as DatabaseItem)">
                            <Eye class="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" @click="deleteDatabase(item as DatabaseItem)">
                            <Trash2 class="h-4 w-4" />
                        </Button>
                    </div>
                </template>
            </TableComponent>
        </div>

        <!-- Create Database Drawer -->
        <Drawer
            class="w-full"
            :open="createDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeCreateDrawer();
                }
            "
        >
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{{ t('serverDatabases.createDatabase') }}</DrawerTitle>
                    <DrawerDescription>{{ t('serverDatabases.createDatabaseDescription') }}</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-6 p-6" @submit.prevent="createDatabase">
                    <!-- Database Host -->
                    <div class="space-y-2">
                        <Label for="database-host" class="text-sm font-medium">
                            {{ t('serverDatabases.databaseHost') }}
                        </Label>
                        <Select v-model="createForm.database_host_id" required>
                            <SelectTrigger class="w-full">
                                <SelectValue :placeholder="t('serverDatabases.selectDatabaseHost')" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="host in availableHosts" :key="host.id" :value="host.id">
                                    {{ host.name }} ({{ host.database_type }})
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.databaseHostHelp') }}
                        </p>
                    </div>

                    <!-- Database Name -->
                    <div class="space-y-2">
                        <Label for="database-name" class="text-sm font-medium">
                            {{ t('serverDatabases.databaseName') }}
                        </Label>
                        <Input
                            id="database-name"
                            v-model="createForm.database"
                            type="text"
                            :placeholder="t('serverDatabases.databaseNamePlaceholder')"
                            required
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.databaseNameHelp') }}
                        </p>
                    </div>

                    <!-- Remote Access -->
                    <div class="space-y-2">
                        <Label for="database-remote" class="text-sm font-medium">
                            {{ t('serverDatabases.remoteAccess') }}
                        </Label>
                        <Input
                            id="database-remote"
                            v-model="createForm.remote"
                            type="text"
                            :placeholder="'%'"
                            required
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.remoteAccessHelp') }}
                        </p>
                    </div>

                    <!-- Max Connections -->
                    <div class="space-y-2">
                        <Label for="database-max-connections" class="text-sm font-medium">
                            {{ t('serverDatabases.maxConnections') }}
                        </Label>
                        <Input
                            id="database-max-connections"
                            v-model="createForm.max_connections"
                            type="number"
                            min="0"
                            :placeholder="'0'"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.maxConnectionsHelp') }}
                        </p>
                    </div>

                    <DrawerFooter>
                        <Button type="submit" :disabled="creating">
                            <Loader2 v-if="creating" class="h-4 w-4 mr-2 animate-spin" />
                            {{ t('serverDatabases.createDatabase') }}
                        </Button>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </Drawer>

        <!-- Edit Database Drawer -->
        <Drawer
            class="w-full"
            :open="viewDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeViewDrawer();
                }
            "
        >
            <DrawerContent v-if="viewingDatabase">
                <DrawerHeader>
                    <DrawerTitle>{{ t('serverDatabases.viewDatabase') }}</DrawerTitle>
                    <DrawerDescription>{{ t('serverDatabases.viewDatabaseDescription') }}</DrawerDescription>
                </DrawerHeader>
                <div class="space-y-6 p-6">
                    <!-- Database Host (Read-only) -->
                    <div class="space-y-2">
                        <Label class="text-sm font-medium">
                            {{ t('serverDatabases.databaseHost') }}
                        </Label>
                        <Input :value="viewingDatabase.host_name" disabled class="bg-muted" />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.databaseHostReadOnly') }}
                        </p>
                    </div>

                    <!-- Database Name (Read-only) -->
                    <div class="space-y-2">
                        <Label class="text-sm font-medium">
                            {{ t('serverDatabases.databaseName') }}
                        </Label>
                        <Input :value="viewingDatabase.database" disabled class="bg-muted" />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.databaseNameReadOnly') }}
                        </p>
                    </div>

                    <!-- Username (Read-only) -->
                    <div class="space-y-2">
                        <Label class="text-sm font-medium">
                            {{ t('serverDatabases.username') }}
                        </Label>
                        <Input :value="viewingDatabase.username" disabled class="bg-muted" />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.usernameReadOnly') }}
                        </p>
                    </div>

                    <!-- Remote Access (Read-only) -->
                    <div class="space-y-2">
                        <Label class="text-sm font-medium">
                            {{ t('serverDatabases.remoteAccess') }}
                        </Label>
                        <Input :value="viewingDatabase.remote" disabled class="bg-muted" />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.remoteAccessReadOnly') }}
                        </p>
                    </div>

                    <!-- Max Connections (Read-only) -->
                    <div class="space-y-2">
                        <Label class="text-sm font-medium">
                            {{ t('serverDatabases.maxConnections') }}
                        </Label>
                        <Input :value="viewingDatabase.max_connections" disabled class="bg-muted" />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.maxConnectionsReadOnly') }}
                        </p>
                    </div>

                    <!-- Created At (Read-only) -->
                    <div class="space-y-2">
                        <Label class="text-sm font-medium">
                            {{ t('serverDatabases.createdAt') }}
                        </Label>
                        <Input :value="formatDate(viewingDatabase.created_at)" disabled class="bg-muted" />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.createdAtReadOnly') }}
                        </p>
                    </div>

                    <DrawerFooter>
                        <Button type="button" variant="outline" @click="closeViewDrawer">
                            {{ t('common.close') }}
                        </Button>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>

        <!-- Confirmation Dialog -->
        <AlertDialog v-model:open="showConfirmDialog">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ confirmDialog.title }}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {{ confirmDialog.description }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{{ t('common.cancel') }}</AlertDialogCancel>
                    <AlertDialogAction
                        :class="
                            confirmDialog.variant === 'destructive'
                                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                : ''
                        "
                        @click="onConfirmDialog"
                    >
                        <Loader2 v-if="confirmLoading" class="h-4 w-4 mr-2 animate-spin" />
                        {{ confirmDialog.confirmText }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import TableComponent from '@/kit/TableComponent.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
} from '@/components/ui/drawer';
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
import { RefreshCw, Plus, Trash2, Loader2, Eye } from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import type { TableColumn } from '@/kit/types';

type DatabaseItem = {
    id: number;
    server_id: number;
    database_host_id: number;
    database: string;
    username: string;
    remote: string;
    password: string;
    max_connections: number;
    created_at: string;
    updated_at: string;
    host_name?: string;
    host_type?: string;
};

type DatabaseHost = {
    id: number;
    name: string;
    database_type: string;
    database_host: string;
    database_port: number;
};

const route = useRoute();
const { t } = useI18n();
const toast = useToast();

const databases = ref<DatabaseItem[]>([]);
const availableHosts = ref<DatabaseHost[]>([]);
const loading = ref(false);
const creating = ref(false);
const searchQuery = ref('');
const server = ref<{ name: string } | null>(null);
const pagination = ref({
    current_page: 1,
    per_page: 20,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
});

// Drawer states
const createDrawerOpen = ref(false);
const viewDrawerOpen = ref(false);
const viewingDatabase = ref<DatabaseItem | null>(null);

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
const createForm = ref({
    database_host_id: '',
    database: '',
    remote: '%',
    max_connections: 0,
});

// Computed
const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverDatabases.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/databases` },
]);

const tableColumns: TableColumn[] = [
    { key: 'database', label: t('serverDatabases.database'), searchable: true },
    { key: 'username', label: t('serverDatabases.username'), searchable: true },
    { key: 'host', label: t('serverDatabases.host') },
    { key: 'remote', label: t('serverDatabases.remote') },
    { key: 'connections', label: t('serverDatabases.maxConnections') },
    { key: 'created', label: t('serverDatabases.createdAt') },
    { key: 'actions', label: t('common.actions'), headerClass: 'w-[200px] font-semibold' },
];

// Lifecycle
onMounted(async () => {
    await Promise.all([fetchDatabases(), fetchAvailableHosts()]);
});

// Methods
async function fetchDatabases(page = pagination.value.current_page) {
    try {
        loading.value = true;
        const { data } = await axios.get(`/api/user/servers/${route.params.uuidShort}/databases`, {
            params: { page, per_page: pagination.value.per_page, search: searchQuery.value || undefined },
        });
        if (!data.success) {
            toast.error(data.message || t('serverDatabases.failedToFetch'));
            return;
        }
        databases.value = data.data.data || [];
        pagination.value = data.data.pagination;
    } catch {
        toast.error(t('serverDatabases.failedToFetch'));
    } finally {
        loading.value = false;
    }
}

async function fetchAvailableHosts() {
    try {
        const { data } = await axios.get(`/api/user/servers/${route.params.uuidShort}/databases/hosts`);
        if (data.success) {
            availableHosts.value = data.data || [];
        }
    } catch (error) {
        console.error('Failed to fetch available hosts:', error);
    }
}

function changePage(page: number) {
    if (page < 1) return;
    fetchDatabases(page);
}

function refresh() {
    fetchDatabases();
}

function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.current_page = 1;
    fetchDatabases(1);
}

function handleColumnToggle(columns: string[]) {
    console.log('Columns changed:', columns);
}

function formatDate(value?: string | null) {
    if (!value) return t('common.never');
    return new Date(value).toLocaleString();
}

// Create database
function openCreateDatabaseDrawer() {
    createDrawerOpen.value = true;
    createForm.value = {
        database_host_id: '',
        database: '',
        remote: '%',
        max_connections: 0,
    };
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
}

async function createDatabase() {
    try {
        creating.value = true;
        const { data } = await axios.post(`/api/user/servers/${route.params.uuidShort}/databases`, createForm.value);

        if (!data.success) {
            toast.error(data.message || data.error_message || t('serverDatabases.createFailed'));
            return;
        }

        toast.success(t('serverDatabases.createSuccess'));
        closeCreateDrawer();
        await fetchDatabases();
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            if (axiosError.response?.data?.message) {
                toast.error(axiosError.response.data.message);
            } else if (axiosError.response?.data?.error_message) {
                toast.error(axiosError.response.data.error_message);
            } else {
                toast.error(t('serverDatabases.createFailed'));
            }
        } else {
            toast.error(t('serverDatabases.createFailed'));
        }
        console.error('Error creating database:', error);
    } finally {
        creating.value = false;
    }
}

// Edit database
function openViewDatabaseDrawer(database: DatabaseItem) {
    viewingDatabase.value = database;
    viewDrawerOpen.value = true;
}

function closeViewDrawer() {
    viewDrawerOpen.value = false;
    viewingDatabase.value = null;
}

// Delete database
function deleteDatabase(database: DatabaseItem) {
    confirmDialog.value = {
        title: t('serverDatabases.confirmDeleteTitle'),
        description: t('serverDatabases.confirmDeleteDescription', { database: database.database }),
        confirmText: t('serverDatabases.confirmDelete'),
        variant: 'destructive',
    };
    confirmAction.value = () => deleteDatabaseConfirm(database.id);
    showConfirmDialog.value = true;
}

async function deleteDatabaseConfirm(databaseId: number) {
    try {
        confirmLoading.value = true;
        const { data } = await axios.delete(`/api/user/servers/${route.params.uuidShort}/databases/${databaseId}`);

        if (!data.success) {
            toast.error(data.message || data.error_message || t('serverDatabases.deleteFailed'));
            return;
        }

        toast.success(t('serverDatabases.deleteSuccess'));
        showConfirmDialog.value = false;
        await fetchDatabases();
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            if (axiosError.response?.data?.message) {
                toast.error(axiosError.response.data.message);
            } else if (axiosError.response?.data?.error_message) {
                toast.error(axiosError.response.data.error_message);
            } else {
                toast.error(t('serverDatabases.deleteFailed'));
            }
        } else {
            toast.error(t('serverDatabases.deleteFailed'));
        }
        console.error('Error deleting database:', error);
    } finally {
        confirmLoading.value = false;
    }
}

function onConfirmDialog() {
    if (!confirmAction.value) return;
    confirmLoading.value = true;
    confirmAction.value();
}
</script>
