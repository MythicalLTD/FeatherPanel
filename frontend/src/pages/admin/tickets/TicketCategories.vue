<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Ticket Categories', isCurrent: true, href: '/admin/tickets/categories' }]">
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading categories...</span>
                </div>
            </div>

            <!-- Categories Table -->
            <div v-else class="p-6">
                <!-- Plugin Widgets: Before Table -->
                <WidgetRenderer v-if="widgetsBeforeTable.length > 0" :widgets="widgetsBeforeTable" />
                <TableComponent
                    title="Ticket Categories"
                    description="Manage ticket categories for organizing support tickets."
                    :columns="tableColumns"
                    :data="categories"
                    :search-placeholder="'Search by name...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-ticket-categories-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <Button
                            variant="outline"
                            size="sm"
                            data-umami-event="Create category"
                            @click="openCreateDrawer"
                        >
                            <Plus class="h-4 w-4 mr-2" />
                            Create Category
                        </Button>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-icon="{ item }">
                        <img
                            v-if="(item as Category).icon"
                            :src="(item as Category).icon"
                            alt="Category icon"
                            class="h-8 w-8 rounded object-cover"
                        />
                        <span v-else class="text-muted-foreground">-</span>
                    </template>
                    <template #cell-color="{ item }">
                        <span
                            v-if="(item as Category).color"
                            :style="{
                                backgroundColor: (item as Category).color,
                                color: '#fff',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                            }"
                        >
                            {{ (item as Category).color }}
                        </span>
                        <span v-else class="text-muted-foreground">-</span>
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="View category details"
                                data-umami-event="View category"
                                @click="onView(item as Category)"
                            >
                                <Eye :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Edit category"
                                data-umami-event="Edit category"
                                @click="onEdit(item as Category)"
                            >
                                <Pencil :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as Category).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :loading="deleting"
                                    title="Confirm deletion"
                                    data-umami-event="Confirm delete category"
                                    @click="confirmDelete(item as Category)"
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
                                    title="Delete category"
                                    data-umami-event="Delete category"
                                    @click="onDelete(item as Category)"
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
            <DrawerContent v-if="selectedCategory">
                <DrawerHeader>
                    <DrawerTitle>Category Info</DrawerTitle>
                    <DrawerDescription>Viewing details for category: {{ selectedCategory.name }}</DrawerDescription>
                </DrawerHeader>
                <div class="px-6 pt-6 space-y-2">
                    <div><b>Name:</b> {{ selectedCategory.name }}</div>
                    <div v-if="selectedCategory.icon">
                        <b>Icon:</b>
                        <img
                            :src="selectedCategory.icon"
                            alt="Category icon"
                            class="h-12 w-12 rounded object-cover mt-2"
                        />
                    </div>
                    <div>
                        <b>Color:</b>
                        <span
                            v-if="selectedCategory.color"
                            :style="{
                                backgroundColor: selectedCategory.color,
                                color: '#fff',
                                padding: '2px 8px',
                                borderRadius: '4px',
                            }"
                            >{{ selectedCategory.color }}</span
                        >
                        <span v-else class="text-muted-foreground">-</span>
                    </div>
                    <div v-if="selectedCategory.support_email">
                        <b>Support Email:</b> {{ selectedCategory.support_email }}
                    </div>
                    <div v-if="selectedCategory.open_hours"><b>Open Hours:</b> {{ selectedCategory.open_hours }}</div>
                    <div><b>Created At:</b> {{ selectedCategory.created_at }}</div>
                    <div v-if="selectedCategory.updated_at"><b>Updated At:</b> {{ selectedCategory.updated_at }}</div>
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
            <DrawerContent v-if="editingCategory">
                <DrawerHeader>
                    <DrawerTitle>Edit Category</DrawerTitle>
                    <DrawerDescription>Edit details for category: {{ editingCategory.name }}</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitEdit">
                    <div>
                        <label for="edit-name" class="block mb-1 font-medium">Name</label>
                        <Input id="edit-name" v-model="editForm.name" placeholder="Category name" required />
                    </div>
                    <div>
                        <label for="edit-icon" class="block mb-1 font-medium">Icon (Optional)</label>
                        <Input
                            ref="editIconFileInput"
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            @change="handleEditIconFileSelect"
                        />
                        <div v-if="editIconPreview" class="flex items-center gap-2 mt-2">
                            <img :src="editIconPreview" alt="Preview" class="h-12 w-12 rounded object-cover" />
                            <span class="text-sm text-muted-foreground">New icon preview</span>
                        </div>
                        <div v-else-if="editingCategory?.icon" class="flex items-center gap-2 mt-2">
                            <img
                                :src="editingCategory.icon"
                                alt="Current icon"
                                class="h-12 w-12 rounded object-cover"
                            />
                            <span class="text-sm text-muted-foreground">Current icon</span>
                        </div>
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
                    <div>
                        <label for="edit-support-email" class="block mb-1 font-medium">Support Email</label>
                        <Input
                            id="edit-support-email"
                            v-model="editForm.support_email"
                            type="email"
                            placeholder="support@example.com"
                        />
                    </div>
                    <div>
                        <label for="edit-open-hours" class="block mb-1 font-medium">Open Hours</label>
                        <Input id="edit-open-hours" v-model="editForm.open_hours" placeholder="Mon-Fri 9AM-5PM" />
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
                    <DrawerTitle>Create Category</DrawerTitle>
                    <DrawerDescription>Fill in the details to create a new ticket category.</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitCreate">
                    <div>
                        <label for="create-name" class="block mb-1 font-medium">Name</label>
                        <Input id="create-name" v-model="createForm.name" placeholder="Category name" required />
                    </div>
                    <div>
                        <label for="create-icon" class="block mb-1 font-medium">Icon (Optional)</label>
                        <Input
                            ref="createIconFileInput"
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            @change="handleCreateIconFileSelect"
                        />
                        <div v-if="createIconPreview" class="flex items-center gap-2 mt-2">
                            <img :src="createIconPreview" alt="Preview" class="h-12 w-12 rounded object-cover" />
                            <span class="text-sm text-muted-foreground">Preview</span>
                        </div>
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
                    <div>
                        <label for="create-support-email" class="block mb-1 font-medium">Support Email</label>
                        <Input
                            id="create-support-email"
                            v-model="createForm.support_email"
                            type="email"
                            placeholder="support@example.com"
                        />
                    </div>
                    <div>
                        <label for="create-open-hours" class="block mb-1 font-medium">Open Hours</label>
                        <Input id="create-open-hours" v-model="createForm.open_hours" placeholder="Mon-Fri 9AM-5PM" />
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

type Category = {
    id: number;
    name: string;
    icon?: string;
    color: string;
    support_email: string;
    open_hours?: string;
    created_at: string;
    updated_at?: string;
};

const categories = ref<Category[]>([]);
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
const selectedCategory = ref<Category | null>(null);
const viewing = ref(false);
const editingCategory = ref<Category | null>(null);
const editDrawerOpen = ref(false);
const editForm = ref({
    name: '',
    icon: '',
    color: '#000000',
    support_email: '',
    open_hours: '',
});
const createDrawerOpen = ref(false);
const createForm = ref({
    name: '',
    icon: '',
    color: '#000000',
    support_email: '',
    open_hours: '',
});
const updating = ref(false);
const creating = ref(false);
const createIconFile = ref<File | null>(null);
const createIconPreview = ref<string | null>(null);
const editIconFile = ref<File | null>(null);
const editIconPreview = ref<string | null>(null);
const createIconFileInput = ref<HTMLInputElement | null>(null);
const editIconFileInput = ref<HTMLInputElement | null>(null);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-ticket-categories');
const widgetsTopOfPage = computed(() => getWidgets('admin-ticket-categories', 'top-of-page'));
const widgetsBeforeTable = computed(() => getWidgets('admin-ticket-categories', 'before-table'));
const widgetsAfterTable = computed(() => getWidgets('admin-ticket-categories', 'after-table'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-ticket-categories', 'bottom-of-page'));

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'name', label: 'Name', searchable: true },
    { key: 'icon', label: 'Icon', searchable: false },
    { key: 'color', label: 'Color', searchable: false },
    { key: 'support_email', label: 'Support Email', searchable: true },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[200px] font-semibold' },
];

async function fetchCategories() {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/tickets/categories', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value || undefined,
            },
        });
        categories.value = data.data.categories || [];

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
            ((e as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to fetch categories';
        toast.error(errorMessage);
        categories.value = [];
        pagination.value.total = 0;
    } finally {
        loading.value = false;
    }
}

onMounted(async () => {
    await fetchPluginWidgets();
    await fetchCategories();
});
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchCategories);

function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.page = 1;
    fetchCategories();
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchCategories();
}

async function onView(category: Category) {
    viewing.value = true;
    try {
        const { data } = await axios.get(`/api/admin/tickets/categories/${category.id}`);
        selectedCategory.value = data.data.category;
    } catch {
        selectedCategory.value = null;
        toast.error('Failed to fetch category details');
    }
}

function closeView() {
    viewing.value = false;
    selectedCategory.value = null;
}

function onEdit(category: Category) {
    editingCategory.value = category;
    editForm.value = {
        name: category.name || '',
        icon: category.icon || '',
        color: category.color || '#000000',
        support_email: category.support_email || '',
        open_hours: category.open_hours || '',
    };
    editDrawerOpen.value = true;
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
    editingCategory.value = null;
    editForm.value = {
        name: '',
        icon: '',
        color: '#000000',
        support_email: '',
        open_hours: '',
    };
    editIconFile.value = null;
    editIconPreview.value = null;
    if (editIconFileInput.value) {
        editIconFileInput.value.value = '';
    }
}

function handleEditIconFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        editIconFile.value = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            editIconPreview.value = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
}

function handleCreateIconFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        createIconFile.value = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            createIconPreview.value = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
}

async function submitEdit() {
    if (!editingCategory.value) return;

    updating.value = true;

    // If no new icon file selected, use existing icon (or null if category had no icon)
    let iconUrl = editingCategory.value.icon || undefined;

    // Upload new icon if one was selected
    if (editIconFile.value) {
        try {
            const formData = new FormData();
            formData.append('icon', editIconFile.value);

            const uploadResponse = await axios.post('/api/admin/tickets/categories/upload-icon', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (uploadResponse.data && uploadResponse.data.success) {
                iconUrl = uploadResponse.data.data.url;
            } else {
                toast.error(uploadResponse.data?.message || 'Failed to upload icon');
                updating.value = false;
                return;
            }
        } catch (e: unknown) {
            const errorMessage =
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to upload icon';
            toast.error(errorMessage);
            updating.value = false;
            return;
        }
    }

    try {
        const updateData = {
            ...editForm.value,
            icon: iconUrl,
        };
        await axios.patch(`/api/admin/tickets/categories/${editingCategory.value.id}`, updateData);
        toast.success('Category updated successfully');
        closeEditDrawer();
        await fetchCategories();
    } catch (e: unknown) {
        const errorMessage =
            ((e as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to update category';
        toast.error(errorMessage);
    } finally {
        updating.value = false;
    }
}

function openCreateDrawer() {
    createForm.value = {
        name: '',
        icon: '',
        color: '#000000',
        support_email: '',
        open_hours: '',
    };
    createDrawerOpen.value = true;
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
    createForm.value = {
        name: '',
        icon: '',
        color: '#000000',
        support_email: '',
        open_hours: '',
    };
    createIconFile.value = null;
    createIconPreview.value = null;
    if (createIconFileInput.value) {
        createIconFileInput.value.value = '';
    }
}

async function submitCreate() {
    creating.value = true;
    let iconUrl = '';

    // Upload icon if one was selected
    if (createIconFile.value) {
        try {
            const formData = new FormData();
            formData.append('icon', createIconFile.value);

            const uploadResponse = await axios.post('/api/admin/tickets/categories/upload-icon', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (uploadResponse.data && uploadResponse.data.success) {
                iconUrl = uploadResponse.data.data.url;
            } else {
                toast.error(uploadResponse.data?.message || 'Failed to upload icon');
                creating.value = false;
                return;
            }
        } catch (e: unknown) {
            const errorMessage =
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to upload icon';
            toast.error(errorMessage);
            creating.value = false;
            return;
        }
    }

    try {
        const createData = {
            ...createForm.value,
            icon: iconUrl || undefined,
        };
        await axios.put('/api/admin/tickets/categories', createData);
        toast.success('Category created successfully');
        closeCreateDrawer();
        await fetchCategories();
    } catch (e: unknown) {
        const errorMessage =
            ((e as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to create category';
        toast.error(errorMessage);
    } finally {
        creating.value = false;
    }
}

function onDelete(category: Category) {
    confirmDeleteRow.value = category.id;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
}

async function confirmDelete(category: Category) {
    deleting.value = true;
    try {
        await axios.delete(`/api/admin/tickets/categories/${category.id}`);
        toast.success('Category deleted successfully');
        confirmDeleteRow.value = null;
        await fetchCategories();
    } catch (e: unknown) {
        const errorMessage =
            ((e as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to delete category';
        toast.error(errorMessage);
    } finally {
        deleting.value = false;
    }
}
</script>
