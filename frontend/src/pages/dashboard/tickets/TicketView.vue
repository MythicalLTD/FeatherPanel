<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: t('tickets.title'), href: '/dashboard/tickets' },
            { text: ticket?.title || t('tickets.loadingTitle'), isCurrent: true },
        ]"
    >
        <div class="min-h-screen bg-background">
            <div class="p-6">
                <div v-if="loading" class="flex items-center justify-center py-12">
                    <div class="flex items-center gap-3">
                        <div
                            class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"
                        ></div>
                        <span class="text-muted-foreground">{{ t('tickets.loading') }}</span>
                    </div>
                </div>

                <div v-else-if="error" class="flex flex-col items-center justify-center py-12 text-center">
                    <div class="text-red-500 mb-4">
                        <AlertCircle class="h-12 w-12 mx-auto" />
                    </div>
                    <h3 class="text-lg font-medium text-muted-foreground mb-2">{{ t('tickets.failedToLoad') }}</h3>
                    <p class="text-sm text-muted-foreground max-w-sm mb-4">{{ error }}</p>
                    <Button @click="router.push('/dashboard/tickets')">{{ t('tickets.backToTickets') }}</Button>
                </div>

                <div v-else-if="ticket" class="space-y-6">
                    <!-- Ticket Header -->
                    <div class="mb-6">
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <h1 class="text-3xl font-bold mb-2">{{ ticket.title }}</h1>
                                <p class="text-muted-foreground">
                                    {{ t('tickets.ticketNumber') }}{{ ticket.id }} • {{ t('tickets.created') }}
                                    {{ formatDate(ticket.created_at) }}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" @click="router.push('/dashboard/tickets')">
                                <ArrowLeft class="h-4 w-4 mr-2" />
                                {{ t('tickets.backToTickets') }}
                            </Button>
                        </div>
                    </div>

                    <!-- Ticket Info Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <Card>
                            <CardContent class="p-4">
                                <div class="text-sm text-muted-foreground mb-2">{{ t('tickets.status') }}</div>
                                <Badge
                                    v-if="ticket.status"
                                    :style="
                                        ticket.status.color
                                            ? { backgroundColor: ticket.status.color, color: '#fff' }
                                            : {}
                                    "
                                    variant="secondary"
                                    class="text-sm"
                                >
                                    {{ ticket.status.name }}
                                </Badge>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent class="p-4">
                                <div class="text-sm text-muted-foreground mb-2">{{ t('tickets.priority') }}</div>
                                <Badge
                                    v-if="ticket.priority"
                                    :style="
                                        ticket.priority.color
                                            ? { backgroundColor: ticket.priority.color, color: '#fff' }
                                            : {}
                                    "
                                    variant="secondary"
                                    class="text-sm"
                                >
                                    {{ ticket.priority.name }}
                                </Badge>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent class="p-4">
                                <div class="text-sm text-muted-foreground mb-2">{{ t('tickets.category') }}</div>
                                <div v-if="ticket.category" class="flex items-center gap-2">
                                    <img
                                        v-if="ticket.category.icon"
                                        :src="ticket.category.icon"
                                        :alt="ticket.category.name"
                                        class="h-4 w-4 rounded"
                                    />
                                    <span class="text-sm font-medium">{{ ticket.category.name }}</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card v-if="ticket.server">
                            <CardContent class="p-4">
                                <div class="text-sm text-muted-foreground mb-2">{{ t('tickets.server') }}</div>
                                <span class="text-sm font-medium">{{ ticket.server.name }}</span>
                            </CardContent>
                        </Card>
                    </div>

                    <!-- Messages -->
                    <Card>
                        <CardHeader>
                            <CardTitle>{{ t('tickets.conversation') }}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div v-if="messages.length === 0" class="text-muted-foreground text-center py-8">
                                <Paperclip class="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>{{ t('tickets.noMessages') }}</p>
                            </div>
                            <div v-else class="space-y-4">
                                <div
                                    v-for="message in messages"
                                    :key="message.id"
                                    class="border rounded-lg p-6"
                                    :class="message.is_internal ? 'bg-muted/30 border-muted' : 'bg-card'"
                                >
                                    <div class="flex items-start gap-4">
                                        <Avatar v-if="message.user" class="h-10 w-10 shrink-0">
                                            <AvatarImage
                                                :src="message.user.avatar || ''"
                                                :alt="message.user.username || ''"
                                            />
                                            <AvatarFallback class="text-sm">
                                                {{ message.user.username?.[0]?.toUpperCase() || '?' }}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-center justify-between mb-2">
                                                <div class="flex items-center gap-2 flex-wrap">
                                                    <span class="font-semibold">{{
                                                        message.user?.username || t('tickets.system')
                                                    }}</span>
                                                    <Badge
                                                        v-if="message.user?.role"
                                                        variant="secondary"
                                                        class="text-xs"
                                                        :style="
                                                            message.user.role.color
                                                                ? {
                                                                      backgroundColor: message.user.role.color,
                                                                      color: '#fff',
                                                                  }
                                                                : {}
                                                        "
                                                    >
                                                        {{ message.user.role.name }}
                                                    </Badge>
                                                    <Badge v-if="message.is_internal" variant="outline" class="text-xs">
                                                        {{ t('tickets.internalNote') }}
                                                    </Badge>
                                                </div>
                                                <div class="flex items-center gap-2">
                                                    <span class="text-xs text-muted-foreground shrink-0">{{
                                                        formatDate(message.created_at)
                                                    }}</span>
                                                    <Button
                                                        v-if="
                                                            canDeleteMessage(message) &&
                                                            !message.is_internal &&
                                                            !ticket?.closed_at
                                                        "
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        class="h-7 w-7 p-0"
                                                        :title="t('tickets.deleteMessage')"
                                                        @click="openDeleteDialog(message.id)"
                                                    >
                                                        <Trash2 class="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <p
                                                v-if="message.user?.first_name || message.user?.last_name"
                                                class="text-xs text-muted-foreground mb-3"
                                            >
                                                {{ message.user.first_name }} {{ message.user.last_name }}
                                            </p>
                                            <!-- eslint-disable vue/no-v-html -->
                                            <div
                                                class="prose prose-sm dark:prose-invert max-w-none mb-3 text-sm"
                                                v-html="renderMarkdown(message.message)"
                                            ></div>
                                            <!-- eslint-enable vue/no-v-html -->
                                            <div
                                                v-if="message.attachments && message.attachments.length > 0"
                                                class="mt-4 pt-3 border-t space-y-2"
                                            >
                                                <div class="text-xs font-semibold text-muted-foreground mb-2">
                                                    {{ t('tickets.attachments') }}
                                                </div>
                                                <div class="flex flex-wrap gap-2">
                                                    <a
                                                        v-for="attachment in message.attachments"
                                                        :key="attachment.id"
                                                        :href="attachment.url"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        class="inline-flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-md text-sm transition-colors"
                                                    >
                                                        <Paperclip class="h-4 w-4" />
                                                        <span class="font-medium">{{ attachment.file_name }}</span>
                                                        <span class="text-xs text-muted-foreground"
                                                            >({{ formatFileSize(attachment.file_size) }})</span
                                                        >
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Reply Form -->
                    <Card v-if="!ticket.closed_at">
                        <CardHeader>
                            <CardTitle>{{ t('tickets.replyToTicket') }}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form class="space-y-6" @submit.prevent="submitReply">
                                <div class="space-y-3">
                                    <Label for="reply-message">{{ t('tickets.messageRequired') }}</Label>
                                    <Textarea
                                        id="reply-message"
                                        v-model="replyForm.message"
                                        :placeholder="t('tickets.typeReply')"
                                        rows="6"
                                        required
                                    />
                                </div>
                                <div class="space-y-3">
                                    <Label>{{ t('tickets.attachmentsOptional') }}</Label>
                                    <div
                                        ref="dropZone"
                                        :class="[
                                            'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
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
                                        <div class="flex flex-col items-center gap-2">
                                            <Paperclip class="h-6 w-6 text-muted-foreground" />
                                            <p class="text-sm">
                                                <span class="text-primary cursor-pointer hover:underline">{{
                                                    t('tickets.clickToUpload')
                                                }}</span>
                                                {{ t('tickets.orDragAndDrop') }}
                                            </p>
                                            <p class="text-xs text-muted-foreground">
                                                {{ t('tickets.maxFileSize') }}
                                            </p>
                                        </div>
                                    </div>
                                    <div v-if="selectedFiles.length > 0" class="space-y-2">
                                        <div
                                            v-for="(file, index) in selectedFiles"
                                            :key="index"
                                            class="flex items-center justify-between p-3 bg-muted rounded-md border"
                                        >
                                            <div class="flex items-center gap-3">
                                                <Paperclip class="h-4 w-4 text-muted-foreground" />
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
                                <div class="flex gap-2">
                                    <Button type="submit" :loading="replying">
                                        <Send class="h-4 w-4 mr-2" />
                                        {{ replying ? t('tickets.sending') : t('tickets.sendReply') }}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                    <Card v-else>
                        <CardContent class="p-6 text-center text-muted-foreground">
                            <p>{{ t('tickets.ticketClosed') }}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>

        <!-- Delete Message Confirmation Dialog -->
        <AlertDialog :open="showDeleteDialog" @update:open="(val: boolean) => !val && closeDeleteDialog()">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle class="flex items-center gap-2 text-destructive">
                        <Trash2 class="h-5 w-5" />
                        {{ t('tickets.deleteMessageTitle') }}
                    </AlertDialogTitle>
                    <AlertDialogDescription class="pt-2">
                        <p class="text-base font-medium text-foreground mb-2">
                            {{ t('tickets.deleteMessageConfirm') }}
                        </p>
                        <p class="text-sm text-muted-foreground">
                            {{ t('tickets.deleteMessageWarning') }}
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="closeDeleteDialog">{{ t('common.cancel') }}</AlertDialogCancel>
                    <Button
                        class="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
                        @click="confirmDeleteMessage"
                    >
                        <Trash2 class="h-4 w-4 mr-2" />
                        {{ t('tickets.deleteMessageTitle') }}
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

import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Paperclip, Trash2, ArrowLeft, AlertCircle } from 'lucide-vue-next';
import axios, { type AxiosError } from 'axios';
import { useToast } from 'vue-toastification';
import { useSessionStore } from '@/stores/session';
import { useI18n } from 'vue-i18n';
import { renderMarkdown } from '@/lib/markdown';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const sessionStore = useSessionStore();
const { t } = useI18n();

type ApiTicket = {
    id: number;
    uuid: string;
    title: string;
    description: string;
    created_at: string;
    closed_at?: string;
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
        icon?: string;
    };
    server?: {
        id: number;
        name: string;
    };
};

type ApiTicketMessage = {
    id: number;
    message: string;
    is_internal: boolean;
    created_at: string;
    user?: {
        uuid: string;
        username: string;
        email: string;
        avatar?: string;
        first_name?: string;
        last_name?: string;
        role?: {
            id: number;
            name: string;
            color?: string;
        };
    };
    attachments?: Array<{
        id: number;
        file_name: string;
        file_size: number;
        url: string;
    }>;
};

const loading = ref(true);
const error = ref<string | null>(null);
const ticket = ref<ApiTicket | null>(null);
const messages = ref<ApiTicketMessage[]>([]);
const replying = ref(false);
const selectedFiles = ref<File[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const dropZone = ref<HTMLDivElement | null>(null);
const isDragging = ref(false);

const replyForm = ref({
    message: '',
});

// Delete confirmation dialog state
const showDeleteDialog = ref(false);
const messageToDelete = ref<number | null>(null);

async function fetchTicketDetails() {
    loading.value = true;
    error.value = null;
    try {
        const uuid = route.params.uuid as string;
        const { data } = await axios.get(`/api/user/tickets/${uuid}`);
        if (data && data.success) {
            ticket.value = data.data.ticket;
            messages.value = data.data.messages || [];
        } else {
            error.value = t('tickets.failedToLoad');
        }
    } catch (err: unknown) {
        const errorMessage =
            ((err as AxiosError)?.response?.data as { message?: string })?.message || t('tickets.failedToLoad');
        error.value = errorMessage;
    } finally {
        loading.value = false;
    }
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

async function submitReply() {
    if (!ticket.value || !replyForm.value.message.trim()) {
        return;
    }

    replying.value = true;
    try {
        const replyResponse = await axios.post(`/api/user/tickets/${ticket.value.uuid}/reply`, {
            message: replyForm.value.message,
        });

        // Upload attachments if any (link them to the message we just created)
        if (selectedFiles.value.length > 0 && replyResponse.data?.data?.message_id) {
            const messageId = replyResponse.data.data.message_id;
            for (const file of selectedFiles.value) {
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('message_id', String(messageId)); // Link to the reply message

                    await axios.post(`/api/user/tickets/${ticket.value.uuid}/attachments`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });
                } catch (err: unknown) {
                    console.error('Failed to upload attachment:', err);
                    toast.error(t('tickets.failedToUploadAttachment', { name: file.name }));
                }
            }
        }

        toast.success(t('tickets.replySent'));
        replyForm.value.message = '';
        selectedFiles.value = [];
        if (fileInput.value) {
            fileInput.value.value = '';
        }

        // Refresh ticket details
        await fetchTicketDetails();
    } catch (err: unknown) {
        const errorMessage =
            ((err as AxiosError)?.response?.data as { message?: string })?.message || t('tickets.failedToSendReply');
        toast.error(errorMessage);
    } finally {
        replying.value = false;
    }
}

function formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function canDeleteMessage(message: ApiTicketMessage): boolean {
    if (!sessionStore.user || !message.user) {
        return false;
    }
    // User can delete their own messages
    return sessionStore.user.uuid === message.user.uuid;
}

function openDeleteDialog(messageId: number) {
    messageToDelete.value = messageId;
    showDeleteDialog.value = true;
}

function closeDeleteDialog() {
    showDeleteDialog.value = false;
    messageToDelete.value = null;
}

async function confirmDeleteMessage() {
    if (!ticket.value || !messageToDelete.value) {
        return;
    }

    try {
        const { data } = await axios.delete(`/api/user/tickets/${ticket.value.uuid}/messages/${messageToDelete.value}`);

        if (data && data.success) {
            toast.success(t('tickets.messageDeleted'));
            closeDeleteDialog();
            // Refresh ticket details
            await fetchTicketDetails();
        } else {
            throw new Error('Failed to delete message');
        }
    } catch (err: unknown) {
        const errorMessage =
            ((err as AxiosError)?.response?.data as { message?: string })?.message ||
            t('tickets.failedToDeleteMessage');
        toast.error(errorMessage);
        closeDeleteDialog();
    }
}

onMounted(() => {
    fetchTicketDetails();
});
</script>
