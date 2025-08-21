<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold">{{ t('serverAllocations.title') }}</h1>
                    <p class="text-muted-foreground">{{ t('serverAllocations.description') }}</p>
                </div>
                <div class="flex gap-2">
                    <Button variant="outline" :disabled="loading" @click="refresh">
                        <RefreshCw class="h-4 w-4 mr-2" />
                        {{ t('serverAllocations.refresh') }}
                    </Button>
                    <Button :disabled="!serverInfo?.can_add_more || loading || autoAllocating" @click="autoAllocate">
                        <Zap class="h-4 w-4 mr-2" />
                        {{ t('serverAllocations.autoAllocate') }}
                    </Button>
                </div>
            </div>

            <!-- Allocation Status -->
            <div v-if="serverInfo" class="bg-card border rounded-lg p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="font-medium">{{ t('serverAllocations.allocationStatus') }}</h3>
                        <p class="text-sm text-muted-foreground">
                            {{
                                t('serverAllocations.allocationStatusDescription', {
                                    current: serverInfo.current_allocations,
                                    limit: serverInfo.allocation_limit,
                                })
                            }}
                        </p>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-primary">
                            {{ serverInfo.current_allocations }}/{{ serverInfo.allocation_limit }}
                        </div>
                        <div class="text-sm text-muted-foreground">
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
                            <div class="text-sm text-blue-800">
                                <p class="font-medium mb-1">{{ t('serverAllocations.allocationManagement') }}:</p>
                                <ul class="space-y-1 text-xs">
                                    <li>
                                        • <strong>{{ t('serverAllocations.autoAllocate') }}:</strong>
                                        {{ t('serverAllocations.autoAllocateDescription') }}
                                    </li>
                                    <li>
                                        • <strong>{{ t('serverAllocations.setPrimary') }}:</strong>
                                        {{ t('serverAllocations.setPrimaryDescription') }}
                                    </li>
                                    <li>
                                        • <strong>{{ t('serverAllocations.delete') }}:</strong>
                                        {{ t('serverAllocations.deleteDescription') }}
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

                    <div v-else class="space-y-4">
                        <div
                            v-for="allocation in allocations"
                            :key="allocation.id"
                            class="flex items-center justify-between p-4 border rounded-lg"
                        >
                            <div class="flex-1">
                                <div class="flex items-center gap-4">
                                    <div class="flex items-center gap-2">
                                        <div class="w-3 h-3 rounded-full bg-green-500"></div>
                                        <span class="font-mono text-sm">{{ allocation.ip }}:{{ allocation.port }}</span>
                                    </div>
                                    <div v-if="allocation.ip_alias" class="text-sm text-muted-foreground">
                                        ({{ allocation.ip_alias }})
                                    </div>
                                </div>
                                <div class="mt-1 text-sm text-muted-foreground">
                                    <span v-if="allocation.notes">{{ allocation.notes }}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <Badge v-if="allocation.is_primary" variant="secondary">
                                    {{ t('serverAllocations.primary') }}
                                </Badge>
                                <Button
                                    v-if="!allocation.is_primary"
                                    variant="outline"
                                    size="sm"
                                    :disabled="settingPrimary === allocation.id"
                                    @click="setPrimaryAllocation(allocation.id)"
                                >
                                    <Star class="h-4 w-4" />
                                </Button>
                                <Button
                                    v-if="!allocation.is_primary"
                                    variant="outline"
                                    size="sm"
                                    :disabled="deletingAllocation === allocation.id"
                                    @click="deleteAllocation(allocation.id)"
                                >
                                    <Trash2 class="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Confirmation Dialog -->
        <Dialog v-model:open="showConfirmDialog">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{{ confirmDialog.title }}</DialogTitle>
                    <DialogDescription>
                        {{ confirmDialog.description }}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" :disabled="confirmLoading" @click="showConfirmDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button :variant="confirmDialog.variant" :disabled="confirmLoading" @click="onConfirmDialog">
                        <Loader2 v-if="confirmLoading" class="h-4 w-4 mr-2 animate-spin" />
                        {{ confirmDialog.confirmText }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </DashboardLayout>
</template>

<script setup lang="ts">
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
