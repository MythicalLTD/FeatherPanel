<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex-1">
                <h3 class="text-lg font-semibold">{{ $t('account.sshKeys.title') }}</h3>
                <p class="text-sm text-muted-foreground">{{ $t('account.sshKeys.description') }}</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" class="w-full sm:w-auto" :disabled="loading" @click="fetchSshKeys">
                    <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
                    {{ $t('account.sshKeys.refresh') }}
                </Button>
                <Button class="w-full sm:w-auto" @click="showCreateModal = true">
                    <Plus class="h-4 w-4 mr-2" />
                    {{ $t('account.sshKeys.addKey') }}
                </Button>
            </div>
        </div>

        <!-- Search and Stats -->
        <div class="space-y-3">
            <div class="relative">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input v-model="searchQuery" :placeholder="$t('account.sshKeys.searchPlaceholder')" class="pl-10" />
            </div>
            <div class="text-sm text-muted-foreground text-center">
                {{ $t('account.sshKeys.totalKeys', { count: filteredSshKeys.length }) }}
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="text-center">
                <RefreshCw class="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p class="text-muted-foreground">{{ $t('account.sshKeys.loading') }}</p>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="flex items-center justify-center py-12">
            <div class="text-center">
                <AlertCircle class="h-8 w-8 mx-auto mb-2 text-destructive" />
                <p class="text-destructive mb-2">{{ $t('account.sshKeys.loadError') }}</p>
                <Button variant="outline" @click="fetchSshKeys">
                    {{ $t('account.sshKeys.tryAgain') }}
                </Button>
            </div>
        </div>

        <!-- SSH Keys List -->
        <div v-else-if="filteredSshKeys.length > 0" class="space-y-4">
            <div
                v-for="key in filteredSshKeys"
                :key="key.id"
                class="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
                <div class="space-y-3">
                    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div class="flex-1">
                            <h4 class="font-medium text-foreground mb-1">{{ key.name }}</h4>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    class="h-8 px-3 text-xs"
                                    @click="viewKeyDetails(key)"
                                >
                                    <Eye class="h-3 w-3 mr-1" />
                                    {{ $t('account.sshKeys.viewDetails') }}
                                </Button>
                                <Button variant="outline" size="sm" class="h-8 px-3 text-xs" @click="editKey(key)">
                                    <Edit class="h-3 w-3 mr-1" />
                                    {{ $t('account.sshKeys.edit') }}
                                </Button>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <Badge :variant="getStatusVariant(key.deleted_at)" class="text-xs">
                                {{
                                    key.deleted_at
                                        ? $t('account.sshKeys.statuses.deleted')
                                        : $t('account.sshKeys.statuses.active')
                                }}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div
                    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground"
                >
                    <div class="flex items-center gap-1">
                        <Clock class="h-3 w-3" />
                        <span>{{ formatDate(key.created_at) }}</span>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <Button
                            v-if="key.deleted_at"
                            variant="outline"
                            size="sm"
                            class="h-8 px-3 text-xs w-full sm:w-auto"
                            @click="restoreKey(key)"
                        >
                            <RotateCcw class="h-3 w-3 mr-1" />
                            {{ $t('account.sshKeys.restore') }}
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            class="h-8 px-3 text-xs w-full sm:w-auto"
                            @click="deleteKey(key)"
                        >
                            <Trash2 class="h-3 w-3 mr-1" />
                            {{
                                key.deleted_at ? $t('account.sshKeys.permanentlyDelete') : $t('account.sshKeys.delete')
                            }}
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
                {{ searchQuery ? $t('account.sshKeys.noSearchResults') : $t('account.sshKeys.noKeys') }}
            </h3>
            <p class="text-xs text-muted-foreground">
                {{ searchQuery ? $t('account.sshKeys.tryDifferentSearch') : $t('account.sshKeys.noKeysDescription') }}
            </p>
            <Button class="mt-4" @click="showCreateModal = true">
                <Plus class="h-4 w-4 mr-2" />
                {{ $t('account.sshKeys.addFirstKey') }}
            </Button>
        </div>

        <!-- Create/Edit SSH Key Modal -->
        <Dialog :open="showCreateModal || showEditModal" @update:open="closeModals">
            <DialogContent class="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {{ showEditModal ? $t('account.sshKeys.editKey') : $t('account.sshKeys.addKey') }}
                    </DialogTitle>
                    <DialogDescription>
                        {{ $t('account.sshKeys.modalDescription') }}
                    </DialogDescription>
                </DialogHeader>

                <form class="space-y-4" @submit.prevent="handleSubmit">
                    <FormItem>
                        <Label for="keyName">{{ $t('account.sshKeys.keyName') }}</Label>
                        <Input
                            id="keyName"
                            v-model="formData.name"
                            :placeholder="$t('account.sshKeys.keyNamePlaceholder')"
                            required
                        />
                    </FormItem>

                    <FormItem>
                        <Label for="publicKey">{{ $t('account.sshKeys.publicKey') }}</Label>
                        <Textarea
                            id="publicKey"
                            v-model="formData.public_key"
                            class="font-mono text-sm"
                            rows="8"
                            required
                        />
                        <p class="text-xs text-muted-foreground mt-1">
                            {{ $t('account.sshKeys.publicKeyHint') }}
                        </p>
                    </FormItem>

                    <div class="flex gap-3 pt-4">
                        <Button type="submit" :disabled="isSubmitting" class="min-w-[120px]">
                            <span v-if="isSubmitting">{{ $t('account.sshKeys.saving') }}</span>
                            <span v-else>{{
                                showEditModal ? $t('account.sshKeys.updateKey') : $t('account.sshKeys.addKey')
                            }}</span>
                        </Button>
                        <Button type="button" variant="outline" :disabled="isSubmitting" @click="closeModals">
                            {{ $t('account.sshKeys.cancel') }}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>

        <!-- View Key Details Modal -->
        <Dialog :open="showViewModal" @update:open="showViewModal = false">
            <DialogContent class="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{{ selectedKey?.name }}</DialogTitle>
                    <DialogDescription>
                        {{ $t('account.sshKeys.keyDetails') }}
                    </DialogDescription>
                </DialogHeader>

                <div v-if="selectedKey" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="font-medium text-muted-foreground">{{ $t('account.sshKeys.keyName') }}:</span>
                            <p class="mt-1">{{ selectedKey.name }}</p>
                        </div>
                        <div>
                            <span class="font-medium text-muted-foreground"
                                >{{ $t('account.sshKeys.fingerprint') }}:</span
                            >
                            <p class="mt-1 font-mono text-xs break-all">{{ selectedKey.fingerprint }}</p>
                        </div>
                        <div>
                            <span class="font-medium text-muted-foreground"
                                >{{ $t('account.sshKeys.createdAt') }}:</span
                            >
                            <p class="mt-1">{{ formatDate(selectedKey.created_at) }}</p>
                        </div>
                        <div>
                            <span class="font-medium text-muted-foreground">{{ $t('account.sshKeys.status') }}:</span>
                            <Badge :variant="getStatusVariant(selectedKey.deleted_at)" class="mt-1">
                                {{
                                    selectedKey.deleted_at
                                        ? $t('account.sshKeys.statuses.deleted')
                                        : $t('account.sshKeys.statuses.active')
                                }}
                            </Badge>
                        </div>
                    </div>

                    <div>
                        <span class="font-medium text-muted-foreground">{{ $t('account.sshKeys.publicKey') }}:</span>
                        <div class="mt-2 p-3 bg-muted rounded-md">
                            <pre class="text-xs font-mono break-all whitespace-pre-wrap">{{
                                selectedKey.public_key
                            }}</pre>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        <!-- Delete Confirmation Modal -->
        <AlertDialog :open="showDeleteModal" @update:open="showDeleteModal = false">
            <AlertDialogContent class="bg-background text-foreground">
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ $t('account.sshKeys.confirmDelete') }}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {{ $t('account.sshKeys.deleteWarning') }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel as-child>
                        <Button variant="outline">{{ $t('account.sshKeys.cancel') }}</Button>
                    </AlertDialogCancel>
                    <AlertDialogAction as-child>
                        <Button variant="destructive" @click="confirmDelete">
                            {{ $t('account.sshKeys.confirmDelete') }}
                        </Button>
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
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Edit, Eye, Trash2, RotateCcw, RefreshCw, Search, AlertCircle, Key, Clock } from 'lucide-vue-next';
import axios from 'axios';

const { t: $t } = useI18n();
const sessionStore = useSessionStore();
const toast = useToast();

type SshKey = {
    id: number;
    user_id: number;
    name: string;
    public_key?: string;
    fingerprint?: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
};

// State
const sshKeys = ref<SshKey[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref('');
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showViewModal = ref(false);
const showDeleteModal = ref(false);
const isSubmitting = ref(false);
const selectedKey = ref<SshKey | null>(null);
const keyToDelete = ref<SshKey | null>(null);

// Form data
const formData = ref({
    name: '',
    public_key: '',
});

// Computed
const filteredSshKeys = computed(() => {
    if (!searchQuery.value) return sshKeys.value;

    const query = searchQuery.value.toLowerCase();
    return sshKeys.value.filter((key) => {
        const nameMatch = key.name.toLowerCase().includes(query);
        const fingerprintMatch = (key.fingerprint?.toLowerCase?.() || '').includes(query);
        return nameMatch || fingerprintMatch;
    });
});

// Methods
async function fetchSshKeys() {
    loading.value = true;
    error.value = null;

    try {
        await sessionStore.checkSessionOrRedirect();
        const { data } = await axios.get('/api/user/ssh-keys');

        if (data.success) {
            sshKeys.value = data.data.ssh_keys || [];
        } else {
            throw new Error(data.message || 'Failed to fetch SSH keys');
        }
    } catch (err: unknown) {
        console.error('Error fetching SSH keys:', err);
        const errorMessage =
            err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : err instanceof Error
                  ? err.message
                  : 'Failed to fetch SSH keys';
        error.value = errorMessage || 'Failed to fetch SSH keys';
        sshKeys.value = [];
    } finally {
        loading.value = false;
    }
}

async function handleSubmit() {
    try {
        isSubmitting.value = true;

        if (showEditModal.value && selectedKey.value) {
            // Update existing key
            const { data } = await axios.put(`/api/user/ssh-keys/${selectedKey.value.id}`, formData.value);
            if (data.success) {
                toast.success($t('account.sshKeys.keyUpdated'));
                await fetchSshKeys();
                closeModals();
            } else {
                throw new Error(data.message || 'Failed to update SSH key');
            }
        } else {
            // Create new key
            const { data } = await axios.post('/api/user/ssh-keys', formData.value);
            if (data.success) {
                toast.success($t('account.sshKeys.keyCreated'));
                await fetchSshKeys();
                closeModals();
            } else {
                throw new Error(data.message || 'Failed to create SSH key');
            }
        }
    } catch (err: unknown) {
        console.error('Error saving SSH key:', err);
        const errorMessage =
            err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : err instanceof Error
                  ? err.message
                  : 'Failed to save SSH key';
        toast.error(errorMessage || 'Failed to save SSH key');
    } finally {
        isSubmitting.value = false;
    }
}

async function editKey(key: SshKey) {
    try {
        await sessionStore.checkSessionOrRedirect();
        const { data } = await axios.get(`/api/user/ssh-keys/${key.id}`);
        if (data.success) {
            const fullKey: SshKey = data.data;
            selectedKey.value = fullKey;
            formData.value = {
                name: fullKey.name,
                public_key: fullKey.public_key || '',
            };
            showEditModal.value = true;
        } else {
            throw new Error(data.message || 'Failed to load SSH key');
        }
    } catch (err: unknown) {
        console.error('Error loading SSH key for edit:', err);
        const errorMessage =
            err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : err instanceof Error
                  ? err.message
                  : 'Failed to load SSH key';
        toast.error(errorMessage || 'Failed to load SSH key');
    }
}

async function viewKeyDetails(key: SshKey) {
    try {
        await sessionStore.checkSessionOrRedirect();
        const { data } = await axios.get(`/api/user/ssh-keys/${key.id}`);
        if (data.success) {
            selectedKey.value = data.data;
            showViewModal.value = true;
        } else {
            throw new Error(data.message || 'Failed to load SSH key');
        }
    } catch (err: unknown) {
        console.error('Error loading SSH key details:', err);
        const errorMessage =
            err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : err instanceof Error
                  ? err.message
                  : 'Failed to load SSH key';
        toast.error(errorMessage || 'Failed to load SSH key');
    }
}

function deleteKey(key: SshKey) {
    keyToDelete.value = key;
    showDeleteModal.value = true;
}

async function confirmDelete() {
    if (!keyToDelete.value) return;

    try {
        const key = keyToDelete.value;
        let endpoint = `/api/user/ssh-keys/${key.id}`;

        if (key.deleted_at) {
            // Permanently delete
            endpoint = `/api/user/ssh-keys/${key.id}/hard-delete`;
        }

        const { data } = await axios.delete(endpoint);

        if (data.success) {
            toast.success(
                key.deleted_at ? $t('account.sshKeys.keyPermanentlyDeleted') : $t('account.sshKeys.keyDeleted'),
            );
            await fetchSshKeys();
        } else {
            throw new Error(data.message || 'Failed to delete SSH key');
        }
    } catch (err: unknown) {
        console.error('Error deleting SSH key:', err);
        const errorMessage =
            err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : err instanceof Error
                  ? err.message
                  : 'Failed to delete SSH key';
        toast.error(errorMessage || 'Failed to delete SSH key');
    } finally {
        showDeleteModal.value = false;
        keyToDelete.value = null;
    }
}

async function restoreKey(key: SshKey) {
    try {
        const { data } = await axios.post(`/api/user/ssh-keys/${key.id}/restore`);

        if (data.success) {
            toast.success($t('account.sshKeys.keyRestored'));
            await fetchSshKeys();
        } else {
            throw new Error(data.message || 'Failed to restore SSH key');
        }
    } catch (err: unknown) {
        console.error('Error restoring SSH key:', err);
        const errorMessage =
            err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : err instanceof Error
                  ? err.message
                  : 'Failed to restore SSH key';
        toast.error(errorMessage || 'Failed to restore SSH key');
    }
}

function closeModals() {
    showCreateModal.value = false;
    showEditModal.value = false;
    showViewModal.value = false;
    selectedKey.value = null;
    formData.value = {
        name: '',
        public_key: '',
    };
}

function getStatusVariant(deletedAt: string | null): 'default' | 'secondary' | 'destructive' {
    return deletedAt ? 'destructive' : 'default';
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

// Lifecycle
onMounted(fetchSshKeys);
</script>
