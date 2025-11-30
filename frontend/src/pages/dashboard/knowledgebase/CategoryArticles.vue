<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Knowledgebase', href: '/dashboard/knowledgebase' },
            { text: category?.name || 'Category', isCurrent: true },
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

            <!-- Articles List -->
            <div v-else class="p-6 max-w-7xl mx-auto">
                <div class="mb-8">
                    <div class="flex items-center gap-3 mb-6">
                        <Button variant="ghost" size="sm" @click="router.push('/dashboard/knowledgebase')">
                            <ChevronLeft class="h-4 w-4 mr-2" />
                            Back to Categories
                        </Button>
                    </div>
                    <div v-if="category" class="flex items-start gap-4 p-6 rounded-xl bg-muted/30 border">
                        <div v-if="category.icon" class="shrink-0 p-4 rounded-xl bg-background border">
                            <img
                                :src="category.icon"
                                :alt="category.name"
                                class="h-20 w-20 rounded-lg object-cover"
                                @error="handleImageError"
                            />
                        </div>
                        <div class="flex-1">
                            <h1 class="text-4xl font-bold mb-2">{{ category.name }}</h1>
                            <p v-if="category.description" class="text-muted-foreground text-lg">
                                {{ category.description }}
                            </p>
                        </div>
                    </div>
                </div>

                <div v-if="articles.length === 0" class="text-center py-16">
                    <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                        <FileText class="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p class="text-muted-foreground text-lg">No articles in this category yet.</p>
                </div>

                <div v-else class="grid gap-6 md:grid-cols-2">
                    <Card
                        v-for="article in articles"
                        :key="article.id"
                        class="cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all duration-200 border-2 hover:border-primary/20 group overflow-hidden"
                        @click="viewArticle(article)"
                    >
                        <CardHeader class="pb-4">
                            <div class="flex items-start gap-4">
                                <div v-if="article.icon" class="shrink-0">
                                    <div class="p-2 rounded-xl bg-muted/50 group-hover:bg-primary/10 transition-colors">
                                        <img
                                            :src="article.icon"
                                            :alt="article.title"
                                            class="h-16 w-16 rounded-lg object-cover"
                                            @error="handleImageError"
                                        />
                                    </div>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-start gap-2 mb-3">
                                        <CardTitle
                                            class="text-xl leading-tight group-hover:text-primary transition-colors"
                                        >
                                            {{ article.title }}
                                        </CardTitle>
                                        <Badge
                                            v-if="article.pinned === 'true'"
                                            variant="default"
                                            class="shrink-0 mt-0.5"
                                        >
                                            Pinned
                                        </Badge>
                                    </div>
                                    <div
                                        class="line-clamp-3 prose prose-sm max-w-none dark:prose-invert text-muted-foreground mb-4"
                                    >
                                        <!-- eslint-disable-next-line vue/no-v-html -->
                                        <div v-html="renderMarkdown(article.content.substring(0, 300) + '...')"></div>
                                    </div>
                                    <div class="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                                        <span>{{ formatDate(article.created_at) }}</span>
                                        <span v-if="article.published_at" class="flex items-center gap-1">
                                            <span>•</span>
                                            <span>{{ formatDate(article.published_at) }}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                </div>

                <!-- Pagination -->
                <div v-if="pagination.total_pages > 1" class="mt-8 flex justify-center items-center gap-4">
                    <Button
                        variant="outline"
                        :disabled="!pagination.has_prev"
                        @click="changePage(pagination.current_page - 1)"
                    >
                        <ChevronLeft class="h-4 w-4 mr-2" />
                        Previous
                    </Button>
                    <span class="flex items-center px-4 py-2 text-sm text-muted-foreground bg-muted rounded-md">
                        Page {{ pagination.current_page }} of {{ pagination.total_pages }}
                    </span>
                    <Button
                        variant="outline"
                        :disabled="!pagination.has_next"
                        @click="changePage(pagination.current_page + 1)"
                    >
                        Next
                        <ChevronLeft class="h-4 w-4 ml-2 rotate-180" />
                    </Button>
                </div>
            </div>
        </div>
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

import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ChevronLeft } from 'lucide-vue-next';
import axios from 'axios';
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
        const { data } = await axios.get(`/api/user/knowledgebase/categories/${categoryId}/articles`, {
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
        router.push('/dashboard/knowledgebase');
    } finally {
        loading.value = false;
    }
}

function changePage(page: number) {
    pagination.value.current_page = page;
    fetchCategoryArticles();
}

function viewArticle(article: Article) {
    router.push(`/dashboard/knowledgebase/article/${article.id}`);
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
