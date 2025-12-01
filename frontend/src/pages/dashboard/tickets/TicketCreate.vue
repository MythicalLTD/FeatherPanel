<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: t('tickets.title'), href: '/dashboard/tickets' },
            { text: t('tickets.createTicket'), isCurrent: true },
        ]"
    >
        <div class="min-h-screen bg-background">
            <div class="p-6">
                <div class="mb-8">
                    <h1 class="text-3xl font-bold mb-2">{{ t('tickets.createTicket') }}</h1>
                    <p class="text-muted-foreground">{{ t('tickets.createTicketDescription') }}</p>
                </div>

                <Card>
                    <CardContent class="p-8">
                        <form class="space-y-8" @submit.prevent="submitCreate">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="md:col-span-2">
                                    <div class="space-y-3">
                                        <Label for="title">{{ t('tickets.titleLabel') }}</Label>
                                        <Input
                                            id="title"
                                            v-model="form.title"
                                            :placeholder="t('tickets.titlePlaceholder')"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div class="space-y-3">
                                        <Label for="category">{{ t('tickets.categoryLabel') }}</Label>
                                        <Select v-model="form.category_id">
                                            <SelectTrigger>
                                                <SelectValue :placeholder="t('tickets.selectCategory')" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem
                                                    v-for="category in categories"
                                                    :key="category.id"
                                                    :value="String(category.id)"
                                                >
                                                    <div class="flex items-center gap-2">
                                                        <img
                                                            v-if="category.icon"
                                                            :src="category.icon"
                                                            :alt="category.name"
                                                            class="h-4 w-4 rounded"
                                                        />
                                                        {{ category.name }}
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div>
                                    <div class="space-y-3">
                                        <Label for="priority">{{ t('tickets.priorityLabel') }}</Label>
                                        <Select v-model="form.priority_id">
                                            <SelectTrigger>
                                                <SelectValue :placeholder="t('tickets.selectPriority')" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem
                                                    v-for="priority in priorities"
                                                    :key="priority.id"
                                                    :value="String(priority.id)"
                                                >
                                                    {{ priority.name }}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div class="md:col-span-2">
                                    <div class="space-y-3">
                                        <Label for="description">{{ t('tickets.descriptionLabel') }}</Label>
                                        <Textarea
                                            id="description"
                                            v-model="form.description"
                                            :placeholder="t('tickets.descriptionPlaceholder')"
                                            rows="10"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <div class="space-y-3">
                                        <Label>{{ t('tickets.serverLabel') }}</Label>
                                        <div class="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                class="flex-1 justify-between"
                                                @click="serverModal.openModal()"
                                            >
                                                {{ getSelectedServerName() || t('tickets.selectServer') }}
                                                <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                            <Button
                                                v-if="form.server_id"
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                :title="t('tickets.clearServerSelection')"
                                                @click="form.server_id = ''"
                                            >
                                                <Trash2 class="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p class="text-xs text-muted-foreground">
                                            {{ t('tickets.serverHint') }}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Drag and Drop Attachments -->
                            <div>
                                <div class="space-y-3">
                                    <Label>{{ t('tickets.attachmentsOptional') }}</Label>
                                    <div
                                        ref="dropZone"
                                        :class="[
                                            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                                            isDragging
                                                ? 'border-primary bg-primary/5'
                                                : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                                        ]"
                                        @dragover.prevent="handleDragOver"
                                        @dragleave.prevent="handleDragLeave"
                                        @drop.prevent="handleDrop"
                                        @click="fileInput?.click()"
                                    >
                                        <input
                                            ref="fileInput"
                                            type="file"
                                            multiple
                                            accept="*/*"
                                            class="hidden"
                                            @change="handleFileSelect"
                                        />
                                        <div class="flex flex-col items-center gap-3">
                                            <div
                                                class="rounded-full bg-muted p-4"
                                                :class="isDragging ? 'bg-primary/10' : ''"
                                            >
                                                <Paperclip class="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p class="text-sm font-medium">
                                                    <span class="text-primary cursor-pointer hover:underline">{{
                                                        t('tickets.clickToUpload')
                                                    }}</span>
                                                    {{ t('tickets.orDragAndDrop') }}
                                                </p>
                                                <p class="text-xs text-muted-foreground mt-1">
                                                    {{ t('tickets.maxFileSize') }}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Selected Files List -->
                                <div v-if="selectedFiles.length > 0" class="mt-4 space-y-2">
                                    <div
                                        v-for="(file, index) in selectedFiles"
                                        :key="index"
                                        class="flex items-center justify-between p-3 bg-muted rounded-md border"
                                    >
                                        <div class="flex items-center gap-3">
                                            <div class="shrink-0">
                                                <Paperclip class="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p class="text-sm font-medium">{{ file.name }}</p>
                                                <p class="text-xs text-muted-foreground">
                                                    {{ formatFileSize(file.size) }}
                                                </p>
                                            </div>
                                        </div>
                                        <Button type="button" variant="ghost" size="sm" @click="removeFile(index)">
                                            <Trash2 class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div class="flex gap-2 pt-4">
                                <Button type="button" variant="outline" @click="router.push('/dashboard/tickets')">
                                    {{ t('common.cancel') }}
                                </Button>
                                <Button type="submit" :loading="creating">
                                    {{ creating ? t('tickets.creating') : t('tickets.createTicketButton') }}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>

        <!-- Server Selection Modal -->
        <SelectionModal
            :is-open="serverModal.state.value.isOpen"
            :title="t('tickets.selectServerTitle')"
            :description="t('tickets.selectServerDescription')"
            item-type="server"
            :search-placeholder="t('tickets.searchServers')"
            :items="serverModal.state.value.items"
            :loading="serverModal.state.value.loading"
            :current-page="serverModal.state.value.currentPage"
            :total-pages="serverModal.state.value.totalPages"
            :total-items="serverModal.state.value.totalItems"
            :page-size="20"
            :selected-item="serverModal.state.value.selectedItem"
            :search-query="serverModal.state.value.searchQuery"
            @update:open="serverModal.closeModal"
            @search="serverModal.handleSearch"
            @search-query-update="serverModal.handleSearchQueryUpdate"
            @page-change="serverModal.handlePageChange"
            @select="serverModal.selectItem"
            @confirm="selectServer(serverModal.confirmSelection())"
        >
            <template #default="{ item, isSelected }">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium truncate text-sm sm:text-base">{{ item.name }}</h4>
                        <p class="text-xs sm:text-sm text-muted-foreground truncate">
                            {{ item.uuidShort || item.uuid }}
                        </p>
                    </div>
                    <div v-if="isSelected" class="shrink-0 ml-2 sm:ml-4">
                        <Check class="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                </div>
            </template>
        </SelectionModal>
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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SelectionModal } from '@/components/ui/selection-modal';
import { useSelectionModal } from '@/composables/useSelectionModal';
import { Trash2, Paperclip, ChevronsUpDown, Check } from 'lucide-vue-next';
import axios, { type AxiosError } from 'axios';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const toast = useToast();
const { t } = useI18n();

type Category = {
    id: number;
    name: string;
    icon?: string;
};

type Priority = {
    id: number;
    name: string;
};

type Server = {
    id: number;
    uuid: string;
    uuidShort: string;
    name: string;
};

const creating = ref(false);
const categories = ref<Category[]>([]);
const priorities = ref<Priority[]>([]);
const selectedFiles = ref<File[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const dropZone = ref<HTMLDivElement | null>(null);
const isDragging = ref(false);

// Server selection modal
const serverModal = useSelectionModal('/api/user/tickets/servers', 20, 'search', 'page');

const form = ref({
    title: '',
    description: '',
    category_id: '',
    priority_id: '',
    server_id: '',
});

async function fetchCategories() {
    try {
        const { data } = await axios.get('/api/user/tickets/categories');
        categories.value = data.data.categories || [];
    } catch (error: unknown) {
        console.error('Failed to fetch categories:', error);
        toast.error(t('tickets.failedToLoadCategories'));
    }
}

async function fetchPriorities() {
    try {
        const { data } = await axios.get('/api/user/tickets/priorities');
        priorities.value = data.data.priorities || [];
    } catch (error: unknown) {
        console.error('Failed to fetch priorities:', error);
        toast.error(t('tickets.failedToLoadPriorities'));
    }
}

function getSelectedServerName(): string {
    if (serverModal.state.value.selectedItem) {
        const selected = serverModal.state.value.selectedItem;
        return `${selected.name} (${selected.uuidShort || selected.uuid})`;
    }
    return '';
}

function selectServer(item: Server | null) {
    if (item && item.id) {
        form.value.server_id = String(item.id);
    } else {
        form.value.server_id = '';
    }
    serverModal.closeModal();
}

function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files) {
        addFiles(Array.from(files));
    }
}

function addFiles(files: File[]) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const validFiles = files.filter((file) => {
        if (file.size > maxSize) {
            toast.error(t('tickets.fileTooLarge', { name: file.name }));
            return false;
        }
        return true;
    });
    selectedFiles.value = [...selectedFiles.value, ...validFiles];
}

function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging.value = true;
}

function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging.value = false;
}

function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging.value = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
        addFiles(Array.from(files));
    }
}

function removeFile(index: number) {
    selectedFiles.value.splice(index, 1);
    if (fileInput.value) {
        fileInput.value.value = '';
    }
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

async function submitCreate() {
    if (
        !form.value.title.trim() ||
        !form.value.description.trim() ||
        !form.value.category_id ||
        !form.value.priority_id
    ) {
        toast.error(t('tickets.fillRequiredFields'));
        return;
    }

    creating.value = true;
    try {
        const createData: {
            title: string;
            description: string;
            category_id: number;
            priority_id: number;
            server_id?: number;
        } = {
            title: form.value.title.trim(),
            description: form.value.description.trim(),
            category_id: Number(form.value.category_id),
            priority_id: Number(form.value.priority_id),
        };

        if (form.value.server_id) {
            createData.server_id = Number(form.value.server_id);
        }

        const { data } = await axios.put('/api/user/tickets', createData);

        if (data && data.success && data.data.ticket) {
            const ticketUuid = data.data.ticket.uuid;
            const messageId = data.data.message_id; // Get the initial message ID

            // Upload attachments if any (link them to the initial message)
            if (selectedFiles.value.length > 0 && messageId) {
                for (const file of selectedFiles.value) {
                    try {
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('message_id', String(messageId)); // Link to initial message

                        await axios.post(`/api/user/tickets/${ticketUuid}/attachments`, formData, {
                            headers: {
                                'Content-Type': 'multipart/form-data',
                            },
                        });
                    } catch (error: unknown) {
                        console.error('Failed to upload attachment:', error);
                        // Continue with other attachments even if one fails
                    }
                }
            }

            toast.success(t('tickets.ticketCreated'));
            router.push(`/dashboard/tickets/${ticketUuid}`);
        } else {
            throw new Error('Failed to create ticket');
        }
    } catch (error: unknown) {
        const errorMessage =
            ((error as AxiosError)?.response?.data as { message?: string })?.message || t('tickets.failedToCreate');
        toast.error(errorMessage);
    } finally {
        creating.value = false;
    }
}

onMounted(async () => {
    await fetchCategories();
    await fetchPriorities();
});
</script>
