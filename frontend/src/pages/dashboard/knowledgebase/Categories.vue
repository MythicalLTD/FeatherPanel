<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Knowledgebase', isCurrent: true, href: '/dashboard/knowledgebase' }]">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading knowledgebase...</span>
                </div>
            </div>

            <!-- Categories Grid -->
            <div v-else class="p-6 max-w-7xl mx-auto">
                <div class="mb-8">
                    <h1
                        class="text-4xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
                    >
                        Knowledgebase
                    </h1>
                    <p class="text-muted-foreground text-lg">Browse articles by category</p>
                </div>

                <div v-if="categories.length === 0" class="text-center py-16">
                    <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                        <BookOpen class="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p class="text-muted-foreground text-lg">No categories available yet.</p>
                </div>

                <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card
                        v-for="category in categories"
                        :key="category.id"
                        class="cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 border-2 hover:border-primary/20 group"
                        @click="viewCategory(category)"
                    >
                        <CardHeader class="pb-4">
                            <div class="flex items-start gap-4">
                                <div
                                    v-if="category.icon"
                                    class="shrink-0 p-3 rounded-xl bg-muted/50 group-hover:bg-primary/10 transition-colors"
                                >
                                    <img
                                        :src="category.icon"
                                        :alt="category.name"
                                        class="h-14 w-14 rounded-lg object-cover"
                                        @error="handleImageError"
                                    />
                                </div>
                                <div class="flex-1 min-w-0 pt-1">
                                    <CardTitle class="text-xl mb-2 group-hover:text-primary transition-colors">
                                        {{ category.name }}
                                    </CardTitle>
                                    <CardDescription v-if="category.description" class="line-clamp-2 text-sm">
                                        {{ category.description }}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent class="pt-0">
                            <Button
                                variant="ghost"
                                class="w-full justify-between group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                                @click.stop="viewCategory(category)"
                            >
                                <span>View Articles</span>
                                <ChevronRight class="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </CardContent>
                    </Card>
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
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ChevronRight } from 'lucide-vue-next';
import axios from 'axios';

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
