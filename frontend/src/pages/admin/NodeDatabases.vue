<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading databases...</span>
                </div>
            </div>

            <!-- Error State -->
            <div
                v-else-if="message?.type === 'error'"
                class="flex flex-col items-center justify-center py-12 text-center"
            >
                <div class="text-red-500 mb-4">
                    <svg class="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load databases</h3>
                <p class="text-sm text-muted-foreground max-w-sm">
                    {{ message.text }}
                </p>
                <Button class="mt-4" @click="fetchDatabases">Try Again</Button>
            </div>

            <!-- Databases Table -->
            <div v-else class="p-6">
                <TableComponent
                    title="Node Databases"
                    :description="`Managing databases for node: ${node?.name}`"
                    :columns="tableColumns"
                    :data="databases"
                    :search-placeholder="'Search by name or host...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-node-databases-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <Button variant="outline" size="sm" @click="openCreateDrawer">
                            <Plus class="h-4 w-4 mr-2" />
                            Add Database
                        </Button>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-status="{ item }">
                        <div class="flex items-center gap-2">
                            <div
                                :class="[
                                    'h-2 w-2 rounded-full',
                                    (item as unknown as Database).healthy ? 'bg-green-500' : 'bg-red-500',
                                ]"
                            ></div>
                            <span class="text-xs">
                                {{ (item as unknown as Database).healthy ? 'Healthy' : 'Unhealthy' }}
                            </span>
                        </div>
                    </template>

                    <template #cell-type="{ item }">
                        <Badge :variant="getDatabaseTypeVariant((item as unknown as Database).database_type)">
                            {{ (item as unknown as Database).database_type }}
                        </Badge>
                    </template>

                    <template #cell-created="{ item }">
                        {{ formatDate((item as unknown as Database).created_at) }}
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button size="sm" variant="outline" @click="onView(item as unknown as Database)">
                                <Eye :size="16" />
                            </Button>
                            <Button size="sm" variant="secondary" @click="onEdit(item as unknown as Database)">
                                <Pencil :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                title="Check Health"
                                @click="onHealthCheck(item as unknown as Database)"
                            >
                                <Activity :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as unknown as Database).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    :loading="deleting"
                                    @click="confirmDelete(item as unknown as Database)"
                                >
                                    Confirm Delete
                                </Button>
                                <Button size="sm" variant="outline" :disabled="deleting" @click="onCancelDelete">
                                    Cancel
                                </Button>
                            </template>
                            <template v-else>
                                <Button size="sm" variant="destructive" @click="onDelete(item as unknown as Database)">
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>
                <!-- Databases info card under the table -->
                <Card class="mt-6">
                    <CardContent>
                        <div class="p-4 text-sm text-muted-foreground">
                            <div class="font-semibold text-foreground mb-1">About Databases</div>
                            <p>
                                These are databases that your users (clients) can create for their servers. Users can
                                create multiple database types depending on the limits you set as the hosting owner.
                                FeatherPanel supports a broad range of popular databases to fit many workloads.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

        <!-- Drawers -->
        <Drawer v-model:open="showDrawer" class="w-full">
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{{
                        drawerMode === 'create'
                            ? 'Add Database'
                            : drawerMode === 'edit'
                              ? 'Edit Database'
                              : 'View Database'
                    }}</DrawerTitle>
                    <DrawerDescription>
                        {{
                            drawerMode === 'create'
                                ? 'Add a new database to this node.'
                                : drawerMode === 'edit'
                                  ? 'Edit the selected database.'
                                  : 'View database details.'
                        }}
                    </DrawerDescription>
                </DrawerHeader>
                <Alert
                    v-if="drawerMessage"
                    :variant="drawerMessage.type === 'error' ? 'destructive' : 'default'"
                    class="mb-4 whitespace-nowrap overflow-x-auto"
                >
                    <span>{{ drawerMessage.text }}</span>
                </Alert>
                <form
                    v-if="drawerMode !== 'view'"
                    class="space-y-4 p-4 overflow-y-auto max-h-[calc(100vh-200px)]"
                    @submit.prevent="submitForm"
                >
                    <div class="space-y-4">
                        <div>
                            <label class="block font-medium mb-1">Database Name</label>
                            <Input v-model="form.name" :disabled="formLoading" placeholder="Enter database name" />
                            <div v-if="formErrors.name" class="text-red-500 text-xs mt-1">
                                {{ formErrors.name }}
                            </div>
                        </div>
                        <div>
                            <label class="block font-medium mb-1">Database Type</label>
                            <Select v-model="form.database_type" :disabled="formLoading">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select database type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mysql">MySQL</SelectItem>
                                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                                    <SelectItem value="mariadb">MariaDB</SelectItem>
                                </SelectContent>
                            </Select>
                            <div v-if="formErrors.database_type" class="text-red-500 text-xs mt-1">
                                {{ formErrors.database_type }}
                            </div>
                        </div>
                        <div>
                            <label class="block font-medium mb-1">Host</label>
                            <Input v-model="form.database_host" :disabled="formLoading" placeholder="localhost" />
                            <div class="text-xs text-muted-foreground">
                                Enter the hostname or IP address of the database server.
                            </div>
                            <div v-if="formErrors.database_host" class="text-red-500 text-xs mt-1">
                                {{ formErrors.database_host }}
                            </div>
                        </div>
                        <div>
                            <label class="block font-medium mb-1">Port</label>
                            <Input
                                v-model.number="form.database_port"
                                type="number"
                                :disabled="formLoading"
                                placeholder="3306"
                            />
                            <div class="text-xs text-muted-foreground">
                                Default ports: MySQL/MariaDB (3306), PostgreSQL (5432)
                            </div>
                            <div v-if="formErrors.database_port" class="text-red-500 text-xs mt-1">
                                {{ formErrors.database_port }}
                            </div>
                        </div>
                        <div>
                            <label class="block font-medium mb-1">Username</label>
                            <Input v-model="form.database_username" :disabled="formLoading" placeholder="root" />
                            <div v-if="formErrors.database_username" class="text-red-500 text-xs mt-1">
                                {{ formErrors.database_username }}
                            </div>
                        </div>
                        <div>
                            <label class="block font-medium mb-1">Password</label>
                            <Input
                                v-model="form.database_password"
                                type="password"
                                :disabled="formLoading"
                                placeholder="Enter password"
                            />
                            <div class="text-xs text-muted-foreground">The password will not be encrypted!!!!</div>
                            <div v-if="formErrors.database_password" class="text-red-500 text-xs mt-1">
                                {{ formErrors.database_password }}
                            </div>
                        </div>
                    </div>
                    <DrawerFooter class="mt-4">
                        <Button type="submit" variant="default" class="w-full" :loading="formLoading">
                            {{ drawerMode === 'create' ? 'Create Database' : 'Update Database' }}
                        </Button>
                        <Button type="button" class="w-full" variant="outline" @click="closeDrawer"> Cancel </Button>
                    </DrawerFooter>
                </form>
                <div v-else class="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                    <Card>
                        <CardHeader>
                            <CardTitle class="text-lg">Database Overview</CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-3">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div class="text-sm font-medium text-muted-foreground">Name</div>
                                    <div class="text-sm">{{ viewDatabase?.name }}</div>
                                </div>
                                <div>
                                    <div class="text-sm font-medium text-muted-foreground">Type</div>
                                    <div class="text-sm">
                                        <Badge :variant="getDatabaseTypeVariant(viewDatabase?.database_type)">
                                            {{ viewDatabase?.database_type }}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <div class="text-sm font-medium text-muted-foreground">Host</div>
                                    <div class="text-sm">{{ viewDatabase?.database_host }}</div>
                                </div>
                                <div>
                                    <div class="text-sm font-medium text-muted-foreground">Port</div>
                                    <div class="text-sm">{{ viewDatabase?.database_port }}</div>
                                </div>
                                <div>
                                    <div class="text-sm font-medium text-muted-foreground">Username</div>
                                    <div class="text-sm">{{ viewDatabase?.database_username }}</div>
                                </div>
                                <div>
                                    <div class="text-sm font-medium text-muted-foreground">Created</div>
                                    <div class="text-sm">{{ formatDate(viewDatabase?.created_at) }}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <DrawerFooter>
                        <Button type="button" variant="outline" class="w-full" @click="closeDrawer">Close</Button>
                    </DrawerFooter>
                </div>
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

import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Pencil, Trash2, Activity, Database, Plus } from 'lucide-vue-next';
import axios from 'axios';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TableComponent from '@/kit/TableComponent.vue';
import type { TableColumn } from '@/kit/types';

// Helper function to get default port based on database type
function getDefaultPort(databaseType: string): number {
    switch (databaseType) {
        case 'mysql':
        case 'mariadb':
            return 3306;
        case 'postgresql':
            return 5432;
        default:
            return 3306;
    }
}

interface Database {
    id: number;
    name: string;
    node_id: number;
    database_type: string;
    database_port: number;
    database_username: string;
    database_password: string;
    database_host: string;
    created_at: string;
    updated_at: string;
    healthy?: boolean;
}

interface Node {
    id: number;
    name: string;
    fqdn: string;
    location_id: number;
}

const route = useRoute();
const nodeId = computed(() => Number(route.params.nodeId));

// Reactive data
const databases = ref<Database[]>([]);
const node = ref<Node | null>(null);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const drawerMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const searchQuery = ref('');
const showDrawer = ref(false);
const drawerMode = ref<'create' | 'edit' | 'view'>('create');
const editingDatabaseId = ref<number | null>(null);
const viewDatabase = ref<Database | null>(null);
const confirmDeleteRow = ref<number | null>(null);
const deleting = ref(false);
const formLoading = ref(false);
const loading = ref(false);

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'status', label: 'Status', headerClass: 'w-[100px]' },
    { key: 'name', label: 'Name', searchable: true },
    { key: 'type', label: 'Type' },
    { key: 'database_host', label: 'Host', searchable: true },
    { key: 'database_port', label: 'Port' },
    { key: 'database_username', label: 'Username' },
    { key: 'created', label: 'Created' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[200px] font-semibold' },
];

// Form data
const form = ref({
    name: '',
    database_type: 'mysql',
    database_host: 'localhost',
    database_port: 3306,
    database_username: '',
    database_password: '',
});

const formErrors = ref<Record<string, string>>({});

// Pagination
const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0,
    hasNext: false,
    hasPrev: false,
    from: 0,
    to: 0,
});

// Breadcrumbs
const breadcrumbs = computed(() => [
    { text: 'Admin', href: '/admin' },
    { text: 'Locations', href: '/admin/locations' },
    { text: 'Nodes', href: '/admin/locations' },
    { text: 'Databases', href: `/admin/nodes/${nodeId.value}/databases` },
]);

// Methods
async function fetchDatabases() {
    loading.value = true;
    try {
        const response = await axios.get(`/api/admin/databases/node/${nodeId.value}`, {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value,
            },
        });
        databases.value = response.data.data.databases;

        // Map the API response pagination to our expected format
        const apiPagination = response.data.data.pagination;
        pagination.value = {
            page: apiPagination.current_page,
            pageSize: apiPagination.per_page,
            total: apiPagination.total_records,
            hasNext: apiPagination.has_next,
            hasPrev: apiPagination.has_prev,
            from: apiPagination.from,
            to: apiPagination.to,
        };
    } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        message.value = { type: 'error', text: err?.response?.data?.message || 'Failed to fetch databases' };
    } finally {
        loading.value = false;
    }
}

async function fetchNode() {
    try {
        const response = await axios.get(`/api/admin/nodes/${nodeId.value}`);
        node.value = response.data.data.node;
    } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        message.value = { type: 'error', text: err?.response?.data?.message || 'Failed to fetch node' };
    }
}

async function checkDatabaseHealth(database: Database) {
    try {
        const response = await axios.get(`/api/admin/databases/${database.id}/health`);
        const healthData = response.data.data;
        database.healthy = healthData.healthy;
    } catch (e) {
        console.error(e);
        database.healthy = false;
    }
}

async function checkAllDatabasesHealth() {
    await Promise.all(databases.value.map(checkDatabaseHealth));
}

// Table event handlers
function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.page = 1; // Reset to first page when searching
    fetchDatabases();
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchDatabases();
}

function openCreateDrawer() {
    drawerMode.value = 'create';
    editingDatabaseId.value = null;
    viewDatabase.value = null;
    resetForm();
    showDrawer.value = true;
}

function onView(database: Database) {
    drawerMode.value = 'view';
    viewDatabase.value = database;
    showDrawer.value = true;
}

function onEdit(database: Database) {
    drawerMode.value = 'edit';
    editingDatabaseId.value = database.id;
    viewDatabase.value = null;
    form.value = {
        name: database.name,
        database_type: database.database_type,
        database_host: database.database_host,
        database_port: database.database_port,
        database_username: database.database_username,
        database_password: '', // Don't populate password for security
    };
    showDrawer.value = true;
}

async function onHealthCheck(database: Database) {
    await checkDatabaseHealth(database);
    message.value = {
        type: database.healthy ? 'success' : 'error',
        text: database.healthy ? 'Database is healthy' : 'Database is unhealthy',
    };
    setTimeout(() => {
        message.value = null;
    }, 3000);
}

function onDelete(database: Database) {
    confirmDeleteRow.value = database.id;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
}

async function confirmDelete(database: Database) {
    deleting.value = true;
    try {
        await axios.delete(`/api/admin/databases/${database.id}`);
        message.value = { type: 'success', text: 'Database deleted successfully' };
        await fetchDatabases();
        confirmDeleteRow.value = null;
    } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        message.value = { type: 'error', text: err?.response?.data?.message || 'Failed to delete database' };
    } finally {
        deleting.value = false;
    }
}

function closeDrawer() {
    showDrawer.value = false;
    editingDatabaseId.value = null;
    viewDatabase.value = null;
    drawerMessage.value = null;
    resetForm();
}

function resetForm() {
    form.value = {
        name: '',
        database_type: 'mysql',
        database_host: 'localhost',
        database_port: 3306,
        database_username: '',
        database_password: '',
    };
    formErrors.value = {};
}

function validateForm() {
    const errors: Record<string, string> = {};

    if (!form.value.name || form.value.name.trim() === '') {
        errors.name = 'Database name is required';
    }
    if (!form.value.database_host || form.value.database_host.trim() === '') {
        errors.database_host = 'Host is required';
    }
    if (!form.value.database_port || form.value.database_port < 1 || form.value.database_port > 65535) {
        errors.database_port = 'Port must be between 1 and 65535';
    }
    if (!form.value.database_username || form.value.database_username.trim() === '') {
        errors.database_username = 'Username is required';
    }
    if (!form.value.database_password || form.value.database_password.trim() === '') {
        errors.database_password = 'Password is required';
    }

    return errors;
}

async function submitForm() {
    formErrors.value = validateForm();
    if (Object.keys(formErrors.value).length > 0) return;

    formLoading.value = true;
    try {
        const data = {
            ...form.value,
            node_id: nodeId.value,
            database_port: Number(form.value.database_port),
        };

        if (drawerMode.value === 'create') {
            await axios.put('/api/admin/databases', data);
            drawerMessage.value = { type: 'success', text: 'Database created successfully' };
            setTimeout(() => {
                drawerMessage.value = null;
            }, 2000);
            await fetchDatabases();
            showDrawer.value = false;
            editingDatabaseId.value = null;
        } else if (drawerMode.value === 'edit' && editingDatabaseId.value) {
            await axios.patch(`/api/admin/databases/${editingDatabaseId.value}`, data);
            drawerMessage.value = { type: 'success', text: 'Database updated successfully' };
            setTimeout(() => {
                drawerMessage.value = null;
            }, 2000);
            await fetchDatabases();
            showDrawer.value = false;
            editingDatabaseId.value = null;
        }
    } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        drawerMessage.value = { type: 'error', text: err?.response?.data?.message || 'Failed to save database' };
    } finally {
        formLoading.value = false;
    }
}

function getDatabaseTypeVariant(type: string | undefined) {
    switch (type) {
        case 'mysql':
            return 'default';
        case 'postgresql':
            return 'secondary';
        case 'mariadb':
            return 'outline';
        case 'mongodb':
            return 'destructive';
        case 'redis':
            return 'default';
        default:
            return 'outline';
    }
}

function formatDate(date: string | undefined) {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
}

// Watchers
watch(searchQuery, () => {
    pagination.value.page = 1;
    fetchDatabases();
});

// Lifecycle
// Watch for database type changes and auto-fill port
watch(
    () => form.value.database_type,
    (newType) => {
        form.value.database_port = getDefaultPort(newType);
    },
);

onMounted(async () => {
    await fetchNode();
    await fetchDatabases();
    await checkAllDatabasesHealth();
});
</script>
