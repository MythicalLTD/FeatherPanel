<template>
    <div class="space-y-6">
        <!-- Plugin Widgets: Activity Tab Top -->
        <WidgetRenderer v-if="widgetsTop.length > 0" :widgets="widgetsTop" />

        <div>
            <h3 class="text-lg font-medium">{{ $t('account.activity.title') }}</h3>
            <p class="text-sm text-muted-foreground">{{ $t('account.activity.description') }}</p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="flex items-center gap-3">
                <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                <span class="text-muted-foreground">{{ $t('account.activity.loading') }}</span>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="message?.type === 'error'" class="flex flex-col items-center justify-center py-12 text-center">
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
            <h3 class="text-lg font-medium text-muted-foreground mb-2">{{ $t('account.activity.loadError') }}</h3>
            <p class="text-sm text-muted-foreground max-w-sm">
                {{ message.text }}
            </p>
            <Button class="mt-4" @click="fetchActivity">{{ $t('account.activity.tryAgain') }}</Button>
        </div>

        <!-- Activity Timeline -->
        <div v-else class="space-y-4">
            <!-- Search Bar -->
            <div class="relative">
                <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    v-model="searchQuery"
                    :placeholder="$t('account.activity.searchPlaceholder')"
                    class="pl-10"
                    @keyup.enter="handleSearch"
                />
            </div>

            <!-- Activity Count -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p class="text-sm text-muted-foreground text-center sm:text-left">
                    <span v-if="pagination">
                        {{
                            $t('table.showingRecords', {
                                from: pagination.from,
                                to: pagination.to,
                                total: pagination.total_records,
                            })
                        }}
                    </span>
                    <span v-else>
                        {{ $t('account.activity.totalActivities', { count: totalActivities }) }}
                    </span>
                </p>
                <Button
                    variant="outline"
                    size="sm"
                    class="w-full sm:w-auto"
                    data-umami-event="Refresh activity"
                    @click="fetchActivity"
                >
                    <RefreshCw class="h-4 w-4 mr-2" />
                    {{ $t('account.activity.refresh') }}
                </Button>
            </div>

            <!-- Timeline -->
            <div v-if="filteredActivities.length > 0" class="relative">
                <!-- Timeline line -->
                <div class="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>

                <div class="space-y-4">
                    <div v-for="activity in filteredActivities" :key="activity.id" class="relative flex gap-4">
                        <!-- Timeline dot -->
                        <div
                            class="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20"
                        >
                            <div class="h-3 w-3 rounded-full bg-primary"></div>
                        </div>

                        <!-- Activity content -->
                        <div class="flex-1 space-y-2 pb-4">
                            <div class="space-y-2">
                                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                    <div class="space-y-1 flex-1">
                                        <h4 class="text-sm font-medium leading-none">
                                            {{ activity.name }}
                                        </h4>
                                        <p v-if="activity.context" class="text-sm text-muted-foreground">
                                            {{ activity.context }}
                                        </p>
                                    </div>
                                    <div class="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                                        <Clock class="h-3 w-3" />
                                        {{ formatDate(activity.created_at) }}
                                    </div>
                                </div>
                            </div>

                            <!-- Activity metadata -->
                            <div class="flex items-center gap-4 text-xs text-muted-foreground">
                                <div v-if="activity.ip_address" class="flex items-center gap-1">
                                    <Globe class="h-3 w-3" />
                                    <span class="font-mono">{{ activity.ip_address }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Pagination -->
            <div v-if="pagination && pagination.total_pages > 1" class="flex items-center justify-between gap-4 pt-4">
                <div class="text-sm text-muted-foreground">
                    {{ $t('table.page') }} {{ pagination.current_page }} {{ $t('table.of') }}
                    {{ pagination.total_pages }}
                </div>
                <div class="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        :disabled="!pagination.has_prev"
                        @click="changePage(pagination.current_page - 1)"
                    >
                        <ChevronLeft class="h-4 w-4" />
                    </Button>
                    <div class="flex items-center gap-1">
                        <Button
                            v-for="page in visiblePages"
                            :key="page"
                            :variant="page === pagination.current_page ? 'default' : 'outline'"
                            size="sm"
                            @click="changePage(page)"
                        >
                            {{ page }}
                        </Button>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        :disabled="!pagination.has_next"
                        @click="changePage(pagination.current_page + 1)"
                    >
                        <ChevronRight class="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <!-- Empty State -->
            <div
                v-if="filteredActivities.length === 0 && (!pagination || pagination.total_records === 0)"
                class="text-center py-12"
            >
                <div class="mx-auto h-12 w-12 text-muted-foreground mb-4">
                    <Activity class="h-12 w-12" />
                </div>
                <h3 class="text-sm font-medium text-muted-foreground mb-2">
                    {{ searchQuery ? $t('account.activity.noSearchResults') : $t('account.activity.noActivities') }}
                </h3>
                <p class="text-xs text-muted-foreground">
                    {{
                        searchQuery
                            ? $t('account.activity.tryDifferentSearch')
                            : $t('account.activity.noActivitiesDescription')
                    }}
                </p>
            </div>

            <div
                v-if="filteredActivities.length === 0 && pagination && pagination.total_records > 0"
                class="text-center py-12"
            >
                <div class="mx-auto h-12 w-12 text-muted-foreground mb-4">
                    <Search class="h-12 w-12" />
                </div>
                <h3 class="text-sm font-medium text-muted-foreground mb-2">
                    {{ $t('account.activity.noSearchResults') }}
                </h3>
                <p class="text-xs text-muted-foreground">
                    {{ $t('account.activity.tryDifferentSearch') }}
                </p>
            </div>
        </div>

        <!-- Plugin Widgets: Activity Tab Bottom -->
        <WidgetRenderer v-if="widgetsBottom.length > 0" :widgets="widgetsBottom" />
    </div>
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

import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, Clock, Globe, Activity, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import axios from 'axios';

const { t } = useI18n();

type ActivityItem = {
    id: number;
    user_uuid: string;
    name: string;
    context?: string;
    ip_address?: string;
    created_at: string;
    updated_at: string;
};

interface PaginationInfo {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    from: number;
    to: number;
}

interface ApiResponse {
    success: boolean;
    data: {
        activities: ActivityItem[];
        pagination: PaginationInfo;
        search: {
            query: string;
            has_results: boolean;
        };
    };
    message?: string;
}

const activities = ref<ActivityItem[]>([]);
const loading = ref(true);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const pagination = ref<PaginationInfo | null>(null);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('account');
const widgetsTop = computed(() => getWidgets('account', 'activity-top'));
const widgetsBottom = computed(() => getWidgets('account', 'activity-bottom'));

const totalActivities = computed(() => pagination.value?.total_records ?? activities.value.length);

const filteredActivities = computed(() => activities.value);

const visiblePages = computed(() => {
    if (!pagination.value) return [];
    const pages: number[] = [];
    const total = pagination.value.total_pages;
    const current = pagination.value.current_page;

    // Always show first page
    pages.push(1);

    // Show pages around current page
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        if (!pages.includes(i)) pages.push(i);
    }

    // Always show last page
    if (total > 1 && !pages.includes(total)) {
        pages.push(total);
    }

    return pages.sort((a, b) => a - b);
});

async function fetchActivity(page: number = currentPage.value) {
    loading.value = true;
    message.value = null;

    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: pageSize.value.toString(),
        });

        if (searchQuery.value.trim()) {
            params.append('search', searchQuery.value.trim());
        }

        const response = await axios.get<ApiResponse>(`/api/user/activities?${params.toString()}`);

        if (response.data.success && response.data.data) {
            activities.value = response.data.data.activities;
            pagination.value = response.data.data.pagination;
            currentPage.value = page;
        } else {
            activities.value = [];
            pagination.value = null;
        }
    } catch (error) {
        console.error('Error fetching activity:', error);
        message.value = {
            type: 'error',
            text: t('account.activity.fetchError'),
        };
        activities.value = [];
        pagination.value = null;
    } finally {
        loading.value = false;
    }
}

const changePage = (page: number) => {
    if (page < 1 || (pagination.value && page > pagination.value.total_pages)) {
        return;
    }
    fetchActivity(page);
};

function handleSearch() {
    currentPage.value = 1;
    fetchActivity(1);
}

function formatDate(dateString: string): string {
    if (!dateString) return '-';

    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return t('account.activity.justNow');
        } else if (diffInHours < 24) {
            const hours = Math.floor(diffInHours);
            return t('account.activity.hoursAgo', { hours });
        } else if (diffInHours < 48) {
            return t('account.activity.yesterday');
        } else {
            return (
                date.toLocaleDateString() +
                ' ' +
                date.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                })
            );
        }
    } catch {
        return dateString;
    }
}

// Watch for search query changes with debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, () => {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
        handleSearch();
    }, 500);
});

onMounted(async () => {
    await fetchActivity();

    // Fetch plugin widgets
    await fetchPluginWidgets();
});
</script>
