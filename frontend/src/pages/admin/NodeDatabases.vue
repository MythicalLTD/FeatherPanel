<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <main class="p-6 space-y-8 bg-background min-h-screen">
            <Card class="rounded-xl">
                <CardHeader>
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle class="text-2xl font-bold">Node Databases</CardTitle>
                            <CardDescription> Managing databases for node: {{ node?.name }} </CardDescription>
                        </div>
                        <div class="flex gap-2 items-center">
                            <Input v-model="searchQuery" placeholder="Search by name or host..." class="max-w-xs" />
                            <Button variant="secondary" @click="openCreateDrawer">Add Database</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Alert
                        v-if="message"
                        :variant="message.type === 'error' ? 'destructive' : 'default'"
                        class="mb-4 whitespace-nowrap overflow-x-auto"
                    >
                        <span>{{ displayMessage }}</span>
                    </Alert>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Host</TableHead>
                                <TableHead>Port</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-for="database in databases" :key="database.id">
                                <TableCell>
                                    <div class="flex items-center gap-2">
                                        <div
                                            :class="[
                                                'h-2 w-2 rounded-full',
                                                database.healthy ? 'bg-green-500' : 'bg-red-500',
                                            ]"
                                        ></div>
                                        <span class="text-xs">
                                            {{ database.healthy ? 'Healthy' : 'Unhealthy' }}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>{{ database.name }}</TableCell>
                                <TableCell>
                                    <Badge :variant="getDatabaseTypeVariant(database.database_type)">
                                        {{ database.database_type }}
                                    </Badge>
                                </TableCell>
                                <TableCell>{{ database.database_host }}</TableCell>
                                <TableCell>{{ database.database_port }}</TableCell>
                                <TableCell>{{ database.database_username }}</TableCell>
                                <TableCell>{{ formatDate(database.created_at) }}</TableCell>
                                <TableCell>
                                    <div class="flex gap-2">
                                        <Button size="sm" variant="outline" @click="onView(database)">
                                            <Eye :size="16" />
                                        </Button>
                                        <Button size="sm" variant="secondary" @click="onEdit(database)">
                                            <Pencil :size="16" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            title="Check Health"
                                            @click="onHealthCheck(database)"
                                        >
                                            <Activity :size="16" />
                                        </Button>
                                        <template v-if="confirmDeleteRow === database.id">
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                :loading="deleting"
                                                @click="confirmDelete(database)"
                                            >
                                                Confirm Delete
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                :disabled="deleting"
                                                @click="onCancelDelete"
                                            >
                                                Cancel
                                            </Button>
                                        </template>
                                        <template v-else>
                                            <Button size="sm" variant="destructive" @click="onDelete(database)">
                                                <Trash2 :size="16" />
                                            </Button>
                                        </template>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    <div class="mt-6 flex justify-end">
                        <Pagination
                            :items-per-page="pagination.pageSize"
                            :total="pagination.total"
                            :default-page="pagination.page"
                            @page-change="onPageChange"
                        />
                    </div>
                </CardContent>
            </Card>
        </main>
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
                                    <SelectItem value="mongodb">MongoDB</SelectItem>
                                    <SelectItem value="redis">Redis</SelectItem>
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
                                Default ports: MySQL/MariaDB (3306), PostgreSQL (5432), MongoDB (27017), Redis (6379)
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
                        <Button type="submit" class="w-full" :loading="formLoading">
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
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Eye, Pencil, Trash2, Activity, Database } from 'lucide-vue-next';
import axios from 'axios';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
});

// Breadcrumbs
const breadcrumbs = computed(() => [
    { text: 'Admin', href: '/admin' },
    { text: 'Locations', href: '/admin/locations' },
    { text: 'Nodes', href: '/admin/locations' },
    { text: 'Databases', href: `/admin/nodes/${nodeId.value}/databases` },
]);

const displayMessage = computed(() => message.value?.text || '');

// Methods
async function fetchDatabases() {
    try {
        const response = await axios.get(`/api/admin/databases/node/${nodeId.value}`, {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value,
            },
        });
        databases.value = response.data.data.databases;
        pagination.value = response.data.data.pagination;
    } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        message.value = { type: 'error', text: err?.response?.data?.message || 'Failed to fetch databases' };
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

function onPageChange(page: number) {
    pagination.value.page = page;
    fetchDatabases();
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
onMounted(async () => {
    await fetchNode();
    await fetchDatabases();
    await checkAllDatabasesHealth();
});
</script>
