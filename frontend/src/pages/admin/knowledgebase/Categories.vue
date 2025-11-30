<template>
    <DashboardLayout
        :breadcrumbs="[{ text: 'Knowledgebase Categories', isCurrent: true, href: '/admin/knowledgebase/categories' }]"
    >
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
                    title="Knowledgebase Categories"
                    description="Manage all knowledgebase categories in your system."
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
                    local-storage-key="featherpanel-knowledgebase-categories-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <Button
                            variant="outline"
                            size="sm"
                            data-umami-event="Create knowledgebase category"
                            @click="openCreateDrawer"
                        >
                            <Plus class="h-4 w-4 mr-2" />
                            Create Category
                        </Button>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-icon="{ item }">
                        <div v-if="(item as Category).icon" class="flex items-center">
                            <img
                                :src="(item as Category).icon"
                                :alt="(item as Category).name"
                                class="h-8 w-8 rounded object-cover"
                                @error="handleImageError"
                            />
                        </div>
                        <span v-else class="text-muted-foreground text-sm">—</span>
                    </template>
                    <template #cell-description="{ item }">
                        <div
                            v-if="(item as Category).description"
                            class="max-w-md truncate"
                            :title="(item as Category).description"
                        >
                            {{ (item as Category).description }}
                        </div>
                        <span v-else class="text-muted-foreground text-sm">—</span>
                    </template>
                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="View category details"
                                data-umami-event="View knowledgebase category"
                                :data-umami-event-category="(item as Category).name"
                                @click="onView(item as Category)"
                            >
                                <Eye :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Edit category"
                                data-umami-event="Edit knowledgebase category"
                                :data-umami-event-category="(item as Category).name"
                                @click="onEdit(item as Category)"
                            >
                                <Pencil :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="View category articles"
                                data-umami-event="View knowledgebase category articles"
                                :data-umami-event-category="(item as Category).name"
                                @click="onViewArticles(item as Category)"
                            >
                                <FileText :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as Category).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :loading="deleting"
                                    title="Confirm deletion"
                                    data-umami-event="Confirm delete knowledgebase category"
                                    :data-umami-event-category="(item as Category).name"
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
                                    data-umami-event="Delete knowledgebase category"
                                    :data-umami-event-category="(item as Category).name"
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
        <DrawerContent v-if="selectedCategory">
            <DrawerHeader>
                <DrawerTitle>Category Info</DrawerTitle>
                <DrawerDescription>Viewing details for category: {{ selectedCategory.name }}</DrawerDescription>
            </DrawerHeader>
            <div class="px-6 pt-6 space-y-2">
                <div v-if="selectedCategory.icon" class="flex items-center gap-2">
                    <b>Icon:</b>
                    <img
                        :src="selectedCategory.icon"
                        :alt="selectedCategory.name"
                        class="h-12 w-12 rounded object-cover"
                    />
                </div>
                <div><b>Name:</b> {{ selectedCategory.name }}</div>
                <div>
                    <b>Description:</b>
                    <p class="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                        {{ selectedCategory.description || '-' }}
                    </p>
                </div>
                <div><b>Position:</b> {{ selectedCategory.position }}</div>
                <div><b>Created At:</b> {{ selectedCategory.created_at }}</div>
                <div><b>Updated At:</b> {{ selectedCategory.updated_at }}</div>
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
                <label for="edit-name" class="block mb-1 font-medium">Name</label>
                <Input id="edit-name" v-model="editForm.name" label="Name" placeholder="Name" required />
                <label for="edit-icon" class="block mb-1 font-medium">Icon (Required)</label>
                <div class="flex gap-2">
                    <Input
                        ref="editIconFileInput"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        @change="handleCreateIconFileSelect"
                    />
                </div>
                <div v-if="editIconPreview" class="flex items-center gap-2 mt-2">
                    <img :src="editIconPreview" alt="Preview" class="h-12 w-12 rounded object-cover" />
                    <span class="text-sm text-muted-foreground">Preview</span>
                </div>
                <div v-else-if="editingCategory?.icon" class="flex items-center gap-2 mt-2">
                    <img :src="editingCategory.icon" alt="Current icon" class="h-12 w-12 rounded object-cover" />
                    <span class="text-sm text-muted-foreground">Current icon</span>
                </div>
                <label for="edit-description" class="block mb-1 font-medium">Description</label>
                <Input
                    id="edit-description"
                    v-model="editForm.description"
                    label="Description"
                    placeholder="Description"
                />
                <label for="edit-position" class="block mb-1 font-medium">Position</label>
                <Input
                    id="edit-position"
                    v-model.number="editForm.position"
                    type="number"
                    label="Position"
                    placeholder="0"
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
                <DrawerTitle>Create Category</DrawerTitle>
                <DrawerDescription>Fill in the details to create a new knowledgebase category.</DrawerDescription>
            </DrawerHeader>
            <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitCreate">
                <label for="create-name" class="block mb-1 font-medium">Name</label>
                <Input id="create-name" v-model="createForm.name" label="Name" placeholder="Name" required />
                <label for="create-icon" class="block mb-1 font-medium">Icon (Required)</label>
                <div class="flex gap-2">
                    <Input
                        ref="createIconFileInput"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        required
                        @change="handleCreateIconFileSelect"
                    />
                </div>
                <div v-if="createIconPreview" class="flex items-center gap-2 mt-2">
                    <img :src="createIconPreview" alt="Preview" class="h-12 w-12 rounded object-cover" />
                    <span class="text-sm text-muted-foreground">Preview</span>
                </div>
                <label for="create-description" class="block mb-1 font-medium">Description</label>
                <Input
                    id="create-description"
                    v-model="createForm.description"
                    label="Description"
                    placeholder="Description"
                />
                <label for="create-position" class="block mb-1 font-medium">Position</label>
                <Input
                    id="create-position"
                    v-model.number="createForm.position"
                    type="number"
                    label="Position"
                    placeholder="0"
                />
                <div class="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="outline" :disabled="uploadingCreateIcon" @click="closeCreateDrawer">
                        Cancel
                    </Button>
                    <Button type="submit" variant="default" :loading="uploadingCreateIcon">Create</Button>
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
import { Eye, Pencil, Trash2, Plus, FileText } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import axios from 'axios';
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

type Category = {
    id: number;
    name: string;
    slug: string;
    icon: string;
    description?: string;
    position: number;
    created_at: string;
    updated_at: string;
};

const toast = useToast();
const router = useRouter();

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-knowledgebase-categories');
const widgetsTopOfPage = computed(() => getWidgets('admin-knowledgebase-categories', 'top-of-page'));
const widgetsBeforeTable = computed(() => getWidgets('admin-knowledgebase-categories', 'before-table'));
const widgetsAfterTable = computed(() => getWidgets('admin-knowledgebase-categories', 'after-table'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-knowledgebase-categories', 'bottom-of-page'));

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
    description: '',
    position: 0,
});
const createDrawerOpen = ref(false);
const createForm = ref({
    name: '',
    description: '',
    position: 0,
});

// Icon upload
const createIconFileInput = ref<HTMLInputElement | null>(null);
const createIconPreview = ref<string | null>(null);
const createIconFile = ref<File | null>(null);
const uploadingCreateIcon = ref(false);

const editIconFileInput = ref<HTMLInputElement | null>(null);
const editIconPreview = ref<string | null>(null);
const editIconFile = ref<File | null>(null);
const uploadingEditIcon = ref(false);

const tableColumns: TableColumn[] = [
    { key: 'icon', label: 'Icon', searchable: false },
    { key: 'name', label: 'Name', searchable: true },
    { key: 'description', label: 'Description', searchable: true },
    { key: 'position', label: 'Position' },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[160px] font-semibold' },
];

async function fetchCategories() {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/knowledgebase/categories', {
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
        const { data } = await axios.get(`/api/admin/knowledgebase/categories/${category.id}`);
        selectedCategory.value = data.data.category;
    } catch {
        selectedCategory.value = null;
        toast.error('Failed to fetch category details');
    }
}

function onEdit(category: Category) {
    openEditDrawer(category);
}

async function confirmDelete(category: Category) {
    deleting.value = true;
    let success = false;
    try {
        const response = await axios.delete(`/api/admin/knowledgebase/categories/${category.id}`);
        if (response.data && response.data.success) {
            toast.success('Category deleted successfully');
            await fetchCategories();
            success = true;
        } else {
            toast.error(response.data?.message || 'Failed to delete category');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to delete category';
        toast.error(errorMessage);
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
    }
}

function onDelete(category: Category) {
    confirmDeleteRow.value = category.id;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
}

function closeView() {
    viewing.value = false;
    selectedCategory.value = null;
}

async function openEditDrawer(category: Category) {
    try {
        const { data } = await axios.get(`/api/admin/knowledgebase/categories/${category.id}`);
        const c: Category = data.data.category;
        editingCategory.value = c;
        editForm.value = {
            name: c.name || '',
            description: c.description || '',
            position: c.position || 0,
        };
        editIconPreview.value = null;
        editIconFile.value = null;
        if (editIconFileInput.value) {
            editIconFileInput.value.value = '';
        }
        editDrawerOpen.value = true;
    } catch {
        toast.error('Failed to fetch category details for editing');
    }
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
    editingCategory.value = null;
}

async function submitEdit() {
    if (!editingCategory.value) return;

    // If no new icon file selected, use existing icon
    let iconUrl = editingCategory.value.icon;

    // Upload new icon if one was selected
    if (editIconFile.value) {
        uploadingEditIcon.value = true;
        try {
            const formData = new FormData();
            formData.append('icon', editIconFile.value);

            const { data } = await axios.post('/api/admin/knowledgebase/upload-icon', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (data && data.success) {
                iconUrl = data.data.url;
            } else {
                toast.error(data?.message || 'Failed to upload icon');
                uploadingEditIcon.value = false;
                return;
            }
        } catch (e: unknown) {
            const errorMessage =
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to upload icon';
            toast.error(errorMessage);
            uploadingEditIcon.value = false;
            return;
        } finally {
            uploadingEditIcon.value = false;
        }
    }

    try {
        const patchData: {
            name: string;
            icon: string;
            description?: string;
            position?: number;
        } = {
            name: editForm.value.name,
            icon: iconUrl,
        };
        if (editForm.value.description !== undefined) {
            patchData.description = editForm.value.description || undefined;
        }
        if (editForm.value.position !== undefined) {
            patchData.position = editForm.value.position;
        }
        const { data } = await axios.patch(
            `/api/admin/knowledgebase/categories/${editingCategory.value.id}`,
            patchData,
        );
        if (data && data.success) {
            toast.success('Category updated successfully');
            await fetchCategories();
            closeEditDrawer();
        } else {
            toast.error(data?.message || 'Failed to update category');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to update category';
        toast.error(errorMessage);
    }
}

function openCreateDrawer() {
    createDrawerOpen.value = true;
    createForm.value = { name: '', description: '', position: 0 };
    createIconPreview.value = null;
    createIconFile.value = null;
    if (createIconFileInput.value) {
        createIconFileInput.value.value = '';
    }
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
    createIconPreview.value = null;
    createIconFile.value = null;
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
    } else {
        createIconFile.value = null;
        createIconPreview.value = null;
    }
}

async function submitCreate() {
    if (!createIconFile.value) {
        toast.error('Please select an icon file');
        return;
    }

    uploadingCreateIcon.value = true;
    let iconUrl = '';

    try {
        // Upload icon first
        const formData = new FormData();
        formData.append('icon', createIconFile.value);

        const uploadResponse = await axios.post('/api/admin/knowledgebase/upload-icon', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (uploadResponse.data && uploadResponse.data.success) {
            iconUrl = uploadResponse.data.data.url;
        } else {
            toast.error(uploadResponse.data?.message || 'Failed to upload icon');
            uploadingCreateIcon.value = false;
            return;
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to upload icon';
        toast.error(errorMessage);
        uploadingCreateIcon.value = false;
        return;
    } finally {
        uploadingCreateIcon.value = false;
    }

    try {
        const createData: {
            name: string;
            slug: string;
            icon: string;
            description?: string;
            position?: number;
        } = {
            name: createForm.value.name,
            slug: createForm.value.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, ''),
            icon: iconUrl,
        };
        if (createForm.value.description) {
            createData.description = createForm.value.description;
        }
        if (createForm.value.position !== undefined) {
            createData.position = createForm.value.position;
        }
        const { data } = await axios.put('/api/admin/knowledgebase/categories', createData);
        if (data && data.success) {
            toast.success('Category created successfully');
            await fetchCategories();
            closeCreateDrawer();
        } else {
            toast.error(data?.message || 'Failed to create category');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to create category';
        toast.error(errorMessage);
    }
}

function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
}

function onViewArticles(category: Category) {
    router.push(`/admin/knowledgebase/categories/${category.id}/articles`);
}
</script>
