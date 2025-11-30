<template>
    <DashboardLayout
        :breadcrumbs="[{ text: t('dashboard.knowledgebase.title'), isCurrent: true, href: '/dashboard/knowledgebase' }]"
    >
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">{{ t('dashboard.knowledgebase.loading') }}</span>
                </div>
            </div>

            <!-- Categories Grid -->
            <div v-else class="p-6">
                <div class="mb-6">
                    <h1 class="text-3xl font-bold mb-2">{{ t('dashboard.knowledgebase.title') }}</h1>
                    <p class="text-muted-foreground">{{ t('dashboard.knowledgebase.browseByCategory') }}</p>
                </div>

                <div v-if="categories.length === 0" class="text-center py-16">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                        <BookOpen class="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p class="text-muted-foreground">{{ t('dashboard.knowledgebase.noCategories') }}</p>
                </div>

                <div v-else class="space-y-0 border rounded-lg">
                    <div
                        v-for="category in categories"
                        :key="category.id"
                        class="flex items-center gap-4 p-4 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors"
                        @click="viewCategory(category)"
                    >
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
                        <div v-else class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <BookOpen class="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="text-lg font-semibold mb-1">{{ category.name }}</h3>
                            <p v-if="category.description" class="text-sm text-muted-foreground line-clamp-2">
                                {{ category.description }}
                            </p>
                        </div>
                        <ChevronRight class="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
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

import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { BookOpen, ChevronRight } from 'lucide-vue-next';
import axios from 'axios';

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

const router = useRouter();
const categories = ref<Category[]>([]);
const loading = ref(true);

async function fetchCategories() {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/user/knowledgebase/categories', {
            params: {
                page: 1,
                limit: 100,
            },
        });
        categories.value = (data.data.categories || []).sort((a: Category, b: Category) => {
            // Sort by position, then by name
            if (a.position !== b.position) {
                return a.position - b.position;
            }
            return a.name.localeCompare(b.name);
        });
    } catch (error) {
        console.error('Failed to fetch categories:', error);
    } finally {
        loading.value = false;
    }
}

function viewCategory(category: Category) {
    router.push(`/dashboard/knowledgebase/category/${category.id}`);
}

function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
}

onMounted(() => {
    fetchCategories();
});
</script>
