<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Roles', isCurrent: true, href: '/admin/roles' }]">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading roles...</span>
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
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load roles</h3>
                <p class="text-sm text-muted-foreground max-w-sm">
                    {{ message.text }}
                </p>
                <Button class="mt-4" @click="fetchRoles">Try Again</Button>
            </div>

            <!-- Roles Table -->
            <div v-else class="p-6">
                <TableComponent
                    title="Roles"
                    description="Manage all roles in your system."
                    :columns="tableColumns"
                    :data="roles"
                    :search-placeholder="'Search by name or display name...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="roles-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                    @column-toggle="handleColumnToggle"
                >
                    <template #header-actions>
                        <Button variant="outline" size="sm" @click="openCreateDrawer">
                            <Plus class="h-4 w-4 mr-2" />
                            Create Role
                        </Button>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-color="{ item }">
                        <span
                            :style="{
                                backgroundColor: (item as Role).color,
                                color: '#fff',
                                padding: '2px 8px',
                                borderRadius: '4px',
                            }"
                        >
                            {{ (item as Role).color }}
                        </span>
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button size="sm" variant="outline" @click="onView(item as Role)">
                                <Eye :size="16" />
                            </Button>
                            <Button size="sm" variant="secondary" @click="onEdit(item as Role)">
                                <Pencil :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                :title="'Manage Permissions'"
                                @click="openPermissionsDrawer(item as Role)"
                            >
                                <Shield :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as Role).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    :loading="deleting"
                                    @click="confirmDelete(item as Role)"
                                >
                                    Confirm Delete
                                </Button>
                                <Button size="sm" variant="outline" :disabled="deleting" @click="onCancelDelete">
                                    Cancel
                                </Button>
                            </template>
                            <template v-else>
                                <Button size="sm" variant="destructive" @click="onDelete(item as Role)">
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>
            </div>
        </div>

        <!-- View Drawer -->
        <Drawer
            class="w-full"
            :open="viewing"
            @update:open="
                (val: boolean) => {
                    if (!val) closeView();
                }
            "
        >
            <DrawerContent v-if="selectedRole">
                <DrawerHeader>
                    <DrawerTitle>Role Info</DrawerTitle>
                    <DrawerDescription>Viewing details for role: {{ selectedRole.name }}</DrawerDescription>
                </DrawerHeader>
                <div class="px-6 pt-6 space-y-2">
                    <div><b>Name:</b> {{ selectedRole.name }}</div>
                    <div><b>Display Name:</b> {{ selectedRole.display_name }}</div>
                    <div>
                        <b>Color:</b>
                        <span
                            :style="{
                                backgroundColor: selectedRole.color,
                                color: '#fff',
                                padding: '2px 8px',
                                borderRadius: '4px',
                            }"
                            >{{ selectedRole.color }}</span
                        >
                    </div>
                    <div><b>Created At:</b> {{ selectedRole.created_at }}</div>
                    <div><b>Updated At:</b> {{ selectedRole.updated_at }}</div>
                </div>
                <div class="p-4 flex justify-end">
                    <DrawerClose as-child>
                        <Button variant="outline" @click="closeView">Close</Button>
                    </DrawerClose>
                </div>
            </DrawerContent>
        </Drawer>

        <!-- Edit Drawer -->
        <Drawer
            :open="editDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeEditDrawer();
                }
            "
        >
            <DrawerContent v-if="editingRole">
                <DrawerHeader>
                    <DrawerTitle>Edit Role</DrawerTitle>
                    <DrawerDescription>Edit details for role: {{ editingRole.name }}</DrawerDescription>
                </DrawerHeader>
                <Alert
                    v-if="drawerMessage"
                    :variant="drawerMessage.type === 'error' ? 'destructive' : 'default'"
                    class="mb-4 whitespace-nowrap overflow-x-auto"
                >
                    <span>{{ drawerMessage.text }}</span>
                </Alert>
                <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitEdit">
                    <label for="edit-name" class="block mb-1 font-medium">Name</label>
                    <Input id="edit-name" v-model="editForm.name" label="Name" placeholder="Name" required />
                    <label for="edit-display-name" class="block mb-1 font-medium">Display Name</label>
                    <Input
                        id="edit-display-name"
                        v-model="editForm.display_name"
                        label="Display Name"
                        placeholder="Display Name"
                        required
                    />
                    <label for="edit-color" class="block mb-1 font-medium">Color</label>
                    <input
                        id="edit-color"
                        v-model="editForm.color"
                        type="color"
                        class="h-10 w-20 rounded border border-input"
                        required
                    />
                    <div class="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" @click="closeEditDrawer">Cancel</Button>
                        <Button type="submit" variant="secondary">Save</Button>
                        <Button
                            type="button"
                            variant="ghost"
                            :title="'Manage Permissions'"
                            @click="openPermissionsDrawer(editingRole)"
                        >
                            <Shield :size="16" />
                        </Button>
                    </div>
                </form>
            </DrawerContent>
        </Drawer>

        <!-- Create Drawer -->
        <Drawer
            :open="createDrawerOpen"
            @update:open="
                (val) => {
                    if (!val) closeCreateDrawer();
                }
            "
        >
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Create Role</DrawerTitle>
                    <DrawerDescription>Fill in the details to create a new role.</DrawerDescription>
                </DrawerHeader>
                <Alert
                    v-if="drawerMessage"
                    :variant="drawerMessage.type === 'error' ? 'destructive' : 'default'"
                    class="mb-4 whitespace-nowrap overflow-x-auto"
                >
                    <span>{{ drawerMessage.text }}</span>
                </Alert>
                <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitCreate">
                    <label for="create-name" class="block mb-1 font-medium">Name</label>
                    <Input id="create-name" v-model="createForm.name" label="Name" placeholder="Name" required />
                    <label for="create-display-name" class="block mb-1 font-medium">Display Name</label>
                    <Input
                        id="create-display-name"
                        v-model="createForm.display_name"
                        label="Display Name"
                        placeholder="Display Name"
                        required
                    />
                    <label for="create-color" class="block mb-1 font-medium">Color</label>
                    <input
                        id="create-color"
                        v-model="createForm.color"
                        type="color"
                        class="h-10 w-20 rounded border border-input"
                        required
                    />
                    <div class="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" @click="closeCreateDrawer">Cancel</Button>
                        <Button type="submit" variant="secondary">Create</Button>
                    </div>
                </form>
            </DrawerContent>
        </Drawer>

        <!-- Permissions Drawer -->
        <Drawer
            :open="permissionsDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closePermissionsDrawer();
                }
            "
        >
            <DrawerContent v-if="permissionsRole">
                <DrawerHeader>
                    <DrawerTitle>Manage Permissions</DrawerTitle>
                    <DrawerDescription>Permissions for role: {{ permissionsRole.name }}</DrawerDescription>
                </DrawerHeader>
                <Card class="m-6">
                    <CardHeader>
                        <CardTitle>Permissions</CardTitle>
                        <CardDescription>View, add, or remove permissions for this role.</CardDescription>
                    </CardHeader>
                    <CardContent class="max-h-96 overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Permission</TableHead>
                                    <TableHead class="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow v-for="perm in permissions" :key="perm.id">
                                    <TableCell>{{ perm.permission }}</TableCell>
                                    <TableCell class="text-right">
                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            :title="'Delete Permission'"
                                            @click="deletePermission(perm.id)"
                                        >
                                            <Trash2 :size="16" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                <TableRow v-if="permissions.length === 0">
                                    <TableCell colspan="2" class="text-muted-foreground"
                                        >No permissions for this role.</TableCell
                                    >
                                </TableRow>
                            </TableBody>
                        </Table>
                        <form class="flex gap-2 mt-4 items-end" @submit.prevent="addPermission">
                            <div class="flex-1">
                                <label for="perm-autocomplete" class="block text-xs font-medium mb-1"
                                    >Add Permission</label
                                >
                                <Input
                                    id="perm-autocomplete"
                                    v-model="newPermission"
                                    placeholder="Type or select permission"
                                    autocomplete="off"
                                    class="w-full"
                                />
                                <div
                                    v-if="newPermission && filteredPermissionOptions.length > 0"
                                    class="bg-popover border rounded shadow mt-1 max-h-48 overflow-auto z-10"
                                >
                                    <ul>
                                        <li
                                            v-for="option in filteredPermissionOptions"
                                            :key="option.value"
                                            class="px-3 py-2 cursor-pointer hover:bg-accent"
                                            @click="addPermissionFromOption(option.value)"
                                        >
                                            <div class="font-mono text-xs">{{ option.value }}</div>
                                            <div class="text-xs text-muted-foreground">
                                                {{ option.category }} — {{ option.description }}
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <Button
                                v-if="newPermission && filteredPermissionOptions.length === 0"
                                type="submit"
                                variant="secondary"
                            >
                                Add
                            </Button>
                        </form>
                    </CardContent>
                </Card>
                <div class="p-4 flex justify-end">
                    <DrawerClose as-child>
                        <Button variant="outline" @click="closePermissionsDrawer">Close</Button>
                    </DrawerClose>
                </div>
            </DrawerContent>
        </Drawer>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Eye, Pencil, Trash2, Shield, Plus } from 'lucide-vue-next';
import axios from 'axios';
import { Alert } from '@/components/ui/alert';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerClose,
} from '@/components/ui/drawer';
import { type Ref } from 'vue';
import Permissions from '@/lib/permissions';
import TableComponent from '@/kit/TableComponent.vue';
import type { TableColumn } from '@/kit/types';

type Role = {
    id: number;
    name: string;
    display_name: string;
    color: string;
    created_at: string;
    updated_at: string;
};

const roles = ref<Role[]>([]);
const searchQuery = ref('');
const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0,
    hasNext: false,
    hasPrev: false,
    from: 0,
    to: 0,
});
const loading = ref(false);
const deleting = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const drawerMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const confirmDeleteRow = ref<number | null>(null);
const selectedRole = ref<Role | null>(null);
const viewing = ref(false);
const editingRole = ref<Role | null>(null);
const editDrawerOpen = ref(false);
const editForm = ref({
    name: '',
    display_name: '',
    color: '',
});
const createDrawerOpen = ref(false);
const createForm = ref({
    name: '',
    display_name: '',
    color: '',
});

// Permission type
interface Permission {
    id: number;
    role_id: number;
    permission: string;
}

const permissions = ref<Permission[]>([]);
const newPermission = ref('');
const loadingPermissions = ref(false);
const permissionsDrawerOpen = ref(false);
const permissionsRole: Ref<Role | null> = ref(null);

const allPermissionNodes = Permissions.getAll();

const filteredPermissionOptions = computed(() => {
    const assigned = new Set(permissions.value.map((p) => p.permission));
    return allPermissionNodes.filter(
        (node) =>
            !assigned.has(node.value) &&
            (!newPermission.value || node.value.toLowerCase().includes(newPermission.value.toLowerCase())),
    );
});

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'name', label: 'Name', searchable: true },
    { key: 'display_name', label: 'Display Name', searchable: true },
    { key: 'color', label: 'Color' },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[200px] font-semibold' },
];

async function fetchRoles() {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/roles', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value || undefined,
            },
        });
        roles.value = data.data.roles || [];

        // Map the API response pagination to our expected format
        const apiPagination = data.data.pagination;
        pagination.value = {
            page: apiPagination.current_page,
            pageSize: apiPagination.per_page,
            total: apiPagination.total_records,
            hasNext: apiPagination.has_next,
            hasPrev: apiPagination.has_prev,
            from: apiPagination.from,
            to: apiPagination.to,
        };
    } finally {
        loading.value = false;
    }
}

async function fetchPermissionsForRole(roleId: number) {
    loadingPermissions.value = true;
    try {
        const { data } = await axios.get('/api/admin/permissions', {
            params: { role_id: roleId },
        });
        permissions.value = data.data.permissions || [];
    } finally {
        loadingPermissions.value = false;
    }
}

// Change the addPermission function signature to accept an optional event parameter of type Event
async function addPermission(event?: Event, val?: string) {
    if (event) event.preventDefault?.();
    if (!permissionsRole.value) return;
    const permToAdd = (val !== undefined ? val : newPermission.value).trim();
    if (!permToAdd) return;
    try {
        const payload = { role_id: permissionsRole.value.id, permission: permToAdd };
        const { data } = await axios.put('/api/admin/permissions', payload);
        if (data && data.success) {
            newPermission.value = '';
            await fetchPermissionsForRole(permissionsRole.value.id);
            message.value = { type: 'success', text: 'Permission added successfully' };
        } else {
            message.value = { type: 'error', text: data?.message || 'Failed to add permission' };
        }
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to add permission',
        };
    } finally {
        newPermission.value = '';
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}

async function deletePermission(permissionId: number) {
    if (!permissionsRole.value) return;
    try {
        const { data } = await axios.delete(`/api/admin/permissions/${permissionId}`);
        if (data && data.success) {
            await fetchPermissionsForRole(permissionsRole.value.id);
            message.value = { type: 'success', text: 'Permission deleted successfully' };
        } else {
            message.value = { type: 'error', text: data?.message || 'Failed to delete permission' };
        }
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to delete permission',
        };
    } finally {
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}

onMounted(fetchRoles);
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchRoles);

// Table event handlers
function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.page = 1; // Reset to first page when searching
    fetchRoles();
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchRoles();
}

function handleColumnToggle(columns: string[]) {
    // Column preferences are automatically saved by the TableComponent
    console.log('Columns changed:', columns);
}

async function onView(role: Role) {
    viewing.value = true;
    try {
        const { data } = await axios.get(`/api/admin/roles/${role.id}`);
        selectedRole.value = data.data.role;
    } catch {
        selectedRole.value = null;
        message.value = { type: 'error', text: 'Failed to fetch role details' };
    }
}

function onEdit(role: Role) {
    openEditDrawer(role);
}

async function confirmDelete(role: Role) {
    deleting.value = true;
    let success = false;
    try {
        const response = await axios.delete(`/api/admin/roles/${role.id}`);
        if (response.data && response.data.success) {
            message.value = { type: 'success', text: 'Role deleted successfully' };
            await fetchRoles();
            success = true;
        } else {
            message.value = { type: 'error', text: response.data?.message || 'Failed to delete role' };
        }
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to delete role',
        };
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}

function onDelete(role: Role) {
    confirmDeleteRow.value = role.id;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
}

function closeView() {
    viewing.value = false;
    selectedRole.value = null;
}

async function openEditDrawer(role: Role) {
    try {
        const { data } = await axios.get(`/api/admin/roles/${role.id}`);
        const r: Role = data.data.role;
        editingRole.value = r;
        editForm.value = {
            name: r.name || '',
            display_name: r.display_name || '',
            color: r.color || '',
        };
        // Removed permissions fetch from here as it's now in a separate drawer
        editDrawerOpen.value = true;
    } catch {
        message.value = { type: 'error', text: 'Failed to fetch role details for editing' };
    }
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
    editingRole.value = null;
    drawerMessage.value = null;
}

async function submitEdit() {
    if (!editingRole.value) return;
    try {
        const patchData = { ...editForm.value };
        const { data } = await axios.patch(`/api/admin/roles/${editingRole.value.id}`, patchData);
        if (data && data.success) {
            drawerMessage.value = { type: 'success', text: 'Role updated successfully' };
            setTimeout(() => {
                drawerMessage.value = null;
            }, 2000);
            await fetchRoles();
            closeEditDrawer();
        } else {
            drawerMessage.value = { type: 'error', text: data?.message || 'Failed to update role' };
        }
    } catch (e: unknown) {
        drawerMessage.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to update role',
        };
    }
}

function openCreateDrawer() {
    createDrawerOpen.value = true;
    createForm.value = { name: '', display_name: '', color: '' };
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
    drawerMessage.value = null;
}

async function submitCreate() {
    try {
        const { data } = await axios.put('/api/admin/roles', createForm.value);
        if (data && data.success) {
            drawerMessage.value = { type: 'success', text: 'Role created successfully' };
            setTimeout(() => {
                drawerMessage.value = null;
            }, 2000);
            await fetchRoles();
            closeCreateDrawer();
        } else {
            drawerMessage.value = { type: 'error', text: data?.message || 'Failed to create role' };
        }
    } catch (e: unknown) {
        drawerMessage.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to create role',
        };
    }
}

function openPermissionsDrawer(role: Role) {
    permissionsRole.value = role;
    permissionsDrawerOpen.value = true;
    fetchPermissionsForRole(role.id);
}

function closePermissionsDrawer() {
    permissionsDrawerOpen.value = false;
    permissionsRole.value = null;
    permissions.value = [];
}

// Add this new function for immediate add on click
async function addPermissionFromOption(val: string) {
    newPermission.value = '';
    // Add permission immediately
    await addPermission(undefined, val);
}
</script>
