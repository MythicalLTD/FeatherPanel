<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Users', isCurrent: true, href: '/admin/users' }]">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading users...</span>
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
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load users</h3>
                <p class="text-sm text-muted-foreground max-w-sm">
                    {{ message.text }}
                </p>
                <Button class="mt-4" @click="fetchUsers">Try Again</Button>
            </div>

            <!-- Users Table -->
            <div v-else class="p-6">
                <TableComponent
                    title="Users"
                    description="Manage all users in your system."
                    :columns="tableColumns"
                    :data="users"
                    :search-placeholder="'Search by username, email, or role...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-users-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <Button variant="outline" size="sm" @click="openCreateDrawer">
                            <Plus class="h-4 w-4 mr-2" />
                            Create User
                        </Button>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-avatar="{ item }">
                        <Avatar>
                            <AvatarImage :src="(item as ApiUser).avatar" :alt="(item as ApiUser).username" />
                            <AvatarFallback>{{ (item as ApiUser).username[0] }}</AvatarFallback>
                        </Avatar>
                    </template>

                    <template #cell-role="{ item }">
                        <Badge
                            :style="
                                (item as ApiUser).role?.color
                                    ? { backgroundColor: (item as ApiUser).role?.color || '', color: '#fff' }
                                    : {}
                            "
                            variant="secondary"
                        >
                            {{ (item as ApiUser).role?.display_name || (item as ApiUser).role?.name || '-' }}
                        </Badge>
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button size="sm" variant="outline" @click="onView(item as ApiUser)">
                                <Eye :size="16" />
                            </Button>
                            <Button size="sm" variant="secondary" @click="onEdit(item as ApiUser)">
                                <Pencil :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as ApiUser).uuid">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    :loading="deleting"
                                    @click="confirmDelete(item as ApiUser)"
                                >
                                    Confirm Delete
                                </Button>
                                <Button size="sm" variant="outline" :disabled="deleting" @click="onCancelDelete">
                                    Cancel
                                </Button>
                            </template>
                            <template v-else>
                                <Button size="sm" variant="destructive" @click="onDelete(item as ApiUser)">
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>
                <!-- Users page help cards -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <UsersIcon class="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Managing Users</div>
                                    <p>
                                        View, create, and edit accounts. Use the search to quickly find users by
                                        username, email, or role. Pagination and column visibility are customizable.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Shield class="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Roles & Permissions</div>
                                    <p>
                                        Assign roles to control access and capabilities. Role badges reflect the
                                        assigned role, and colors help you spot important roles at a glance.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <KeyRound class="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Security Actions</div>
                                    <ul class="list-disc list-inside space-y-1">
                                        <li>Ban or unban accounts when needed</li>
                                        <li>Remove 2FA for locked-out users</li>
                                        <li>Audit activities, servers, and mails per user</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card class="md:col-span-2 lg:col-span-3">
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Search class="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div class="flex-1">
                                    <div class="font-semibold text-foreground mb-1">Tips</div>
                                    <ul class="list-disc list-inside space-y-1">
                                        <li>Use filters and search to quickly target accounts.</li>
                                        <li>Keep roles minimal (least privilege) and review periodically.</li>
                                        <li>Encourage users to enable 2FA; remove 2FA only for support scenarios.</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
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
            <DrawerContent v-if="selectedUser">
                <DrawerHeader>
                    <DrawerTitle>User Info</DrawerTitle>
                    <DrawerDescription>Viewing details for user: {{ selectedUser.username }}</DrawerDescription>
                </DrawerHeader>
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
                    <Tabs default-value="servers">
                        <TabsList class="mb-4">
                            <TabsTrigger value="servers">Servers</TabsTrigger>
                            <TabsTrigger value="activities">Activities</TabsTrigger>
                            <TabsTrigger value="mails">Mails</TabsTrigger>
                        </TabsList>
                        <TabsContent value="servers">
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
                                    <TableRow v-for="server in ownedServers" :key="server.id">
                                        <TableCell>{{ server.name }}</TableCell>
                                        <TableCell>
                                            <Badge :variant="server.status === 'Online' ? 'secondary' : 'destructive'">
                                                {{ server.status || 'Offline' }}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{{ server.created_at }}</TableCell>
                                        <TableCell class="text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                @click="goToServerManage(server.uuidShort)"
                                                >View Server (Client)</Button
                                            >
                                            <Button size="sm" variant="outline" @click="goToServerEdit(server.id)"
                                                >Edit Server (Admin)</Button
                                            >
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TabsContent>
                        <TabsContent value="activities">
                            <h3 class="font-semibold text-base mb-4">Activities</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Context</TableHead>
                                        <TableHead>IP Address</TableHead>
                                        <TableHead>Created At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow
                                        v-for="activity in selectedUser.activities"
                                        :key="activity.created_at + activity.name"
                                    >
                                        <TableCell>{{ activity.name }}</TableCell>
                                        <TableCell>{{ activity.context }}</TableCell>
                                        <TableCell>{{ activity.ip_address }}</TableCell>
                                        <TableCell>{{ activity.created_at }}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TabsContent>
                        <TabsContent value="mails">
                            <h3 class="font-semibold text-base mb-4">Mails</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created At</TableHead>
                                        <TableHead>Preview</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow v-for="mail in selectedUser.mails" :key="mail.created_at + mail.subject">
                                        <TableCell>{{ mail.subject }}</TableCell>
                                        <TableCell>
                                            <Badge :variant="mail.status === 'sent' ? 'secondary' : 'destructive'">
                                                {{ mail.status }}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{{ mail.created_at }}</TableCell>
                                        <TableCell>
                                            <Button size="sm" variant="outline" @click="() => showMailPreview(mail)">
                                                Preview
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                </section>
                <!-- Mail Preview Dialog -->
                <Dialog v-model:open="mailPreviewOpen">
                    <DialogContent class="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{{ mailPreview?.subject }}</DialogTitle>
                            <DialogDescription>
                                {{ mailPreview?.created_at }} | {{ mailPreview?.status }}
                            </DialogDescription>
                        </DialogHeader>
                        <div class="overflow-auto max-h-[60vh] border rounded bg-background p-4">
                            <!-- eslint-disable-next-line vue/no-v-html -->
                            <div v-if="mailPreview?.body" v-html="mailPreview.body"></div>
                            <div v-else class="text-muted-foreground">No content</div>
                        </div>
                    </DialogContent>
                </Dialog>
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
            <DrawerContent v-if="editingUser">
                <DrawerHeader>
                    <DrawerTitle>Edit User</DrawerTitle>
                    <DrawerDescription>Edit details for user: {{ editingUser.username }}</DrawerDescription>
                </DrawerHeader>
                <Alert
                    v-if="drawerMessage"
                    :variant="drawerMessage.type === 'error' ? 'destructive' : 'default'"
                    class="mb-4 whitespace-nowrap overflow-x-auto"
                >
                    <span>{{ drawerMessage.text }}</span>
                </Alert>
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
                    <Input
                        id="edit-firstname"
                        v-model="editForm.first_name"
                        label="First Name"
                        placeholder="First Name"
                    />
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
                                {{
                                    availableRoles.find((r) => r.id == editForm.role_id)?.display_name || 'Select Role'
                                }}
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
                        <Button type="submit" variant="default">Save</Button>
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
                    <DrawerTitle>Create User</DrawerTitle>
                    <DrawerDescription>Fill in the details to create a new user.</DrawerDescription>
                </DrawerHeader>
                <Alert
                    v-if="drawerMessage"
                    :variant="drawerMessage.type === 'error' ? 'destructive' : 'default'"
                    class="mb-4 whitespace-nowrap overflow-x-auto"
                >
                    <span>{{ drawerMessage.text }}</span>
                </Alert>
                <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitCreate">
                    <label for="create-username" class="block mb-1 font-medium">Username</label>
                    <Input
                        id="create-username"
                        v-model="createForm.username"
                        label="Username"
                        placeholder="Username"
                        required
                    />
                    <label for="create-firstname" class="block mb-1 font-medium">First Name</label>
                    <Input
                        id="create-firstname"
                        v-model="createForm.first_name"
                        label="First Name"
                        placeholder="First Name"
                        required
                    />
                    <label for="create-lastname" class="block mb-1 font-medium">Last Name</label>
                    <Input
                        id="create-lastname"
                        v-model="createForm.last_name"
                        label="Last Name"
                        placeholder="Last Name"
                        required
                    />
                    <label for="create-email" class="block mb-1 font-medium">Email</label>
                    <Input
                        id="create-email"
                        v-model="createForm.email"
                        label="Email"
                        placeholder="Email"
                        type="email"
                        required
                    />
                    <label for="create-password" class="block mb-1 font-medium">Password</label>
                    <Input
                        id="create-password"
                        v-model="createForm.password"
                        label="Password"
                        placeholder="Password"
                        type="password"
                        required
                    />
                    <div class="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" @click="closeCreateDrawer">Cancel</Button>
                        <Button type="submit" variant="default">Create</Button>
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

import { ref, watch, onMounted } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Eye, Pencil, Trash2, Plus, Rocket } from 'lucide-vue-next';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import TableComponent from '@/kit/TableComponent.vue';
import type { TableColumn } from '@/kit/types';
import { Card, CardContent } from '@/components/ui/card';
import { Users as UsersIcon, Shield, KeyRound, Search } from 'lucide-vue-next';

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
    activities?: { name: string; context: string; ip_address: string; created_at: string }[];
    mails?: { subject: string; status: string; created_at: string }[];
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
    hasNext: false,
    hasPrev: false,
    from: 0,
    to: 0,
});
const loading = ref(false);
const deleting = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const drawerMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const confirmDeleteRow = ref<string | null>(null);
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

// Owned servers list
const ownedServers = ref<
    { id: number; name: string; description?: string; status?: string; uuidShort: string; created_at: string }[]
>([]);

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'avatar', label: '', headerClass: 'w-[50px]' },
    { key: 'username', label: 'Username', searchable: true },
    { key: 'email', label: 'Email', searchable: true },
    { key: 'role', label: 'Role', searchable: true },
    { key: 'last_seen', label: 'Last Seen' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[200px] font-semibold' },
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

onMounted(fetchUsers);
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchUsers);

// Table event handlers
function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.page = 1; // Reset to first page when searching
    fetchUsers();
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchUsers();
}

async function onView(user: ApiUser) {
    viewing.value = true;
    try {
        const { data } = await axios.get(`/api/admin/users/${user.uuid}`);
        selectedUser.value = data.data.user;
        // Load owned servers for this user
        const serversRes = await axios.get(`/api/admin/users/${user.uuid}/servers`);
        ownedServers.value = serversRes.data?.data?.servers || [];
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
    ownedServers.value = [];
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
    drawerMessage.value = null;
}

async function submitEdit() {
    if (!editingUser.value) return;
    try {
        // Send booleans directly
        const patchData = { ...editForm.value };
        const { data } = await axios.patch(`/api/admin/users/${editingUser.value.uuid}`, patchData);
        if (data && data.success) {
            drawerMessage.value = { type: 'success', text: 'User updated successfully' };
            setTimeout(() => {
                drawerMessage.value = null;
            }, 2000);
            await fetchUsers();
            closeEditDrawer();
        } else {
            drawerMessage.value = { type: 'error', text: data?.message || 'Failed to update user' };
        }
    } catch (e: unknown) {
        drawerMessage.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to update user',
        };
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

const createDrawerOpen = ref(false);
const createForm = ref({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
});

function openCreateDrawer() {
    createDrawerOpen.value = true;
    createForm.value = { username: '', first_name: '', last_name: '', email: '', password: '' };
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
    drawerMessage.value = null;
}

function goToServerEdit(id: number) {
    window.location.assign(`/admin/servers/${id}/edit`);
}

function goToServerManage(uuidShort: string) {
    window.location.assign(`/server/${uuidShort}`);
}

async function submitCreate() {
    try {
        const { data } = await axios.put('/api/admin/users', createForm.value);
        if (data && data.success) {
            drawerMessage.value = { type: 'success', text: 'User created successfully' };
            setTimeout(() => {
                drawerMessage.value = null;
            }, 2000);
            await fetchUsers();
            closeCreateDrawer();
        } else {
            drawerMessage.value = { type: 'error', text: data?.message || 'Failed to create user' };
        }
    } catch (e: unknown) {
        drawerMessage.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to create user',
        };
    }
}

const mailPreview = ref<{ subject: string; body?: string; status: string; created_at: string } | null>(null);
const mailPreviewOpen = ref(false);

function showMailPreview(mail: { subject: string; body?: string; status: string; created_at: string }) {
    mailPreview.value = mail;
    mailPreviewOpen.value = true;
}
</script>
