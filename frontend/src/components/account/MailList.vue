<template>
    <div class="space-y-6">
        <!-- Plugin Widgets: Mail Tab Top -->
        <WidgetRenderer v-if="widgetsTop.length > 0" :widgets="widgetsTop" />

        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex-1">
                <h3 class="text-lg font-semibold">{{ $t('account.mail.title') }}</h3>
                <p class="text-sm text-muted-foreground">{{ $t('account.mail.description') }}</p>
            </div>
            <Button
                variant="outline"
                size="sm"
                class="w-full sm:w-auto"
                :disabled="loading"
                data-umami-event="Refresh mail list"
                @click="fetchMails"
            >
                <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
                {{ $t('account.mail.refresh') }}
            </Button>
        </div>

        <!-- Search and Stats -->
        <div class="space-y-3">
            <div class="relative">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    v-model="searchQuery"
                    :placeholder="$t('account.mail.searchPlaceholder')"
                    class="pl-10"
                    @keyup.enter="handleSearch"
                />
            </div>
            <div class="text-sm text-muted-foreground text-center">
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
                    {{ $t('account.mail.totalMails', { count: filteredMails.length }) }}
                </span>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="text-center">
                <RefreshCw class="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p class="text-muted-foreground">{{ $t('account.mail.loading') }}</p>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="flex items-center justify-center py-12">
            <div class="text-center">
                <AlertCircle class="h-8 w-8 mx-auto mb-2 text-destructive" />
                <p class="text-destructive mb-2">{{ $t('account.mail.loadError') }}</p>
                <Button variant="outline" data-umami-event="Retry mail fetch" @click="fetchMails">
                    {{ $t('account.mail.tryAgain') }}
                </Button>
            </div>
        </div>

        <!-- Mail List -->
        <div v-else-if="filteredMails.length > 0" class="space-y-4">
            <div
                v-for="mail in filteredMails"
                :key="mail.id"
                class="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
                <div class="space-y-3">
                    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div class="flex-1">
                            <h4 class="font-medium text-foreground mb-1">{{ mail.subject }}</h4>
                            <div class="flex items-center gap-2 mb-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    class="h-8 px-3 text-xs"
                                    data-umami-event="View mail details"
                                    :data-umami-event-subject="mail.subject"
                                    @click="openMailModal(mail)"
                                >
                                    <Mail class="h-3 w-3 mr-1" />
                                    {{ $t('account.mail.viewFull') }}
                                </Button>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <Badge :variant="getStatusVariant(mail.status)" class="text-xs">
                                {{ $t(`account.mail.status.${mail.status}`) }}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div class="flex items-center justify-between text-xs text-muted-foreground">
                    <div class="flex items-center gap-1">
                        <Clock class="h-3 w-3" />
                        <span>{{ formatDate(mail.created_at) }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Mail Modal -->
        <Dialog :open="mailModalOpen" @update:open="mailModalOpen = false">
            <DialogContent class="max-w-[90vw] w-[98vw] max-h-[98vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle class="text-xl font-semibold">
                        {{ selectedMail?.subject }}
                    </DialogTitle>
                    <DialogDescription class="flex items-center gap-4 text-sm text-muted-foreground">
                        <div class="flex items-center gap-2">
                            <Clock class="h-4 w-4" />
                            <span>{{ selectedMail ? formatDate(selectedMail.created_at) : '' }}</span>
                        </div>
                        <Badge :variant="getStatusVariant(selectedMail?.status || 'pending')">
                            {{ selectedMail ? $t(`account.mail.status.${selectedMail.status}`) : '' }}
                        </Badge>
                    </DialogDescription>
                </DialogHeader>

                <div class="flex-1 overflow-y-auto pr-2">
                    <iframe
                        v-if="selectedMail"
                        :srcdoc="getIframeContent(selectedMail.body)"
                        class="w-full h-full min-h-[70vh] border-0 bg-white"
                        sandbox="allow-same-origin"
                        title="Mail Content"
                    ></iframe>
                </div>

                <DialogFooter>
                    <Button variant="outline" @click="mailModalOpen = false">
                        {{ $t('account.mail.close') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Pagination -->
        <div v-if="pagination && pagination.total_pages > 1" class="flex items-center justify-between gap-4">
            <div class="text-sm text-muted-foreground">
                {{ $t('table.page') }} {{ pagination.current_page }} {{ $t('table.of') }} {{ pagination.total_pages }}
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

        <!-- Empty States -->
        <div
            v-if="!loading && !error && mails.length === 0 && (!pagination || pagination.total_records === 0)"
            class="flex items-center justify-center py-12"
        >
            <div class="text-center">
                <Mail class="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p class="text-foreground mb-1">{{ $t('account.mail.noMails') }}</p>
                <p class="text-sm text-muted-foreground">{{ $t('account.mail.noMailsDescription') }}</p>
            </div>
        </div>

        <div
            v-if="!loading && !error && mails.length === 0 && pagination && pagination.total_records > 0"
            class="flex items-center justify-center py-12"
        >
            <div class="text-center">
                <Search class="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p class="text-foreground mb-1">{{ $t('account.mail.noSearchResults') }}</p>
                <p class="text-sm text-muted-foreground">{{ $t('account.mail.tryDifferentSearch') }}</p>
            </div>
        </div>

        <!-- Plugin Widgets: Mail Tab Bottom -->
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

import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Search, RefreshCw, Clock, Mail, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';

const { t: $t } = useI18n();

// Types
interface MailItem {
    id: number;
    subject: string;
    body: string;
    status: 'pending' | 'sent' | 'failed';
    created_at: string;
}

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
        mails: MailItem[];
        pagination: PaginationInfo;
        search: {
            query: string;
            has_results: boolean;
        };
    };
    message?: string;
}

// Reactive state
const loading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref('');
const mails = ref<MailItem[]>([]);
const mailModalOpen = ref(false);
const selectedMail = ref<MailItem | null>(null);
const currentPage = ref(1);
const pageSize = ref(10);
const pagination = ref<PaginationInfo | null>(null);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('account');
const widgetsTop = computed(() => getWidgets('account', 'mail-top'));
const widgetsBottom = computed(() => getWidgets('account', 'mail-bottom'));

// Computed properties
const filteredMails = computed(() => mails.value);

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

// Methods
const fetchMails = async (page: number = currentPage.value) => {
    loading.value = true;
    error.value = null;

    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: pageSize.value.toString(),
        });

        if (searchQuery.value.trim()) {
            params.append('search', searchQuery.value.trim());
        }

        const response = await axios.get<ApiResponse>(`/api/user/mails?${params.toString()}`);

        if (response.data.success && response.data.data) {
            mails.value = response.data.data.mails;
            pagination.value = response.data.data.pagination;
            currentPage.value = page;
        } else {
            mails.value = [];
            pagination.value = null;
        }
    } catch (err) {
        console.error('Failed to fetch mails:', err);
        error.value = $t('account.mail.fetchError');
        mails.value = [];
        pagination.value = null;
    } finally {
        loading.value = false;
    }
};

const changePage = (page: number) => {
    if (page < 1 || (pagination.value && page > pagination.value.total_pages)) {
        return;
    }
    fetchMails(page);
};

const handleSearch = () => {
    currentPage.value = 1;
    fetchMails(1);
};

const openMailModal = (mail: MailItem) => {
    selectedMail.value = mail;
    mailModalOpen.value = true;
};

const getIframeContent = (htmlContent: string): string => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 20px;
                    background: white;
                }
                img {
                    max-width: 100%;
                    height: auto;
                }
                table {
                    max-width: 100%;
                    border-collapse: collapse;
                }
                td, th {
                    padding: 8px;
                    border: 1px solid #ddd;
                }
                button {
                    padding: 10px 20px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    margin: 10px 0;
                }
                button:hover {
                    background: #0056b3;
                }
                a {
                    color: #007bff;
                    text-decoration: none;
                }
                a:hover {
                    text-decoration: underline;
                }
                h1, h2, h3, h4, h5, h6 {
                    margin-top: 20px;
                    margin-bottom: 10px;
                }
                p {
                    margin-bottom: 15px;
                }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `;
};

const getStatusVariant = (status: string) => {
    switch (status) {
        case 'pending':
            return 'secondary';
        case 'sent':
            return 'default';
        case 'failed':
            return 'destructive';
        default:
            return 'secondary';
    }
};

const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';

    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) {
            return $t('account.mail.justNow');
        } else if (diffInHours < 24) {
            return $t('account.mail.hoursAgo', { hours: diffInHours });
        } else if (diffInHours < 48) {
            return $t('account.mail.yesterday');
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        }
    } catch {
        return 'Unknown';
    }
};

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

// Lifecycle
onMounted(async () => {
    await fetchMails();

    // Fetch plugin widgets
    await fetchPluginWidgets();
});
</script>
