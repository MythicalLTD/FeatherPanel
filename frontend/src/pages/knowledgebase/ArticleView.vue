<!-- eslint-disable vue/no-v-html -->
<template>
    <PublicLayout>
        <div class="min-h-screen">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">{{ t('dashboard.knowledgebase.loadingArticle') }}</span>
                </div>
            </div>

            <!-- Article Content -->
            <div v-else-if="article" class="max-w-4xl mx-auto">
                <div class="mb-4">
                    <Button variant="ghost" size="sm" @click="goBack">
                        <ChevronLeft class="h-4 w-4 mr-2" />
                        {{ t('dashboard.knowledgebase.back') }}
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <div class="flex items-start gap-4">
                            <div
                                v-if="article.icon"
                                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted"
                            >
                                <img
                                    :src="article.icon"
                                    :alt="article.title"
                                    class="h-8 w-8 rounded object-cover"
                                    @error="handleImageError"
                                />
                            </div>
                            <div v-else class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <FileText class="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-start gap-3 mb-3">
                                    <CardTitle class="text-2xl">{{ article.title }}</CardTitle>
                                    <Badge v-if="article.pinned === 'true'" variant="default" class="shrink-0 mt-1">
                                        {{ t('dashboard.knowledgebase.pinned') }}
                                    </Badge>
                                </div>
                                <div class="flex items-center gap-3 text-sm text-muted-foreground">
                                    <span v-if="category" class="font-medium">{{ category.name }}</span>
                                    <span v-if="category">•</span>
                                    <span>{{ formatDate(article.published_at || article.created_at) }}</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent class="space-y-6">
                        <!-- Tags -->
                        <div v-if="tags.length > 0" class="flex flex-wrap gap-2 pb-4 border-b">
                            <Badge v-for="tag in tags" :key="tag.id" variant="secondary" class="text-xs">
                                {{ tag.tag_name }}
                            </Badge>
                        </div>

                        <!-- Article Content -->
                        <div class="prose prose-lg max-w-none dark:prose-invert markdown-content">
                            <!-- eslint-disable-next-line vue/no-v-html -->
                            <div v-html="renderMarkdown(article.content)"></div>
                        </div>

                        <!-- Downloadable Attachments -->
                        <div v-if="attachments.length > 0" class="mt-8 pt-8 border-t">
                            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Download class="h-5 w-5" />
                                {{ t('dashboard.knowledgebase.downloads') }}
                            </h3>
                            <div class="grid gap-3 md:grid-cols-2">
                                <div
                                    v-for="attachment in attachments"
                                    :key="attachment.id"
                                    class="flex items-center justify-between p-4 rounded-lg border bg-muted/50"
                                >
                                    <div class="flex items-center gap-3 flex-1 min-w-0">
                                        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                            <FileText class="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <a
                                                :href="attachment.file_path"
                                                target="_blank"
                                                class="text-sm font-medium text-primary hover:underline truncate block"
                                            >
                                                {{ attachment.file_name }}
                                            </a>
                                            <span class="text-xs text-muted-foreground">
                                                {{ formatFileSize(attachment.file_size) }}
                                            </span>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" as-child class="shrink-0">
                                        <a :href="attachment.file_path" target="_blank" download>
                                            <Download class="h-4 w-4" />
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </PublicLayout>
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
import { useI18n } from 'vue-i18n';
import PublicLayout from '@/layouts/PublicLayout.vue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, FileText, Download } from 'lucide-vue-next';
import axios from 'axios';
import { renderMarkdown } from '@/lib/markdown';

const { t } = useI18n();

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

type Tag = {
    id: number;
    article_id: number;
    tag_name: string;
    created_at: string;
    updated_at: string;
};

const route = useRoute();
const router = useRouter();
const article = ref<Article | null>(null);
const category = ref<Category | null>(null);
const attachments = ref<Attachment[]>([]);
const tags = ref<Tag[]>([]);
const loading = ref(true);

async function fetchArticle() {
    const articleId = route.params.id as string;
    if (!articleId) return;

    loading.value = true;
    try {
        const { data } = await axios.get(`/api/knowledgebase/articles/${articleId}`);
        article.value = data.data.article;
        attachments.value = data.data.attachments || [];
        tags.value = data.data.tags || [];

        // Fetch category
        if (article.value && article.value.category_id) {
            try {
                const categoryData = await axios.get(`/api/knowledgebase/categories/${article.value.category_id}`);
                category.value = categoryData.data.data.category;
            } catch {
                // Category fetch failed, continue without it
            }
        }
    } catch (error) {
        console.error('Failed to fetch article:', error);
        router.push('/knowledgebase');
    } finally {
        loading.value = false;
    }
}

function goBack() {
    if (category.value) {
        router.push(`/knowledgebase/category/${category.value.id}`);
    } else {
        router.push('/knowledgebase');
    }
}

function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
}

function formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

onMounted(() => {
    fetchArticle();
});
</script>
