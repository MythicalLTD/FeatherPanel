<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Users', isCurrent: true, href: '/admin/users' }]">
        <main class="p-6 space-y-8 bg-background min-h-screen">
            <Card class="rounded-xl">
                <CardHeader>
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle class="text-2xl font-bold">Users</CardTitle>
                            <CardDescription>Manage all users in your system.</CardDescription>
                        </div>
                        <Input
                            v-model="searchQuery"
                            placeholder="Search by username, email, or role..."
                            class="max-w-xs"
                        />
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
                                <TableHead></TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Last Seen</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-for="user in users" :key="user.uuid">
                                <TableCell>
                                    <Avatar>
                                        <AvatarImage :src="user.avatar" :alt="user.username" />
                                        <AvatarFallback>{{ user.username[0] }}</AvatarFallback>
                                    </Avatar>
                                </TableCell>
                                <TableCell>{{ user.username }}</TableCell>
                                <TableCell>{{ user.email || '-' }}</TableCell>
                                <TableCell>
                                    <Badge
                                        :style="
                                            user.role && user.role.color
                                                ? { backgroundColor: user.role.color, color: '#fff' }
                                                : {}
                                        "
                                        variant="secondary"
                                    >
                                        {{
                                            user.role && user.role.display_name
                                                ? user.role.display_name
                                                : user.role?.name || '-'
                                        }}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {{ user.last_seen || '-' }}
                                </TableCell>
                                <TableCell>
                                    <div class="flex gap-2">
                                        <Button size="sm" variant="outline" @click="onView(user)">
                                            <Eye :size="16" />
                                        </Button>
                                        <Button size="sm" variant="secondary" @click="onEdit(user)">
                                            <Pencil :size="16" />
                                        </Button>
                                        <template v-if="confirmDeleteRow === user.uuid">
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                :loading="deleting"
                                                @click="confirmDelete(user)"
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
                                            <Button size="sm" variant="destructive" @click="onDelete(user)">
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
        :open="viewing"
        @update:open="
            (val: boolean) => {
                if (!val) closeView();
            }
        "
    >
        <DrawerContent v-if="selectedUser">
            <DrawerHeader>
                <DrawerTitle>Server List</DrawerTitle>
                <DrawerDescription>Viewing servers for user: {{ selectedUser.username }}</DrawerDescription>
            </DrawerHeader>
            <!-- Remove Card wrapper, keep only the content -->
            <div class="flex items-center gap-4 mb-6 px-6 pt-6">
                <Avatar>
                    <AvatarImage :src="selectedUser.avatar" :alt="selectedUser.username" />
                    <AvatarFallback>{{ selectedUser.username[0] }}</AvatarFallback>
                </Avatar>
                <div>
                    <div class="font-bold text-xl">{{ selectedUser.username }}</div>
                    <div class="text-muted-foreground text-sm">{{ selectedUser.email }}</div>
                </div>
            </div>
            <section class="px-6 pb-6">
                <h3 class="font-semibold text-base mb-4">Servers</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead class="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow v-for="server in dummyServers" :key="server.id">
                            <TableCell>{{ server.name }}</TableCell>
                            <TableCell>
                                <Badge :variant="server.status === 'Online' ? 'secondary' : 'destructive'">
                                    {{ server.status }}
                                </Badge>
                            </TableCell>
                            <TableCell>{{ server.created }}</TableCell>
                            <TableCell class="text-right">
                                <Button size="sm" variant="outline">View</Button>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </section>
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
        <DrawerContent v-if="editingUser">
            <DrawerHeader>
                <DrawerTitle>Edit User</DrawerTitle>
                <DrawerDescription>Edit details for user: {{ editingUser.username }}</DrawerDescription>
            </DrawerHeader>
            <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitEdit">
                <label for="edit-username" class="block mb-1 font-medium">Username</label>
                <Input
                    id="edit-username"
                    v-model="editForm.username"
                    label="Username"
                    placeholder="Username"
                    required
                />
                <label for="edit-firstname" class="block mb-1 font-medium">First Name</label>
                <Input id="edit-firstname" v-model="editForm.first_name" label="First Name" placeholder="First Name" />
                <label for="edit-lastname" class="block mb-1 font-medium">Last Name</label>
                <Input id="edit-lastname" v-model="editForm.last_name" label="Last Name" placeholder="Last Name" />
                <label for="edit-email" class="block mb-1 font-medium">Email</label>
                <Input id="edit-email" v-model="editForm.email" label="Email" placeholder="Email" type="email" />
                <div class="flex flex-col gap-2 mt-4">
                    <!-- Removed Account Flags checkboxes for banned and 2FA Enabled -->
                </div>
                <label class="block mb-2 font-medium">Role</label>
                <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <Button variant="outline" class="w-full text-left">
                            {{ availableRoles.find((r) => r.id == editForm.role_id)?.display_name || 'Select Role' }}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent class="w-56">
                        <DropdownMenuLabel>Select Role</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup v-model="editForm.role_id">
                            <DropdownMenuRadioItem
                                v-for="role in availableRoles"
                                :key="role.id"
                                :value="String(role.id)"
                            >
                                <span :style="{ color: role.color }">{{ role.display_name }}</span>
                            </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
                <label for="edit-externalid" class="block mb-1 font-medium">External ID</label>
                <Input
                    id="edit-externalid"
                    v-model.number="editForm.external_id"
                    label="External ID"
                    placeholder="External ID"
                    type="number"
                />
                <label for="edit-password" class="block mb-1 font-medium">Password</label>
                <Input
                    id="edit-password"
                    v-model="editForm.password"
                    label="Password"
                    placeholder="Password"
                    type="password"
                />
                <div class="flex justify-end gap-2 mt-4">
                    <Button
                        type="button"
                        :variant="editingUser && editingUser.banned === 'true' ? 'secondary' : 'destructive'"
                        @click="toggleBanUser"
                    >
                        {{ editingUser && editingUser.banned === 'true' ? 'Unban User' : 'Ban User' }}
                    </Button>
                    <Button
                        v-if="editingUser && editingUser.two_fa_enabled === 'true'"
                        type="button"
                        variant="secondary"
                        @click="removeTwoFactorAuth"
                    >
                        Remove Two Factor Auth
                    </Button>
                    <Button type="button" variant="outline" @click="closeEditDrawer">Cancel</Button>
                    <Button type="submit" variant="secondary">Save</Button>
                </div>
            </form>
        </DrawerContent>
    </Drawer>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Eye, Pencil, Trash2 } from 'lucide-vue-next';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type UserRole = {
    name: string;
    display_name: string;
    color: string;
};

type ApiUser = {
    uuid: string;
    avatar: string;
    username: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    external_id?: string | null;
    password?: string;
    remember_token?: string;
    mail_verify?: string | null;
    first_ip?: string;
    last_ip?: string;
    banned?: string;
    two_fa_enabled?: string;
    two_fa_key?: string;
    two_fa_blocked?: string;
    deleted?: boolean | string;
    locked?: boolean | string;
    first_seen?: string;
    last_seen?: string;
    role_id?: number;
    role?: UserRole;
    status?: string;
};

type EditForm = {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    role_id: string;
    external_id?: number;
    password: string;
};

const users = ref<ApiUser[]>([]);
const searchQuery = ref('');
const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0,
});
const loading = ref(false);
const deleting = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const confirmDeleteRow = ref<string | null>(null);
const displayMessage = computed(() => (message.value ? message.value.text.replace(/[\r\n]+/g, ' ') : ''));
const selectedUser = ref<ApiUser | null>(null);
const viewing = ref(false);
const editingUser = ref<ApiUser | null>(null);
const editDrawerOpen = ref(false);
const editForm = ref<EditForm>({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    role_id: '',
    external_id: undefined,
    password: '',
});

// Store roles for dropdown
const availableRoles = ref<{ id: string; name: string; display_name: string; color: string }[]>([]);

const dummyServers = [
    { id: 1, name: 'Survival SMP', status: 'Online', created: '2024-01-10' },
    { id: 2, name: 'Creative World', status: 'Offline', created: '2024-02-15' },
    { id: 3, name: 'Skyblock', status: 'Online', created: '2024-03-01' },
];

async function fetchUsers() {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/users', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value || undefined,
            },
        });
        users.value = data.data.users || [];
        pagination.value.total = data.data.pagination.total;
    } finally {
        loading.value = false;
    }
}

onMounted(fetchUsers);
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchUsers);

function onPageChange(page: number) {
    pagination.value.page = page;
}
async function onView(user: ApiUser) {
    viewing.value = true;
    try {
        const { data } = await axios.get(`/api/admin/users/${user.uuid}`);
        selectedUser.value = data.data.user;
    } catch {
        selectedUser.value = null;
        message.value = { type: 'error', text: 'Failed to fetch user details' };
    }
}
function onEdit(user: ApiUser) {
    openEditDrawer(user);
}

async function confirmDelete(user: ApiUser) {
    deleting.value = true;
    let success = false;
    try {
        const response = await axios.delete(`/api/admin/users/${user.uuid}`);
        if (response.data && response.data.success) {
            message.value = { type: 'success', text: 'User deleted successfully' };
            await fetchUsers();
            success = true;
        } else {
            message.value = { type: 'error', text: response.data?.message || 'Failed to delete user' };
        }
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to delete user',
        };
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}

function onDelete(user: ApiUser) {
    confirmDeleteRow.value = user.uuid;
}
function onCancelDelete() {
    confirmDeleteRow.value = null;
}
function closeView() {
    viewing.value = false;
    selectedUser.value = null;
}

async function openEditDrawer(user: ApiUser) {
    try {
        const { data } = await axios.get(`/api/admin/users/${user.uuid}`);
        const u: ApiUser = data.data.user;
        // Parse roles from API response
        const rolesObj = data.data.roles || {};
        availableRoles.value = Object.entries(rolesObj).map(([id, role]) => {
            const r = role as { name: string; display_name: string; color: string };
            return {
                id: String(id),
                name: r.name,
                display_name: r.display_name,
                color: r.color,
            };
        });
        editingUser.value = u;
        editForm.value = {
            username: u.username || '',
            first_name: u.first_name || '',
            last_name: u.last_name || '',
            email: u.email || '',
            role_id: u.role_id != null ? String(u.role_id) : '',
            external_id: u.external_id !== null && u.external_id !== undefined ? Number(u.external_id) : undefined,
            password: u.password || '',
        };
        editDrawerOpen.value = true;
    } catch {
        message.value = { type: 'error', text: 'Failed to fetch user details for editing' };
    }
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
    editingUser.value = null;
}

async function submitEdit() {
    if (!editingUser.value) return;
    try {
        // Send booleans directly
        const patchData = { ...editForm.value };
        console.log('PATCH payload:', patchData);
        const { data } = await axios.patch(`/api/admin/users/${editingUser.value.uuid}`, patchData);
        if (data && data.success) {
            message.value = { type: 'success', text: 'User updated successfully' };
            await fetchUsers();
            closeEditDrawer();
        } else {
            message.value = { type: 'error', text: data?.message || 'Failed to update user' };
        }
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to update user',
        };
    } finally {
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}

async function toggleBanUser() {
    if (!editingUser.value) return;
    const currentlyBanned = editingUser.value.banned === 'true';
    try {
        const { data } = await axios.patch(`/api/admin/users/${editingUser.value.uuid}`, {
            banned: currentlyBanned ? 'false' : 'true',
        });
        if (data && data.success) {
            message.value = {
                type: 'success',
                text: currentlyBanned ? 'User unbanned successfully' : 'User banned successfully',
            };
            await openEditDrawer(editingUser.value); // refresh user data
        } else {
            message.value = { type: 'error', text: data?.message || 'Failed to update ban status' };
        }
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to update ban status',
        };
    } finally {
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}

async function removeTwoFactorAuth() {
    if (!editingUser.value) return;
    try {
        const { data } = await axios.patch(`/api/admin/users/${editingUser.value.uuid}`, { two_fa_enabled: 'false' });
        if (data && data.success) {
            message.value = { type: 'success', text: 'Two-factor authentication removed' };
            await openEditDrawer(editingUser.value); // refresh user data
        } else {
            message.value = { type: 'error', text: data?.message || 'Failed to remove 2FA' };
        }
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to remove 2FA',
        };
    } finally {
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}
</script>
