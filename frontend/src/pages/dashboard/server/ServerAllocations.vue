<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6 pb-8">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Header Section -->
            <div class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
                            {{ t('serverAllocations.title') }}
                        </h1>
                        <p class="text-sm text-muted-foreground">{{ t('serverAllocations.description') }}</p>
                    </div>
                    <div class="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="loading"
                            class="flex items-center gap-2"
                            @click="refresh"
                        >
                            <RefreshCw :class="['h-4 w-4', loading && 'animate-spin']" />
                            <span>{{ t('serverAllocations.refresh') }}</span>
                        </Button>
                        <Button
                            v-if="canCreateAllocations"
                            size="sm"
                            :disabled="!serverInfo?.can_add_more || loading || autoAllocating"
                            class="flex items-center gap-2"
                            data-umami-event="Auto allocate"
                            @click="autoAllocate"
                        >
                            <Zap :class="['h-4 w-4', autoAllocating && 'animate-pulse']" />
                            <span>{{ t('serverAllocations.autoAllocate') }}</span>
                        </Button>
                    </div>
                </div>

                <!-- Allocation Status Banner -->
                <div
                    v-if="serverInfo"
                    class="flex items-start gap-3 p-4 rounded-lg border-2 transition-colors"
                    :class="[
                        serverInfo.can_add_more
                            ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                            : 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
                    ]"
                >
                    <div
                        class="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                        :class="[serverInfo.can_add_more ? 'bg-green-500/20' : 'bg-orange-500/20']"
                    >
                        <Network
                            class="h-5 w-5"
                            :class="[
                                serverInfo.can_add_more
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-orange-600 dark:text-orange-400',
                            ]"
                        />
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3
                            class="font-semibold mb-1"
                            :class="[
                                serverInfo.can_add_more
                                    ? 'text-green-800 dark:text-green-200'
                                    : 'text-orange-800 dark:text-orange-200',
                            ]"
                        >
                            {{ t('serverAllocations.allocationStatus') }}
                        </h3>
                        <p
                            class="text-sm"
                            :class="[
                                serverInfo.can_add_more
                                    ? 'text-green-700 dark:text-green-300'
                                    : 'text-orange-700 dark:text-orange-300',
                            ]"
                        >
                            {{
                                t('serverAllocations.allocationStatusDescription', {
                                    current: serverInfo.current_allocations,
                                    limit: serverInfo.allocation_limit,
                                })
                            }}
                        </p>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-2xl font-bold text-primary">
                            {{ serverInfo.current_allocations }}/{{ serverInfo.allocation_limit }}
                        </div>
                        <div class="text-xs text-muted-foreground">
                            {{
                                serverInfo.can_add_more
                                    ? t('serverAllocations.canAddMore')
                                    : t('serverAllocations.limitReached')
                            }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Plugin Widgets: After Status Banner -->
            <WidgetRenderer v-if="widgetsAfterStatusBanner.length > 0" :widgets="widgetsAfterStatusBanner" />

            <!-- Loading State -->
            <div v-if="loading && allocations.length === 0" class="flex flex-col items-center justify-center py-16">
                <div class="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"></div>
                <span class="mt-4 text-muted-foreground">{{ t('common.loading') }}</span>
            </div>

            <!-- Empty State -->
            <div
                v-else-if="!loading && allocations.length === 0"
                class="flex flex-col items-center justify-center py-16 px-4"
            >
                <div class="text-center max-w-md space-y-6">
                    <div class="flex justify-center">
                        <div class="relative">
                            <div class="absolute inset-0 animate-ping opacity-20">
                                <div class="w-32 h-32 rounded-full bg-primary/20"></div>
                            </div>
                            <div class="relative p-8 rounded-full bg-linear-to-br from-primary/20 to-primary/5">
                                <Network class="h-16 w-16 text-primary" />
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h3 class="text-2xl sm:text-3xl font-bold text-foreground">
                            {{ t('serverAllocations.noAllocationsFound') }}
                        </h3>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            {{ t('serverAllocations.noAllocationsDescription') }}
                        </p>
                    </div>
                    <Button
                        v-if="canCreateAllocations && serverInfo?.can_add_more"
                        size="lg"
                        class="gap-2 shadow-lg"
                        :disabled="autoAllocating"
                        @click="autoAllocate"
                    >
                        <Zap class="h-5 w-5" />
                        {{ t('serverAllocations.autoAllocate') }}
                    </Button>
                </div>
            </div>

            <!-- Plugin Widgets: Before Allocations List -->
            <WidgetRenderer
                v-if="!loading && allocations.length > 0 && widgetsBeforeAllocations.length > 0"
                :widgets="widgetsBeforeAllocations"
            />

            <!-- Allocations List -->
            <Card v-if="!loading && allocations.length > 0" class="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Network class="h-5 w-5 text-primary" />
                        </div>
                        <div class="flex-1">
                            <CardTitle class="text-lg">{{ t('serverAllocations.networkAllocations') }}</CardTitle>
                            <CardDescription class="text-sm">
                                {{ t('serverAllocations.networkAllocationsDescription') }}
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" class="text-xs">
                            {{ allocations.length }} {{ allocations.length === 1 ? 'allocation' : 'allocations' }}
                        </Badge>
                    </div>
                    <div
                        class="mt-4 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg"
                    >
                        <Info class="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                        <div class="text-xs text-blue-800 dark:text-blue-200">
                            <p class="font-medium mb-1">{{ t('serverAllocations.allocationManagement') }}:</p>
                            <ul class="space-y-1">
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
                </CardHeader>
                <CardContent>
                    <div class="space-y-3">
                        <div
                            v-for="allocation in allocations"
                            :key="allocation.id"
                            class="group relative rounded-lg border-2 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                        >
                            <div class="flex items-start justify-between gap-3">
                                <div class="flex items-start gap-3 flex-1 min-w-0">
                                    <div
                                        class="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0"
                                    >
                                        <Network class="h-5 w-5 text-green-500" />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 mb-1">
                                            <span class="font-mono font-semibold text-sm"
                                                >{{ allocation.ip }}:{{ allocation.port }}</span
                                            >
                                            <Badge v-if="allocation.is_primary" variant="default" class="text-xs">
                                                <Star class="h-3 w-3 mr-1" />
                                                {{ t('serverAllocations.primary') }}
                                            </Badge>
                                        </div>
                                        <div
                                            class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
                                        >
                                            <span v-if="allocation.ip_alias" class="flex items-center gap-1">
                                                <Info class="h-3 w-3" />
                                                {{ allocation.ip_alias }}
                                            </span>
                                            <span v-if="allocation.notes" class="truncate">
                                                {{ allocation.notes }}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Action Buttons -->
                                <div
                                    v-if="!allocation.is_primary && (canUpdateAllocations || canDeleteAllocations)"
                                    class="flex items-center gap-2 shrink-0"
                                >
                                    <Button
                                        v-if="canUpdateAllocations"
                                        variant="outline"
                                        size="sm"
                                        :disabled="settingPrimary === allocation.id || loading"
                                        class="flex items-center gap-2"
                                        data-umami-event="Set primary allocation"
                                        :data-umami-event-allocation="`${allocation.ip}:${allocation.port}`"
                                        @click="setPrimaryAllocation(allocation.id)"
                                    >
                                        <Star class="h-3.5 w-3.5" />
                                        <span class="hidden sm:inline">{{ t('serverAllocations.setPrimary') }}</span>
                                    </Button>
                                    <Button
                                        v-if="canDeleteAllocations"
                                        variant="destructive"
                                        size="sm"
                                        :disabled="deletingAllocation === allocation.id || loading"
                                        class="flex items-center gap-2"
                                        data-umami-event="Delete allocation"
                                        :data-umami-event-allocation="`${allocation.ip}:${allocation.port}`"
                                        @click="deleteAllocation(allocation.id)"
                                    >
                                        <Trash2 class="h-3.5 w-3.5" />
                                        <span class="hidden sm:inline">{{ t('serverAllocations.delete') }}</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Plugin Widgets: After Allocations List -->
            <WidgetRenderer
                v-if="!loading && allocations.length > 0 && widgetsAfterAllocations.length > 0"
                :widgets="widgetsAfterAllocations"
            />

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>

        <!-- Confirmation Dialog -->
        <Dialog v-model:open="showConfirmDialog">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle class="flex items-center gap-2">
                        <div
                            class="h-10 w-10 rounded-lg flex items-center justify-center"
                            :class="[confirmDialog.variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10']"
                        >
                            <AlertTriangle
                                v-if="confirmDialog.variant === 'destructive'"
                                class="h-5 w-5 text-destructive"
                            />
                            <Info v-else class="h-5 w-5 text-primary" />
                        </div>
                        <span>{{ confirmDialog.title }}</span>
                    </DialogTitle>
                    <DialogDescription class="text-sm">
                        {{ confirmDialog.description }}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter class="gap-2">
                    <Button variant="outline" size="sm" :disabled="confirmLoading" @click="showConfirmDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button
                        :variant="confirmDialog.variant"
                        size="sm"
                        :disabled="confirmLoading"
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
import { useRoute, useRouter } from 'vue-router';
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
import { RefreshCw, Network, Trash2, Star, Zap, Info, Loader2, AlertTriangle } from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { useServerPermissions } from '@/composables/useServerPermissions';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t } = useI18n();

// Check server permissions
const { hasPermission: hasServerPermission, isLoading: permissionsLoading } = useServerPermissions();

// Permission checks
const canViewAllocations = computed(() => hasServerPermission('allocation.read'));
const canCreateAllocations = computed(() => hasServerPermission('allocation.create'));
const canUpdateAllocations = computed(() => hasServerPermission('allocation.update'));
const canDeleteAllocations = computed(() => hasServerPermission('allocation.delete'));

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

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('server-allocations');
const widgetsTopOfPage = computed(() => getWidgets('server-allocations', 'top-of-page'));
const widgetsAfterStatusBanner = computed(() => getWidgets('server-allocations', 'after-status-banner'));
const widgetsBeforeAllocations = computed(() => getWidgets('server-allocations', 'before-allocations-list'));
const widgetsAfterAllocations = computed(() => getWidgets('server-allocations', 'after-allocations-list'));
const widgetsBottomOfPage = computed(() => getWidgets('server-allocations', 'bottom-of-page'));

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
onMounted(async () => {
    // Wait for permission check to complete
    while (permissionsLoading.value) {
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Check if user has permission to view allocations
    if (!canViewAllocations.value) {
        toast.error(t('serverAllocations.noAllocationPermission'));
        await router.push(`/server/${route.params.uuidShort}`);
        return;
    }

    fetchAllocations();

    // Fetch plugin widgets
    await fetchPluginWidgets();
});
</script>
