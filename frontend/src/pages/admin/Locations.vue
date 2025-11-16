<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Locations', isCurrent: true, href: '/admin/locations' }]">
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading locations...</span>
                </div>
            </div>

            <!-- Locations Table -->
            <div v-else class="p-6">
                <!-- Plugin Widgets: Before Table -->
                <WidgetRenderer v-if="widgetsBeforeTable.length > 0" :widgets="widgetsBeforeTable" />

                <TableComponent
                    title="Locations"
                    description="Manage all locations in your system."
                    :columns="tableColumns"
                    :data="locations"
                    :search-placeholder="'Search by name or country...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-locations-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <Button
                            variant="outline"
                            size="sm"
                            data-umami-event="Create location"
                            @click="openCreateDrawer"
                        >
                            <Plus class="h-4 w-4 mr-2" />
                            Create Location
                        </Button>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="View location details"
                                data-umami-event="View location"
                                :data-umami-event-location="(item as Location).name"
                                @click="onView(item as Location)"
                            >
                                <Eye :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Edit location"
                                data-umami-event="Edit location"
                                :data-umami-event-location="(item as Location).name"
                                @click="onEdit(item as Location)"
                            >
                                <Pencil :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="View location nodes"
                                data-umami-event="View location nodes"
                                :data-umami-event-location="(item as Location).name"
                                @click="onViewNodes(item as Location)"
                            >
                                <Server :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as Location).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :loading="deleting"
                                    title="Confirm deletion"
                                    data-umami-event="Confirm delete location"
                                    :data-umami-event-location="(item as Location).name"
                                    @click="confirmDelete(item as Location)"
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
                                    title="Delete location"
                                    data-umami-event="Delete location"
                                    :data-umami-event-location="(item as Location).name"
                                    @click="onDelete(item as Location)"
                                >
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>

                <!-- Plugin Widgets: After Table -->
                <WidgetRenderer v-if="widgetsAfterTable.length > 0" :widgets="widgetsAfterTable" />

                <!-- Helpful info cards under the table -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <MapPin class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">What are Locations?</div>
                                    <p>
                                        Locations group nodes by geography or purpose. Keep your infrastructure
                                        organized and easy to navigate across regions and data centers.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Flag class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Examples</div>
                                    <ul class="list-disc list-inside space-y-1">
                                        <li><b>USA</b>: nodes where Wings runs for US servers</li>
                                        <li><b>Romania</b>: nodes where Romanian servers run (or other workloads)</li>
                                    </ul>
                                    <p class="mt-2">
                                        Use specific names like <b>USA-East</b>, <b>USA-West</b>, or
                                        <b>Romania-Bucharest</b> for clarity.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Rocket class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Getting started</div>
                                    <ol class="list-decimal list-inside space-y-1">
                                        <li>Click <b>Create Location</b> above to add your first location.</li>
                                        <li>After creating, a <b>Nodes</b> button appears next to row actions.</li>
                                        <li>Click <b>Nodes</b> to add and manage nodes for that location.</li>
                                    </ol>
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
    </DashboardLayout>

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
        <DrawerContent v-if="selectedLocation">
            <DrawerHeader>
                <DrawerTitle>Location Info</DrawerTitle>
                <DrawerDescription>Viewing details for location: {{ selectedLocation.name }}</DrawerDescription>
            </DrawerHeader>
            <div class="px-6 pt-6 space-y-2">
                <div><b>Name:</b> {{ selectedLocation.name }}</div>
                <div><b>Description:</b> {{ selectedLocation.description || '-' }}</div>
                <div><b>Created At:</b> {{ selectedLocation.created_at }}</div>
                <div><b>Updated At:</b> {{ selectedLocation.updated_at }}</div>
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
        <DrawerContent v-if="editingLocation">
            <DrawerHeader>
                <DrawerTitle>Edit Location</DrawerTitle>
                <DrawerDescription>Edit details for location: {{ editingLocation.name }}</DrawerDescription>
            </DrawerHeader>
            <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitEdit">
                <label for="edit-name" class="block mb-1 font-medium">Name</label>
                <Input id="edit-name" v-model="editForm.name" label="Name" placeholder="Name" required />
                <label for="edit-description" class="block mb-1 font-medium">Description</label>
                <Input
                    id="edit-description"
                    v-model="editForm.description"
                    label="Description"
                    placeholder="Description"
                />
                <div class="flex justify-end gap-2 mt-4">
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
                <DrawerTitle>Create Location</DrawerTitle>
                <DrawerDescription>Fill in the details to create a new location.</DrawerDescription>
            </DrawerHeader>
            <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitCreate">
                <label for="create-name" class="block mb-1 font-medium">Name</label>
                <Input id="create-name" v-model="createForm.name" label="Name" placeholder="Name" required />
                <label for="create-description" class="block mb-1 font-medium">Description</label>
                <Input
                    id="create-description"
                    v-model="createForm.description"
                    label="Description"
                    placeholder="Description"
                />
                <div class="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="outline" @click="closeCreateDrawer">Cancel</Button>
                    <Button type="submit" variant="default">Create</Button>
                </div>
            </form>
        </DrawerContent>
    </Drawer>
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

import { computed, ref, onMounted, watch } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Pencil, Trash2, Server, Plus, MapPin, Flag, Rocket } from 'lucide-vue-next';
import axios from 'axios';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerClose,
} from '@/components/ui/drawer';
import { useRouter } from 'vue-router';
import TableComponent from '@/kit/TableComponent.vue';
import type { TableColumn } from '@/kit/types';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from 'vue-toastification';

type Location = {
    id: number;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
};

const toast = useToast();
const router = useRouter();

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-locations');
const widgetsTopOfPage = computed(() => getWidgets('admin-locations', 'top-of-page'));
const widgetsBeforeTable = computed(() => getWidgets('admin-locations', 'before-table'));
const widgetsAfterTable = computed(() => getWidgets('admin-locations', 'after-table'));
const widgetsAfterHelpCards = computed(() => getWidgets('admin-locations', 'after-help-cards'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-locations', 'bottom-of-page'));

const locations = ref<Location[]>([]);
const searchQuery = ref('');
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
const loading = ref(true);
const deleting = ref(false);
const confirmDeleteRow = ref<number | null>(null);
const selectedLocation = ref<Location | null>(null);
const viewing = ref(false);
const editingLocation = ref<Location | null>(null);
const editDrawerOpen = ref(false);
const editForm = ref({
    name: '',
    description: '',
});
const createDrawerOpen = ref(false);
const createForm = ref({
    name: '',
    description: '',
});

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'name', label: 'Name', searchable: true },
    { key: 'description', label: 'Description', searchable: true },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[120px] font-semibold' },
];

async function fetchLocations() {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/locations', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value || undefined,
            },
        });
        locations.value = data.data.locations || [];

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

    await fetchLocations();
});
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchLocations);

function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.page = 1; // Reset to first page when searching
    fetchLocations();
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchLocations();
}

async function onView(location: Location) {
    viewing.value = true;
    try {
        const { data } = await axios.get(`/api/admin/locations/${location.id}`);
        selectedLocation.value = data.data.location;
    } catch {
        selectedLocation.value = null;
        toast.error('Failed to fetch location details');
    }
}

function onEdit(location: Location) {
    openEditDrawer(location);
}

async function confirmDelete(location: Location) {
    deleting.value = true;
    let success = false;
    try {
        const response = await axios.delete(`/api/admin/locations/${location.id}`);
        if (response.data && response.data.success) {
            toast.success('Location deleted successfully');
            await fetchLocations();
            success = true;
        } else {
            toast.error(response.data?.message || 'Failed to delete location');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to delete location';
        toast.error(errorMessage);
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
    }
}

function onDelete(location: Location) {
    confirmDeleteRow.value = location.id;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
}

function closeView() {
    viewing.value = false;
    selectedLocation.value = null;
}

async function openEditDrawer(location: Location) {
    try {
        const { data } = await axios.get(`/api/admin/locations/${location.id}`);
        const l: Location = data.data.location;
        editingLocation.value = l;
        editForm.value = {
            name: l.name || '',
            description: l.description || '',
        };
        editDrawerOpen.value = true;
    } catch {
        toast.error('Failed to fetch location details for editing');
    }
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
    editingLocation.value = null;
}

async function submitEdit() {
    if (!editingLocation.value) return;
    try {
        const patchData = { ...editForm.value };
        const { data } = await axios.patch(`/api/admin/locations/${editingLocation.value.id}`, patchData);
        if (data && data.success) {
            toast.success('Location updated successfully');
            await fetchLocations();
            closeEditDrawer();
        } else {
            toast.error(data?.message || 'Failed to update location');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to update location';
        toast.error(errorMessage);
    }
}

function openCreateDrawer() {
    createDrawerOpen.value = true;
    createForm.value = { name: '', description: '' };
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
}

async function submitCreate() {
    try {
        const { data } = await axios.put('/api/admin/locations', createForm.value);
        if (data && data.success) {
            toast.success('Location created successfully');
            await fetchLocations();
            closeCreateDrawer();
        } else {
            toast.error(data?.message || 'Failed to create location');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to create location';
        toast.error(errorMessage);
    }
}

function onViewNodes(location: Location) {
    router.push(`/admin/nodes?location_id=${location.id}`);
}
</script>
