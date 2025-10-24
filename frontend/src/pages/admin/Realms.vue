<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Realms', isCurrent: true, href: '/admin/realms' }]">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading realms...</span>
                </div>
            </div>

            <!-- Realms Table -->
            <div v-else class="p-6">
                <TableComponent
                    title="Realms"
                    description="Manage all realms in your system."
                    :columns="tableColumns"
                    :data="realms"
                    :search-placeholder="'Search by name or description...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-realms-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <Button variant="outline" size="sm" @click="openCreateDrawer">
                            <Plus class="h-4 w-4 mr-2" />
                            Create Realm
                        </Button>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button size="sm" variant="outline" @click="onView(item as Realm)">
                                <Eye :size="16" />
                            </Button>
                            <Button size="sm" variant="secondary" @click="onEdit(item as Realm)">
                                <Pencil :size="16" />
                            </Button>
                            <Button size="sm" variant="secondary" @click="onViewSpells(item as Realm)">
                                <Sparkles :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as Realm).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    :loading="deleting"
                                    @click="confirmDelete(item as Realm)"
                                >
                                    Confirm Delete
                                </Button>
                                <Button size="sm" variant="outline" :disabled="deleting" @click="onCancelDelete">
                                    Cancel
                                </Button>
                            </template>
                            <template v-else>
                                <Button size="sm" variant="destructive" @click="onDelete(item as Realm)">
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>
                <!-- Realms help cards under the table -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Sparkles class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">What are Realms?</div>
                                    <p>
                                        Realms are categories for your spells (known as "eggs" in Pterodactyl's terms).
                                        Pterodactyl calls them nests; we call them realms because it's just better.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <FolderTree class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Organize your spells</div>
                                    <p>
                                        Use realms as lightweight categories, similar to how locations group nodes. For
                                        example, a <b>Minecraft</b> realm contains Minecraft spells (eggs) like Paper,
                                        Vanilla, BungeeCord, and more.
                                    </p>
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
            <DrawerContent v-if="selectedRealm">
                <DrawerHeader>
                    <DrawerTitle>Realm Info</DrawerTitle>
                    <DrawerDescription>Viewing details for realm: {{ selectedRealm.name }}</DrawerDescription>
                </DrawerHeader>
                <div class="px-6 pt-6 space-y-2">
                    <div><b>Name:</b> {{ selectedRealm.name }}</div>
                    <div><b>Description:</b> {{ selectedRealm.description || '-' }}</div>
                    <div><b>Created At:</b> {{ selectedRealm.created_at }}</div>
                    <div><b>Updated At:</b> {{ selectedRealm.updated_at }}</div>
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
            <DrawerContent v-if="editingRealm">
                <DrawerHeader>
                    <DrawerTitle>Edit Realm</DrawerTitle>
                    <DrawerDescription>Edit details for realm: {{ editingRealm.name }}</DrawerDescription>
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
                    <DrawerTitle>Create Realm</DrawerTitle>
                    <DrawerDescription>Fill in the details to create a new realm.</DrawerDescription>
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Pencil, Trash2, Sparkles, Plus, FolderTree } from 'lucide-vue-next';
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

const toast = useToast();

type Realm = {
    id: number;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
};

const realms = ref<Realm[]>([]);
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
const confirmDeleteRow = ref<number | null>(null);
const selectedRealm = ref<Realm | null>(null);
const viewing = ref(false);
const editingRealm = ref<Realm | null>(null);
const editDrawerOpen = ref(false);
const router = useRouter();
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
    { key: 'actions', label: 'Actions', headerClass: 'w-[200px] font-semibold' },
];

async function fetchRealms() {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/realms', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value || undefined,
            },
        });
        realms.value = data.data.realms || [];

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
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to fetch realms';
        toast.error(errorMessage);
        // Clear realms on error to show empty state
        realms.value = [];
        pagination.value.total = 0;
    } finally {
        loading.value = false;
    }
}

onMounted(fetchRealms);
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchRealms);

// Table event handlers
function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.page = 1; // Reset to first page when searching
    fetchRealms();
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchRealms();
}
async function onView(realm: Realm) {
    viewing.value = true;
    try {
        const { data } = await axios.get(`/api/admin/realms/${realm.id}`);
        selectedRealm.value = data.data.realm;
    } catch {
        selectedRealm.value = null;
        toast.error('Failed to fetch realm details');
    }
}

function onViewSpells(realm: Realm) {
    router.push({ path: '/admin/spells', query: { realm_id: realm.id } });
}

function onEdit(realm: Realm) {
    openEditDrawer(realm);
}

async function confirmDelete(realm: Realm) {
    deleting.value = true;
    let success = false;
    try {
        const response = await axios.delete(`/api/admin/realms/${realm.id}`);
        if (response.data && response.data.success) {
            toast.success('Realm deleted successfully');
            await fetchRealms();
            success = true;
        } else {
            toast.error(response.data?.message || 'Failed to delete realm');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete realm';
        toast.error(errorMessage);
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
    }
}

function onDelete(realm: Realm) {
    confirmDeleteRow.value = realm.id;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
}

function closeView() {
    viewing.value = false;
    selectedRealm.value = null;
}

async function openEditDrawer(realm: Realm) {
    try {
        const { data } = await axios.get(`/api/admin/realms/${realm.id}`);
        const r: Realm = data.data.realm;
        editingRealm.value = r;
        editForm.value = {
            name: r.name || '',
            description: r.description || '',
        };
        editDrawerOpen.value = true;
    } catch {
        toast.error('Failed to fetch realm details for editing');
    }
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
    editingRealm.value = null;
}

async function submitEdit() {
    if (!editingRealm.value) return;

    try {
        const patchData = { ...editForm.value };
        const { data } = await axios.patch(`/api/admin/realms/${editingRealm.value.id}`, patchData);
        if (data && data.success) {
            toast.success('Realm updated successfully');
            await fetchRealms();
            closeEditDrawer();
        } else {
            toast.error(data?.message || 'Failed to update realm');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update realm';
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
        const { data } = await axios.put('/api/admin/realms', createForm.value);
        if (data && data.success) {
            toast.success('Realm created successfully');
            await fetchRealms();
            closeCreateDrawer();
        } else {
            toast.error(data?.message || 'Failed to create realm');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create realm';
        toast.error(errorMessage);
    }
}
</script>
