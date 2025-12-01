<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Ticket Statuses', isCurrent: true, href: '/admin/tickets/statuses' }]">
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading statuses...</span>
                </div>
            </div>

            <!-- Statuses Table -->
            <div v-else class="p-6">
                <!-- Plugin Widgets: Before Table -->
                <WidgetRenderer v-if="widgetsBeforeTable.length > 0" :widgets="widgetsBeforeTable" />
                <TableComponent
                    title="Ticket Statuses"
                    description="Manage ticket statuses for organizing support tickets."
                    :columns="tableColumns"
                    :data="statuses"
                    :search-placeholder="'Search by name...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-ticket-statuses-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <Button variant="outline" size="sm" data-umami-event="Create status" @click="openCreateDrawer">
                            <Plus class="h-4 w-4 mr-2" />
                            Create Status
                        </Button>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-color="{ item }">
                        <span
                            v-if="(item as Status).color"
                            :style="{
                                backgroundColor: (item as Status).color,
                                color: '#fff',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                            }"
                        >
                            {{ (item as Status).color }}
                        </span>
                        <span v-else class="text-muted-foreground">-</span>
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="View status details"
                                data-umami-event="View status"
                                @click="onView(item as Status)"
                            >
                                <Eye :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Edit status"
                                data-umami-event="Edit status"
                                @click="onEdit(item as Status)"
                            >
                                <Pencil :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as Status).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :loading="deleting"
                                    title="Confirm deletion"
                                    data-umami-event="Confirm delete status"
                                    @click="confirmDelete(item as Status)"
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
                                    title="Delete status"
                                    data-umami-event="Delete status"
                                    @click="onDelete(item as Status)"
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
            <DrawerContent v-if="selectedStatus">
                <DrawerHeader>
                    <DrawerTitle>Status Info</DrawerTitle>
                    <DrawerDescription>Viewing details for status: {{ selectedStatus.name }}</DrawerDescription>
                </DrawerHeader>
                <div class="px-6 pt-6 space-y-2">
                    <div><b>Name:</b> {{ selectedStatus.name }}</div>
                    <div>
                        <b>Color:</b>
                        <span
                            v-if="selectedStatus.color"
                            :style="{
                                backgroundColor: selectedStatus.color,
                                color: '#fff',
                                padding: '2px 8px',
                                borderRadius: '4px',
                            }"
                            >{{ selectedStatus.color }}</span
                        >
                        <span v-else class="text-muted-foreground">-</span>
                    </div>
                    <div><b>Created At:</b> {{ selectedStatus.created_at }}</div>
                    <div v-if="selectedStatus.updated_at"><b>Updated At:</b> {{ selectedStatus.updated_at }}</div>
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
            <DrawerContent v-if="editingStatus">
                <DrawerHeader>
                    <DrawerTitle>Edit Status</DrawerTitle>
                    <DrawerDescription>Edit details for status: {{ editingStatus.name }}</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitEdit">
                    <div>
                        <label for="edit-name" class="block mb-1 font-medium">Name</label>
                        <Input id="edit-name" v-model="editForm.name" placeholder="Status name" required />
                    </div>
                    <div>
                        <label for="edit-color" class="block mb-1 font-medium">Color</label>
                        <div class="flex items-center gap-3">
                            <input
                                id="edit-color"
                                v-model="editForm.color"
                                type="color"
                                class="h-10 w-10 rounded border border-input"
                            />
                            <Input v-model="editForm.color" placeholder="#3366FF" />
                            <span
                                class="inline-flex items-center rounded px-2 py-1 text-xs border"
                                :style="{
                                    backgroundColor: editForm.color || '#000000',
                                    color: '#fff',
                                    borderColor: 'rgba(0,0,0,0.1)',
                                }"
                                >Preview</span
                            >
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" @click="closeEditDrawer">Cancel</Button>
                        <Button type="submit" variant="default" :loading="updating">Save</Button>
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
                    <DrawerTitle>Create Status</DrawerTitle>
                    <DrawerDescription>Fill in the details to create a new ticket status.</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitCreate">
                    <div>
                        <label for="create-name" class="block mb-1 font-medium">Name</label>
                        <Input id="create-name" v-model="createForm.name" placeholder="Status name" required />
                    </div>
                    <div>
                        <label for="create-color" class="block mb-1 font-medium">Color</label>
                        <div class="flex items-center gap-3">
                            <input
                                id="create-color"
                                v-model="createForm.color"
                                type="color"
                                class="h-10 w-10 rounded border border-input"
                            />
                            <Input v-model="createForm.color" placeholder="#3366FF" />
                            <span
                                class="inline-flex items-center rounded px-2 py-1 text-xs border"
                                :style="{
                                    backgroundColor: createForm.color || '#000000',
                                    color: '#fff',
                                    borderColor: 'rgba(0,0,0,0.1)',
                                }"
                                >Preview</span
                            >
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" @click="closeCreateDrawer">Cancel</Button>
                        <Button type="submit" variant="default" :loading="creating">Create</Button>
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
import { Eye, Pencil, Trash2, Plus } from 'lucide-vue-next';
import axios, { type AxiosError } from 'axios';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerClose,
} from '@/components/ui/drawer';
import TableComponent from '@/components/ui/feather-table/TableComponent.vue';
import type { TableColumn } from '@/components/ui/feather-table/types';
import { useToast } from 'vue-toastification';

const toast = useToast();

type Status = {
    id: number;
    name: string;
    color: string;
    created_at: string;
    updated_at?: string;
};

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
const loading = ref(true);
const deleting = ref(false);
const confirmDeleteRow = ref<number | null>(null);
const selectedStatus = ref<Status | null>(null);
const viewing = ref(false);
const editingStatus = ref<Status | null>(null);
const editDrawerOpen = ref(false);
const editForm = ref({
    name: '',
    color: '#000000',
});
const createDrawerOpen = ref(false);
const createForm = ref({
    name: '',
    color: '#000000',
});
const updating = ref(false);
const creating = ref(false);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-ticket-statuses');
const widgetsTopOfPage = computed(() => getWidgets('admin-ticket-statuses', 'top-of-page'));
const widgetsBeforeTable = computed(() => getWidgets('admin-ticket-statuses', 'before-table'));
const widgetsAfterTable = computed(() => getWidgets('admin-ticket-statuses', 'after-table'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-ticket-statuses', 'bottom-of-page'));

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'name', label: 'Name', searchable: true },
    { key: 'color', label: 'Color', searchable: false },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[200px] font-semibold' },
];

async function fetchStatuses() {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/tickets/statuses', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value || undefined,
            },
        });
        statuses.value = data.data.statuses || [];

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
    } catch (e: unknown) {
        const errorMessage =
            ((e as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to fetch statuses';
        toast.error(errorMessage);
        statuses.value = [];
        pagination.value.total = 0;
    } finally {
        loading.value = false;
    }
}

onMounted(async () => {
    await fetchPluginWidgets();
    await fetchStatuses();
});
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchStatuses);

function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.page = 1;
    fetchStatuses();
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchStatuses();
}

async function onView(status: Status) {
    viewing.value = true;
    try {
        const { data } = await axios.get(`/api/admin/tickets/statuses/${status.id}`);
        selectedStatus.value = data.data.status;
    } catch {
        selectedStatus.value = null;
        toast.error('Failed to fetch status details');
    }
}

function closeView() {
    viewing.value = false;
    selectedStatus.value = null;
}

function onEdit(status: Status) {
    editingStatus.value = status;
    editForm.value = {
        name: status.name || '',
        color: status.color || '#000000',
    };
    editDrawerOpen.value = true;
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
    editingStatus.value = null;
    editForm.value = {
        name: '',
        color: '#000000',
    };
}

async function submitEdit() {
    if (!editingStatus.value) return;

    updating.value = true;
    try {
        await axios.patch(`/api/admin/tickets/statuses/${editingStatus.value.id}`, editForm.value);
        toast.success('Status updated successfully');
        closeEditDrawer();
        await fetchStatuses();
    } catch (e: unknown) {
        const errorMessage =
            ((e as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to update status';
        toast.error(errorMessage);
    } finally {
        updating.value = false;
    }
}

function openCreateDrawer() {
    createForm.value = {
        name: '',
        color: '#000000',
    };
    createDrawerOpen.value = true;
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
    createForm.value = {
        name: '',
        color: '#000000',
    };
}

async function submitCreate() {
    creating.value = true;
    try {
        await axios.put('/api/admin/tickets/statuses', createForm.value);
        toast.success('Status created successfully');
        closeCreateDrawer();
        await fetchStatuses();
    } catch (e: unknown) {
        const errorMessage =
            ((e as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to create status';
        toast.error(errorMessage);
    } finally {
        creating.value = false;
    }
}

function onDelete(status: Status) {
    confirmDeleteRow.value = status.id;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
}

async function confirmDelete(status: Status) {
    deleting.value = true;
    try {
        await axios.delete(`/api/admin/tickets/statuses/${status.id}`);
        toast.success('Status deleted successfully');
        confirmDeleteRow.value = null;
        await fetchStatuses();
    } catch (e: unknown) {
        const errorMessage =
            ((e as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to delete status';
        toast.error(errorMessage);
    } finally {
        deleting.value = false;
    }
}
</script>
