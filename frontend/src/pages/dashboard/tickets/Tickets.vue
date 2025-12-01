<template>
    <DashboardLayout :breadcrumbs="[{ text: t('tickets.title'), isCurrent: true, href: '/dashboard/tickets' }]">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">{{ t('tickets.loadingTickets') }}</span>
                </div>
            </div>

            <!-- Tickets List -->
            <div v-else class="p-6">
                <div class="mb-6 flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold mb-2">{{ t('tickets.title') }}</h1>
                        <p class="text-muted-foreground">{{ t('tickets.viewAndManage') }}</p>
                    </div>
                    <Button @click="router.push('/dashboard/tickets/create')">
                        <Plus class="h-4 w-4 mr-2" />
                        {{ t('tickets.createTicket') }}
                    </Button>
                </div>

                <!-- Filters -->
                <div class="mb-4 flex gap-2">
                    <Select v-model="filterStatus" @update:model-value="applyFilters">
                        <SelectTrigger class="w-[180px]">
                            <SelectValue :placeholder="t('tickets.filterByStatus')" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{{ t('tickets.allStatuses') }}</SelectItem>
                            <SelectItem v-for="status in statuses" :key="status.id" :value="String(status.id)">
                                {{ status.name }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <Select v-model="filterCategory" @update:model-value="applyFilters">
                        <SelectTrigger class="w-[180px]">
                            <SelectValue :placeholder="t('tickets.filterByCategory')" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{{ t('tickets.allCategories') }}</SelectItem>
                            <SelectItem v-for="category in categories" :key="category.id" :value="String(category.id)">
                                {{ category.name }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <div class="flex gap-2 max-w-sm">
                        <Input
                            v-model="searchQuery"
                            :placeholder="t('tickets.searchTickets')"
                            class="flex-1"
                            @keyup.enter="handleSearch"
                        />
                        <Button type="button" variant="outline" @click="handleSearch">
                            <Search class="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <!-- Tickets Table -->
                <div v-if="tickets.length === 0" class="text-center py-16 border rounded-lg">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                        <Ticket class="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p class="text-muted-foreground mb-4">{{ t('tickets.noTicketsFound') }}</p>
                    <Button @click="router.push('/dashboard/tickets/create')">
                        <Plus class="h-4 w-4 mr-2" />
                        {{ t('tickets.createFirstTicket') }}
                    </Button>
                </div>

                <div v-else class="space-y-0 border rounded-lg">
                    <div
                        v-for="ticket in tickets"
                        :key="ticket.uuid"
                        class="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                    >
                        <div class="flex-1 min-w-0 cursor-pointer" @click="viewTicket(ticket.uuid)">
                            <div class="flex items-center gap-2 mb-2">
                                <h3 class="text-lg font-semibold">{{ ticket.title }}</h3>
                                <Badge
                                    v-if="ticket.status"
                                    :style="
                                        ticket.status.color
                                            ? { backgroundColor: ticket.status.color, color: '#fff' }
                                            : {}
                                    "
                                    variant="secondary"
                                    class="text-xs"
                                >
                                    {{ ticket.status.name }}
                                </Badge>
                                <Badge
                                    v-if="ticket.priority"
                                    :style="
                                        ticket.priority.color
                                            ? { backgroundColor: ticket.priority.color, color: '#fff' }
                                            : {}
                                    "
                                    variant="secondary"
                                    class="text-xs"
                                >
                                    {{ ticket.priority.name }}
                                </Badge>
                            </div>
                            <div class="flex items-center gap-4 text-sm text-muted-foreground">
                                <span v-if="ticket.category">
                                    <span class="font-medium">{{ t('tickets.category') }}:</span>
                                    {{ ticket.category.name }}
                                </span>
                                <span v-if="ticket.server">
                                    <span class="font-medium">{{ t('tickets.server') }}:</span> {{ ticket.server.name }}
                                </span>
                                <span>
                                    <span class="font-medium">{{ t('tickets.created') }}:</span>
                                    {{ formatDate(ticket.created_at) }}
                                </span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                class="h-8 w-8 text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                                :title="t('tickets.deleteTicket')"
                                @click.stop.prevent="openDeleteDialog(ticket)"
                            >
                                <Trash2 class="h-4 w-4" />
                            </Button>
                            <ChevronRight
                                class="h-5 w-5 text-muted-foreground shrink-0 cursor-pointer"
                                @click="viewTicket(ticket.uuid)"
                            />
                        </div>
                    </div>
                </div>

                <!-- Pagination -->
                <div v-if="pagination.total > 0" class="mt-4 flex items-center justify-between">
                    <div class="text-sm text-muted-foreground">
                        {{
                            t('tickets.showingTickets', {
                                from: pagination.from,
                                to: pagination.to,
                                total: pagination.total,
                            })
                        }}
                    </div>
                    <div class="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="!pagination.hasPrev"
                            @click="changePage(pagination.page - 1)"
                        >
                            {{ t('tickets.previous') }}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="!pagination.hasNext"
                            @click="changePage(pagination.page + 1)"
                        >
                            {{ t('tickets.next') }}
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Delete Ticket Confirmation Dialog -->
        <AlertDialog :open="showDeleteDialog" @update:open="(val: boolean) => !val && closeDeleteDialog()">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle class="flex items-center gap-2 text-destructive">
                        <Trash2 class="h-5 w-5" />
                        {{ t('tickets.deleteTicketTitle') }}
                    </AlertDialogTitle>
                    <AlertDialogDescription class="pt-2">
                        <p class="text-base font-medium text-foreground mb-2">
                            {{ t('tickets.deleteTicketConfirm') }}
                        </p>
                        <p class="text-sm text-muted-foreground">
                            {{ t('tickets.deleteTicketWarning') }}
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="closeDeleteDialog">{{ t('common.cancel') }}</AlertDialogCancel>
                    <Button
                        class="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
                        :disabled="deleting"
                        @click="confirmDeleteTicket"
                    >
                        <Trash2 class="h-4 w-4 mr-2" />
                        {{ deleting ? t('common.loading') : t('tickets.deleteTicket') }}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
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

import { ref, onMounted, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ticket, Plus, ChevronRight, Trash2, Search } from 'lucide-vue-next';
import axios, { type AxiosError } from 'axios';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const router = useRouter();
const toast = useToast();
const { t } = useI18n();

type ApiTicket = {
    id: number;
    uuid: string;
    title: string;
    description: string;
    created_at: string;
    status?: {
        id: number;
        name: string;
        color?: string;
    };
    priority?: {
        id: number;
        name: string;
        color?: string;
    };
    category?: {
        id: number;
        name: string;
    };
    server?: {
        id: number;
        name: string;
    };
};

type Category = {
    id: number;
    name: string;
};

type Status = {
    id: number;
    name: string;
};

const loading = ref(true);
const tickets = ref<ApiTicket[]>([]);
const categories = ref<Category[]>([]);
const statuses = ref<Status[]>([]);
const searchQuery = ref('');
const filterStatus = ref('all');
const filterCategory = ref('all');
const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0,
    hasNext: false,
    hasPrev: false,
    from: 0,
    to: 0,
});

// Delete confirmation dialog state
const showDeleteDialog = ref(false);
const ticketToDelete = ref<ApiTicket | null>(null);
const deleting = ref(false);

// Search debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, () => {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
        handleSearch();
    }, 2000); // 2 second debounce
});

async function fetchTickets() {
    loading.value = true;
    try {
        const params: Record<string, string | number | undefined> = {
            page: pagination.value.page,
            limit: pagination.value.pageSize,
            search: searchQuery.value || undefined,
        };

        if (filterStatus.value && filterStatus.value !== 'all') {
            params.status_id = filterStatus.value;
        }
        if (filterCategory.value && filterCategory.value !== 'all') {
            params.category_id = filterCategory.value;
        }

        const { data } = await axios.get('/api/user/tickets', { params });
        tickets.value = data.data.tickets || [];

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
    } catch (error: unknown) {
        const errorMessage =
            ((error as AxiosError)?.response?.data as { message?: string })?.message || t('tickets.failedToFetch');
        toast.error(errorMessage);
        tickets.value = [];
    } finally {
        loading.value = false;
    }
}

async function fetchCategories() {
    try {
        const { data } = await axios.get('/api/user/tickets/categories');
        categories.value = data.data.categories || [];
    } catch (error: unknown) {
        console.error('Failed to fetch categories:', error);
    }
}

async function fetchStatuses() {
    try {
        const { data } = await axios.get('/api/user/tickets/statuses');
        statuses.value = data.data.statuses || [];
    } catch (error: unknown) {
        console.error('Failed to fetch statuses:', error);
    }
}

function viewTicket(uuid: string) {
    router.push(`/dashboard/tickets/${uuid}`);
}

function handleSearch() {
    pagination.value.page = 1;
    fetchTickets();
}

function applyFilters() {
    pagination.value.page = 1;
    fetchTickets();
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchTickets();
}

function formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function openDeleteDialog(ticket: ApiTicket) {
    if (!ticket || !ticket.uuid) {
        return;
    }
    ticketToDelete.value = ticket;
    showDeleteDialog.value = true;
}

function closeDeleteDialog() {
    showDeleteDialog.value = false;
    ticketToDelete.value = null;
}

async function confirmDeleteTicket() {
    if (!ticketToDelete.value) {
        console.error('No ticket to delete');
        return;
    }

    const ticketUuid = ticketToDelete.value.uuid;
    console.log('Attempting to delete ticket:', ticketUuid);

    deleting.value = true;
    try {
        console.log('Sending DELETE request to:', `/api/user/tickets/${ticketUuid}`);
        const response = await axios.delete(`/api/user/tickets/${ticketUuid}`);
        console.log('Delete response:', response);

        const { data } = response;

        if (data && data.success) {
            console.log('Ticket deleted successfully');
            toast.success(t('tickets.ticketDeleted'));
            closeDeleteDialog();
            // Refresh tickets list
            await fetchTickets();
        } else {
            console.error('Delete failed - response:', data);
            throw new Error(data?.message || 'Failed to delete ticket');
        }
    } catch (err: unknown) {
        console.error('Error deleting ticket:', err);
        const errorMessage =
            ((err as AxiosError)?.response?.data as { message?: string })?.message ||
            (err as Error)?.message ||
            t('tickets.failedToDeleteTicket');
        toast.error(errorMessage);
        closeDeleteDialog();
    } finally {
        deleting.value = false;
    }
}

onMounted(async () => {
    await fetchCategories();
    await fetchStatuses();
    await fetchTickets();
});

onUnmounted(() => {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
});
</script>
