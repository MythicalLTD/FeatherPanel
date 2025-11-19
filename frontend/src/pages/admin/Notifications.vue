<!-- eslint-disable vue/no-v-html -->
<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Notifications', isCurrent: true, href: '/admin/notifications' }]">
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading notifications...</span>
                </div>
            </div>

            <!-- Error State -->
            <div
                v-else-if="message?.type === 'error'"
                class="flex flex-col items-center justify-center py-12 text-center"
            >
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
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load notifications</h3>
                <p class="text-sm text-muted-foreground max-w-sm">
                    {{ message.text }}
                </p>
                <Button class="mt-4" @click="fetchNotifications">Try Again</Button>
            </div>

            <!-- Notifications Table -->
            <div v-else class="p-4 sm:p-6">
                <!-- Plugin Widgets: Before Table -->
                <WidgetRenderer v-if="widgetsBeforeTable.length > 0" :widgets="widgetsBeforeTable" />
                <TableComponent
                    title="Notifications"
                    description="Manage notifications that will be displayed to users."
                    :columns="tableColumns"
                    :data="notifications"
                    :search-placeholder="'Search by title or message...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-notifications-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <Button
                            variant="outline"
                            size="sm"
                            data-umami-event="Create notification"
                            @click="openCreateDrawer"
                        >
                            <Plus class="h-4 w-4 mr-2" />
                            Create Notification
                        </Button>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-title="{ item }">
                        <div class="flex items-center gap-2">
                            <Bell class="h-4 w-4 text-muted-foreground" />
                            <span class="font-medium">{{ (item as unknown as Notification).title }}</span>
                        </div>
                    </template>

                    <template #cell-type="{ item }">
                        <Badge :variant="getTypeVariant((item as unknown as Notification).type)">
                            {{ (item as unknown as Notification).type }}
                        </Badge>
                    </template>

                    <template #cell-is_dismissible="{ item }">
                        <Badge :variant="(item as unknown as Notification).is_dismissible ? 'default' : 'secondary'">
                            {{ (item as unknown as Notification).is_dismissible ? 'Yes' : 'No' }}
                        </Badge>
                    </template>

                    <template #cell-is_sticky="{ item }">
                        <Badge :variant="(item as unknown as Notification).is_sticky ? 'default' : 'secondary'">
                            {{ (item as unknown as Notification).is_sticky ? 'Yes' : 'No' }}
                        </Badge>
                    </template>

                    <template #cell-created_at="{ item }">
                        <span class="text-sm text-muted-foreground">
                            {{ formatDate((item as unknown as Notification).created_at) }}
                        </span>
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex flex-col sm:flex-row gap-1 sm:gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                class="flex-1 sm:flex-none hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="View notification"
                                data-umami-event="View notification"
                                :data-umami-event-notification="(item as unknown as Notification).title"
                                @click="onView(item as unknown as Notification)"
                            >
                                <Eye :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                class="flex-1 sm:flex-none hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Edit notification"
                                data-umami-event="Edit notification"
                                :data-umami-event-notification="(item as unknown as Notification).title"
                                @click="onEdit(item as unknown as Notification)"
                            >
                                <Pencil :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as unknown as Notification).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="flex-1 sm:flex-none hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :loading="deleting"
                                    title="Confirm deletion"
                                    data-umami-event="Confirm delete notification"
                                    :data-umami-event-notification="(item as unknown as Notification).title"
                                    @click="confirmDelete(item as unknown as Notification)"
                                >
                                    <span class="hidden sm:inline">Confirm Delete</span>
                                    <span class="sm:hidden">Confirm</span>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    class="flex-1 sm:flex-none hover:scale-110 hover:shadow-md transition-all duration-200"
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
                                    class="w-full sm:w-auto hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :disabled="deleting"
                                    title="Delete notification"
                                    data-umami-event="Delete notification"
                                    :data-umami-event-notification="(item as unknown as Notification).title"
                                    @click="onDelete(item as unknown as Notification)"
                                >
                                    <Trash2 :size="16" />
                                    <span class="hidden sm:inline ml-1">Delete</span>
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>

                <!-- Plugin Widgets: After Table -->
                <WidgetRenderer v-if="widgetsAfterTable.length > 0" :widgets="widgetsAfterTable" />

                <!-- Notifications help cards -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Bell class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">What are Notifications?</div>
                                    <p>
                                        Notifications are alerts that can be displayed to users. They can be global
                                        (shown to all users) or user-specific. Use them to communicate important
                                        information, updates, or warnings.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <AlertCircle class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Types & Behavior</div>
                                    <p>
                                        Notifications support different types (info, warning, danger, success, error)
                                        and can be dismissible or sticky. Sticky notifications remain until explicitly
                                        closed by the user.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Plugin Widgets: After Help Cards -->
                <WidgetRenderer v-if="widgetsAfterHelpCards.length > 0" :widgets="widgetsAfterHelpCards" />
            </div>

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>

        <!-- View Drawer -->
        <Drawer
            :open="viewDrawerOpen"
            @update:open="
                (val) => {
                    if (!val) closeViewDrawer();
                }
            "
        >
            <DrawerContent v-if="selectedNotification">
                <DrawerHeader>
                    <DrawerTitle>Notification Details</DrawerTitle>
                    <DrawerDescription
                        >Viewing details for notification: {{ selectedNotification.title }}</DrawerDescription
                    >
                </DrawerHeader>

                <div class="px-4 sm:px-6 pb-6 space-y-6">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label class="text-sm font-medium">Title</Label>
                            <p class="text-sm text-muted-foreground mt-1">{{ selectedNotification.title }}</p>
                        </div>
                        <div>
                            <Label class="text-sm font-medium">Type</Label>
                            <div class="mt-1">
                                <Badge :variant="getTypeVariant(selectedNotification.type)">
                                    {{ selectedNotification.type }}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-4">
                        <div>
                            <Label class="text-sm font-medium">Message (Markdown)</Label>
                            <!-- eslint-disable-next-line vue/no-v-html -->
                            <div
                                class="mt-1 p-4 bg-muted rounded-md border border-border markdown-content"
                                v-html="renderMarkdown(selectedNotification.message_markdown)"
                            ></div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-4">
                        <div>
                            <Label class="text-sm font-medium">Options</Label>
                            <div class="mt-1 flex gap-2">
                                <Badge :variant="selectedNotification.is_dismissible ? 'default' : 'secondary'">
                                    {{ selectedNotification.is_dismissible ? 'Dismissible' : 'Not dismissible' }}
                                </Badge>
                                <Badge :variant="selectedNotification.is_sticky ? 'default' : 'secondary'">
                                    {{ selectedNotification.is_sticky ? 'Sticky' : 'Not sticky' }}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label class="text-sm font-medium">Created At</Label>
                            <p class="text-sm text-muted-foreground mt-1">
                                {{ formatDate(selectedNotification.created_at) }}
                            </p>
                        </div>
                        <div v-if="selectedNotification.updated_at">
                            <Label class="text-sm font-medium">Updated At</Label>
                            <p class="text-sm text-muted-foreground mt-1">
                                {{ formatDate(selectedNotification.updated_at) }}
                            </p>
                        </div>
                    </div>
                </div>

                <DrawerFooter>
                    <DrawerClose as-child>
                        <Button variant="outline">Close</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>

        <!-- Edit Drawer -->
        <Drawer
            :open="editDrawerOpen"
            @update:open="
                (val) => {
                    if (!val) closeEditDrawer();
                }
            "
        >
            <DrawerContent v-if="editingNotification">
                <DrawerHeader>
                    <DrawerTitle>Edit Notification</DrawerTitle>
                    <DrawerDescription
                        >Edit details for notification: {{ editingNotification.title }}</DrawerDescription
                    >
                </DrawerHeader>

                <form class="px-4 sm:px-6 pb-6 space-y-6" @submit.prevent="updateNotification">
                    <div class="space-y-2">
                        <Label for="edit-title">Title</Label>
                        <Input
                            id="edit-title"
                            v-model="editingNotification.title"
                            placeholder="Notification title"
                            required
                            maxlength="255"
                        />
                    </div>

                    <div class="space-y-2">
                        <Label for="edit-message">Message (Markdown)</Label>
                        <Textarea
                            id="edit-message"
                            v-model="editingNotification.message_markdown"
                            placeholder="Enter notification message in Markdown format..."
                            required
                            rows="6"
                        />
                        <p class="text-xs text-muted-foreground">You can use Markdown formatting in the message.</p>
                    </div>

                    <div class="space-y-2">
                        <Label for="edit-type">Type</Label>
                        <Select v-model="editingNotification.type">
                            <SelectTrigger id="edit-type">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="info">Info</SelectItem>
                                <SelectItem value="warning">Warning</SelectItem>
                                <SelectItem value="danger">Danger</SelectItem>
                                <SelectItem value="success">Success</SelectItem>
                                <SelectItem value="error">Error</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div class="flex items-center gap-3">
                        <input
                            id="edit-is_dismissible"
                            v-model="editingNotification.is_dismissible"
                            type="checkbox"
                            class="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer"
                        />
                        <Label for="edit-is_dismissible" class="font-normal cursor-pointer flex-1">
                            Allow users to dismiss this notification
                        </Label>
                    </div>

                    <div class="flex items-center gap-3">
                        <input
                            id="edit-is_sticky"
                            v-model="editingNotification.is_sticky"
                            type="checkbox"
                            class="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer"
                        />
                        <Label for="edit-is_sticky" class="font-normal cursor-pointer flex-1">
                            Sticky (remains until explicitly closed)
                        </Label>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-2">
                        <Button type="submit" variant="default" :loading="updating" class="w-full sm:w-auto">
                            {{ updating ? 'Updating...' : 'Update Notification' }}
                        </Button>
                        <Button type="button" variant="outline" class="w-full sm:w-auto" @click="closeEditDrawer"
                            >Cancel</Button
                        >
                    </div>
                </form>
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
                    <DrawerTitle>Create Notification</DrawerTitle>
                    <DrawerDescription>Create a new notification to display to users.</DrawerDescription>
                </DrawerHeader>

                <form class="px-4 sm:px-6 pb-6 space-y-6" @submit.prevent="createNotification">
                    <div class="space-y-2">
                        <Label for="create-title">Title</Label>
                        <Input
                            id="create-title"
                            v-model="newNotification.title"
                            placeholder="Notification title"
                            required
                            maxlength="255"
                        />
                    </div>

                    <div class="space-y-2">
                        <Label for="create-message">Message (Markdown)</Label>
                        <Textarea
                            id="create-message"
                            v-model="newNotification.message_markdown"
                            placeholder="Enter notification message in Markdown format..."
                            required
                            rows="6"
                        />
                        <p class="text-xs text-muted-foreground">You can use Markdown formatting in the message.</p>
                    </div>

                    <div class="space-y-2">
                        <Label for="create-type">Type</Label>
                        <Select v-model="newNotification.type">
                            <SelectTrigger id="create-type">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="info">Info</SelectItem>
                                <SelectItem value="warning">Warning</SelectItem>
                                <SelectItem value="danger">Danger</SelectItem>
                                <SelectItem value="success">Success</SelectItem>
                                <SelectItem value="error">Error</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div class="flex items-center gap-3">
                        <input
                            id="create-is_dismissible"
                            v-model="newNotification.is_dismissible"
                            type="checkbox"
                            class="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer"
                        />
                        <Label for="create-is_dismissible" class="font-normal cursor-pointer flex-1">
                            Allow users to dismiss this notification
                        </Label>
                    </div>

                    <div class="flex items-center gap-3">
                        <input
                            id="create-is_sticky"
                            v-model="newNotification.is_sticky"
                            type="checkbox"
                            class="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer"
                        />
                        <Label for="create-is_sticky" class="font-normal cursor-pointer flex-1">
                            Sticky (remains until explicitly closed)
                        </Label>
                    </div>

                    <div class="flex gap-2">
                        <Button type="submit" variant="default" :loading="creating">
                            {{ creating ? 'Creating...' : 'Create Notification' }}
                        </Button>
                        <Button type="button" variant="outline" @click="closeCreateDrawer">Cancel</Button>
                    </div>
                </form>
            </DrawerContent>
        </Drawer>
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

import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import axios from 'axios';
import { marked } from 'marked';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import TableComponent from '@/components/ui/feather-table/TableComponent.vue';
import type { TableColumn } from '@/components/ui/feather-table/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
} from '@/components/ui/drawer';
import { Plus, Eye, Pencil, Trash2, Bell, AlertCircle } from 'lucide-vue-next';
import { Card, CardContent } from '@/components/ui/card';

// Types
interface Notification {
    id: number;
    title: string;
    message_markdown: string;
    type: 'info' | 'warning' | 'danger' | 'success' | 'error';
    is_dismissible: boolean;
    is_sticky: boolean;
    created_at: string;
    updated_at: string | null;
    dismissed_at: string | null;
}

interface Message {
    type: 'success' | 'error' | 'info' | 'warning';
    text: string;
}

// Reactive state
const loading = ref(true);
const notifications = ref<Notification[]>([]);
const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0,
    hasNext: false,
    hasPrev: false,
    from: 0,
    to: 0,
});
const message = ref<Message | null>(null);
const searchQuery = ref('');

// Drawer states
const viewDrawerOpen = ref(false);
const editDrawerOpen = ref(false);
const createDrawerOpen = ref(false);

// Selected items
const selectedNotification = ref<Notification | null>(null);
const editingNotification = ref<Notification | null>(null);

// Form states
const creating = ref(false);
const updating = ref(false);
const deleting = ref(false);
const confirmDeleteRow = ref<number | null>(null);

// New notification form
const newNotification = ref({
    title: '',
    message_markdown: '',
    type: 'info' as Notification['type'],
    is_dismissible: true,
    is_sticky: false,
});

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-notifications');
const widgetsTopOfPage = computed(() => getWidgets('admin-notifications', 'top-of-page'));
const widgetsBeforeTable = computed(() => getWidgets('admin-notifications', 'before-table'));
const widgetsAfterTable = computed(() => getWidgets('admin-notifications', 'after-table'));
const widgetsAfterHelpCards = computed(() => getWidgets('admin-notifications', 'after-help-cards'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-notifications', 'bottom-of-page'));

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'title', label: 'Title', searchable: true },
    { key: 'type', label: 'Type' },
    { key: 'is_dismissible', label: 'Dismissible' },
    { key: 'is_sticky', label: 'Sticky' },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[120px] font-semibold' },
];

const toast = useToast();

// Methods
async function fetchNotifications() {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/notifications', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value || undefined,
            },
        });
        notifications.value = data.data.notifications || [];

        // Map the API response pagination to our expected format
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
    } catch (error) {
        console.error('Error fetching notifications:', error);
        message.value = {
            type: 'error',
            text: error instanceof Error ? error.message : 'Failed to fetch notifications',
        };
    } finally {
        loading.value = false;
    }
}

const handleSearch = (query: string) => {
    searchQuery.value = query;
    pagination.value.page = 1;
    fetchNotifications();
};

const changePage = (page: number) => {
    pagination.value.page = page;
    fetchNotifications();
};

// Drawer methods
const openViewDrawer = (notification: Notification) => {
    selectedNotification.value = notification;
    viewDrawerOpen.value = true;
};

const closeViewDrawer = () => {
    viewDrawerOpen.value = false;
    selectedNotification.value = null;
};

const openEditDrawer = (notification: Notification) => {
    editingNotification.value = { ...notification };
    editDrawerOpen.value = true;
};

const closeEditDrawer = () => {
    editDrawerOpen.value = false;
    editingNotification.value = null;
};

const openCreateDrawer = () => {
    newNotification.value = {
        title: '',
        message_markdown: '',
        type: 'info',
        is_dismissible: true,
        is_sticky: false,
    };
    createDrawerOpen.value = true;
};

const closeCreateDrawer = () => {
    createDrawerOpen.value = false;
    newNotification.value = {
        title: '',
        message_markdown: '',
        type: 'info',
        is_dismissible: true,
        is_sticky: false,
    };
};

// CRUD operations
const onView = (notification: Notification) => {
    openViewDrawer(notification);
};

const onEdit = (notification: Notification) => {
    openEditDrawer(notification);
};

const onDelete = (notification: Notification) => {
    confirmDeleteRow.value = notification.id;
};

const onCancelDelete = () => {
    confirmDeleteRow.value = null;
};

const confirmDelete = async (notification: Notification) => {
    deleting.value = true;
    try {
        await axios.delete(`/api/admin/notifications/${notification.id}`);
        toast.success('Notification deleted successfully');
        confirmDeleteRow.value = null;
        await fetchNotifications();
    } catch (error) {
        console.error('Error deleting notification:', error);
        const axiosError = error as { response?: { data?: { error_message?: string } } };
        toast.error(axiosError.response?.data?.error_message || 'Failed to delete notification');
    } finally {
        deleting.value = false;
    }
};

const createNotification = async () => {
    creating.value = true;
    try {
        const payload = {
            title: newNotification.value.title,
            message_markdown: newNotification.value.message_markdown,
            type: newNotification.value.type,
            is_dismissible: newNotification.value.is_dismissible,
            is_sticky: newNotification.value.is_sticky,
        };

        await axios.put('/api/admin/notifications', payload);
        toast.success('Notification created successfully');
        closeCreateDrawer();
        await fetchNotifications();
    } catch (error) {
        console.error('Error creating notification:', error);
        const axiosError = error as { response?: { data?: { error_message?: string } } };
        toast.error(axiosError.response?.data?.error_message || 'Failed to create notification');
    } finally {
        creating.value = false;
    }
};

const updateNotification = async () => {
    if (!editingNotification.value) return;

    updating.value = true;
    try {
        const payload: Partial<Notification> = {};

        if (editingNotification.value.title !== selectedNotification.value?.title) {
            payload.title = editingNotification.value.title;
        }
        if (editingNotification.value.message_markdown !== selectedNotification.value?.message_markdown) {
            payload.message_markdown = editingNotification.value.message_markdown;
        }
        if (editingNotification.value.type !== selectedNotification.value?.type) {
            payload.type = editingNotification.value.type;
        }
        if (editingNotification.value.is_dismissible !== selectedNotification.value?.is_dismissible) {
            payload.is_dismissible = editingNotification.value.is_dismissible;
        }
        if (editingNotification.value.is_sticky !== selectedNotification.value?.is_sticky) {
            payload.is_sticky = editingNotification.value.is_sticky;
        }

        await axios.patch(`/api/admin/notifications/${editingNotification.value.id}`, payload);
        toast.success('Notification updated successfully');
        closeEditDrawer();
        await fetchNotifications();
    } catch (error) {
        console.error('Error updating notification:', error);
        const axiosError = error as { response?: { data?: { error_message?: string } } };
        toast.error(axiosError.response?.data?.error_message || 'Failed to update notification');
    } finally {
        updating.value = false;
    }
};

// Utility functions
const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getTypeVariant = (type: Notification['type']): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (type) {
        case 'success':
            return 'default';
        case 'error':
        case 'danger':
            return 'destructive';
        case 'warning':
            return 'outline';
        default:
            return 'secondary';
    }
};

const renderMarkdown = (markdown: string): string => {
    if (!markdown) return '';
    try {
        // Configure marked for safe rendering
        marked.setOptions({
            breaks: true,
            gfm: true,
        });
        return marked.parse(markdown) as string;
    } catch (error) {
        console.error('Markdown parsing error:', error);
        return markdown;
    }
};

// Initialize
onMounted(async () => {
    await fetchPluginWidgets();
    await fetchNotifications();
});
</script>

<style scoped>
/* Markdown content styling */
.markdown-content {
    color: hsl(var(--foreground));
    line-height: 1.6;
}

.markdown-content :deep(p) {
    margin: 0 0 1em 0;
}

.markdown-content :deep(p:last-child) {
    margin-bottom: 0;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
    line-height: 1.25;
    color: hsl(var(--foreground));
}

.markdown-content :deep(h1) {
    font-size: 1.875rem;
}

.markdown-content :deep(h2) {
    font-size: 1.5rem;
}

.markdown-content :deep(h3) {
    font-size: 1.25rem;
}

.markdown-content :deep(h4) {
    font-size: 1.125rem;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
    margin: 0.5em 0;
    padding-left: 1.5em;
}

.markdown-content :deep(li) {
    margin: 0.25em 0;
}

.markdown-content :deep(strong) {
    font-weight: 600;
    color: hsl(var(--foreground));
}

.markdown-content :deep(em) {
    font-style: italic;
}

.markdown-content :deep(code) {
    background-color: hsl(var(--muted));
    color: hsl(var(--foreground));
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
}

.markdown-content :deep(pre) {
    background-color: hsl(var(--muted));
    color: hsl(var(--foreground));
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1em 0;
}

.markdown-content :deep(pre code) {
    background-color: transparent;
    padding: 0;
    font-size: 0.875em;
}

.markdown-content :deep(blockquote) {
    border-left: 4px solid hsl(var(--border));
    padding-left: 1rem;
    margin: 1em 0;
    color: hsl(var(--muted-foreground));
}

.markdown-content :deep(a) {
    color: hsl(var(--primary));
    text-decoration: underline;
    text-underline-offset: 2px;
}

.markdown-content :deep(a:hover) {
    color: hsl(var(--primary) / 0.8);
}

.markdown-content :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 1em 0;
}

.markdown-content :deep(hr) {
    border: none;
    border-top: 1px solid hsl(var(--border));
    margin: 1.5em 0;
}

.markdown-content :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
    border: 1px solid hsl(var(--border));
    padding: 0.5rem;
    text-align: left;
}

.markdown-content :deep(th) {
    background-color: hsl(var(--muted));
    font-weight: 600;
}
</style>
