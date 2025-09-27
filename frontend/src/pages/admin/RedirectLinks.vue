<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Redirect Links', isCurrent: true, href: '/admin/redirect-links' }]">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading redirect links...</span>
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
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load redirect links</h3>
                <p class="text-sm text-muted-foreground max-w-sm">
                    {{ message.text }}
                </p>
                <Button class="mt-4" @click="fetchRedirectLinks">Try Again</Button>
            </div>

            <!-- Redirect Links Table -->
            <div v-else class="p-4 sm:p-6">
                <TableComponent
                    title="Redirect Links"
                    description="Manage redirect links for your system."
                    :columns="tableColumns"
                    :data="redirectLinks"
                    :search-placeholder="'Search by name or URL...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-redirect-links-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <div class="flex flex-col sm:flex-row gap-2">
                            <Button variant="outline" size="sm" class="w-full sm:w-auto" @click="testRedirectApi">
                                Test API
                            </Button>
                            <Button variant="outline" size="sm" class="w-full sm:w-auto" @click="openCreateDrawer">
                                <Plus class="h-4 w-4 mr-2" />
                                <span class="hidden sm:inline">Create Redirect Link</span>
                                <span class="sm:hidden">Create Link</span>
                            </Button>
                        </div>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-name="{ item }">
                        <div class="flex items-center gap-2">
                            <Link class="h-4 w-4 text-muted-foreground" />
                            <span class="font-medium">{{ (item as unknown as RedirectLink).name }}</span>
                        </div>
                    </template>

                    <template #cell-slug="{ item }">
                        <div class="max-w-xs">
                            <a
                                :href="getShortUrl((item as unknown as RedirectLink).slug)"
                                target="_blank"
                                class="text-sm text-green-600 hover:text-green-800 truncate block font-mono"
                            >
                                {{ getShortUrl((item as unknown as RedirectLink).slug) }}
                            </a>
                        </div>
                    </template>

                    <template #cell-url="{ item }">
                        <div class="max-w-xs">
                            <a
                                :href="(item as unknown as RedirectLink).url"
                                target="_blank"
                                class="text-sm text-blue-600 hover:text-blue-800 truncate block"
                            >
                                {{ (item as unknown as RedirectLink).url }}
                            </a>
                        </div>
                    </template>

                    <template #cell-created_at="{ item }">
                        <span class="text-sm text-muted-foreground">
                            {{ formatDate((item as unknown as RedirectLink).created_at) }}
                        </span>
                    </template>

                    <template #cell-updated_at="{ item }">
                        <span class="text-sm text-muted-foreground">
                            {{ formatDate((item as unknown as RedirectLink).updated_at) }}
                        </span>
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex flex-col sm:flex-row gap-1 sm:gap-2">
                            <div class="flex gap-1 sm:gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    class="flex-1 sm:flex-none"
                                    @click="onView(item as unknown as RedirectLink)"
                                >
                                    <Eye :size="16" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    class="flex-1 sm:flex-none"
                                    @click="onEdit(item as unknown as RedirectLink)"
                                >
                                    <Pencil :size="16" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    class="flex-1 sm:flex-none"
                                    @click="onCopyUrl(item as unknown as RedirectLink)"
                                >
                                    <Copy :size="16" />
                                </Button>
                            </div>
                            <div class="flex gap-1 sm:gap-2">
                                <template v-if="confirmDeleteRow === (item as unknown as RedirectLink).id">
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        :loading="deleting"
                                        class="flex-1 sm:flex-none"
                                        @click="confirmDelete(item as unknown as RedirectLink)"
                                    >
                                        <span class="hidden sm:inline">Confirm Delete</span>
                                        <span class="sm:hidden">Confirm</span>
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        :disabled="deleting"
                                        class="flex-1 sm:flex-none"
                                        @click="onCancelDelete"
                                    >
                                        Cancel
                                    </Button>
                                </template>
                                <template v-else>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        :disabled="deleting"
                                        class="w-full sm:w-auto"
                                        @click="onDelete(item as unknown as RedirectLink)"
                                    >
                                        <Trash2 :size="16" />
                                        <span class="hidden sm:inline ml-1">Delete</span>
                                    </Button>
                                </template>
                            </div>
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
            <DrawerContent v-if="selectedRedirectLink">
                <DrawerHeader>
                    <DrawerTitle>Redirect Link Details</DrawerTitle>
                    <DrawerDescription
                        >Viewing details for redirect link: {{ selectedRedirectLink.name }}</DrawerDescription
                    >
                </DrawerHeader>

                <div class="px-4 sm:px-6 pb-6 space-y-6">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label class="text-sm font-medium">Name</Label>
                            <p class="text-sm text-muted-foreground mt-1">{{ selectedRedirectLink.name }}</p>
                        </div>
                        <div>
                            <Label class="text-sm font-medium">Short URL</Label>
                            <a
                                :href="getShortUrl(selectedRedirectLink.slug)"
                                target="_blank"
                                class="text-sm text-green-600 hover:text-green-800 block mt-1 break-all font-mono"
                            >
                                {{ getShortUrl(selectedRedirectLink.slug) }}
                            </a>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-4">
                        <div>
                            <Label class="text-sm font-medium">Destination URL</Label>
                            <a
                                :href="selectedRedirectLink.url"
                                target="_blank"
                                class="text-sm text-blue-600 hover:text-blue-800 block mt-1 break-all"
                            >
                                {{ selectedRedirectLink.url }}
                            </a>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label class="text-sm font-medium">Created At</Label>
                            <p class="text-sm text-muted-foreground mt-1">
                                {{ formatDate(selectedRedirectLink.created_at) }}
                            </p>
                        </div>
                        <div>
                            <Label class="text-sm font-medium">Updated At</Label>
                            <p class="text-sm text-muted-foreground mt-1">
                                {{ formatDate(selectedRedirectLink.updated_at) }}
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
            <DrawerContent v-if="editingRedirectLink">
                <DrawerHeader>
                    <DrawerTitle>Edit Redirect Link</DrawerTitle>
                    <DrawerDescription
                        >Edit details for redirect link: {{ editingRedirectLink.name }}</DrawerDescription
                    >
                </DrawerHeader>

                <form class="px-4 sm:px-6 pb-6 space-y-6" @submit.prevent="updateRedirectLink">
                    <div class="space-y-2">
                        <Label for="edit-name">Name</Label>
                        <Input
                            id="edit-name"
                            v-model="editingRedirectLink.name"
                            placeholder="Redirect link name"
                            required
                        />
                    </div>

                    <div class="space-y-2">
                        <Label for="edit-slug">Short URL Slug</Label>
                        <Input id="edit-slug" v-model="editingRedirectLink.slug" placeholder="my-redirect" required />
                        <p class="text-xs text-muted-foreground">
                            Short URL: {{ getShortUrl(editingRedirectLink.slug) }}
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Label for="edit-url">Destination URL</Label>
                        <Input
                            id="edit-url"
                            v-model="editingRedirectLink.url"
                            placeholder="https://example.com"
                            required
                        />
                    </div>

                    <div class="flex flex-col sm:flex-row gap-2">
                        <Button type="submit" :loading="updating" class="w-full sm:w-auto">
                            {{ updating ? 'Updating...' : 'Update Redirect Link' }}
                        </Button>
                        <Button type="button" variant="outline" class="w-full sm:w-auto" @click="closeEditDrawer"
                            >Cancel</Button
                        >
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
                    <DrawerTitle>Create Redirect Link</DrawerTitle>
                    <DrawerDescription>Create a new redirect link for your system.</DrawerDescription>
                </DrawerHeader>

                <form class="px-4 sm:px-6 pb-6 space-y-6" @submit.prevent="createRedirectLink">
                    <div class="space-y-2">
                        <Label for="create-name">Name</Label>
                        <Input
                            id="create-name"
                            v-model="newRedirectLink.name"
                            placeholder="Redirect link name"
                            required
                            @input="
                                () => {
                                    if (!manualSlugEdit) {
                                        // Generate slug: lowercase, replace spaces with -, only a-z, 0-9, -
                                        const slug = newRedirectLink.name
                                            .toLowerCase()
                                            .replace(/[^a-z0-9\s-]/g, '') // remove invalid chars
                                            .replace(/\s+/g, '-') // spaces to -
                                            .replace(/-+/g, '-') // collapse multiple -
                                            .replace(/^-+|-+$/g, ''); // trim leading/trailing -
                                        newRedirectLink.slug = slug;
                                    }
                                }
                            "
                        />
                    </div>

                    <div class="space-y-2">
                        <Label for="create-slug">Short URL Slug (optional)</Label>
                        <Input
                            id="create-slug"
                            v-model="newRedirectLink.slug"
                            placeholder="my-redirect"
                            @input="manualSlugEdit = true"
                        />
                        <p class="text-xs text-muted-foreground">
                            Leave empty to auto-generate from name. Short URL:
                            {{ getShortUrl(newRedirectLink.slug || 'example') }}
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Label for="create-url">Destination URL</Label>
                        <Input
                            id="create-url"
                            v-model="newRedirectLink.url"
                            placeholder="https://example.com"
                            required
                        />
                    </div>

                    <div class="flex gap-2">
                        <Button type="submit" :loading="creating">
                            {{ creating ? 'Creating...' : 'Create Redirect Link' }}
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
import { Plus, Eye, Pencil, Trash2, Copy, Link } from 'lucide-vue-next';

// Types
interface RedirectLink {
    id: number;
    name: string;
    slug: string;
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
const redirectLinks = ref<RedirectLink[]>([]);
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
const selectedRedirectLink = ref<RedirectLink | null>(null);
const editingRedirectLink = ref<RedirectLink | null>(null);

// Form states
const creating = ref(false);
const updating = ref(false);
const deleting = ref(false);
const confirmDeleteRow = ref<number | null>(null);

// New redirect link form
const newRedirectLink = ref({
    name: '',
    slug: '',
    url: '',
});

// Slug edit state
const manualSlugEdit = ref(false);

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'name', label: 'Name', searchable: true },
    { key: 'slug', label: 'Short URL', searchable: true },
    { key: 'url', label: 'Destination URL', searchable: true },
    { key: 'created_at', label: 'Created' },
    { key: 'updated_at', label: 'Updated' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[120px] font-semibold' },
];

const toast = useToast();

// Methods
async function fetchRedirectLinks() {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/redirect-links', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value || undefined,
            },
        });
        redirectLinks.value = data.data.redirect_links || [];

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
        console.error('[REDIRECT DEBUG] Admin: Error fetching redirect links:', error);
        message.value = {
            type: 'error',
            text: error instanceof Error ? error.message : 'Failed to fetch redirect links',
        };
    } finally {
        loading.value = false;
    }
}

const handleSearch = (query: string) => {
    searchQuery.value = query;
    pagination.value.page = 1;
    fetchRedirectLinks();
};

const changePage = (page: number) => {
    pagination.value.page = page;
    fetchRedirectLinks();
};
// Drawer methods
const openViewDrawer = (redirectLink: RedirectLink) => {
    selectedRedirectLink.value = redirectLink;
    viewDrawerOpen.value = true;
};

const closeViewDrawer = () => {
    viewDrawerOpen.value = false;
    selectedRedirectLink.value = null;
};

const openEditDrawer = (redirectLink: RedirectLink) => {
    editingRedirectLink.value = { ...redirectLink };
    editDrawerOpen.value = true;
};

const closeEditDrawer = () => {
    editDrawerOpen.value = false;
    editingRedirectLink.value = null;
};

const openCreateDrawer = () => {
    newRedirectLink.value = { name: '', slug: '', url: '' };
    manualSlugEdit.value = false;
    createDrawerOpen.value = true;
};

const closeCreateDrawer = () => {
    createDrawerOpen.value = false;
    newRedirectLink.value = { name: '', slug: '', url: '' };
    manualSlugEdit.value = false;
};

// CRUD operations
async function createRedirectLink() {
    if (!newRedirectLink.value.name || !newRedirectLink.value.url) {
        toast.error('Please fill in all required fields');
        return;
    }

    try {
        creating.value = true;
        const { data } = await axios.post('/api/admin/redirect-links', newRedirectLink.value);

        if (data && data.success) {
            toast.success('Redirect link created successfully');
            closeCreateDrawer();
            await fetchRedirectLinks();
        } else {
            toast.error(data?.message || 'Failed to create redirect link');
        }
    } catch (error) {
        console.error('[REDIRECT DEBUG] Admin: Error creating redirect link:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to create redirect link');
    } finally {
        creating.value = false;
    }
}

async function updateRedirectLink() {
    if (!editingRedirectLink.value) return;

    try {
        updating.value = true;
        const { data } = await axios.patch(
            `/api/admin/redirect-links/${editingRedirectLink.value.id}`,
            editingRedirectLink.value,
        );

        if (data && data.success) {
            toast.success('Redirect link updated successfully');
            closeEditDrawer();
            await fetchRedirectLinks();
        } else {
            toast.error(data?.message || 'Failed to update redirect link');
        }
    } catch (error) {
        console.error('Error updating redirect link:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to update redirect link');
    } finally {
        updating.value = false;
    }
}

const onDelete = (redirectLink: RedirectLink) => {
    confirmDeleteRow.value = redirectLink.id;
};

const onCancelDelete = () => {
    confirmDeleteRow.value = null;
};

async function confirmDelete(redirectLink: RedirectLink) {
    deleting.value = true;
    let success = false;
    try {
        const response = await axios.delete(`/api/admin/redirect-links/${redirectLink.id}`);
        if (response.data && response.data.success) {
            toast.success('Redirect link deleted successfully');
            await fetchRedirectLinks();
            success = true;
        } else {
            toast.error(response.data?.message || 'Failed to delete redirect link');
        }
    } catch (error) {
        console.error('Error deleting redirect link:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to delete redirect link');
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
    }
}

// Action handlers
const onView = (redirectLink: RedirectLink) => {
    openViewDrawer(redirectLink);
};

const onEdit = (redirectLink: RedirectLink) => {
    openEditDrawer(redirectLink);
};

const onCopyUrl = async (redirectLink: RedirectLink) => {
    try {
        const shortUrl = getShortUrl(redirectLink.slug);
        await navigator.clipboard.writeText(shortUrl);
        toast.success('Short URL copied to clipboard');
    } catch {
        toast.error('Failed to copy URL');
    }
};

// Utility functions
const getShortUrl = (slug: string) => {
    const baseUrl = window.location.origin;
    const shortUrl = `${baseUrl}/${slug}`;
    return shortUrl;
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// Test function to check API endpoint
async function testApiEndpoint() {
    try {
        await axios.get('/api/redirect-links');
    } catch (error) {
        console.error('[REDIRECT DEBUG] Admin: API test error:', error);
    }
}

// Test redirect API with specific slug
async function testRedirectApi() {
    const testSlug = prompt('Enter a slug to test (e.g., "discord"):');
    if (testSlug) {
        try {
            const { data } = await axios.get(`/api/redirect-links/${testSlug}`);
            alert('API Response: ' + JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('[REDIRECT DEBUG] Admin: Redirect API test error:', error);
            alert('API Error: ' + (error instanceof Error ? error.message : String(error)));
        }
    }
}

onMounted(() => {
    fetchRedirectLinks();
    testApiEndpoint(); // Test the API endpoint
});
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchRedirectLinks);
</script>
