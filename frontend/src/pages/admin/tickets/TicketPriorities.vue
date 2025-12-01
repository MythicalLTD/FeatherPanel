<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Ticket Priorities', isCurrent: true, href: '/admin/tickets/priorities' }]">
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading priorities...</span>
                </div>
            </div>

            <!-- Priorities Table -->
            <div v-else class="p-6">
                <!-- Plugin Widgets: Before Table -->
                <WidgetRenderer v-if="widgetsBeforeTable.length > 0" :widgets="widgetsBeforeTable" />
                <TableComponent
                    title="Ticket Priorities"
                    description="Manage ticket priorities for organizing support tickets."
                    :columns="tableColumns"
                    :data="priorities"
                    :search-placeholder="'Search by name...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-ticket-priorities-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <Button
                            variant="outline"
                            size="sm"
                            data-umami-event="Create priority"
                            @click="openCreateDrawer"
                        >
                            <Plus class="h-4 w-4 mr-2" />
                            Create Priority
                        </Button>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-color="{ item }">
                        <span
                            v-if="(item as Priority).color"
                            :style="{
                                backgroundColor: (item as Priority).color,
                                color: '#fff',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                            }"
                        >
                            {{ (item as Priority).color }}
                        </span>
                        <span v-else class="text-muted-foreground">-</span>
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="View priority details"
                                data-umami-event="View priority"
                                @click="onView(item as Priority)"
                            >
                                <Eye :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Edit priority"
                                data-umami-event="Edit priority"
                                @click="onEdit(item as Priority)"
                            >
                                <Pencil :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as Priority).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :loading="deleting"
                                    title="Confirm deletion"
                                    data-umami-event="Confirm delete priority"
                                    @click="confirmDelete(item as Priority)"
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
                                    title="Delete priority"
                                    data-umami-event="Delete priority"
                                    @click="onDelete(item as Priority)"
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
            <DrawerContent v-if="selectedPriority">
                <DrawerHeader>
                    <DrawerTitle>Priority Info</DrawerTitle>
                    <DrawerDescription>Viewing details for priority: {{ selectedPriority.name }}</DrawerDescription>
                </DrawerHeader>
                <div class="px-6 pt-6 space-y-2">
                    <div><b>Name:</b> {{ selectedPriority.name }}</div>
                    <div>
                        <b>Color:</b>
                        <span
                            v-if="selectedPriority.color"
                            :style="{
                                backgroundColor: selectedPriority.color,
                                color: '#fff',
                                padding: '2px 8px',
                                borderRadius: '4px',
                            }"
                            >{{ selectedPriority.color }}</span
                        >
                        <span v-else class="text-muted-foreground">-</span>
                    </div>
                    <div><b>Created At:</b> {{ selectedPriority.created_at }}</div>
                    <div v-if="selectedPriority.updated_at"><b>Updated At:</b> {{ selectedPriority.updated_at }}</div>
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
            <DrawerContent v-if="editingPriority">
                <DrawerHeader>
                    <DrawerTitle>Edit Priority</DrawerTitle>
                    <DrawerDescription>Edit details for priority: {{ editingPriority.name }}</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitEdit">
                    <div>
                        <label for="edit-name" class="block mb-1 font-medium">Name</label>
                        <Input id="edit-name" v-model="editForm.name" placeholder="Priority name" required />
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
                    <DrawerTitle>Create Priority</DrawerTitle>
                    <DrawerDescription>Fill in the details to create a new ticket priority.</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitCreate">
                    <div>
                        <label for="create-name" class="block mb-1 font-medium">Name</label>
                        <Input id="create-name" v-model="createForm.name" placeholder="Priority name" required />
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

type Priority = {
    id: number;
    name: string;
    color: string;
    created_at: string;
    updated_at?: string;
};

const priorities = ref<Priority[]>([]);
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
const selectedPriority = ref<Priority | null>(null);
const viewing = ref(false);
const editingPriority = ref<Priority | null>(null);
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
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-ticket-priorities');
const widgetsTopOfPage = computed(() => getWidgets('admin-ticket-priorities', 'top-of-page'));
const widgetsBeforeTable = computed(() => getWidgets('admin-ticket-priorities', 'before-table'));
const widgetsAfterTable = computed(() => getWidgets('admin-ticket-priorities', 'after-table'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-ticket-priorities', 'bottom-of-page'));

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'name', label: 'Name', searchable: true },
    { key: 'color', label: 'Color', searchable: false },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[200px] font-semibold' },
];

async function fetchPriorities() {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/tickets/priorities', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value || undefined,
            },
        });
        priorities.value = data.data.priorities || [];

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
            ((e as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to fetch priorities';
        toast.error(errorMessage);
        priorities.value = [];
        pagination.value.total = 0;
    } finally {
        loading.value = false;
    }
}

onMounted(async () => {
    await fetchPluginWidgets();
    await fetchPriorities();
});
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchPriorities);

function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.page = 1;
    fetchPriorities();
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchPriorities();
}

async function onView(priority: Priority) {
    viewing.value = true;
    try {
        const { data } = await axios.get(`/api/admin/tickets/priorities/${priority.id}`);
        selectedPriority.value = data.data.priority;
    } catch {
        selectedPriority.value = null;
        toast.error('Failed to fetch priority details');
    }
}

function closeView() {
    viewing.value = false;
    selectedPriority.value = null;
}

function onEdit(priority: Priority) {
    editingPriority.value = priority;
    editForm.value = {
        name: priority.name || '',
        color: priority.color || '#000000',
    };
    editDrawerOpen.value = true;
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
    editingPriority.value = null;
    editForm.value = {
        name: '',
        color: '#000000',
    };
}

async function submitEdit() {
    if (!editingPriority.value) return;

    updating.value = true;
    try {
        await axios.patch(`/api/admin/tickets/priorities/${editingPriority.value.id}`, editForm.value);
        toast.success('Priority updated successfully');
        closeEditDrawer();
        await fetchPriorities();
    } catch (e: unknown) {
        const errorMessage =
            ((e as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to update priority';
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
        await axios.put('/api/admin/tickets/priorities', createForm.value);
        toast.success('Priority created successfully');
        closeCreateDrawer();
        await fetchPriorities();
    } catch (e: unknown) {
        const errorMessage =
            ((e as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to create priority';
        toast.error(errorMessage);
    } finally {
        creating.value = false;
    }
}

function onDelete(priority: Priority) {
    confirmDeleteRow.value = priority.id;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
}

async function confirmDelete(priority: Priority) {
    deleting.value = true;
    try {
        await axios.delete(`/api/admin/tickets/priorities/${priority.id}`);
        toast.success('Priority deleted successfully');
        confirmDeleteRow.value = null;
        await fetchPriorities();
    } catch (e: unknown) {
        const errorMessage =
            ((e as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to delete priority';
        toast.error(errorMessage);
    } finally {
        deleting.value = false;
    }
}
</script>
