<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Locations', isCurrent: true, href: '/admin/locations' }]">
        <main class="p-6 space-y-8 bg-background min-h-screen">
            <Card class="rounded-xl">
                <CardHeader>
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle class="text-2xl font-bold">Locations</CardTitle>
                            <CardDescription>Manage all locations in your system.</CardDescription>
                        </div>
                        <div class="flex gap-2">
                            <Input v-model="searchQuery" placeholder="Search by name or country..." class="max-w-xs" />
                            <Button variant="secondary" @click="openCreateDrawer">Create Location</Button>
                        </div>
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
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>IP Address</TableHead>
                                <TableHead>Country</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-for="location in locations" :key="location.id">
                                <TableCell>{{ location.name }}</TableCell>
                                <TableCell>{{ location.description || '-' }}</TableCell>
                                <TableCell>{{ location.ip_address || '-' }}</TableCell>
                                <TableCell>{{ location.country || '-' }}</TableCell>
                                <TableCell>{{ location.created_at }}</TableCell>
                                <TableCell>
                                    <div class="flex gap-2">
                                        <Button size="sm" variant="outline" @click="onView(location)">
                                            <Eye :size="16" />
                                        </Button>
                                        <Button size="sm" variant="secondary" @click="onEdit(location)">
                                            <Pencil :size="16" />
                                        </Button>
                                        <Button size="sm" variant="secondary" @click="onViewNodes(location)">
                                            <Server :size="16" />
                                        </Button>
                                        <template v-if="confirmDeleteRow === location.id">
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                :loading="deleting"
                                                @click="confirmDelete(location)"
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
                                            <Button size="sm" variant="destructive" @click="onDelete(location)">
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
        <DrawerContent v-if="selectedLocation">
            <DrawerHeader>
                <DrawerTitle>Location Info</DrawerTitle>
                <DrawerDescription>Viewing details for location: {{ selectedLocation.name }}</DrawerDescription>
            </DrawerHeader>
            <div class="px-6 pt-6 space-y-2">
                <div><b>Name:</b> {{ selectedLocation.name }}</div>
                <div><b>Description:</b> {{ selectedLocation.description || '-' }}</div>
                <div><b>IP Address:</b> {{ selectedLocation.ip_address || '-' }}</div>
                <div><b>Country:</b> {{ selectedLocation.country || '-' }}</div>
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
                <label for="edit-ip" class="block mb-1 font-medium">IP Address</label>
                <Input id="edit-ip" v-model="editForm.ip_address" label="IP Address" placeholder="IP Address" />
                <label for="edit-country" class="block mb-1 font-medium">Country</label>
                <Input id="edit-country" v-model="editForm.country" label="Country" placeholder="Country" />
                <div class="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="outline" @click="closeEditDrawer">Cancel</Button>
                    <Button type="submit" variant="secondary">Save</Button>
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
                <label for="create-ip" class="block mb-1 font-medium">IP Address</label>
                <Input id="create-ip" v-model="createForm.ip_address" label="IP Address" placeholder="IP Address" />
                <label for="create-country" class="block mb-1 font-medium">Country</label>
                <Input id="create-country" v-model="createForm.country" label="Country" placeholder="Country" />
                <div class="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="outline" @click="closeCreateDrawer">Cancel</Button>
                    <Button type="submit" variant="secondary">Create</Button>
                </div>
            </form>
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
import { Eye, Pencil, Trash2, Server } from 'lucide-vue-next';
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

type Location = {
    id: number;
    name: string;
    description?: string;
    ip_address?: string;
    country?: string;
    created_at: string;
    updated_at: string;
};

const locations = ref<Location[]>([]);
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
const selectedLocation = ref<Location | null>(null);
const viewing = ref(false);
const editingLocation = ref<Location | null>(null);
const editDrawerOpen = ref(false);
const editForm = ref({
    name: '',
    description: '',
    ip_address: '',
    country: '',
});
const createDrawerOpen = ref(false);
const createForm = ref({
    name: '',
    description: '',
    ip_address: '',
    country: '',
});
const router = useRouter();
const createNodeDrawerOpen = ref(false);
const createNodeLocationId = ref<number | null>(null);

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
        pagination.value.total = data.data.pagination.total;
    } finally {
        loading.value = false;
    }
}

onMounted(fetchLocations);
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchLocations);

function onPageChange(page: number) {
    pagination.value.page = page;
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
            ip_address: l.ip_address || '',
            country: l.country || '',
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
    createForm.value = { name: '', description: '', ip_address: '', country: '' };
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
    router.push({ path: '/admin/nodes', query: { location_id: location.id } });
}
function openCreateNodeDrawer(location: Location) {
    createNodeLocationId.value = location.id;
    createNodeDrawerOpen.value = true;
}
</script>
