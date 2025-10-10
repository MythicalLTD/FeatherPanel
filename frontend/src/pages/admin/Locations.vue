<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Locations', isCurrent: true, href: '/admin/locations' }]">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading locations...</span>
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
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load locations</h3>
                <p class="text-sm text-muted-foreground max-w-sm">
                    {{ message.text }}
                </p>
                <Button class="mt-4" @click="fetchLocations">Try Again</Button>
            </div>

            <!-- Locations Table -->
            <div v-else class="p-6">
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
                        <Button variant="outline" size="sm" @click="openCreateDrawer">
                            <Plus class="h-4 w-4 mr-2" />
                            Create Location
                        </Button>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button size="sm" variant="outline" @click="onView(item as Location)">
                                <Eye :size="16" />
                            </Button>
                            <Button size="sm" variant="secondary" @click="onEdit(item as Location)">
                                <Pencil :size="16" />
                            </Button>
                            <Button size="sm" variant="secondary" @click="onViewNodes(item as Location)">
                                <Server :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as Location).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    :loading="deleting"
                                    @click="confirmDelete(item as Location)"
                                >
                                    Confirm Delete
                                </Button>
                                <Button size="sm" variant="outline" :disabled="deleting" @click="onCancelDelete">
                                    Cancel
                                </Button>
                            </template>
                            <template v-else>
                                <Button size="sm" variant="destructive" @click="onDelete(item as Location)">
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>
                <!-- Helpful info cards under the table -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <div class="p-4 flex items-start gap-3">
                            <MapPin class="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div class="text-sm text-muted-foreground">
                                <div class="font-medium text-foreground mb-1">What are Locations?</div>
                                <p>
                                    Locations group nodes by geography or purpose. Keep your infrastructure organized
                                    and easy to navigate across regions and data centers.
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div class="p-4 text-sm text-muted-foreground">
                            <div class="flex items-start gap-3">
                                <Flag class="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div class="flex-1">
                                    <div class="font-medium text-foreground mb-1">Examples</div>
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
                        </div>
                    </Card>
                    <Card>
                        <div class="p-4 text-sm text-muted-foreground">
                            <div class="flex items-start gap-3">
                                <Rocket class="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div class="flex-1">
                                    <div class="font-medium text-foreground mb-1">Getting started</div>
                                    <ol class="list-decimal list-inside space-y-1">
                                        <li>Click <b>Create Location</b> above to add your first location.</li>
                                        <li>After creating, a <b>Nodes</b> button appears next to row actions.</li>
                                        <li>Click <b>Nodes</b> to add and manage nodes for that location.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
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
            <div class="p-4 flex justify-between">
                <Button variant="secondary" @click="openCreateNodeDrawer(selectedLocation)">Create Node</Button>
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
                <label for="edit-description" class="block mb-1 font-medium">Description</label>
                <Input
                    id="edit-description"
                    v-model="editForm.description"
                    label="Description"
                    placeholder="Description"
                />
                <div class="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="outline" @click="closeEditDrawer">Cancel</Button>
                    <Button type="submit" variant="secondary">Save</Button>
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
                <label for="create-description" class="block mb-1 font-medium">Description</label>
                <Input
                    id="create-description"
                    v-model="createForm.description"
                    label="Description"
                    placeholder="Description"
                />
                <div class="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="outline" @click="closeCreateDrawer">Cancel</Button>
                    <Button type="submit" variant="secondary">Create</Button>
                </div>
            </form>
        </DrawerContent>
    </Drawer>

    <!-- Create Node Drawer -->
    <Drawer
        :open="createNodeDrawerOpen"
        @update:open="
            (val) => {
                if (!val) closeCreateNodeDrawer();
            }
        "
    >
        <DrawerContent>
            <DrawerHeader>
                <DrawerTitle>Create Node</DrawerTitle>
                <DrawerDescription>Fill in the details to create a new node for this location.</DrawerDescription>
            </DrawerHeader>
            <Alert
                v-if="drawerMessage"
                :variant="drawerMessage.type === 'error' ? 'destructive' : 'default'"
                class="mb-4 whitespace-nowrap overflow-x-auto"
            >
                <span>{{ drawerMessage.text }}</span>
            </Alert>
            <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitCreateNode">
                <label for="create-node-name" class="block mb-1 font-medium">Name</label>
                <Input id="create-node-name" v-model="createNodeForm.name" label="Name" placeholder="Name" required />
                <label for="create-node-fqdn" class="block mb-1 font-medium">FQDN</label>
                <Input id="create-node-fqdn" v-model="createNodeForm.fqdn" label="FQDN" placeholder="FQDN" required />
                <label for="create-node-token" class="block mb-1 font-medium">Token</label>
                <Input
                    id="create-node-token"
                    v-model="createNodeForm.token"
                    label="Token"
                    placeholder="Token"
                    required
                />
                <div class="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="outline" @click="closeCreateNodeDrawer">Cancel</Button>
                    <Button type="submit" variant="secondary">Create</Button>
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

import { ref, onMounted, watch } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Pencil, Trash2, Server, Plus, MapPin, Flag, Rocket } from 'lucide-vue-next';
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
import { useRouter } from 'vue-router';
import TableComponent from '@/kit/TableComponent.vue';
import type { TableColumn } from '@/kit/types';
import { Card } from '@/components/ui/card';

type Location = {
    id: number;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
};

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
const loading = ref(false);
const deleting = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const drawerMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);
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
const router = useRouter();
const createNodeDrawerOpen = ref(false);
const createNodeLocationId = ref<number | null>(null);
const createNodeForm = ref({
    name: '',
    fqdn: '',
    token: '',
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

onMounted(fetchLocations);
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
        message.value = { type: 'error', text: 'Failed to fetch location details' };
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
            message.value = { type: 'success', text: 'Location deleted successfully' };
            await fetchLocations();
            success = true;
        } else {
            message.value = { type: 'error', text: response.data?.message || 'Failed to delete location' };
        }
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to delete location',
        };
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
        setTimeout(() => {
            message.value = null;
        }, 4000);
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
        message.value = { type: 'error', text: 'Failed to fetch location details for editing' };
    }
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
    editingLocation.value = null;
    drawerMessage.value = null;
}

async function submitEdit() {
    if (!editingLocation.value) return;
    try {
        const patchData = { ...editForm.value };
        const { data } = await axios.patch(`/api/admin/locations/${editingLocation.value.id}`, patchData);
        if (data && data.success) {
            drawerMessage.value = { type: 'success', text: 'Location updated successfully' };
            setTimeout(() => {
                drawerMessage.value = null;
            }, 2000);
            await fetchLocations();
            closeEditDrawer();
        } else {
            drawerMessage.value = { type: 'error', text: data?.message || 'Failed to update location' };
        }
    } catch (e: unknown) {
        drawerMessage.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to update location',
        };
    }
}

function openCreateDrawer() {
    createDrawerOpen.value = true;
    createForm.value = { name: '', description: '' };
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
    drawerMessage.value = null;
}

async function submitCreate() {
    try {
        const { data } = await axios.put('/api/admin/locations', createForm.value);
        if (data && data.success) {
            drawerMessage.value = { type: 'success', text: 'Location created successfully' };
            setTimeout(() => {
                drawerMessage.value = null;
            }, 2000);
            await fetchLocations();
            closeCreateDrawer();
        } else {
            drawerMessage.value = { type: 'error', text: data?.message || 'Failed to create location' };
        }
    } catch (e: unknown) {
        drawerMessage.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to create location',
        };
    }
}

function onViewNodes(location: Location) {
    router.push(`/admin/nodes?location_id=${location.id}`);
}

function openCreateNodeDrawer(location: Location) {
    createNodeLocationId.value = location.id;
    createNodeDrawerOpen.value = true;
}

async function submitCreateNode() {
    if (!createNodeLocationId.value) return;
    try {
        const { data } = await axios.post(`/api/admin/nodes`, {
            ...createNodeForm.value,
            location_id: createNodeLocationId.value,
        });
        if (data && data.success) {
            drawerMessage.value = { type: 'success', text: 'Node created successfully' };
            setTimeout(() => {
                drawerMessage.value = null;
            }, 2000);
            closeCreateNodeDrawer();
            await fetchLocations(); // Refresh locations to show new node
        } else {
            drawerMessage.value = { type: 'error', text: data?.message || 'Failed to create node' };
        }
    } catch (e: unknown) {
        drawerMessage.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to create node',
        };
    }
}

function closeCreateNodeDrawer() {
    createNodeDrawerOpen.value = false;
    createNodeForm.value = { name: '', fqdn: '', token: '' };
    drawerMessage.value = null;
}
</script>
