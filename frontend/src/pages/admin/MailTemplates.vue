<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Mail Templates', isCurrent: true, href: '/admin/mail-templates' }]">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading mail templates...</span>
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
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load mail templates</h3>
                <p class="text-sm text-muted-foreground max-w-sm">
                    {{ message.text }}
                </p>
                <Button class="mt-4" @click="fetchTemplates">Try Again</Button>
            </div>

            <!-- Mass Email Card -->
            <div v-else class="p-6">
                <div class="mb-6">
                    <div
                        class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6"
                    >
                        <div class="flex items-center gap-3 mb-4">
                            <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Mail class="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-100">Mass Email</h3>
                                <p class="text-sm text-blue-700 dark:text-blue-300">
                                    Send HTML emails to all users in your system
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="flex-1">
                                <p class="text-sm text-blue-800 dark:text-blue-200 mb-2">
                                    Create and send personalized HTML emails to all users with valid email addresses.
                                </p>
                                <div class="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <span>Emails will be queued and sent via your SMTP configuration</span>
                                </div>
                            </div>
                            <Button class="bg-blue-600 hover:bg-blue-700 text-white" @click="openMassEmailDrawer">
                                <Mail class="h-4 w-4 mr-2" />
                                Send Mass Email
                            </Button>
                        </div>
                    </div>
                </div>

                <TableComponent
                    title="Mail Templates"
                    description="Manage email templates for your system."
                    :columns="tableColumns"
                    :data="templates"
                    :search-placeholder="'Search by name or subject...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-mail-templates-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <div class="flex gap-2">
                            <Button variant="outline" size="sm" @click="openCreateDrawer">
                                <Plus class="h-4 w-4 mr-2" />
                                Create Template
                            </Button>
                        </div>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-name="{ item }">
                        <div class="flex items-center gap-2">
                            <Mail class="h-4 w-4 text-muted-foreground" />
                            <span class="font-medium">{{ (item as unknown as MailTemplate).name }}</span>
                        </div>
                    </template>

                    <template #cell-subject="{ item }">
                        <span class="text-sm">{{ (item as unknown as MailTemplate).subject }}</span>
                    </template>

                    <template #cell-body="{ item }">
                        <div class="max-w-xs">
                            <p class="text-sm text-muted-foreground truncate">
                                {{ (item as unknown as MailTemplate).body.substring(0, 100) }}
                                {{ (item as unknown as MailTemplate).body.length > 100 ? '...' : '' }}
                            </p>
                        </div>
                    </template>

                    <template #cell-created_at="{ item }">
                        <span class="text-sm text-muted-foreground">
                            {{ formatDate((item as unknown as MailTemplate).created_at) }}
                        </span>
                    </template>

                    <template #cell-updated_at="{ item }">
                        <span class="text-sm text-muted-foreground">
                            {{ formatDate((item as unknown as MailTemplate).updated_at) }}
                        </span>
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button size="sm" variant="outline" @click="onPreview(item as unknown as MailTemplate)">
                                <Eye :size="16" />
                            </Button>
                            <Button size="sm" variant="secondary" @click="onEdit(item as unknown as MailTemplate)">
                                <Pencil :size="16" />
                            </Button>

                            <template v-if="confirmDeleteRow === (item as unknown as MailTemplate).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    :loading="deleting"
                                    @click="confirmDelete(item as unknown as MailTemplate)"
                                >
                                    Confirm Delete
                                </Button>
                                <Button size="sm" variant="outline" :disabled="deleting" @click="onCancelDelete">
                                    Cancel
                                </Button>
                            </template>
                            <template v-else>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    :disabled="deleting"
                                    @click="onDelete(item as unknown as MailTemplate)"
                                >
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>
                <!-- Mail templates help cards under the table -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <FileText class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">What are Mail Templates?</div>
                                    <p>
                                        Reusable HTML email layouts for notifications, onboarding, invoices, and more.
                                        Edit subject and body, then preview before sending.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Send class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Mass Email</div>
                                    <p>
                                        Send an HTML email to all users with valid addresses. Use responsibly: verify
                                        content, test with a small group, and ensure your SMTP is configured.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card class="md:col-span-2 lg:col-span-1">
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Scale class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Legal & Compliance</div>
                                    <p>
                                        Update your Privacy Policy and Terms to reflect any bulk messaging. FeatherPanel
                                        and its developers are not liable for how you use email features.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
        <!-- Edit Drawer -->
        <Drawer
            :open="editDrawerOpen"
            @update:open="
                (val) => {
                    if (!val) closeEditDrawer();
                }
            "
        >
            <DrawerContent v-if="editingTemplate">
                <DrawerHeader>
                    <DrawerTitle>Edit Template</DrawerTitle>
                    <DrawerDescription>Edit details for template: {{ editingTemplate.name }}</DrawerDescription>
                </DrawerHeader>

                <form class="px-6 pb-6 space-y-6" @submit.prevent="updateTemplate">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <Label for="edit-name">Name</Label>
                            <Input id="edit-name" v-model="editingTemplate.name" placeholder="Template name" required />
                        </div>
                        <div class="space-y-2">
                            <Label for="edit-subject">Subject</Label>
                            <Input
                                id="edit-subject"
                                v-model="editingTemplate.subject"
                                placeholder="Email subject"
                                required
                            />
                        </div>
                    </div>

                    <div class="space-y-2">
                        <Label for="edit-body">Body</Label>
                        <Textarea
                            id="edit-body"
                            v-model="editingTemplate.body"
                            placeholder="Enter email template body (HTML supported)"
                            class="min-h-96 font-mono text-sm"
                            rows="15"
                        />
                    </div>

                    <div class="flex gap-2">
                        <Button type="submit" variant="default" :loading="updating">
                            {{ updating ? 'Updating...' : 'Update Template' }}
                        </Button>
                        <Button type="button" variant="outline" @click="closeEditDrawer">Cancel</Button>
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
                    <DrawerTitle>Create Template</DrawerTitle>
                    <DrawerDescription>Fill in the details to create a new email template.</DrawerDescription>
                </DrawerHeader>

                <form class="px-6 pb-6 space-y-6" @submit.prevent="createTemplate">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <Label for="create-name">Name</Label>
                            <Input id="create-name" v-model="newTemplate.name" placeholder="Template name" required />
                        </div>
                        <div class="space-y-2">
                            <Label for="create-subject">Subject</Label>
                            <Input
                                id="create-subject"
                                v-model="newTemplate.subject"
                                placeholder="Email subject"
                                required
                            />
                        </div>
                    </div>

                    <div class="space-y-2">
                        <Label for="create-body">Body</Label>
                        <Textarea
                            id="create-body"
                            v-model="newTemplate.body"
                            placeholder="Enter email template body (HTML supported)"
                            class="min-h-96 font-mono text-sm"
                            rows="15"
                        />
                    </div>

                    <div class="flex gap-2">
                        <Button type="submit" variant="default" :loading="creating">
                            {{ creating ? 'Creating...' : 'Create Template' }}
                        </Button>
                        <Button type="button" variant="outline" @click="closeCreateDrawer">Cancel</Button>
                    </div>
                </form>
            </DrawerContent>
        </Drawer>

        <!-- Preview Drawer -->
        <Drawer
            :open="previewDrawerOpen"
            @update:open="
                (val) => {
                    if (!val) closePreviewDrawer();
                }
            "
        >
            <DrawerContent v-if="previewTemplate">
                <DrawerHeader>
                    <DrawerTitle>Template Preview</DrawerTitle>
                    <DrawerDescription>Preview for template: {{ previewTemplate.name }}</DrawerDescription>
                </DrawerHeader>

                <div class="px-6 pb-6">
                    <div class="space-y-4">
                        <div>
                            <Label class="text-sm font-medium">Subject</Label>
                            <p class="text-sm text-muted-foreground mt-1">{{ previewTemplate.subject }}</p>
                        </div>

                        <div>
                            <Label class="text-sm font-medium">Body Preview</Label>
                            <div class="mt-2 border rounded-lg p-4 bg-white dark:bg-gray-900">
                                <!-- eslint-disable-next-line vue/no-v-html -->
                                <div class="prose prose-sm max-w-none" v-html="previewTemplate.body"></div>
                            </div>
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

        <!-- Mass Email Drawer -->
        <Drawer
            :open="massEmailDrawerOpen"
            @update:open="
                (val) => {
                    if (!val) closeMassEmailDrawer();
                }
            "
        >
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Send Mass Email</DrawerTitle>
                    <DrawerDescription>Create and send HTML emails to all users in your system.</DrawerDescription>
                </DrawerHeader>

                <form class="px-6 pb-6 space-y-6" @submit.prevent="sendMassEmail">
                    <div class="space-y-2">
                        <Label for="mass-email-subject">Subject</Label>
                        <Input
                            id="mass-email-subject"
                            v-model="massEmailData.subject"
                            placeholder="Email subject line"
                            required
                        />
                    </div>

                    <div class="space-y-2">
                        <Label for="mass-email-body">Email Body (HTML)</Label>
                        <Textarea
                            id="mass-email-body"
                            v-model="massEmailData.body"
                            placeholder="Enter your email content with HTML formatting..."
                            class="min-h-96 font-mono text-sm"
                            rows="15"
                            required
                        />
                        <p class="text-xs text-muted-foreground">
                            You can use HTML tags like &lt;h1&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;a&gt;,
                            etc.
                        </p>
                    </div>

                    <div
                        class="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
                    >
                        <div class="flex items-start gap-3">
                            <svg
                                class="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                />
                            </svg>
                            <div>
                                <h4 class="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                    Important Notice
                                </h4>
                                <p class="text-sm text-yellow-700 dark:text-yellow-300">
                                    This will send emails to ALL users with valid email addresses in your system. Make
                                    sure your content is appropriate and test thoroughly before sending.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="flex gap-2">
                        <Button
                            type="submit"
                            variant="default"
                            :loading="sendingMassEmail"
                            :disabled="sendingMassEmail"
                        >
                            {{ sendingMassEmail ? 'Sending...' : 'Send to All Users' }}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            :disabled="sendingMassEmail"
                            @click="closeMassEmailDrawer"
                        >
                            Cancel
                        </Button>
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

import { ref, onMounted, watch } from 'vue';
import { useToast } from 'vue-toastification';
import axios from 'axios';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import TableComponent from '@/kit/TableComponent.vue';
import type { TableColumn } from '@/kit/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
} from '@/components/ui/drawer';
import { Plus, Eye, Pencil, Trash2, Mail, FileText, Send, Scale } from 'lucide-vue-next';
import { Card, CardContent } from '@/components/ui/card';

// Types
interface MailTemplate {
    id: number;
    name: string;
    subject: string;
    body: string;
    created_at: string;
    updated_at: string;
    deleted: string;
}

interface Message {
    type: 'success' | 'error' | 'info' | 'warning';
    text: string;
}

// Reactive state
const loading = ref(true);
const templates = ref<MailTemplate[]>([]);
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
const includeDeleted = ref(false);

// Drawer states
const editDrawerOpen = ref(false);
const createDrawerOpen = ref(false);
const previewDrawerOpen = ref(false);
const massEmailDrawerOpen = ref(false);

// Selected items
const editingTemplate = ref<MailTemplate | null>(null);
const previewTemplate = ref<MailTemplate | null>(null);

// Form states
const creating = ref(false);
const updating = ref(false);
const deleting = ref(false);
const sendingMassEmail = ref(false);
const confirmDeleteRow = ref<number | null>(null);

// New template form
const newTemplate = ref({
    name: '',
    subject: '',
    body: '<h1>Welcome!</h1>\n<p>This is a sample email template.</p>',
});

// Mass email form
const massEmailData = ref({
    subject: '',
    body: '<h1>Important Update</h1>\n<p>Hello!</p>\n<p>We have an important announcement to share with you.</p>\n<p>Best regards,<br>Your Team</p>',
});

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'name', label: 'Name', searchable: true },
    { key: 'subject', label: 'Subject', searchable: true },
    { key: 'body', label: 'Body Preview', searchable: false },
    { key: 'created_at', label: 'Created' },
    { key: 'updated_at', label: 'Updated' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[120px] font-semibold' },
];

const toast = useToast();

async function fetchTemplates() {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/mail-templates', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value || undefined,
                include_deleted: includeDeleted.value,
            },
        });
        templates.value = data.data.templates || [];

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
        console.error('Error fetching templates:', error);
        message.value = {
            type: 'error',
            text: error instanceof Error ? error.message : 'Failed to fetch templates',
        };
    } finally {
        loading.value = false;
    }
}

const handleSearch = (query: string) => {
    searchQuery.value = query;
    pagination.value.page = 1;
    fetchTemplates();
};

const changePage = (page: number) => {
    pagination.value.page = page;
    fetchTemplates();
};

const openEditDrawer = (template: MailTemplate) => {
    editingTemplate.value = { ...template };
    editDrawerOpen.value = true;
};

const closeEditDrawer = () => {
    editDrawerOpen.value = false;
    editingTemplate.value = null;
};

const openCreateDrawer = () => {
    newTemplate.value = {
        name: '',
        subject: '',
        body: '<h1>Welcome!</h1>\n<p>This is a sample email template.</p>',
    };
    createDrawerOpen.value = true;
};

const closeCreateDrawer = () => {
    createDrawerOpen.value = false;
    newTemplate.value = {
        name: '',
        subject: '',
        body: '<h1>Welcome!</h1>\n<p>This is a sample email template.</p>',
    };
};

const openPreviewDrawer = (template: MailTemplate) => {
    previewTemplate.value = template;
    previewDrawerOpen.value = true;
};

const closePreviewDrawer = () => {
    previewDrawerOpen.value = false;
    previewTemplate.value = null;
};

const openMassEmailDrawer = () => {
    massEmailData.value = {
        subject: '',
        body: '<h1>Important Update</h1>\n<p>Hello!</p>\n<p>We have an important announcement to share with you.</p>\n<p>Best regards,<br>Your Team</p>',
    };
    massEmailDrawerOpen.value = true;
};

const closeMassEmailDrawer = () => {
    massEmailDrawerOpen.value = false;
    massEmailData.value = {
        subject: '',
        body: '<h1>Important Update</h1>\n<p>Hello!</p>\n<p>We have an important announcement to share with you.</p>\n<p>Best regards,<br>Your Team</p>',
    };
};

async function createTemplate() {
    if (!newTemplate.value.name || !newTemplate.value.subject || !newTemplate.value.body) {
        toast.error('Please fill in all required fields');
        return;
    }

    try {
        creating.value = true;
        const { data } = await axios.post('/api/admin/mail-templates', newTemplate.value);

        if (data && data.success) {
            toast.success('Template created successfully');
            closeCreateDrawer();
            await fetchTemplates();
        } else {
            toast.error(data?.message || 'Failed to create template');
        }
    } catch (error) {
        console.error('Error creating template:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to create template');
    } finally {
        creating.value = false;
    }
}

async function updateTemplate() {
    if (!editingTemplate.value) return;

    try {
        updating.value = true;
        const { data } = await axios.patch(
            `/api/admin/mail-templates/${editingTemplate.value.id}`,
            editingTemplate.value,
        );

        if (data && data.success) {
            toast.success('Template updated successfully');
            closeEditDrawer();
            await fetchTemplates();
        } else {
            toast.error(data?.message || 'Failed to update template');
        }
    } catch (error) {
        console.error('Error updating template:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to update template');
    } finally {
        updating.value = false;
    }
}

const onDelete = (template: MailTemplate) => {
    confirmDeleteRow.value = template.id;
};

const onCancelDelete = () => {
    confirmDeleteRow.value = null;
};

async function confirmDelete(template: MailTemplate) {
    deleting.value = true;
    let success = false;
    try {
        const response = await axios.delete(`/api/admin/mail-templates/${template.id}`);
        if (response.data && response.data.success) {
            toast.success('Template deleted successfully');
            await fetchTemplates();
            success = true;
        } else {
            toast.error(response.data?.message || 'Failed to delete template');
        }
    } catch (error) {
        console.error('Error deleting template:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to delete template');
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
    }
}

async function sendMassEmail() {
    if (!massEmailData.value.subject || !massEmailData.value.body) {
        toast.error('Please fill in all required fields');
        return;
    }

    try {
        sendingMassEmail.value = true;
        const { data } = await axios.post('/api/admin/mail-templates/mass-email', massEmailData.value);

        if (data && data.success) {
            const result = data.data;
            toast.success(`Mass email queued successfully! ${result.queued_count} emails queued for delivery.`);
            if (result.failed_count > 0) {
                toast.warning(`${result.failed_count} emails failed to queue.`);
            }
            closeMassEmailDrawer();
        } else {
            toast.error(data?.message || 'Failed to send mass email');
        }
    } catch (error) {
        console.error('Error sending mass email:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to send mass email');
    } finally {
        sendingMassEmail.value = false;
    }
}

const onEdit = (template: MailTemplate) => {
    openEditDrawer(template);
};

const onPreview = (template: MailTemplate) => {
    openPreviewDrawer(template);
};

// Utility functions
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

onMounted(fetchTemplates);
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchTemplates);
</script>
