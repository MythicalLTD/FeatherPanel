<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Realms', isCurrent: true, href: '/admin/realms' }]">
        <main class="p-6 space-y-8 bg-background min-h-screen">
            <Card class="rounded-xl">
                <CardHeader>
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle class="text-2xl font-bold">Realms</CardTitle>
                            <CardDescription>Manage all realms in your system.</CardDescription>
                        </div>
                        <div class="flex gap-2">
                            <Input
                                v-model="searchQuery"
                                placeholder="Search by name, description, or author..."
                                class="max-w-xs"
                            />
                            <Button variant="secondary" @click="openCreateDrawer">Create Realm</Button>
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
                                <TableHead>Logo</TableHead>
                                <TableHead>Author</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-for="realm in realms" :key="realm.id">
                                <TableCell>{{ realm.name }}</TableCell>
                                <TableCell>{{ realm.description || '-' }}</TableCell>
                                <TableCell>
                                    <img
                                        v-if="realm.logo"
                                        :src="realm.logo"
                                        :alt="realm.name"
                                        class="h-8 w-8 rounded"
                                    />
                                    <span v-else>-</span>
                                </TableCell>
                                <TableCell>{{ realm.author || '-' }}</TableCell>
                                <TableCell>{{ realm.created_at }}</TableCell>
                                <TableCell>
                                    <div class="flex gap-2">
                                        <Button size="sm" variant="outline" @click="onView(realm)">
                                            <Eye :size="16" />
                                        </Button>
                                        <Button size="sm" variant="secondary" @click="onEdit(realm)">
                                            <Pencil :size="16" />
                                        </Button>
                                        <template v-if="confirmDeleteRow === realm.id">
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                :loading="deleting"
                                                @click="confirmDelete(realm)"
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
                                            <Button size="sm" variant="destructive" @click="onDelete(realm)">
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
        <DrawerContent v-if="selectedRealm">
            <DrawerHeader>
                <DrawerTitle>Realm Info</DrawerTitle>
                <DrawerDescription>Viewing details for realm: {{ selectedRealm.name }}</DrawerDescription>
            </DrawerHeader>
            <div class="px-6 pt-6 space-y-2">
                <div><b>Name:</b> {{ selectedRealm.name }}</div>
                <div><b>Description:</b> {{ selectedRealm.description || '-' }}</div>
                <div>
                    <b>Logo:</b>
                    <img
                        v-if="selectedRealm.logo"
                        :src="selectedRealm.logo"
                        :alt="selectedRealm.name"
                        class="h-8 w-8 rounded inline"
                    />
                    <span v-else>-</span>
                </div>
                <div><b>Author:</b> {{ selectedRealm.author || '-' }}</div>
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
                <label for="edit-logo" class="block mb-1 font-medium">Logo URL</label>
                <Input id="edit-logo" v-model="editForm.logo" label="Logo" placeholder="Logo URL" />
                <label for="edit-author" class="block mb-1 font-medium">Author</label>
                <Input id="edit-author" v-model="editForm.author" label="Author" placeholder="Author" />
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
                <label for="create-logo" class="block mb-1 font-medium">Logo URL</label>
                <Input id="create-logo" v-model="createForm.logo" label="Logo" placeholder="Logo URL" />
                <label for="create-author" class="block mb-1 font-medium">Author</label>
                <Input id="create-author" v-model="createForm.author" label="Author" placeholder="Author" />
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

type Realm = {
    id: number;
    name: string;
    description?: string;
    logo?: string;
    author?: string;
    created_at: string;
    updated_at: string;
};

const realms = ref<Realm[]>([]);
const searchQuery = ref('');
const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0,
});
const loading = ref(false);
const deleting = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const confirmDeleteRow = ref<number | null>(null);
const displayMessage = computed(() => (message.value ? message.value.text.replace(/\r?\n|\r/g, ' ') : ''));
const selectedRealm = ref<Realm | null>(null);
const viewing = ref(false);
const editingRealm = ref<Realm | null>(null);
const editDrawerOpen = ref(false);
const editForm = ref({
    name: '',
    description: '',
    logo: '',
    author: '',
});
const createDrawerOpen = ref(false);
const createForm = ref({
    name: '',
    description: '',
    logo: '',
    author: '',
});

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
        pagination.value.total = data.data.pagination.total;
    } finally {
        loading.value = false;
    }
}

onMounted(fetchRealms);
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchRealms);

function onPageChange(page: number) {
    pagination.value.page = page;
}
async function onView(realm: Realm) {
    viewing.value = true;
    try {
        const { data } = await axios.get(`/api/admin/realms/${realm.id}`);
        selectedRealm.value = data.data.realm;
    } catch {
        selectedRealm.value = null;
        message.value = { type: 'error', text: 'Failed to fetch realm details' };
    }
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
            message.value = { type: 'success', text: 'Realm deleted successfully' };
            await fetchRealms();
            success = true;
        } else {
            message.value = { type: 'error', text: response.data?.message || 'Failed to delete realm' };
        }
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to delete realm',
        };
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
        setTimeout(() => {
            message.value = null;
        }, 4000);
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
            logo: r.logo || '',
            author: r.author || '',
        };
        editDrawerOpen.value = true;
    } catch {
        message.value = { type: 'error', text: 'Failed to fetch realm details for editing' };
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
            message.value = { type: 'success', text: 'Realm updated successfully' };
            await fetchRealms();
            closeEditDrawer();
        } else {
            message.value = { type: 'error', text: data?.message || 'Failed to update realm' };
        }
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to update realm',
        };
    } finally {
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}

function openCreateDrawer() {
    createDrawerOpen.value = true;
    createForm.value = { name: '', description: '', logo: '', author: '' };
}
function closeCreateDrawer() {
    createDrawerOpen.value = false;
}
async function submitCreate() {
    try {
        const { data } = await axios.put('/api/admin/realms', createForm.value);
        if (data && data.success) {
            message.value = { type: 'success', text: 'Realm created successfully' };
            await fetchRealms();
            closeCreateDrawer();
        } else {
            message.value = { type: 'error', text: data?.message || 'Failed to create realm' };
        }
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to create realm',
        };
    } finally {
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}
</script>
