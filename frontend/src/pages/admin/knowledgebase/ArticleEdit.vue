<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Knowledgebase Articles', href: '/admin/knowledgebase/articles' },
            { text: 'Edit Article', isCurrent: true },
        ]"
    >
        <div class="min-h-screen bg-background p-6">
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading article...</span>
                </div>
            </div>

            <div v-else-if="article" class="max-w-4xl mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Edit Article</CardTitle>
                        <CardDescription>Edit knowledgebase article: {{ article.title }}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form class="space-y-4" @submit.prevent="submitEdit">
                            <div>
                                <label for="edit-category" class="block mb-1 font-medium">Category</label>
                                <Select v-model="editForm.category_id">
                                    <SelectTrigger id="edit-category">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem v-for="cat in categories" :key="cat.id" :value="cat.id.toString()">
                                            {{ cat.name }}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label for="edit-title" class="block mb-1 font-medium">Title</label>
                                <Input
                                    id="edit-title"
                                    v-model="editForm.title"
                                    label="Title"
                                    placeholder="Title"
                                    required
                                />
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
                                <div v-else-if="article?.icon" class="flex items-center gap-2 mt-2">
                                    <img
                                        :src="article.icon"
                                        alt="Current icon"
                                        class="h-12 w-12 rounded object-cover"
                                    />
                                    <span class="text-sm text-muted-foreground">Current icon</span>
                                </div>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <label for="edit-content" class="block font-medium">Content (Markdown)</label>
                                    <div class="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            :class="
                                                contentViewMode === 'edit' ? 'bg-primary text-primary-foreground' : ''
                                            "
                                            @click="contentViewMode = 'edit'"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            :class="
                                                contentViewMode === 'preview'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : ''
                                            "
                                            @click="contentViewMode = 'preview'"
                                        >
                                            Preview
                                        </Button>
                                    </div>
                                </div>
                                <textarea
                                    v-if="contentViewMode === 'edit'"
                                    id="edit-content"
                                    v-model="editForm.content"
                                    class="w-full min-h-[300px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                                    placeholder="Article content (Markdown)..."
                                    required
                                />
                                <!-- eslint-disable vue/no-v-html -->
                                <div
                                    v-else
                                    class="w-full min-h-[300px] rounded-md border border-input bg-background p-4 overflow-auto prose prose-sm max-w-none dark:prose-invert markdown-content"
                                    v-html="renderMarkdown(editForm.content)"
                                />
                                <!-- eslint-enable vue/no-v-html -->
                            </div>
                            <div>
                                <label for="edit-status" class="block mb-1 font-medium">Status</label>
                                <Select v-model="editForm.status">
                                    <SelectTrigger id="edit-status">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                        <SelectItem value="archived">Archived</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div class="flex items-center gap-2">
                                <input
                                    id="edit-pinned"
                                    v-model="editForm.pinned"
                                    type="checkbox"
                                    class="h-4 w-4 rounded border-gray-300"
                                />
                                <label for="edit-pinned" class="text-sm font-medium">Pinned</label>
                            </div>
                            <div class="border-t pt-4">
                                <div class="flex items-center justify-between mb-2">
                                    <label class="block font-medium">Attachments</label>
                                    <Button type="button" variant="outline" size="sm" @click="openAttachmentUpload">
                                        <Upload class="h-4 w-4 mr-2" />
                                        Upload File
                                    </Button>
                                </div>
                                <div v-if="attachments.length > 0" class="space-y-2">
                                    <div
                                        v-for="attachment in attachments"
                                        :key="attachment.id"
                                        class="flex items-center justify-between p-2 border rounded-md"
                                    >
                                        <div class="flex items-center gap-2 flex-1 min-w-0">
                                            <a
                                                :href="attachment.file_path"
                                                target="_blank"
                                                class="text-sm text-primary hover:underline truncate"
                                            >
                                                {{ attachment.file_name }}
                                            </a>
                                            <span class="text-xs text-muted-foreground">
                                                ({{ formatFileSize(attachment.file_size) }})
                                            </span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                :title="
                                                    copiedAttachmentId === attachment.id ? 'Copied!' : 'Copy markdown'
                                                "
                                                @click="copyMarkdownImage(attachment)"
                                            >
                                                <Check
                                                    v-if="copiedAttachmentId === attachment.id"
                                                    class="h-4 w-4 text-green-500"
                                                />
                                                <Copy v-else class="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                :loading="deletingAttachment === attachment.id"
                                                @click="deleteAttachment(attachment)"
                                            >
                                                <Trash2 class="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <p v-else class="text-sm text-muted-foreground">No attachments</p>
                            </div>
                            <div class="border-t pt-4">
                                <div class="flex items-center justify-between mb-2">
                                    <label class="block font-medium">Tags</label>
                                    <Button type="button" variant="outline" size="sm" @click="openTagDialog">
                                        <Plus class="h-4 w-4 mr-2" />
                                        Add Tag
                                    </Button>
                                </div>
                                <div v-if="tags.length > 0" class="flex flex-wrap gap-2">
                                    <Badge
                                        v-for="tag in tags"
                                        :key="tag.id"
                                        variant="secondary"
                                        class="flex items-center gap-1"
                                    >
                                        {{ tag.tag_name }}
                                        <button
                                            type="button"
                                            class="ml-1 hover:text-destructive"
                                            :disabled="deletingTag === tag.id"
                                            @click="deleteTag(tag)"
                                        >
                                            <X class="h-3 w-3" />
                                        </button>
                                    </Badge>
                                </div>
                                <p v-else class="text-sm text-muted-foreground">No tags</p>
                            </div>
                            <div class="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    @click="router.push('/admin/knowledgebase/articles')"
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" variant="default" :loading="saving">Save Changes</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    </DashboardLayout>

    <!-- Attachment Upload Dialog -->
    <Dialog v-model:open="attachmentUploadOpen">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Upload File</DialogTitle>
                <DialogDescription>Upload any file for this article (max 50MB)</DialogDescription>
            </DialogHeader>
            <div class="space-y-4">
                <Input ref="attachmentFileInput" type="file" @change="handleAttachmentFileSelect" />
                <div class="flex items-center gap-2">
                    <input
                        id="user-downloadable"
                        v-model="userDownloadable"
                        type="checkbox"
                        class="h-4 w-4 rounded border-gray-300"
                    />
                    <label for="user-downloadable" class="text-sm font-medium"> Make downloadable for users </label>
                </div>
                <div v-if="selectedAttachmentFile" class="text-sm text-muted-foreground">
                    Selected: {{ selectedAttachmentFile.name }} ({{ formatFileSize(selectedAttachmentFile.size) }})
                </div>
                <div class="flex justify-end gap-2">
                    <Button type="button" variant="outline" @click="closeAttachmentUpload">Cancel</Button>
                    <Button type="button" variant="default" :loading="uploadingAttachment" @click="uploadAttachment">
                        Upload
                    </Button>
                </div>
            </div>
        </DialogContent>
    </Dialog>

    <!-- Tag Dialog -->
    <Dialog v-model:open="tagDialogOpen">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add Tags</DialogTitle>
                <DialogDescription>Enter tag names separated by commas (e.g., tutorial, guide, faq)</DialogDescription>
            </DialogHeader>
            <div class="space-y-4">
                <Input v-model="newTagName" placeholder="tag1, tag2, tag3" @keyup.enter="createTag" />
                <div class="flex justify-end gap-2">
                    <Button type="button" variant="outline" @click="closeTagDialog">Cancel</Button>
                    <Button type="button" variant="default" :loading="creatingTag" @click="createTag">
                        Add Tags
                    </Button>
                </div>
            </div>
        </DialogContent>
    </Dialog>
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

import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, Trash2, Plus, X, Copy, Check } from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { renderMarkdown } from '@/lib/markdown';

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

type Category = {
    id: number;
    name: string;
    slug: string;
};

const toast = useToast();
const route = useRoute();
const router = useRouter();

const article = ref<Article | null>(null);
const categories = ref<Category[]>([]);
const loading = ref(true);
const saving = ref(false);
const editForm = ref({
    category_id: '',
    title: '',
    icon: '',
    content: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    pinned: false,
});

// Icon upload
const editIconFileInput = ref<HTMLInputElement | null>(null);
const editIconPreview = ref<string | null>(null);
const editIconFile = ref<File | null>(null);
const contentViewMode = ref<'edit' | 'preview'>('edit');

// Attachments
const attachments = ref<Attachment[]>([]);
const attachmentUploadOpen = ref(false);
const attachmentFileInput = ref<HTMLInputElement | null>(null);
const selectedAttachmentFile = ref<File | null>(null);
const uploadingAttachment = ref(false);
const deletingAttachment = ref<number | null>(null);
const userDownloadable = ref(false);

// Tags
const tags = ref<Tag[]>([]);
const tagDialogOpen = ref(false);
const newTagName = ref('');
const creatingTag = ref(false);
const deletingTag = ref<number | null>(null);

// Copy to clipboard
const copiedAttachmentId = ref<number | null>(null);

type Tag = {
    id: number;
    article_id: number;
    tag_name: string;
    created_at: string;
    updated_at: string;
};

type Attachment = {
    id: number;
    article_id: number;
    file_name: string;
    file_path: string;
    file_size: number;
    file_type: string;
    user_downloadable?: boolean;
    created_at: string;
    updated_at: string;
};

async function fetchCategories() {
    try {
        const { data } = await axios.get('/api/admin/knowledgebase/categories', {
            params: { page: 1, limit: 100 },
        });
        categories.value = data.data.categories || [];
    } catch {
        toast.error('Failed to fetch categories');
    }
}

async function fetchArticle() {
    loading.value = true;
    try {
        const articleId = route.params.id as string;
        const { data } = await axios.get(`/api/admin/knowledgebase/articles/${articleId}`);
        article.value = data.data.article;
        if (article.value) {
            editForm.value = {
                category_id: article.value.category_id.toString(),
                title: article.value.title,
                icon: article.value.icon || '',
                content: article.value.content,
                status: article.value.status,
                pinned: article.value.pinned === 'true',
            };
        }
        editIconPreview.value = null;
        editIconFile.value = null;
        if (editIconFileInput.value) {
            editIconFileInput.value.value = '';
        }
    } catch {
        toast.error('Failed to fetch article');
        router.push('/admin/knowledgebase/articles');
    } finally {
        loading.value = false;
    }
}

onMounted(async () => {
    await fetchCategories();
    await fetchArticle();
    if (article.value) {
        await fetchAttachments();
        await fetchTags();
    }
});

async function fetchAttachments() {
    if (!article.value) return;
    try {
        const { data } = await axios.get(`/api/admin/knowledgebase/articles/${article.value.id}/attachments`);
        attachments.value = data.data.attachments || [];
    } catch {
        toast.error('Failed to fetch attachments');
    }
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function openAttachmentUpload() {
    attachmentUploadOpen.value = true;
    selectedAttachmentFile.value = null;
    userDownloadable.value = false;
    if (attachmentFileInput.value) {
        attachmentFileInput.value.value = '';
    }
}

function closeAttachmentUpload() {
    attachmentUploadOpen.value = false;
    selectedAttachmentFile.value = null;
    userDownloadable.value = false;
}

function handleAttachmentFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        selectedAttachmentFile.value = file;
    }
}

async function uploadAttachment() {
    if (!selectedAttachmentFile.value || !article.value) {
        toast.error('Please select a file');
        return;
    }

    uploadingAttachment.value = true;
    try {
        const formData = new FormData();
        formData.append('file', selectedAttachmentFile.value);
        formData.append('user_downloadable', userDownloadable.value ? '1' : '0');

        const { data } = await axios.post(
            `/api/admin/knowledgebase/articles/${article.value.id}/upload-attachment`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            },
        );

        if (data && data.success) {
            toast.success('Attachment uploaded successfully');
            await fetchAttachments();
            closeAttachmentUpload();
        } else {
            toast.error(data?.message || 'Failed to upload attachment');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to upload attachment';
        toast.error(errorMessage);
    } finally {
        uploadingAttachment.value = false;
    }
}

async function deleteAttachment(attachment: Attachment) {
    if (!article.value) return;

    deletingAttachment.value = attachment.id;
    try {
        const { data } = await axios.delete(
            `/api/admin/knowledgebase/articles/${article.value.id}/attachments/${attachment.id}`,
        );

        if (data && data.success) {
            toast.success('Attachment deleted successfully');
            await fetchAttachments();
        } else {
            toast.error(data?.message || 'Failed to delete attachment');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to delete attachment';
        toast.error(errorMessage);
    } finally {
        deletingAttachment.value = null;
    }
}

async function copyMarkdownImage(attachment: Attachment) {
    // Generate markdown image syntax: ![alt text](/path/to/image.jpg)
    const markdownSyntax = `![${attachment.file_name}](${attachment.file_path})`;

    try {
        await navigator.clipboard.writeText(markdownSyntax);
        copiedAttachmentId.value = attachment.id;
        toast.success('Markdown copied to clipboard!');
        setTimeout(() => {
            copiedAttachmentId.value = null;
        }, 2000);
    } catch {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = markdownSyntax;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            copiedAttachmentId.value = attachment.id;
            toast.success('Markdown copied to clipboard!');
            setTimeout(() => {
                copiedAttachmentId.value = null;
            }, 2000);
        } catch {
            toast.error('Failed to copy to clipboard');
        } finally {
            document.body.removeChild(textarea);
        }
    }
}

async function fetchTags() {
    if (!article.value) return;
    try {
        const { data } = await axios.get(`/api/admin/knowledgebase/articles/${article.value.id}/tags`);
        tags.value = data.data.tags || [];
    } catch {
        toast.error('Failed to fetch tags');
    }
}

function openTagDialog() {
    tagDialogOpen.value = true;
    newTagName.value = '';
}

function closeTagDialog() {
    tagDialogOpen.value = false;
    newTagName.value = '';
}

async function createTag() {
    if (!article.value || !newTagName.value.trim()) {
        toast.error('Please enter at least one tag name');
        return;
    }

    // Split by comma and clean up tags
    const tagNames = newTagName.value
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

    if (tagNames.length === 0) {
        toast.error('Please enter at least one valid tag name');
        return;
    }

    creatingTag.value = true;
    let successCount = 0;
    let errorCount = 0;

    try {
        // Create tags one by one
        for (const tagName of tagNames) {
            try {
                const { data } = await axios.post(`/api/admin/knowledgebase/articles/${article.value.id}/tags`, {
                    tag_name: tagName,
                });

                if (data && data.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (e: unknown) {
                // Check if it's a duplicate error (409)
                const status = (e as { response?: { status?: number } })?.response?.status;
                if (status === 409) {
                    // Tag already exists, skip it
                    continue;
                }
                errorCount++;
            }
        }

        if (successCount > 0) {
            toast.success(`Successfully added ${successCount} tag${successCount > 1 ? 's' : ''}`);
            await fetchTags();
            closeTagDialog();
        }

        if (errorCount > 0 && successCount === 0) {
            toast.error('Failed to add tags. Some tags may already exist.');
        } else if (errorCount > 0) {
            toast.warning(
                `Added ${successCount} tag${successCount > 1 ? 's' : ''}, but ${errorCount} failed (may already exist)`,
            );
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add tags';
        toast.error(errorMessage);
    } finally {
        creatingTag.value = false;
    }
}

async function deleteTag(tag: Tag) {
    if (!article.value) return;

    deletingTag.value = tag.id;
    try {
        const { data } = await axios.delete(`/api/admin/knowledgebase/articles/${article.value.id}/tags/${tag.id}`);

        if (data && data.success) {
            toast.success('Tag deleted successfully');
            await fetchTags();
        } else {
            toast.error(data?.message || 'Failed to delete tag');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete tag';
        toast.error(errorMessage);
    } finally {
        deletingTag.value = null;
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

async function submitEdit() {
    if (!article.value) return;

    saving.value = true;

    // If no new icon file selected, use existing icon (or null if article had no icon)
    let iconUrl = article.value.icon || undefined;

    // Upload new icon if one was selected
    if (editIconFile.value) {
        try {
            const formData = new FormData();
            formData.append('icon', editIconFile.value);

            const uploadResponse = await axios.post('/api/admin/knowledgebase/upload-icon', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (uploadResponse.data && uploadResponse.data.success) {
                iconUrl = uploadResponse.data.data.url;
            } else {
                toast.error(uploadResponse.data?.message || 'Failed to upload icon');
                saving.value = false;
                return;
            }
        } catch (e: unknown) {
            const errorMessage =
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to upload icon';
            toast.error(errorMessage);
            saving.value = false;
            return;
        }
    }

    try {
        const patchData: {
            category_id: number;
            title: string;
            slug: string;
            icon?: string;
            content: string;
            status: 'draft' | 'published' | 'archived';
            pinned: boolean;
        } = {
            category_id: parseInt(editForm.value.category_id),
            title: editForm.value.title,
            slug: editForm.value.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, ''),
            content: editForm.value.content,
            status: editForm.value.status,
            pinned: editForm.value.pinned,
        };
        if (iconUrl) {
            patchData.icon = iconUrl;
        }
        const { data } = await axios.patch(`/api/admin/knowledgebase/articles/${article.value.id}`, patchData);
        if (data && data.success) {
            toast.success('Article updated successfully');
        } else {
            toast.error(data?.message || 'Failed to update article');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to update article';
        toast.error(errorMessage);
    } finally {
        saving.value = false;
    }
}
</script>
