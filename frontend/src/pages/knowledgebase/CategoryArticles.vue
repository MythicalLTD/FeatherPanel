<template>
    <PublicLayout>
        <div class="min-h-screen">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">{{ t('dashboard.knowledgebase.loadingArticles') }}</span>
                </div>
            </div>

            <!-- Articles List -->
            <div v-else class="max-w-4xl mx-auto">
                <div class="mb-6">
                    <Button variant="ghost" size="sm" class="mb-4" @click="router.push('/knowledgebase')">
                        <ChevronLeft class="h-4 w-4 mr-2" />
                        {{ t('dashboard.knowledgebase.backToCategories') }}
                    </Button>
                    <Card v-if="category">
                        <CardHeader>
                            <div class="flex items-start gap-4">
                                <div
                                    v-if="category.icon"
                                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted"
                                >
                                    <img
                                        :src="category.icon"
                                        :alt="category.name"
                                        class="h-8 w-8 rounded object-cover"
                                        @error="handleImageError"
                                    />
                                </div>
                                <div
                                    v-else
                                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted"
                                >
                                    <FileText class="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div class="flex-1">
                                    <CardTitle class="text-2xl mb-2">{{ category.name }}</CardTitle>
                                    <CardDescription v-if="category.description" class="text-sm">
                                        {{ category.description }}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                </div>

                <div v-if="articles.length === 0" class="text-center py-16">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                        <FileText class="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p class="text-muted-foreground">{{ t('dashboard.knowledgebase.noArticles') }}</p>
                </div>

                <div v-else class="space-y-0 border rounded-lg">
                    <div
                        v-for="article in articles"
                        :key="article.id"
                        class="flex items-start gap-4 p-4 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors"
                        @click="viewArticle(article)"
                    >
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
                            <div class="flex items-start gap-2 mb-2">
                                <h3 class="text-lg font-semibold leading-tight">{{ article.title }}</h3>
                                <Badge v-if="article.pinned === 'true'" variant="default" class="shrink-0 mt-0.5">
                                    {{ t('dashboard.knowledgebase.pinned') }}
                                </Badge>
                            </div>
                            <div
                                class="line-clamp-2 prose prose-sm max-w-none dark:prose-invert text-sm text-muted-foreground mb-2"
                            >
                                <!-- eslint-disable-next-line vue/no-v-html -->
                                <div v-html="renderMarkdown(article.content.substring(0, 300) + '...')"></div>
                            </div>
                            <div class="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{{ formatDate(article.created_at) }}</span>
                                <span v-if="article.published_at" class="flex items-center gap-1">
                                    <span>•</span>
                                    <span>{{ formatDate(article.published_at) }}</span>
                                </span>
                            </div>
                        </div>
                        <ChevronRight class="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                    </div>
                </div>

                <!-- Pagination -->
                <div v-if="pagination.total_pages > 1" class="mt-6 flex justify-center items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        :disabled="!pagination.has_prev"
                        @click="changePage(pagination.current_page - 1)"
                    >
                        <ChevronLeft class="h-4 w-4 mr-2" />
                        {{ t('dashboard.knowledgebase.previous') }}
                    </Button>
                    <span class="flex items-center px-4 py-2 text-sm text-muted-foreground bg-muted rounded-md">
                        {{ t('dashboard.knowledgebase.page') }} {{ pagination.current_page }}
                        {{ t('dashboard.knowledgebase.of') }} {{ pagination.total_pages }}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        :disabled="!pagination.has_next"
                        @click="changePage(pagination.current_page + 1)"
                    >
                        {{ t('dashboard.knowledgebase.next') }}
                        <ChevronLeft class="h-4 w-4 ml-2 rotate-180" />
                    </Button>
                </div>
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

import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import PublicLayout from '@/layouts/PublicLayout.vue';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-vue-next';
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

const route = useRoute();
const router = useRouter();
const category = ref<Category | null>(null);
const articles = ref<Article[]>([]);
const loading = ref(true);
const pagination = ref({
    current_page: 1,
    per_page: 10,
    total_records: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
});

async function fetchCategoryArticles() {
    const categoryId = route.params.id as string;
    if (!categoryId) return;

    loading.value = true;
    try {
        const { data } = await axios.get(`/api/knowledgebase/categories/${categoryId}/articles`, {
            params: {
                page: pagination.value.current_page,
                limit: pagination.value.per_page,
            },
        });
        category.value = data.data.category;
        articles.value = data.data.articles || [];

        const apiPagination = data.data.pagination;
        pagination.value = {
            current_page: apiPagination.current_page,
            per_page: apiPagination.per_page,
            total_records: apiPagination.total_records,
            total_pages: apiPagination.total_pages,
            has_next: apiPagination.has_next,
            has_prev: apiPagination.has_prev,
        };
    } catch (error) {
        console.error('Failed to fetch category articles:', error);
        router.push('/knowledgebase');
    } finally {
        loading.value = false;
    }
}

function changePage(page: number) {
    pagination.value.current_page = page;
    fetchCategoryArticles();
}

function viewArticle(article: Article) {
    router.push(`/knowledgebase/article/${article.id}`);
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

onMounted(() => {
    fetchCategoryArticles();
});

watch(
    () => route.params.id,
    () => {
        fetchCategoryArticles();
    },
);
</script>
