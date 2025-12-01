<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Tickets', isCurrent: true, href: '/admin/tickets' }]">
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading tickets...</span>
                </div>
            </div>

            <!-- Tickets Table -->
            <div v-else class="p-6">
                <!-- Plugin Widgets: Before Table -->
                <WidgetRenderer v-if="widgetsBeforeTable.length > 0" :widgets="widgetsBeforeTable" />

                <TableComponent
                    title="Support Tickets"
                    description="Manage and respond to support tickets from users."
                    :columns="tableColumns"
                    :data="tickets"
                    :search-placeholder="'Search by title or description...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-tickets-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <div class="flex gap-2">
                            <Select v-model="filterStatus" @update:model-value="applyFilters">
                                <SelectTrigger class="w-[180px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem v-for="status in statuses" :key="status.id" :value="String(status.id)">
                                        {{ status.name }}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <Select v-model="filterCategory" @update:model-value="applyFilters">
                                <SelectTrigger class="w-[180px]">
                                    <SelectValue placeholder="Filter by category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    <SelectItem
                                        v-for="category in categories"
                                        :key="category.id"
                                        :value="String(category.id)"
                                    >
                                        {{ category.name }}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-title="{ item }">
                        <div class="flex items-center gap-2">
                            <span class="font-medium">{{ (item as ApiTicket).title }}</span>
                            <Badge v-if="(item as ApiTicket).is_internal" variant="secondary" class="text-xs">
                                Internal
                            </Badge>
                        </div>
                    </template>

                    <template #cell-user="{ item }">
                        <div v-if="(item as ApiTicket).user" class="flex items-center gap-2">
                            <Avatar class="h-6 w-6">
                                <AvatarImage
                                    :src="(item as ApiTicket).user?.avatar || ''"
                                    :alt="(item as ApiTicket).user?.username || ''"
                                />
                                <AvatarFallback>{{ (item as ApiTicket).user?.username?.[0] }}</AvatarFallback>
                            </Avatar>
                            <span>{{ (item as ApiTicket).user?.username }}</span>
                        </div>
                        <span v-else class="text-muted-foreground">-</span>
                    </template>

                    <template #cell-category="{ item }">
                        <Badge
                            v-if="(item as ApiTicket).category"
                            :style="
                                (item as ApiTicket).category?.color
                                    ? { backgroundColor: (item as ApiTicket).category?.color || '', color: '#fff' }
                                    : {}
                            "
                            variant="secondary"
                        >
                            {{ (item as ApiTicket).category?.name || '-' }}
                        </Badge>
                        <span v-else class="text-muted-foreground">-</span>
                    </template>

                    <template #cell-priority="{ item }">
                        <Badge
                            v-if="(item as ApiTicket).priority"
                            :style="
                                (item as ApiTicket).priority?.color
                                    ? { backgroundColor: (item as ApiTicket).priority?.color || '', color: '#fff' }
                                    : {}
                            "
                            variant="secondary"
                        >
                            {{ (item as ApiTicket).priority?.name || '-' }}
                        </Badge>
                        <span v-else class="text-muted-foreground">-</span>
                    </template>

                    <template #cell-status="{ item }">
                        <Badge
                            v-if="(item as ApiTicket).status"
                            :style="
                                (item as ApiTicket).status?.color
                                    ? { backgroundColor: (item as ApiTicket).status?.color || '', color: '#fff' }
                                    : {}
                            "
                            variant="secondary"
                        >
                            {{ (item as ApiTicket).status?.name || '-' }}
                        </Badge>
                        <span v-else class="text-muted-foreground">-</span>
                    </template>

                    <template #cell-server="{ item }">
                        <span v-if="(item as ApiTicket).server" class="text-sm">
                            {{ (item as ApiTicket).server?.name }}
                        </span>
                        <span v-else class="text-muted-foreground">-</span>
                    </template>

                    <template #cell-created_at="{ item }">
                        <span class="text-sm text-muted-foreground">
                            {{ formatDate((item as ApiTicket).created_at) }}
                        </span>
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="View ticket"
                                data-umami-event="View ticket"
                                @click="onView(item as ApiTicket)"
                            >
                                <Eye :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Edit ticket"
                                data-umami-event="Edit ticket"
                                @click="onEdit(item as ApiTicket)"
                            >
                                <Pencil :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as ApiTicket).uuid">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :loading="deleting"
                                    title="Confirm deletion"
                                    data-umami-event="Confirm delete ticket"
                                    @click="confirmDelete(item as ApiTicket)"
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
                                    title="Delete ticket"
                                    data-umami-event="Delete ticket"
                                    @click="onDelete(item as ApiTicket)"
                                >
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>

                <!-- Plugin Widgets: After Table -->
                <WidgetRenderer v-if="widgetsAfterTable.length > 0" :widgets="widgetsAfterTable" />
            </div>

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>

        <!-- Edit Drawer -->
        <Drawer
            :open="editDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeEditDrawer();
                }
            "
        >
            <DrawerContent v-if="editingTicket">
                <DrawerHeader>
                    <DrawerTitle>Edit Ticket</DrawerTitle>
                    <DrawerDescription>Edit ticket: {{ editingTicket.title }}</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitEdit">
                    <div>
                        <Label for="edit-title">Title</Label>
                        <Input id="edit-title" v-model="editForm.title" placeholder="Ticket title" required />
                    </div>
                    <div>
                        <Label for="edit-description">Description</Label>
                        <Textarea
                            id="edit-description"
                            v-model="editForm.description"
                            placeholder="Ticket description"
                            rows="4"
                            required
                        />
                    </div>
                    <div>
                        <Label for="edit-status">Status</Label>
                        <Select v-model="editForm.status_id">
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="status in statuses" :key="status.id" :value="String(status.id)">
                                    {{ status.name }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label for="edit-priority">Priority</Label>
                        <Select v-model="editForm.priority_id">
                            <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    v-for="priority in priorities"
                                    :key="priority.id"
                                    :value="String(priority.id)"
                                >
                                    {{ priority.name || '' }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label for="edit-category">Category</Label>
                        <Select v-model="editForm.category_id">
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    v-for="category in categories"
                                    :key="category.id"
                                    :value="String(category.id)"
                                >
                                    {{ category.name || '' }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div class="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" @click="closeEditDrawer">Cancel</Button>
                        <Button type="submit" :loading="updating">Save</Button>
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
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Eye, Pencil, Trash2 } from 'lucide-vue-next';
import axios, { type AxiosError } from 'axios';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import TableComponent from '@/components/ui/feather-table/TableComponent.vue';
import type { TableColumn } from '@/components/ui/feather-table/types';
import { useToast } from 'vue-toastification';
import { useRouter } from 'vue-router';

type ApiTicket = {
    id: number;
    uuid: string;
    user_uuid: string;
    server_id?: number;
    category_id: number;
    priority_id: number;
    status_id: number;
    title: string;
    description: string;
    closed_at?: string;
    created_at: string;
    updated_at?: string;
    user?: {
        uuid: string;
        username: string;
        email: string;
        avatar?: string;
    };
    server?: {
        id: number;
        uuid: string;
        name: string;
    };
    category?: {
        id: number;
        name: string;
        color?: string;
    };
    priority?: {
        id: number;
        name: string;
        color?: string;
    };
    status?: {
        id: number;
        name: string;
        color?: string;
    };
    is_internal?: boolean;
};

type Category = {
    id: number;
    name: string;
    color?: string;
};

type Priority = {
    id: number;
    name: string;
    color?: string;
};

type Status = {
    id: number;
    name: string;
    color?: string;
};

const toast = useToast();
const router = useRouter();
const loading = ref(false);
const tickets = ref<ApiTicket[]>([]);
const editingTicket = ref<ApiTicket | null>(null);
const confirmDeleteRow = ref<string | null>(null);
const deleting = ref(false);
const updating = ref(false);
const editDrawerOpen = ref(false);
const filterStatus = ref('all');
const filterCategory = ref('all');

const categories = ref<Category[]>([]);
const priorities = ref<Priority[]>([]);
const statuses = ref<Status[]>([]);

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

const editForm = ref({
    title: '',
    description: '',
    status_id: '',
    priority_id: '',
    category_id: '',
});

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-tickets');
const widgetsTopOfPage = computed(() => getWidgets('admin-tickets', 'top-of-page'));
const widgetsBeforeTable = computed(() => getWidgets('admin-tickets', 'before-table'));
const widgetsAfterTable = computed(() => getWidgets('admin-tickets', 'after-table'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-tickets', 'bottom-of-page'));

onMounted(async () => {
    await fetchPluginWidgets();
    await fetchCategories();
    await fetchPriorities();
    await fetchStatuses();
    await fetchTickets();
});

const tableColumns: TableColumn[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'user', label: 'User', sortable: false },
    { key: 'category', label: 'Category', sortable: false },
    { key: 'priority', label: 'Priority', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
    { key: 'server', label: 'Server', sortable: false },
    { key: 'created_at', label: 'Created', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false },
];

async function fetchTickets() {
    loading.value = true;
    try {
        const params: Record<string, string | number | undefined> = {
            page: pagination.value.page,
            limit: pagination.value.pageSize,
            search: searchQuery.value || undefined,
        };

        if (filterStatus.value && filterStatus.value !== 'all') {
            params.status_id = filterStatus.value;
        }
        if (filterCategory.value && filterCategory.value !== 'all') {
            params.category_id = filterCategory.value;
        }

        const { data } = await axios.get('/api/admin/tickets', { params });
        tickets.value = data.data.tickets || [];

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
    } catch (error: unknown) {
        const errorMessage =
            ((error as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to fetch tickets';
        toast.error(errorMessage);
        tickets.value = [];
        pagination.value.total = 0;
    } finally {
        loading.value = false;
    }
}

async function fetchCategories() {
    try {
        const { data } = await axios.get('/api/admin/tickets/categories');
        categories.value = data.data.categories || [];
    } catch (error: unknown) {
        console.error('Failed to fetch categories:', error);
    }
}

async function fetchPriorities() {
    try {
        const { data } = await axios.get('/api/admin/tickets/priorities');
        priorities.value = data.data.priorities || [];
    } catch (error: unknown) {
        console.error('Failed to fetch priorities:', error);
    }
}

async function fetchStatuses() {
    try {
        const { data } = await axios.get('/api/admin/tickets/statuses');
        statuses.value = data.data.statuses || [];
    } catch (error: unknown) {
        console.error('Failed to fetch statuses:', error);
    }
}

function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.page = 1;
    fetchTickets();
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchTickets();
}

function applyFilters() {
    pagination.value.page = 1;
    fetchTickets();
}

function onView(ticket: ApiTicket) {
    router.push(`/admin/tickets/${ticket.uuid}`);
}

function onEdit(ticket: ApiTicket) {
    editingTicket.value = ticket;
    editForm.value = {
        title: ticket.title,
        description: ticket.description,
        status_id: String(ticket.status_id),
        priority_id: String(ticket.priority_id),
        category_id: String(ticket.category_id),
    };
    editDrawerOpen.value = true;
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
    editingTicket.value = null;
    editForm.value = {
        title: '',
        description: '',
        status_id: '',
        priority_id: '',
        category_id: '',
    };
}

async function submitEdit() {
    if (!editingTicket.value) return;

    updating.value = true;
    try {
        await axios.patch(`/api/admin/tickets/${editingTicket.value.uuid}`, editForm.value);
        toast.success('Ticket updated successfully');
        closeEditDrawer();
        await fetchTickets();
    } catch (error: unknown) {
        const errorMessage =
            ((error as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to update ticket';
        toast.error(errorMessage);
    } finally {
        updating.value = false;
    }
}

function onDelete(ticket: ApiTicket) {
    confirmDeleteRow.value = ticket.uuid;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
}

async function confirmDelete(ticket: ApiTicket) {
    deleting.value = true;
    try {
        await axios.delete(`/api/admin/tickets/${ticket.uuid}`);
        toast.success('Ticket deleted successfully');
        confirmDeleteRow.value = null;
        await fetchTickets();
    } catch (error: unknown) {
        const errorMessage =
            ((error as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to delete ticket';
        toast.error(errorMessage);
    } finally {
        deleting.value = false;
    }
}

function formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
}

watch([() => pagination.value.page, () => pagination.value.pageSize], fetchTickets);
</script>
