<!-- eslint-disable vue/no-v-html -->
<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Knowledgebase', href: '/admin/knowledgebase/categories' },
            { text: category?.name || 'Category Articles', isCurrent: true },
        ]"
    >
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading articles...</span>
                </div>
            </div>

            <!-- Articles Table -->
            <div v-else class="p-6">
                <div class="mb-6">
                    <div class="flex items-center gap-3 mb-2">
                        <Button variant="ghost" size="sm" @click="router.push('/admin/knowledgebase/categories')">
                            <ChevronLeft class="h-4 w-4 mr-2" />
                            Back to Categories
                        </Button>
                    </div>
                    <div v-if="category" class="flex items-center gap-3">
                        <div v-if="category.icon" class="shrink-0">
                            <img
                                :src="category.icon"
                                :alt="category.name"
                                class="h-16 w-16 rounded object-cover"
                                @error="handleImageError"
                            />
                        </div>
                        <div>
                            <h1 class="text-3xl font-bold">{{ category.name }}</h1>
                            <p v-if="category.description" class="text-muted-foreground">{{ category.description }}</p>
                        </div>
                    </div>
                </div>

                <TableComponent
                    title="Articles"
                    description="Articles in this category"
                    :columns="tableColumns"
                    :data="articles"
                    :search-placeholder="'Search by title...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-knowledgebase-category-articles-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <Button
                            variant="outline"
                            size="sm"
                            data-umami-event="Create knowledgebase article"
                            @click="openCreateDrawer"
                        >
                            <Plus class="h-4 w-4 mr-2" />
                            Create Article
                        </Button>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-icon="{ item }">
                        <div v-if="(item as Article).icon" class="flex items-center">
                            <img
                                :src="(item as Article).icon || undefined"
                                :alt="(item as Article).title"
                                class="h-8 w-8 rounded object-cover"
                                @error="handleImageError"
                            />
                        </div>
                        <span v-else class="text-muted-foreground text-sm">—</span>
                    </template>
                    <template #cell-status="{ item }">
                        <Badge :variant="getStatusVariant((item as Article).status)">
                            {{ (item as Article).status }}
                        </Badge>
                    </template>
                    <template #cell-pinned="{ item }">
                        <Badge v-if="(item as Article).pinned === 'true'" variant="default">Pinned</Badge>
                        <span v-else class="text-muted-foreground text-sm">—</span>
                    </template>
                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="View article details"
                                data-umami-event="View knowledgebase article"
                                :data-umami-event-article="(item as Article).title"
                                @click="onView(item as Article)"
                            >
                                <Eye :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Edit article"
                                data-umami-event="Edit knowledgebase article"
                                :data-umami-event-article="(item as Article).title"
                                @click="onEdit(item as Article)"
                            >
                                <Pencil :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as Article).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :loading="deleting"
                                    title="Confirm deletion"
                                    data-umami-event="Confirm delete knowledgebase article"
                                    :data-umami-event-article="(item as Article).title"
                                    @click="confirmDelete(item as Article)"
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
                                    title="Delete article"
                                    data-umami-event="Delete knowledgebase article"
                                    :data-umami-event-article="(item as Article).title"
                                    @click="onDelete(item as Article)"
                                >
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>
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
        <DrawerContent v-if="selectedArticle">
            <DrawerHeader>
                <DrawerTitle>Article Info</DrawerTitle>
                <DrawerDescription>Viewing details for article: {{ selectedArticle.title }}</DrawerDescription>
            </DrawerHeader>
            <div class="px-6 pt-6 space-y-4">
                <div v-if="selectedArticle.icon" class="flex items-center gap-2">
                    <b>Icon:</b>
                    <img
                        :src="selectedArticle.icon"
                        :alt="selectedArticle.title"
                        class="h-12 w-12 rounded object-cover"
                    />
                </div>
                <div><b>Title:</b> {{ selectedArticle.title }}</div>
                <div><b>Status:</b> {{ selectedArticle.status }}</div>
                <div><b>Pinned:</b> {{ selectedArticle.pinned === 'true' ? 'Yes' : 'No' }}</div>
                <div><b>Published At:</b> {{ selectedArticle.published_at || '-' }}</div>
                <div><b>Created At:</b> {{ selectedArticle.created_at }}</div>
                <div><b>Updated At:</b> {{ selectedArticle.updated_at }}</div>
            </div>
            <div class="p-4 flex justify-end">
                <DrawerClose as-child>
                    <Button variant="outline" @click="closeView">Close</Button>
                </DrawerClose>
            </div>
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
                <DrawerTitle>Create Article</DrawerTitle>
                <DrawerDescription>Fill in the details to create a new knowledgebase article.</DrawerDescription>
            </DrawerHeader>
            <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitCreate">
                <label for="create-title" class="block mb-1 font-medium">Title</label>
                <Input id="create-title" v-model="createForm.title" label="Title" placeholder="Title" required />
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
                <label for="create-content" class="block mb-1 font-medium">Content (Markdown)</label>
                <div class="flex items-center justify-between mb-1">
                    <span></span>
                    <div class="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            :class="contentViewMode === 'edit' ? 'bg-primary text-primary-foreground' : ''"
                            @click="contentViewMode = 'edit'"
                        >
                            Edit
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            :class="contentViewMode === 'preview' ? 'bg-primary text-primary-foreground' : ''"
                            @click="contentViewMode = 'preview'"
                        >
                            Preview
                        </Button>
                    </div>
                </div>
                <textarea
                    v-if="contentViewMode === 'edit'"
                    id="create-content"
                    v-model="createForm.content"
                    class="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                    placeholder="Article content (Markdown)..."
                    required
                />
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div
                    v-else
                    class="w-full min-h-[200px] rounded-md border border-input bg-background p-4 overflow-auto prose prose-sm max-w-none dark:prose-invert markdown-content"
                    v-html="renderMarkdown(createForm.content)"
                />
                <label for="create-status" class="block mb-1 font-medium">Status</label>
                <Select v-model="createForm.status">
                    <SelectTrigger id="create-status">
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                </Select>
                <div class="flex items-center gap-2">
                    <input
                        id="create-pinned"
                        v-model="createForm.pinned"
                        type="checkbox"
                        class="h-4 w-4 rounded border-gray-300"
                    />
                    <label for="create-pinned" class="text-sm font-medium">Pinned</label>
                </div>
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

import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Pencil, Trash2, Plus, ChevronLeft } from 'lucide-vue-next';
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
import { useSessionStore } from '@/stores/session';
import { renderMarkdown } from '@/lib/markdown';

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

type Article = {
    id: number;
    category_id: number;
    title: string;
    slug: string;
    icon?: string | null;
    content: string;
    author_id: number;
    status: 'draft' | 'published' | 'archived';
    pinned: 'true' | 'false';
    published_at?: string | null;
    created_at: string;
    updated_at: string;
};

const toast = useToast();
const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();

const category = ref<Category | null>(null);
const articles = ref<Article[]>([]);
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
const selectedArticle = ref<Article | null>(null);
const viewing = ref(false);
const createDrawerOpen = ref(false);
const createForm = ref({
    title: '',
    content: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    pinned: false,
});

// Icon upload
const createIconFileInput = ref<HTMLInputElement | null>(null);
const createIconPreview = ref<string | null>(null);
const createIconFile = ref<File | null>(null);
const contentViewMode = ref<'edit' | 'preview'>('edit');

const tableColumns: TableColumn[] = [
    { key: 'icon', label: 'Icon', searchable: false },
    { key: 'title', label: 'Title', searchable: true },
    { key: 'status', label: 'Status', searchable: false },
    { key: 'pinned', label: 'Pinned', searchable: false },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[120px] font-semibold' },
];

async function fetchCategory() {
    const categoryId = route.params.id as string;
    if (!categoryId) return;

    try {
        const { data } = await axios.get(`/api/admin/knowledgebase/categories/${categoryId}`);
        category.value = data.data.category;
    } catch {
        toast.error('Failed to fetch category');
        router.push('/admin/knowledgebase/categories');
    }
}

async function fetchArticles() {
    const categoryId = route.params.id as string;
    if (!categoryId) return;

    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/knowledgebase/articles', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value || undefined,
                category_id: categoryId,
            },
        });
        articles.value = data.data.articles || [];

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
    await fetchCategory();
    await fetchArticles();
});

watch(
    () => route.params.id,
    () => {
        fetchCategory();
        fetchArticles();
    },
);

watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchArticles);

function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.page = 1;
    fetchArticles();
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchArticles();
}

async function onView(article: Article) {
    viewing.value = true;
    try {
        const { data } = await axios.get(`/api/admin/knowledgebase/articles/${article.id}`);
        selectedArticle.value = data.data.article;
    } catch {
        selectedArticle.value = null;
        toast.error('Failed to fetch article details');
    }
}

function onEdit(article: Article) {
    router.push(`/admin/knowledgebase/articles/${article.id}/edit`);
}

async function confirmDelete(article: Article) {
    deleting.value = true;
    let success = false;
    try {
        const response = await axios.delete(`/api/admin/knowledgebase/articles/${article.id}`);
        if (response.data && response.data.success) {
            toast.success('Article deleted successfully');
            await fetchArticles();
            success = true;
        } else {
            toast.error(response.data?.message || 'Failed to delete article');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to delete article';
        toast.error(errorMessage);
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
    }
}

function onDelete(article: Article) {
    confirmDeleteRow.value = article.id;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
}

function closeView() {
    viewing.value = false;
    selectedArticle.value = null;
}

function openCreateDrawer() {
    createDrawerOpen.value = true;
    createForm.value = {
        title: '',
        content: '',
        status: 'draft',
        pinned: false,
    };
    createIconPreview.value = null;
    createIconFile.value = null;
    if (createIconFileInput.value) {
        createIconFileInput.value.value = '';
    }
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
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

async function submitCreate() {
    const categoryId = route.params.id as string;
    if (!categoryId) return;

    try {
        const user = sessionStore.user;
        if (!user || !user.id) {
            toast.error('User not found');
            return;
        }

        let iconUrl = '';

        // Upload icon if one was selected
        if (createIconFile.value) {
            const formData = new FormData();
            formData.append('icon', createIconFile.value);

            try {
                const uploadResponse = await axios.post('/api/admin/knowledgebase/upload-icon', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                if (uploadResponse.data && uploadResponse.data.success) {
                    iconUrl = uploadResponse.data.data.url;
                } else {
                    toast.error(uploadResponse.data?.message || 'Failed to upload icon');
                    return;
                }
            } catch (e: unknown) {
                const errorMessage =
                    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                    'Failed to upload icon';
                toast.error(errorMessage);
                return;
            }
        }

        const createData: {
            category_id: number;
            title: string;
            slug: string;
            icon?: string;
            content: string;
            author_id: number;
            status: 'draft' | 'published' | 'archived';
            pinned: boolean;
        } = {
            category_id: parseInt(categoryId),
            title: createForm.value.title,
            slug: createForm.value.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, ''),
            content: createForm.value.content,
            author_id: user.id,
            status: createForm.value.status,
            pinned: createForm.value.pinned,
        };
        if (iconUrl) {
            createData.icon = iconUrl;
        }
        const { data } = await axios.put('/api/admin/knowledgebase/articles', createData);
        if (data && data.success) {
            toast.success('Article created successfully');
            await fetchArticles();
            closeCreateDrawer();
        } else {
            toast.error(data?.message || 'Failed to create article');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to create article';
        toast.error(errorMessage);
    }
}

function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
        case 'published':
            return 'default';
        case 'draft':
            return 'secondary';
        case 'archived':
            return 'outline';
        default:
            return 'secondary';
    }
}
</script>
