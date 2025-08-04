<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Roles', isCurrent: true, href: '/admin/roles' }]">
        <main class="p-6 space-y-8 bg-background min-h-screen">
            <Card class="rounded-xl">
                <CardHeader>
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle class="text-2xl font-bold">Roles</CardTitle>
                            <CardDescription>Manage all roles in your system.</CardDescription>
                        </div>
                        <div class="flex gap-2">
                            <Input
                                v-model="searchQuery"
                                placeholder="Search by name or display name..."
                                class="max-w-xs"
                            />
                            <Button variant="secondary" @click="openCreateDrawer">Create Role</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent class="flex-1 overflow-auto">
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
                                <TableHead>Name</TableHead>
                                <TableHead>Display Name</TableHead>
                                <TableHead>Color</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-for="role in roles" :key="role.id">
                                <TableCell>{{ role.name }}</TableCell>
                                <TableCell>{{ role.display_name }}</TableCell>
                                <TableCell>
                                    <span
                                        :style="{
                                            backgroundColor: role.color,
                                            color: '#fff',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                        }"
                                    >
                                        {{ role.color }}
                                    </span>
                                </TableCell>
                                <TableCell>{{ role.created_at }}</TableCell>
                                <TableCell>
                                    <div class="flex gap-2">
                                        <Button size="sm" variant="outline" @click="onView(role)">
                                            <Eye :size="16" />
                                        </Button>
                                        <Button size="sm" variant="secondary" @click="onEdit(role)">
                                            <Pencil :size="16" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            :title="'Manage Permissions'"
                                            @click="openPermissionsDrawer(role)"
                                        >
                                            <Shield :size="16" />
                                        </Button>
                                        <template v-if="confirmDeleteRow === role.id">
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                :loading="deleting"
                                                @click="confirmDelete(role)"
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
                                            <Button size="sm" variant="destructive" @click="onDelete(role)">
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
    </DashboardLayout>
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
                            <label for="perm-autocomplete" class="block text-xs font-medium mb-1">Add Permission</label>
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
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Eye, Pencil, Trash2, Shield } from 'lucide-vue-next';
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
});
const loading = ref(false);
const deleting = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const drawerMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const confirmDeleteRow = ref<number | null>(null);
const displayMessage = computed(() => (message.value ? message.value.text.replace(/\r?\n|\r/g, ' ') : ''));
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
        pagination.value.total = data.data.pagination.total;
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

function onPageChange(page: number) {
    pagination.value.page = page;
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
