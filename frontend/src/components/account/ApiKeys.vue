<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="space-y-4">
            <div>
                <h3 class="text-lg font-semibold">{{ $t('account.apiKeys.title') }}</h3>
                <p class="text-sm text-muted-foreground">{{ $t('account.apiKeys.description') }}</p>
            </div>
            <div class="flex flex-col gap-3">
                <div class="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" size="sm" class="flex-1" @click="openApiDocumentation">
                        <ExternalLink class="h-4 w-4 mr-2" />
                        {{ $t('account.apiKeys.apiDocs') }}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        class="flex-1"
                        :disabled="loading"
                        data-umami-event="Refresh API keys"
                        @click="fetchApiClients"
                    >
                        <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
                        {{ $t('account.apiKeys.refresh') }}
                    </Button>
                </div>
                <Button class="w-full" data-umami-event="Create API key" @click="showCreateModal = true">
                    <Plus class="h-4 w-4 mr-2" />
                    {{ $t('account.apiKeys.addKey') }}
                </Button>
            </div>
        </div>

        <!-- API Keys Information -->
        <div class="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div class="flex items-start gap-3">
                <Info class="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div class="space-y-2">
                    <h4 class="text-sm font-medium text-blue-800 dark:text-blue-200">
                        {{ $t('account.apiKeys.importantInfo.title') }}
                    </h4>
                    <div class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        <p>{{ $t('account.apiKeys.importantInfo.persistent') }}</p>
                        <p>{{ $t('account.apiKeys.importantInfo.accessScope') }}</p>
                        <p>{{ $t('account.apiKeys.importantInfo.security') }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Search and Stats -->
        <div class="space-y-3">
            <div class="relative">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input v-model="searchQuery" :placeholder="$t('account.apiKeys.searchPlaceholder')" class="pl-10" />
            </div>
            <div class="text-sm text-muted-foreground text-center">
                {{ $t('account.apiKeys.totalKeys', { count: filteredApiClients.length }) }}
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="text-center">
                <RefreshCw class="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p class="text-muted-foreground">{{ $t('account.apiKeys.loading') }}</p>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="flex items-center justify-center py-12">
            <div class="text-center">
                <AlertCircle class="h-8 w-8 mx-auto mb-2 text-destructive" />
                <p class="text-destructive mb-2">{{ $t('account.apiKeys.loadError') }}</p>
                <Button variant="outline" @click="fetchApiClients">
                    {{ $t('account.apiKeys.tryAgain') }}
                </Button>
            </div>
        </div>

        <!-- API Clients List -->
        <div v-else-if="filteredApiClients.length > 0" class="space-y-4">
            <div
                v-for="client in filteredApiClients"
                :key="client.id"
                class="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
                <div class="space-y-3">
                    <!-- Header with name and status -->
                    <div class="flex items-start justify-between">
                        <div class="flex-1 min-w-0">
                            <h4 class="font-medium text-foreground mb-1 truncate">{{ client.name }}</h4>
                            <div class="text-xs text-muted-foreground">
                                <span class="font-mono break-all">{{
                                    client.public_key ? client.public_key.substring(0, 20) + '...' : ''
                                }}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 ml-2 shrink-0">
                            <Badge variant="default" class="text-xs">
                                {{ $t('account.apiKeys.statuses.active') }}
                            </Badge>
                        </div>
                    </div>

                    <!-- Action buttons - mobile optimized -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            class="h-8 px-3 text-xs"
                            data-umami-event="View API key details"
                            :data-umami-event-key="client.name"
                            @click="viewClientDetails(client)"
                        >
                            <Eye class="h-3 w-3 mr-1" />
                            {{ $t('account.apiKeys.viewDetails') }}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            class="h-8 px-3 text-xs"
                            data-umami-event="Edit API key"
                            :data-umami-event-key="client.name"
                            @click="editClient(client)"
                        >
                            <Edit class="h-3 w-3 mr-1" />
                            {{ $t('account.apiKeys.edit') }}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            class="h-8 px-3 text-xs"
                            data-umami-event="Regenerate API keys"
                            :data-umami-event-key="client.name"
                            @click="regenerateKeys(client)"
                        >
                            <RefreshCw class="h-3 w-3 mr-1" />
                            {{ $t('account.apiKeys.regenerateKeys') }}
                        </Button>
                    </div>

                    <!-- Footer with date and delete -->
                    <div
                        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground"
                    >
                        <div class="flex items-center gap-1">
                            <Clock class="h-3 w-3" />
                            <span>{{ formatDate(client.created_at) }}</span>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            class="h-7 px-2 text-xs w-full sm:w-auto"
                            data-umami-event="Delete API key"
                            :data-umami-event-key="client.name"
                            @click="deleteClient(client)"
                        >
                            <Trash2 class="h-3 w-3 mr-1" />
                            {{ $t('account.apiKeys.delete') }}
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
            <div class="mx-auto h-12 w-12 text-muted-foreground mb-4">
                <Key class="h-12 w-12" />
            </div>
            <h3 class="text-sm font-medium text-muted-foreground mb-2">
                {{ searchQuery ? $t('account.apiKeys.noSearchResults') : $t('account.apiKeys.noKeys') }}
            </h3>
            <p class="text-xs text-muted-foreground">
                {{ searchQuery ? $t('account.apiKeys.tryDifferentSearch') : $t('account.apiKeys.noKeysDescription') }}
            </p>
            <Button class="mt-4" data-umami-event="Create first API key" @click="showCreateModal = true">
                <Plus class="h-4 w-4 mr-2" />
                {{ $t('account.apiKeys.addFirstKey') }}
            </Button>
        </div>

        <!-- Create/Edit API Client Modal -->
        <Dialog :open="showCreateModal || showEditModal" @update:open="closeModals">
            <DialogContent class="max-w-2xl mx-4 sm:mx-0">
                <DialogHeader>
                    <DialogTitle>
                        {{ showEditModal ? $t('account.apiKeys.editKey') : $t('account.apiKeys.addKey') }}
                    </DialogTitle>
                    <DialogDescription>
                        {{ $t('account.apiKeys.modalDescription') }}
                        <div
                            class="mt-3 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md"
                        >
                            <div class="flex items-start gap-2">
                                <AlertTriangle class="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                                <div class="text-sm text-amber-700 dark:text-amber-300">
                                    <p class="font-medium mb-1">{{ $t('account.apiKeys.modalWarning.title') }}</p>
                                    <p>{{ $t('account.apiKeys.modalWarning.description') }}</p>
                                </div>
                            </div>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <form class="space-y-4" @submit.prevent="handleSubmit">
                    <FormItem>
                        <Label for="clientName">{{ $t('account.apiKeys.clientName') }}</Label>
                        <Input
                            id="clientName"
                            v-model="formData.name"
                            :placeholder="$t('account.apiKeys.clientNamePlaceholder')"
                            required
                        />
                        <p class="text-xs text-muted-foreground mt-1">
                            {{ $t('account.apiKeys.clientNameHint') }}
                        </p>
                    </FormItem>

                    <div class="flex flex-col sm:flex-row gap-3 pt-4">
                        <Button
                            type="submit"
                            :disabled="isSubmitting"
                            class="w-full sm:min-w-[120px] sm:w-auto"
                            data-umami-event="Save API key"
                            :data-umami-event-key="formData.name"
                        >
                            <span v-if="isSubmitting">{{ $t('account.apiKeys.saving') }}</span>
                            <span v-else>{{
                                showEditModal ? $t('account.apiKeys.updateKey') : $t('account.apiKeys.addKey')
                            }}</span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            class="w-full sm:w-auto"
                            :disabled="isSubmitting"
                            @click="closeModals"
                        >
                            {{ $t('account.apiKeys.cancel') }}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>

        <!-- View Client Details Modal -->
        <Dialog :open="showViewModal" @update:open="showViewModal = false">
            <DialogContent class="max-w-2xl mx-4 sm:mx-0">
                <DialogHeader>
                    <DialogTitle class="truncate">{{ selectedClient?.name }}</DialogTitle>
                    <DialogDescription>
                        {{ $t('account.apiKeys.clientDetails') }}
                        <div class="mt-2 text-xs text-muted-foreground">
                            {{ $t('account.apiKeys.keyCapabilities') }}
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div v-if="selectedClient" class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="font-medium text-muted-foreground"
                                >{{ $t('account.apiKeys.clientName') }}:</span
                            >
                            <p class="mt-1 break-words">{{ selectedClient.name }}</p>
                        </div>
                        <div>
                            <span class="font-medium text-muted-foreground"
                                >{{ $t('account.apiKeys.createdAt') }}:</span
                            >
                            <p class="mt-1">{{ formatDate(selectedClient.created_at) }}</p>
                        </div>
                    </div>

                    <div>
                        <span class="font-medium text-muted-foreground">{{ $t('account.apiKeys.publicKey') }}:</span>
                        <div class="mt-2 p-3 bg-muted rounded-md">
                            <pre class="text-xs font-mono break-all whitespace-pre-wrap overflow-x-auto">{{
                                selectedClient.public_key
                            }}</pre>
                            <Button
                                variant="outline"
                                size="sm"
                                class="mt-2 h-7 px-2 text-xs w-full sm:w-auto"
                                data-umami-event="Copy public key"
                                :data-umami-event-key="selectedClient?.name"
                                @click="copyToClipboard(selectedClient.public_key || '')"
                            >
                                <Copy class="h-3 w-3 mr-1" />
                                {{ $t('account.apiKeys.copyKey') }}
                            </Button>
                        </div>
                    </div>

                    <div v-if="selectedClient.private_key">
                        <span class="font-medium text-muted-foreground">{{ $t('account.apiKeys.privateKey') }}:</span>
                        <div class="mt-2 p-3 bg-muted rounded-md">
                            <pre class="text-xs font-mono break-all whitespace-pre-wrap overflow-x-auto">{{
                                selectedClient.private_key
                            }}</pre>
                            <div class="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    class="h-7 px-2 text-xs w-full sm:w-auto"
                                    data-umami-event="Copy private key"
                                    :data-umami-event-key="selectedClient?.name"
                                    @click="copyToClipboard(selectedClient.private_key || '')"
                                >
                                    <Copy class="h-3 w-3 mr-1" />
                                    {{ $t('account.apiKeys.copyKey') }}
                                </Button>
                                <div class="flex items-center gap-2">
                                    <AlertTriangle class="h-4 w-4 text-yellow-500 shrink-0" />
                                    <span class="text-xs text-yellow-600">{{
                                        $t('account.apiKeys.privateKeyWarning')
                                    }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        <!-- Delete Confirmation Modal -->
        <AlertDialog :open="showDeleteModal" @update:open="showDeleteModal = false">
            <AlertDialogContent class="mx-4 sm:mx-0">
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ $t('account.apiKeys.confirmDelete') }}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {{ $t('account.apiKeys.deleteWarning') }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter class="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel class="w-full sm:w-auto">{{ $t('account.apiKeys.cancel') }}</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        class="w-full sm:w-auto"
                        data-umami-event="Confirm delete API key"
                        :data-umami-event-key="clientToDelete?.name"
                        @click="confirmDelete"
                    >
                        {{ $t('account.apiKeys.confirmDelete') }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <!-- Regenerate Keys Confirmation Modal -->
        <AlertDialog :open="showRegenerateModal" @update:open="showRegenerateModal = false">
            <AlertDialogContent class="mx-4 sm:mx-0">
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ $t('account.apiKeys.confirmRegenerate') }}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {{ $t('account.apiKeys.regenerateWarning') }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter class="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel class="w-full sm:w-auto">{{ $t('account.apiKeys.cancel') }}</AlertDialogCancel>
                    <AlertDialogAction
                        class="w-full sm:w-auto"
                        data-umami-event="Confirm regenerate API keys"
                        :data-umami-event-key="clientToRegenerate?.name"
                        @click="confirmRegenerate"
                    >
                        {{ $t('account.apiKeys.confirmRegenerate') }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
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

import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSessionStore } from '@/stores/session';
import { useToast } from 'vue-toastification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FormItem } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Plus,
    Edit,
    Eye,
    Trash2,
    RefreshCw,
    Search,
    AlertCircle,
    Key,
    Clock,
    Copy,
    AlertTriangle,
    Info,
    ExternalLink,
} from 'lucide-vue-next';
import axios from 'axios';

const { t: $t } = useI18n();
const sessionStore = useSessionStore();
const toast = useToast();

type ApiClient = {
    id: number;
    user_uuid: string;
    name: string;
    public_key?: string;
    private_key?: string;
    created_at: string;
    updated_at: string;
};

// State
const apiClients = ref<ApiClient[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref('');
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showViewModal = ref(false);
const showDeleteModal = ref(false);
const showRegenerateModal = ref(false);
const isSubmitting = ref(false);
const selectedClient = ref<ApiClient | null>(null);
const clientToDelete = ref<ApiClient | null>(null);
const clientToRegenerate = ref<ApiClient | null>(null);

// Form data
const formData = ref({
    name: '',
});

// Computed
const filteredApiClients = computed(() => {
    if (!searchQuery.value) return apiClients.value;

    const query = searchQuery.value.toLowerCase();
    return apiClients.value.filter((client) => {
        const nameMatch = client.name.toLowerCase().includes(query);
        const publicKeyMatch = (client.public_key?.toLowerCase?.() || '').includes(query);
        return nameMatch || publicKeyMatch;
    });
});

// Methods
async function fetchApiClients() {
    loading.value = true;
    error.value = null;

    try {
        await sessionStore.checkSessionOrRedirect();
        const { data } = await axios.get('/api/user/api-clients');

        if (data.success) {
            apiClients.value = data.data.api_clients || [];
        } else {
            throw new Error(data.message || 'Failed to fetch API clients');
        }
    } catch (err: unknown) {
        console.error('Error fetching API clients:', err);
        const errorMessage =
            err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : err instanceof Error
                  ? err.message
                  : 'Failed to fetch API clients';
        error.value = errorMessage || 'Failed to fetch API clients';
        apiClients.value = [];
    } finally {
        loading.value = false;
    }
}

async function handleSubmit() {
    try {
        isSubmitting.value = true;

        if (showEditModal.value && selectedClient.value) {
            // Update existing client
            const { data } = await axios.put(`/api/user/api-clients/${selectedClient.value.id}`, formData.value);
            if (data.success) {
                toast.success($t('account.apiKeys.keyUpdated'));
                await fetchApiClients();
                closeModals();
            } else {
                throw new Error(data.message || 'Failed to update API client');
            }
        } else {
            // Create new client
            const { data } = await axios.post('/api/user/api-clients', formData.value);
            if (data.success) {
                toast.success($t('account.apiKeys.keyCreated'));
                await fetchApiClients();
                closeModals();

                // Show the created client with keys
                selectedClient.value = data.data;
                showViewModal.value = true;
            } else {
                throw new Error(data.message || 'Failed to create API client');
            }
        }
    } catch (err: unknown) {
        console.error('Error saving API client:', err);
        const errorMessage =
            err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : err instanceof Error
                  ? err.message
                  : 'Failed to save API client';
        toast.error(errorMessage || 'Failed to save API client');
    } finally {
        isSubmitting.value = false;
    }
}

async function editClient(client: ApiClient) {
    try {
        await sessionStore.checkSessionOrRedirect();
        const { data } = await axios.get(`/api/user/api-clients/${client.id}`);
        if (data.success) {
            const fullClient: ApiClient = data.data;
            selectedClient.value = fullClient;
            formData.value = {
                name: fullClient.name,
            };
            showEditModal.value = true;
        } else {
            throw new Error(data.message || 'Failed to load API client');
        }
    } catch (err: unknown) {
        console.error('Error loading API client for edit:', err);
        const errorMessage =
            err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : err instanceof Error
                  ? err.message
                  : 'Failed to load API client';
        toast.error(errorMessage || 'Failed to load API client');
    }
}

async function viewClientDetails(client: ApiClient) {
    try {
        await sessionStore.checkSessionOrRedirect();
        const { data } = await axios.get(`/api/user/api-clients/${client.id}`);
        if (data.success) {
            selectedClient.value = data.data;
            showViewModal.value = true;
        } else {
            throw new Error(data.message || 'Failed to load API client');
        }
    } catch (err: unknown) {
        console.error('Error loading API client details:', err);
        const errorMessage =
            err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : err instanceof Error
                  ? err.message
                  : 'Failed to load API client';
        toast.error(errorMessage || 'Failed to load API client');
    }
}

function deleteClient(client: ApiClient) {
    clientToDelete.value = client;
    showDeleteModal.value = true;
}

async function confirmDelete() {
    if (!clientToDelete.value) return;

    try {
        const client = clientToDelete.value;
        const { data } = await axios.delete(`/api/user/api-clients/${client.id}`);

        if (data.success) {
            toast.success($t('account.apiKeys.keyDeleted'));
            await fetchApiClients();
        } else {
            throw new Error(data.message || 'Failed to delete API client');
        }
    } catch (err: unknown) {
        console.error('Error deleting API client:', err);
        const errorMessage =
            err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : err instanceof Error
                  ? err.message
                  : 'Failed to delete API client';
        toast.error(errorMessage || 'Failed to delete API client');
    } finally {
        showDeleteModal.value = false;
        clientToDelete.value = null;
    }
}

function regenerateKeys(client: ApiClient) {
    clientToRegenerate.value = client;
    showRegenerateModal.value = true;
}

async function confirmRegenerate() {
    if (!clientToRegenerate.value) return;

    try {
        const client = clientToRegenerate.value;
        const { data } = await axios.post(`/api/user/api-clients/${client.id}/regenerate`);

        if (data.success) {
            toast.success($t('account.apiKeys.keysRegenerated'));

            // Show the updated client with new keys
            selectedClient.value = data.data;
            showViewModal.value = true;

            await fetchApiClients();
        } else {
            throw new Error(data.message || 'Failed to regenerate API keys');
        }
    } catch (err: unknown) {
        console.error('Error regenerating API keys:', err);
        const errorMessage =
            err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : err instanceof Error
                  ? err.message
                  : 'Failed to regenerate API keys';
        toast.error(errorMessage || 'Failed to regenerate API keys');
    } finally {
        showRegenerateModal.value = false;
        clientToRegenerate.value = null;
    }
}

function closeModals() {
    showCreateModal.value = false;
    showEditModal.value = false;
    showViewModal.value = false;
    selectedClient.value = null;
    formData.value = {
        name: '',
    };
}

async function copyToClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        toast.success($t('account.apiKeys.keyCopied'));
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        toast.error($t('account.apiKeys.copyFailed'));
    }
}

function formatDate(dateString: string): string {
    if (!dateString) return '-';

    try {
        const date = new Date(dateString);
        return (
            date.toLocaleDateString() +
            ' ' +
            date.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            })
        );
    } catch {
        return dateString;
    }
}

function openApiDocumentation() {
    window.open('/docs.html', '_blank');
}

// Lifecycle
onMounted(fetchApiClients);
</script>
