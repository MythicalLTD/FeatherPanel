<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Images', isCurrent: true, href: '/admin/images' }]">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading images...</span>
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
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load images</h3>
                <p class="text-sm text-muted-foreground max-w-sm">
                    {{ message.text }}
                </p>
                <Button class="mt-4" @click="fetchImages">Try Again</Button>
            </div>

            <!-- Images Table -->
            <div v-else class="p-6">
                <TableComponent
                    title="Images"
                    description="Manage uploaded images for your system."
                    :columns="tableColumns"
                    :data="images"
                    :search-placeholder="'Search by name or URL...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-images-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <div class="flex gap-2">
                            <Button variant="outline" size="sm" @click="openCreateDrawer">
                                <Plus class="h-4 w-4 mr-2" />
                                Upload Image
                            </Button>
                        </div>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-name="{ item }">
                        <div class="flex items-center gap-2">
                            <ImageIcon class="h-4 w-4 text-muted-foreground" />
                            <span class="font-medium">{{ (item as unknown as Image).name }}</span>
                        </div>
                    </template>

                    <template #cell-url="{ item }">
                        <div class="max-w-xs">
                            <a
                                :href="(item as unknown as Image).url"
                                target="_blank"
                                class="text-sm text-blue-600 hover:text-blue-800 truncate block"
                            >
                                {{ (item as unknown as Image).url }}
                            </a>
                        </div>
                    </template>

                    <template #cell-preview="{ item }">
                        <div class="w-16 h-16 rounded-lg overflow-hidden border">
                            <img
                                :src="(item as unknown as Image).url"
                                :alt="(item as unknown as Image).name"
                                class="w-full h-full object-cover"
                                @error="handleImageError"
                            />
                        </div>
                    </template>

                    <template #cell-created_at="{ item }">
                        <span class="text-sm text-muted-foreground">
                            {{ formatDate((item as unknown as Image).created_at) }}
                        </span>
                    </template>

                    <template #cell-updated_at="{ item }">
                        <span class="text-sm text-muted-foreground">
                            {{ formatDate((item as unknown as Image).updated_at) }}
                        </span>
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button size="sm" variant="outline" @click="onView(item as unknown as Image)">
                                <Eye :size="16" />
                            </Button>
                            <Button size="sm" variant="secondary" @click="onEdit(item as unknown as Image)">
                                <Pencil :size="16" />
                            </Button>
                            <Button size="sm" variant="outline" @click="onCopyUrl(item as unknown as Image)">
                                <Copy :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as unknown as Image).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    :loading="deleting"
                                    @click="confirmDelete(item as unknown as Image)"
                                >
                                    Confirm Delete
                                </Button>
                                <Button size="sm" variant="outline" :disabled="deleting" @click="onCancelDelete">
                                    Cancel
                                </Button>
                            </template>
                            <template v-else>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    :disabled="deleting"
                                    @click="onDelete(item as unknown as Image)"
                                >
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>
            </div>
        </div>

        <!-- View Drawer -->
        <Drawer
            :open="viewDrawerOpen"
            @update:open="
                (val) => {
                    if (!val) closeViewDrawer();
                }
            "
        >
            <DrawerContent v-if="selectedImage">
                <DrawerHeader>
                    <DrawerTitle>Image Details</DrawerTitle>
                    <DrawerDescription>Viewing details for image: {{ selectedImage.name }}</DrawerDescription>
                </DrawerHeader>

                <div class="px-6 pb-6 space-y-6">
                    <div class="flex justify-center">
                        <div class="w-64 h-64 rounded-lg overflow-hidden border">
                            <img
                                :src="selectedImage.url"
                                :alt="selectedImage.name"
                                class="w-full h-full object-cover"
                                @error="handleImageError"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label class="text-sm font-medium">Name</Label>
                            <p class="text-sm text-muted-foreground mt-1">{{ selectedImage.name }}</p>
                        </div>
                        <div>
                            <Label class="text-sm font-medium">URL</Label>
                            <a
                                :href="selectedImage.url"
                                target="_blank"
                                class="text-sm text-blue-600 hover:text-blue-800 block mt-1 break-all"
                            >
                                {{ selectedImage.url }}
                            </a>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label class="text-sm font-medium">Created At</Label>
                            <p class="text-sm text-muted-foreground mt-1">
                                {{ formatDate(selectedImage.created_at) }}
                            </p>
                        </div>
                        <div>
                            <Label class="text-sm font-medium">Updated At</Label>
                            <p class="text-sm text-muted-foreground mt-1">
                                {{ formatDate(selectedImage.updated_at) }}
                            </p>
                        </div>
                    </div>
                </div>

                <DrawerFooter>
                    <DrawerClose as-child>
                        <Button variant="outline">Close</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>

        <!-- Edit Drawer -->
        <Drawer
            :open="editDrawerOpen"
            @update:open="
                (val) => {
                    if (!val) closeEditDrawer();
                }
            "
        >
            <DrawerContent v-if="editingImage">
                <DrawerHeader>
                    <DrawerTitle>Edit Image</DrawerTitle>
                    <DrawerDescription>Edit details for image: {{ editingImage.name }}</DrawerDescription>
                </DrawerHeader>

                <form class="px-6 pb-6 space-y-6" @submit.prevent="updateImage">
                    <div class="space-y-2">
                        <Label for="edit-name">Name</Label>
                        <Input id="edit-name" v-model="editingImage.name" placeholder="Image name" required />
                    </div>

                    <div class="space-y-2">
                        <Label for="edit-url">URL</Label>
                        <Input id="edit-url" v-model="editingImage.url" placeholder="Image URL" required />
                    </div>

                    <div class="flex gap-2">
                        <Button type="submit" :loading="updating">
                            {{ updating ? 'Updating...' : 'Update Image' }}
                        </Button>
                        <Button type="button" variant="outline" @click="closeEditDrawer">Cancel</Button>
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
                    <DrawerTitle>Upload Image</DrawerTitle>
                    <DrawerDescription>Upload a new image to your system.</DrawerDescription>
                </DrawerHeader>

                <form class="px-6 pb-6 space-y-6" @submit.prevent="uploadImage">
                    <div class="space-y-2">
                        <Label for="create-name">Name</Label>
                        <Input id="create-name" v-model="newImage.name" placeholder="Image name" required />
                    </div>

                    <div class="space-y-2">
                        <Label for="create-file">Image File</Label>
                        <Input id="create-file" type="file" accept="image/*" required @change="handleFileSelect" />
                        <p class="text-xs text-muted-foreground">Supported formats: JPG, PNG, GIF, WebP</p>
                    </div>

                    <div v-if="selectedFile" class="space-y-2">
                        <Label>Preview</Label>
                        <div class="w-32 h-32 rounded-lg overflow-hidden border">
                            <img :src="filePreview" :alt="newImage.name" class="w-full h-full object-cover" />
                        </div>
                    </div>

                    <div class="flex gap-2">
                        <Button type="submit" :loading="uploading">
                            {{ uploading ? 'Uploading...' : 'Upload Image' }}
                        </Button>
                        <Button type="button" variant="outline" @click="closeCreateDrawer">Cancel</Button>
                    </div>
                </form>
            </DrawerContent>
        </Drawer>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useToast } from 'vue-toastification';
import axios from 'axios';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import TableComponent from '@/kit/TableComponent.vue';
import type { TableColumn } from '@/kit/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
} from '@/components/ui/drawer';
import { Plus, Eye, Pencil, Trash2, Copy, ImageIcon } from 'lucide-vue-next';

// Types
interface Image {
    id: number;
    name: string;
    url: string;
    created_at: string;
    updated_at: string;
}

interface Message {
    type: 'success' | 'error' | 'info' | 'warning';
    text: string;
}

// Reactive state
const loading = ref(true);
const images = ref<Image[]>([]);
const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0,
    hasNext: false,
    hasPrev: false,
    from: 0,
    to: 0,
});
const message = ref<Message | null>(null);
const searchQuery = ref('');

// Drawer states
const viewDrawerOpen = ref(false);
const editDrawerOpen = ref(false);
const createDrawerOpen = ref(false);

// Selected items
const selectedImage = ref<Image | null>(null);
const editingImage = ref<Image | null>(null);

// Form states
const uploading = ref(false);
const updating = ref(false);
const deleting = ref(false);
const confirmDeleteRow = ref<number | null>(null);

// New image form
const newImage = ref({
    name: '',
});
const selectedFile = ref<File | null>(null);
const filePreview = ref<string>('');

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'name', label: 'Name', searchable: true },
    { key: 'url', label: 'URL', searchable: true },
    { key: 'preview', label: 'Preview', searchable: false },
    { key: 'created_at', label: 'Created' },
    { key: 'updated_at', label: 'Updated' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[120px] font-semibold' },
];

const toast = useToast();

// Methods
async function fetchImages() {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/images', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value || undefined,
            },
        });
        images.value = data.data.images || [];

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
    } catch (error) {
        console.error('Error fetching images:', error);
        message.value = {
            type: 'error',
            text: error instanceof Error ? error.message : 'Failed to fetch images',
        };
    } finally {
        loading.value = false;
    }
}

const handleSearch = (query: string) => {
    searchQuery.value = query;
    pagination.value.page = 1;
    fetchImages();
};

const changePage = (page: number) => {
    pagination.value.page = page;
    fetchImages();
};

// Drawer methods
const openViewDrawer = (image: Image) => {
    selectedImage.value = image;
    viewDrawerOpen.value = true;
};

const closeViewDrawer = () => {
    viewDrawerOpen.value = false;
    selectedImage.value = null;
};

const openEditDrawer = (image: Image) => {
    editingImage.value = { ...image };
    editDrawerOpen.value = true;
};

const closeEditDrawer = () => {
    editDrawerOpen.value = false;
    editingImage.value = null;
};

const openCreateDrawer = () => {
    newImage.value = { name: '' };
    selectedFile.value = null;
    filePreview.value = '';
    createDrawerOpen.value = true;
};

const closeCreateDrawer = () => {
    createDrawerOpen.value = false;
    newImage.value = { name: '' };
    selectedFile.value = null;
    filePreview.value = '';
};

// File handling
const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
        selectedFile.value = target.files[0];

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            filePreview.value = e.target?.result as string;
        };
        reader.readAsDataURL(selectedFile.value);
    }
};

const handleImageError = (event: Event) => {
    const img = event.target as HTMLImageElement;
    img.src =
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAyNEg0MFY0MEgyNFYyNFoiIGZpbGw9IiNEMUQ1REIiLz4KPC9zdmc+';
};

// CRUD operations
async function uploadImage() {
    if (!newImage.value.name || !selectedFile.value) {
        toast.error('Please fill in all required fields');
        return;
    }

    try {
        uploading.value = true;

        const formData = new FormData();
        formData.append('name', newImage.value.name);
        formData.append('image', selectedFile.value);

        const { data } = await axios.post('/api/admin/images/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (data && data.success) {
            toast.success('Image uploaded successfully');
            closeCreateDrawer();
            await fetchImages();
        } else {
            toast.error(data?.message || 'Failed to upload image');
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
        uploading.value = false;
    }
}

async function updateImage() {
    if (!editingImage.value) return;

    try {
        updating.value = true;
        const { data } = await axios.patch(`/api/admin/images/${editingImage.value.id}`, editingImage.value);

        if (data && data.success) {
            toast.success('Image updated successfully');
            closeEditDrawer();
            await fetchImages();
        } else {
            toast.error(data?.message || 'Failed to update image');
        }
    } catch (error) {
        console.error('Error updating image:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to update image');
    } finally {
        updating.value = false;
    }
}

const onDelete = (image: Image) => {
    confirmDeleteRow.value = image.id;
};

const onCancelDelete = () => {
    confirmDeleteRow.value = null;
};

async function confirmDelete(image: Image) {
    deleting.value = true;
    let success = false;
    try {
        const response = await axios.delete(`/api/admin/images/${image.id}`);
        if (response.data && response.data.success) {
            toast.success('Image deleted successfully');
            await fetchImages();
            success = true;
        } else {
            toast.error(response.data?.message || 'Failed to delete image');
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to delete image');
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
    }
}

// Action handlers
const onView = (image: Image) => {
    openViewDrawer(image);
};

const onEdit = (image: Image) => {
    openEditDrawer(image);
};

const onCopyUrl = async (image: Image) => {
    try {
        await navigator.clipboard.writeText(image.url);
        toast.success('URL copied to clipboard');
    } catch {
        toast.error('Failed to copy URL');
    }
};

// Utility functions
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

onMounted(fetchImages);
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchImages);
</script>
