<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Users', isCurrent: true, href: '/admin/users' }]">
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading users...</span>
                </div>
            </div>

            <!-- Users Table -->
            <div v-else class="p-6">
                <!-- Plugin Widgets: Before Table -->
                <WidgetRenderer v-if="widgetsBeforeTable.length > 0" :widgets="widgetsBeforeTable" />

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
                        <Button variant="outline" size="sm" data-umami-event="Create user" @click="openCreateDrawer">
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
                            <Button
                                size="sm"
                                variant="outline"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="View user details"
                                data-umami-event="View user"
                                :data-umami-event-user="(item as ApiUser).username"
                                @click="onView(item as ApiUser)"
                            >
                                <Eye :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Edit user"
                                data-umami-event="Edit user"
                                :data-umami-event-user="(item as ApiUser).username"
                                @click="onEdit(item as ApiUser)"
                            >
                                <Pencil :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as ApiUser).uuid">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :loading="deleting"
                                    title="Confirm deletion"
                                    data-umami-event="Confirm delete user"
                                    :data-umami-event-user="(item as ApiUser).username"
                                    @click="confirmDelete(item as ApiUser)"
                                >
                                    Confirm Delete
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
                            </template>
                            <template v-else>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    title="Delete user"
                                    data-umami-event="Delete user"
                                    :data-umami-event-user="(item as ApiUser).username"
                                    @click="onDelete(item as ApiUser)"
                                >
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>

                <!-- Plugin Widgets: After Table -->
                <WidgetRenderer v-if="widgetsAfterTable.length > 0" :widgets="widgetsAfterTable" />

                <!-- Plugin Widgets: Before Help Cards -->
                <WidgetRenderer v-if="widgetsBeforeHelpCards.length > 0" :widgets="widgetsBeforeHelpCards" />

                <!-- Users page help cards -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <UsersIcon class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
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
                                <Shield class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
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
                                <KeyRound class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
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
                                <Search class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
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

                <!-- Plugin Widgets: After Help Cards -->
                <WidgetRenderer v-if="widgetsAfterHelpCards.length > 0" :widgets="widgetsAfterHelpCards" />
            </div>

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>

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

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Eye, Pencil, Trash2, Plus, Users as UsersIcon, Shield, KeyRound, Search } from 'lucide-vue-next';
import axios from 'axios';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import TableComponent from '@/components/ui/feather-table/TableComponent.vue';
import type { TableColumn } from '@/components/ui/feather-table/types';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from 'vue-toastification';

type UserRole = {
    name: string;
    display_name: string;
    color: string;
};

type ApiUser = {
    id?: number;
    uuid: string;
    avatar: string;
    username: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    external_id?: number | null;
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
    created_at?: string;
    updated_at?: string;
    role_id?: number;
    role?: UserRole;
    status?: string;
    discord_oauth2_id?: string | null;
    discord_oauth2_access_token?: string | null;
    discord_oauth2_linked?: string;
    discord_oauth2_username?: string | null;
    discord_oauth2_name?: string | null;
    activities?: { name: string; context: string; ip_address: string; created_at: string }[];
    mails?: { subject: string; status: string; created_at: string }[];
};

const toast = useToast();

const router = useRouter();

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
const loading = ref(true);
const deleting = ref(false);
const confirmDeleteRow = ref<string | null>(null);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-users');
const widgetsTopOfPage = computed(() => getWidgets('admin-users', 'top-of-page'));
const widgetsBeforeTable = computed(() => getWidgets('admin-users', 'before-table'));
const widgetsAfterTable = computed(() => getWidgets('admin-users', 'after-table'));
const widgetsBeforeHelpCards = computed(() => getWidgets('admin-users', 'before-help-cards'));
const widgetsAfterHelpCards = computed(() => getWidgets('admin-users', 'after-help-cards'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-users', 'bottom-of-page'));

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'avatar', label: 'Avatar', headerClass: 'w-[50px]', hideLabelOnLayout: true },
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

onMounted(async () => {
    // Fetch plugin widgets
    await fetchPluginWidgets();

    await fetchUsers();
});
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

function onView(user: ApiUser) {
    router.push(`/admin/users/${user.uuid}/edit`);
}

function onEdit(user: ApiUser) {
    router.push(`/admin/users/${user.uuid}/edit`);
}

async function confirmDelete(user: ApiUser) {
    deleting.value = true;
    let success = false;
    try {
        const response = await axios.delete(`/api/admin/users/${user.uuid}`);
        if (response.data && response.data.success) {
            toast.success('User deleted successfully');
            await fetchUsers();
            success = true;
        } else {
            toast.error(response.data?.message || 'Failed to delete user');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete user';
        toast.error(errorMessage);
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
    }
}

function onDelete(user: ApiUser) {
    confirmDeleteRow.value = user.uuid;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
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
}

async function submitCreate() {
    try {
        const { data } = await axios.put('/api/admin/users', createForm.value);
        if (data && data.success) {
            toast.success('User created successfully');
            await fetchUsers();
            closeCreateDrawer();
        } else {
            toast.error(data?.message || 'Failed to create user');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create user';
        toast.error(errorMessage);
    }
}
</script>
