<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <!-- Header -->
            <div class="space-y-4">
                <div>
                    <h1 class="text-xl sm:text-2xl font-bold">{{ t('serverAllocations.title') }}</h1>
                    <p class="text-sm sm:text-base text-muted-foreground">{{ t('serverAllocations.description') }}</p>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" :disabled="loading" class="flex-1 sm:flex-none" @click="refresh">
                        <RefreshCw class="h-4 w-4 sm:mr-2" />
                        <span class="hidden sm:inline">{{ t('serverAllocations.refresh') }}</span>
                    </Button>
                    <Button
                        :disabled="!serverInfo?.can_add_more || loading || autoAllocating"
                        class="flex-1 sm:flex-none"
                        @click="autoAllocate"
                    >
                        <Zap class="h-4 w-4 sm:mr-2" />
                        <span class="hidden sm:inline">{{ t('serverAllocations.autoAllocate') }}</span>
                    </Button>
                </div>
            </div>

            <!-- Allocation Status -->
            <div v-if="serverInfo" class="bg-card border rounded-lg p-3 sm:p-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h3 class="font-medium text-sm sm:text-base">{{ t('serverAllocations.allocationStatus') }}</h3>
                        <p class="text-xs sm:text-sm text-muted-foreground">
                            {{
                                t('serverAllocations.allocationStatusDescription', {
                                    current: serverInfo.current_allocations,
                                    limit: serverInfo.allocation_limit,
                                })
                            }}
                        </p>
                    </div>
                    <div class="text-center sm:text-right">
                        <div class="text-xl sm:text-2xl font-bold text-primary">
                            {{ serverInfo.current_allocations }}/{{ serverInfo.allocation_limit }}
                        </div>
                        <div class="text-xs sm:text-sm text-muted-foreground">
                            {{
                                serverInfo.can_add_more
                                    ? t('serverAllocations.canAddMore')
                                    : t('serverAllocations.limitReached')
                            }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Allocations Table -->
            <Card>
                <CardHeader>
                    <CardTitle>{{ t('serverAllocations.networkAllocations') }}</CardTitle>
                    <CardDescription>{{ t('serverAllocations.networkAllocationsDescription') }}</CardDescription>
                    <div class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div class="flex items-start gap-2">
                            <Info class="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div class="text-xs sm:text-sm text-blue-800">
                                <p class="font-medium mb-1">{{ t('serverAllocations.allocationManagement') }}:</p>
                                <ul class="space-y-1 text-xs">
                                    <li>
                                        • <strong>{{ t('serverAllocations.autoAllocate') }}:</strong>
                                        <span class="hidden sm:inline">{{
                                            t('serverAllocations.autoAllocateDescription')
                                        }}</span>
                                        <span class="sm:hidden">{{ t('serverAllocations.autoAllocateShort') }}</span>
                                    </li>
                                    <li>
                                        • <strong>{{ t('serverAllocations.setPrimary') }}:</strong>
                                        <span class="hidden sm:inline">{{
                                            t('serverAllocations.setPrimaryDescription')
                                        }}</span>
                                        <span class="sm:hidden">{{ t('serverAllocations.setPrimaryShort') }}</span>
                                    </li>
                                    <li>
                                        • <strong>{{ t('serverAllocations.delete') }}:</strong>
                                        <span class="hidden sm:inline">{{
                                            t('serverAllocations.deleteDescription')
                                        }}</span>
                                        <span class="sm:hidden">{{ t('serverAllocations.deleteShort') }}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div v-if="loading" class="flex items-center justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>

                    <div v-else-if="allocations.length === 0" class="text-center py-8">
                        <Network class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 class="text-lg font-medium mb-2">{{ t('serverAllocations.noAllocationsFound') }}</h3>
                        <p class="text-muted-foreground mb-4">
                            {{ t('serverAllocations.noAllocationsDescription') }}
                        </p>
                        <div class="flex gap-2 justify-center">
                            <Button v-if="serverInfo?.can_add_more" :disabled="autoAllocating" @click="autoAllocate">
                                <Zap class="h-4 w-4 mr-2" />
                                {{ t('serverAllocations.autoAllocate') }}
                            </Button>
                        </div>
                    </div>

                    <div v-else class="space-y-3">
                        <div
                            v-for="allocation in allocations"
                            :key="allocation.id"
                            class="flex items-center justify-between p-3 sm:p-4 border rounded-lg"
                        >
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 sm:gap-4">
                                    <div class="flex items-center gap-2 flex-shrink-0">
                                        <div class="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500"></div>
                                        <span class="font-mono text-xs sm:text-sm"
                                            >{{ allocation.ip }}:{{ allocation.port }}</span
                                        >
                                    </div>
                                    <div
                                        v-if="allocation.ip_alias"
                                        class="text-xs sm:text-sm text-muted-foreground truncate"
                                    >
                                        ({{ allocation.ip_alias }})
                                    </div>
                                </div>
                                <div class="mt-1 text-xs sm:text-sm text-muted-foreground truncate">
                                    <span v-if="allocation.notes">{{ allocation.notes }}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                <Badge v-if="allocation.is_primary" variant="secondary" class="text-xs">
                                    {{ t('serverAllocations.primary') }}
                                </Badge>
                                <Button
                                    v-if="!allocation.is_primary"
                                    variant="outline"
                                    size="sm"
                                    :disabled="settingPrimary === allocation.id"
                                    class="h-8 w-8 p-0"
                                    @click="setPrimaryAllocation(allocation.id)"
                                >
                                    <Star class="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                                <Button
                                    v-if="!allocation.is_primary"
                                    variant="outline"
                                    size="sm"
                                    :disabled="deletingAllocation === allocation.id"
                                    class="h-8 w-8 p-0"
                                    @click="deleteAllocation(allocation.id)"
                                >
                                    <Trash2 class="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Confirmation Dialog -->
        <Dialog v-model:open="showConfirmDialog">
            <DialogContent class="mx-4 sm:mx-0">
                <DialogHeader>
                    <DialogTitle>{{ confirmDialog.title }}</DialogTitle>
                    <DialogDescription>
                        {{ confirmDialog.description }}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter class="flex flex-col sm:flex-row gap-3">
                    <Button
                        variant="outline"
                        :disabled="confirmLoading"
                        class="w-full sm:w-auto"
                        @click="showConfirmDialog = false"
                    >
                        {{ t('common.cancel') }}
                    </Button>
                    <Button
                        :variant="confirmDialog.variant"
                        :disabled="confirmLoading"
                        class="w-full sm:w-auto"
                        @click="onConfirmDialog"
                    >
                        <Loader2 v-if="confirmLoading" class="h-4 w-4 mr-2 animate-spin" />
                        {{ confirmDialog.confirmText }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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

import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { RefreshCw, Network, Trash2, Star, Zap, Info, Loader2 } from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';

const route = useRoute();
const toast = useToast();
const { t } = useI18n();

// State
const loading = ref(false);
const deletingAllocation = ref<number | null>(null);
const settingPrimary = ref<number | null>(null);
const autoAllocating = ref(false);

// Confirm dialog state
const showConfirmDialog = ref(false);
const confirmDialog = ref({
    title: '' as string,
    description: '' as string,
    confirmText: '' as string,
    variant: 'default' as 'default' | 'destructive',
});
const confirmAction = ref<null | (() => Promise<void> | void)>(null);
const confirmLoading = ref(false);
const serverInfo = ref<{
    id: number;
    name: string;
    uuid: string;
    allocation_limit: number;
    current_allocations: number;
    can_add_more: boolean;
    primary_allocation_id?: number;
} | null>(null);
const allocations = ref<
    Array<{
        id: number;
        node_id: number;
        ip: string;
        port: number;
        ip_alias?: string;
        notes?: string;
        is_primary: boolean;
    }>
>([]);

// Computed
const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: serverInfo.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('common.allocations'), isCurrent: true, href: `/server/${route.params.uuidShort}/allocations` },
]);

// Methods
async function fetchAllocations() {
    try {
        loading.value = true;
        const { data } = await axios.get(`/api/user/servers/${route.params.uuidShort}/allocations`);

        if (!data.success) {
            toast.error(data.message || t('serverAllocations.failedToFetch'));
            return;
        }

        serverInfo.value = data.data.server;
        allocations.value = data.data.allocations;
    } catch (error) {
        toast.error(t('serverAllocations.failedToFetch'));
        console.error('Error fetching allocations:', error);
    } finally {
        loading.value = false;
    }
}

async function deleteAllocation(allocationId: number) {
    confirmDialog.value = {
        title: t('serverAllocations.confirmDeleteTitle'),
        description: t('serverAllocations.confirmDeleteDescription', { allocationId }),
        confirmText: t('serverAllocations.confirmDelete'),
        variant: 'destructive',
    };
    confirmAction.value = () => deleteAllocationConfirm(allocationId);
    showConfirmDialog.value = true;
}

async function deleteAllocationConfirm(allocationId: number) {
    try {
        confirmLoading.value = true;
        deletingAllocation.value = allocationId;
        const { data } = await axios.delete(`/api/user/servers/${route.params.uuidShort}/allocations/${allocationId}`);

        if (!data.success) {
            toast.error(data.message || t('serverAllocations.failedToDelete'));
            return;
        }

        toast.success(t('serverAllocations.allocationDeleted'));
        await fetchAllocations();
        showConfirmDialog.value = false;
    } catch (error) {
        toast.error(t('serverAllocations.failedToDelete'));
        console.error('Error deleting allocation:', error);
    } finally {
        deletingAllocation.value = null;
        confirmLoading.value = false;
    }
}

async function setPrimaryAllocation(allocationId: number) {
    confirmDialog.value = {
        title: t('serverAllocations.confirmSetPrimaryTitle'),
        description: t('serverAllocations.confirmSetPrimaryDescription'),
        confirmText: t('serverAllocations.confirmSetPrimary'),
        variant: 'default',
    };
    confirmAction.value = () => setPrimaryAllocationConfirm(allocationId);
    showConfirmDialog.value = true;
}

async function setPrimaryAllocationConfirm(allocationId: number) {
    try {
        confirmLoading.value = true;
        settingPrimary.value = allocationId;
        const { data } = await axios.post(
            `/api/user/servers/${route.params.uuidShort}/allocations/${allocationId}/primary`,
        );

        if (!data.success) {
            toast.error(data.message || t('serverAllocations.failedToSetPrimary'));
            return;
        }

        toast.success(t('serverAllocations.primaryUpdated'));
        await fetchAllocations();
        showConfirmDialog.value = false;
    } catch (error) {
        toast.error(t('serverAllocations.failedToSetPrimary'));
        console.error('Error setting primary allocation:', error);
    } finally {
        settingPrimary.value = null;
        confirmLoading.value = false;
    }
}

async function autoAllocate() {
    try {
        autoAllocating.value = true;
        const { data } = await axios.post(`/api/user/servers/${route.params.uuidShort}/allocations/auto`);

        if (!data.success) {
            toast.error(data.message || t('serverAllocations.failedToAutoAllocate'));
            return;
        }

        toast.success(data.message || t('serverAllocations.autoAllocationCompleted'));

        // Refresh data to show new allocations
        await fetchAllocations();
    } catch (error) {
        toast.error(t('serverAllocations.failedToAutoAllocate'));
        console.error('Error auto-allocating:', error);
    } finally {
        autoAllocating.value = false;
    }
}

function refresh() {
    fetchAllocations();
}

function onConfirmDialog() {
    if (!confirmAction.value) return;
    confirmLoading.value = true;
    confirmAction.value();
}

// Lifecycle
onMounted(() => {
    fetchAllocations();
});
</script>
