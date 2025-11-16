<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6 pb-8">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Header Section -->
            <div class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">{{ t('serverSubusers.title') }}</h1>
                        <p class="text-sm text-muted-foreground">{{ t('serverSubusers.description') }}</p>
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
                            <span>{{ t('serverSubusers.refresh') }}</span>
                        </Button>
                        <Button
                            size="sm"
                            :disabled="loading"
                            class="flex items-center gap-2"
                            data-umami-event="Create subuser"
                            @click="openAddDialog"
                        >
                            <Plus class="h-4 w-4" />
                            <span>{{ t('serverSubusers.addSubuser') }}</span>
                        </Button>
                    </div>
                </div>
            </div>

            <!-- Plugin Widgets: After Header -->
            <WidgetRenderer v-if="widgetsAfterHeader.length > 0" :widgets="widgetsAfterHeader" />

            <!-- Loading State -->
            <div v-if="loading && subusers.length === 0" class="flex flex-col items-center justify-center py-16">
                <div class="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"></div>
                <span class="mt-4 text-muted-foreground">{{ t('common.loading') }}</span>
            </div>

            <!-- Empty State -->
            <div
                v-else-if="!loading && subusers.length === 0 && !searchQuery"
                class="flex flex-col items-center justify-center py-16 px-4"
            >
                <div class="text-center max-w-md space-y-6">
                    <div class="flex justify-center">
                        <div class="relative">
                            <div class="absolute inset-0 animate-ping opacity-20">
                                <div class="w-32 h-32 rounded-full bg-primary/20"></div>
                            </div>
                            <div class="relative p-8 rounded-full bg-linear-to-br from-primary/20 to-primary/5">
                                <Users class="h-16 w-16 text-primary" />
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h3 class="text-2xl sm:text-3xl font-bold text-foreground">
                            {{ t('serverSubusers.noSubusers') }}
                        </h3>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            {{ t('serverSubusers.noSubusersDescription') }}
                        </p>
                    </div>
                    <Button size="lg" class="gap-2 shadow-lg" :disabled="loading" @click="openAddDialog">
                        <Plus class="h-5 w-5" />
                        {{ t('serverSubusers.addSubuser') }}
                    </Button>
                </div>
            </div>

            <!-- Plugin Widgets: Before Subusers List -->
            <WidgetRenderer
                v-if="!loading && (subusers.length > 0 || searchQuery) && widgetsBeforeSubusersList.length > 0"
                :widgets="widgetsBeforeSubusersList"
            />

            <!-- Subusers List -->
            <Card
                v-if="!loading && (subusers.length > 0 || searchQuery)"
                class="border-2 hover:border-primary/50 transition-colors"
            >
                <CardHeader>
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users class="h-5 w-5 text-primary" />
                        </div>
                        <div class="flex-1">
                            <CardTitle class="text-lg">{{ t('serverSubusers.subusers') }}</CardTitle>
                            <CardDescription class="text-sm">{{
                                t('serverSubusers.subusersDescription')
                            }}</CardDescription>
                        </div>
                        <Badge variant="secondary" class="text-xs">
                            {{ subusers.length }} {{ subusers.length === 1 ? 'user' : 'users' }}
                        </Badge>
                    </div>
                    <div class="mt-4 flex gap-2">
                        <div class="relative flex-1">
                            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                v-model="searchQuery"
                                type="text"
                                :placeholder="t('serverSubusers.searchPlaceholder')"
                                class="w-full pl-9 pr-3 py-2 border-2 rounded-lg bg-background transition-colors focus:border-primary focus:outline-none"
                                @keyup.enter="onRunSearch"
                            />
                        </div>
                        <Button variant="outline" size="sm" :disabled="loading" @click="onRunSearch">
                            <Search class="h-4 w-4 sm:mr-2" />
                            <span class="hidden sm:inline">{{ t('serverSubusers.search') }}</span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <!-- Empty Search Result -->
                    <div v-if="!loading && subusers.length === 0 && searchQuery" class="text-center py-12">
                        <div class="flex justify-center mb-4">
                            <div class="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                                <Search class="h-8 w-8 text-muted-foreground" />
                            </div>
                        </div>
                        <h3 class="text-lg font-semibold mb-2">{{ t('serverSubusers.noResults') }}</h3>
                        <p class="text-sm text-muted-foreground mb-4">{{ t('serverSubusers.noResultsDescription') }}</p>
                        <Button
                            variant="outline"
                            size="sm"
                            @click="
                                searchQuery = '';
                                onRunSearch();
                            "
                        >
                            {{ t('serverSubusers.clearSearch') }}
                        </Button>
                    </div>

                    <!-- Subusers List -->
                    <div v-else class="space-y-3">
                        <div
                            v-for="sub in subusers"
                            :key="sub.id"
                            class="group relative rounded-lg border-2 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                        >
                            <div class="flex items-start justify-between gap-3">
                                <div class="flex items-start gap-3 flex-1 min-w-0">
                                    <div
                                        class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"
                                    >
                                        <Users class="h-5 w-5 text-primary" />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="font-semibold text-sm mb-1 truncate">
                                            {{ sub.username || sub.email }}
                                        </div>
                                        <div class="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Mail class="h-3 w-3" />
                                            <span class="truncate">{{ sub.email }}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Action Buttons -->
                                <div class="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        :disabled="loading"
                                        class="flex items-center gap-2"
                                        data-umami-event="Edit subuser permissions"
                                        @click="openPermissionsDialog(sub)"
                                    >
                                        <Shield class="h-3.5 w-3.5" />
                                        <span class="hidden sm:inline">{{ t('serverSubusers.permissions') }}</span>
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        :disabled="deletingId === sub.id || loading"
                                        class="flex items-center gap-2"
                                        data-umami-event="Delete subuser"
                                        :data-umami-event-subuser="sub.email"
                                        @click="confirmDelete(sub)"
                                    >
                                        <Trash2 class="h-3.5 w-3.5" />
                                        <span class="hidden sm:inline">{{ t('serverSubusers.delete') }}</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <!-- Pagination -->
                        <div
                            v-if="pagination.total > pagination.per_page"
                            class="flex items-center justify-between gap-3 pt-4 border-t"
                        >
                            <div class="text-xs text-muted-foreground">
                                {{ t('serverSubusers.showing') }} {{ pagination.from }}-{{ pagination.to }}
                                {{ t('serverSubusers.of') }}
                                {{ pagination.total }}
                            </div>
                            <div class="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    :disabled="pagination.current_page <= 1 || loading"
                                    @click="goToPage(pagination.current_page - 1)"
                                >
                                    <ChevronLeft class="h-4 w-4" />
                                </Button>
                                <div class="text-sm px-2">
                                    {{ pagination.current_page }} / {{ pagination.last_page }}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    :disabled="pagination.current_page >= pagination.last_page || loading"
                                    @click="goToPage(pagination.current_page + 1)"
                                >
                                    <ChevronRight class="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Plugin Widgets: After Subusers List -->
            <WidgetRenderer
                v-if="!loading && (subusers.length > 0 || searchQuery) && widgetsAfterSubusersList.length > 0"
                :widgets="widgetsAfterSubusersList"
            />

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>

        <!-- Add Subuser Dialog -->
        <Dialog v-model:open="showAddDialog">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle class="flex items-center gap-2">
                        <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Plus class="h-5 w-5 text-primary" />
                        </div>
                        <span>{{ t('serverSubusers.addSubuser') }}</span>
                    </DialogTitle>
                    <DialogDescription class="text-sm">
                        {{ t('serverSubusers.addSubuserDialogDescription') }}
                    </DialogDescription>
                </DialogHeader>
                <div class="space-y-3 py-4">
                    <div class="space-y-2">
                        <label class="text-sm font-medium">{{ t('serverSubusers.emailLabel') }}</label>
                        <div class="relative">
                            <Mail class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                v-model="addEmail"
                                type="email"
                                :placeholder="t('serverSubusers.emailPlaceholder')"
                                class="w-full pl-9 pr-3 py-2 border-2 rounded-lg bg-background transition-colors focus:border-primary focus:outline-none"
                                @keyup.enter="createSubuser"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter class="gap-2">
                    <Button variant="outline" size="sm" :disabled="addLoading" @click="showAddDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button size="sm" :disabled="addLoading || !isValidEmail(addEmail)" @click="createSubuser">
                        <Loader2 v-if="addLoading" class="h-4 w-4 mr-2 animate-spin" />
                        {{ t('serverSubusers.add') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

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

        <!-- Permissions Dialog -->
        <Dialog v-model:open="showPermissionsDialog">
            <DialogContent class="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle class="flex items-center gap-2">
                        <Shield class="h-5 w-5 text-primary" />
                        {{ t('serverSubusers.managePermissions') }}
                    </DialogTitle>
                    <DialogDescription class="text-sm">
                        {{ t('serverSubusers.managePermissionsDescription') }}
                    </DialogDescription>
                </DialogHeader>

                <div v-if="permissionsLoading" class="flex flex-col items-center justify-center py-12">
                    <Loader2 class="h-8 w-8 animate-spin text-primary" />
                    <p class="mt-4 text-sm text-muted-foreground">{{ t('common.loading') }}</p>
                </div>

                <div v-else class="space-y-4">
                    <div class="flex items-center justify-between px-4 py-2 bg-muted rounded-lg">
                        <div class="flex items-center gap-2">
                            <Mail class="h-4 w-4 text-muted-foreground" />
                            <span class="text-sm font-medium">{{ currentSubuser?.email }}</span>
                        </div>
                        <Button variant="outline" size="sm" @click="selectAllPermissions">
                            {{
                                allPermissionsSelected ? t('serverSubusers.deselectAll') : t('serverSubusers.selectAll')
                            }}
                        </Button>
                    </div>

                    <div class="max-h-96 overflow-y-auto border rounded-lg">
                        <div
                            v-for="(group, category) in groupedPermissions"
                            :key="category"
                            class="p-4 space-y-3 border-b last:border-b-0"
                        >
                            <div class="space-y-1">
                                <h4 class="font-semibold text-sm">
                                    {{ t(`serverSubusers.permissionCategories.${category}.name`) }}
                                </h4>
                                <p class="text-xs text-muted-foreground">
                                    {{ t(`serverSubusers.permissionCategories.${category}.description`) }}
                                </p>
                            </div>
                            <div class="space-y-1.5">
                                <label
                                    v-for="permission in group.permissions"
                                    :key="permission"
                                    class="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-all cursor-pointer group border border-transparent hover:border-border"
                                >
                                    <div class="relative mt-0.5 shrink-0">
                                        <input
                                            :id="`permission-${permission}`"
                                            type="checkbox"
                                            :checked="selectedPermissions.includes(permission)"
                                            class="peer sr-only"
                                            @change="togglePermission(permission)"
                                        />
                                        <div
                                            :class="[
                                                'h-4 w-4 rounded border-2 transition-all relative',
                                                selectedPermissions.includes(permission)
                                                    ? 'border-primary bg-primary'
                                                    : 'border-muted-foreground/40 hover:border-primary/60',
                                            ]"
                                        >
                                            <svg
                                                v-if="selectedPermissions.includes(permission)"
                                                class="absolute inset-0 h-full w-full text-white p-0.5"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="3"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    d="M5 13l4 4L19 7"
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="font-medium text-sm text-foreground">
                                            {{ getPermissionName(permission) }}
                                        </div>
                                        <div class="text-xs text-muted-foreground mt-1 leading-relaxed">
                                            {{ getPermissionDescription(permission) }}
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="text-xs text-muted-foreground flex items-center gap-2 px-4">
                        <CheckCircle2 class="h-4 w-4" />
                        {{ selectedPermissions.length }}
                        {{ t('serverSubusers.permissionsSelected', { count: selectedPermissions.length }) }}
                    </div>
                </div>

                <DialogFooter class="gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        :disabled="permissionsSaving"
                        @click="showPermissionsDialog = false"
                    >
                        {{ t('common.cancel') }}
                    </Button>
                    <Button size="sm" :disabled="permissionsSaving" @click="savePermissions">
                        <Loader2 v-if="permissionsSaving" class="h-4 w-4 mr-2 animate-spin" />
                        {{ t('common.saveChanges') }}
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

import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useServerPermissions } from '@/composables/useServerPermissions';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import {
    RefreshCw,
    Users,
    Plus,
    Trash2,
    Search,
    Loader2,
    Mail,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Info,
    Shield,
    CheckCircle2,
} from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t } = useI18n();

// Check server permissions
const { isOwner: isServerOwner, isLoading: permissionsLoadingCheck } = useServerPermissions();

// State
const loading = ref(true);
const deletingId = ref<number | null>(null);
const subusers = ref<Array<{ id: number; username?: string; email: string; permissions?: string[] }>>([]);
const pagination = ref<{
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
}>({
    current_page: 1,
    per_page: 20,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
});
const searchQuery = ref('');

// Add dialog state
const showAddDialog = ref(false);
const addEmail = ref('');
const addLoading = ref(false);

// Confirm dialog state
const showConfirmDialog = ref(false);
const confirmDialog = ref({
    title: '' as string,
    description: '' as string,
    confirmText: '' as string,
    variant: 'destructive' as 'default' | 'destructive',
});
const confirmAction = ref<null | (() => Promise<void> | void)>(null);
const confirmLoading = ref(false);

// Permissions dialog state
const showPermissionsDialog = ref(false);
const currentSubuser = ref<{ id: number; email: string; permissions?: string[] } | null>(null);
const availablePermissions = ref<string[]>([]);
const groupedPermissions = ref<Record<string, { permissions: string[] }>>({});
const selectedPermissions = ref<string[]>([]);
const permissionsLoading = ref(false);
const permissionsSaving = ref(false);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('server-subusers');
const widgetsTopOfPage = computed(() => getWidgets('server-subusers', 'top-of-page'));
const widgetsAfterHeader = computed(() => getWidgets('server-subusers', 'after-header'));
const widgetsBeforeSubusersList = computed(() => getWidgets('server-subusers', 'before-subusers-list'));
const widgetsAfterSubusersList = computed(() => getWidgets('server-subusers', 'after-subusers-list'));
const widgetsBottomOfPage = computed(() => getWidgets('server-subusers', 'bottom-of-page'));

// Computed
const serverBasic = ref<{ name?: string } | null>(null);
const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: serverBasic.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverSubusers.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/users` },
]);

const allPermissionsSelected = computed(() => {
    return (
        availablePermissions.value.length > 0 &&
        availablePermissions.value.every((p) => selectedPermissions.value.includes(p))
    );
});

// Methods
async function fetchSubusers(page = 1) {
    try {
        loading.value = true;
        const { data } = await axios.get(`/api/user/servers/${route.params.uuidShort}/subusers`, {
            params: {
                page,
                per_page: pagination.value.per_page,
                search: searchQuery.value || undefined,
            },
        });

        if (!data.success) {
            toast.error(data.message || t('serverSubusers.failedToFetch'));
            return;
        }

        subusers.value = data.data.data || [];
        if (data.data.pagination) {
            pagination.value = data.data.pagination;
        } else {
            pagination.value = {
                ...pagination.value,
                total: subusers.value.length,
                last_page: 1,
                from: subusers.value.length ? 1 : 0,
                to: subusers.value.length,
            };
        }
    } catch (error) {
        toast.error(t('serverSubusers.failedToFetch'));
        console.error('Error fetching subusers:', error);
    } finally {
        loading.value = false;
    }
}

function onRunSearch() {
    fetchSubusers(1);
}

function goToPage(page: number) {
    if (page < 1 || page > pagination.value.last_page) return;
    fetchSubusers(page);
}

function refresh() {
    fetchSubusers(pagination.value.current_page || 1);
}

function openAddDialog() {
    addEmail.value = '';
    showAddDialog.value = true;
}

function isValidEmail(email: string): boolean {
    return /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email);
}

async function createSubuser() {
    if (!isValidEmail(addEmail.value)) return;
    try {
        addLoading.value = true;
        const { data } = await axios.post(`/api/user/servers/${route.params.uuidShort}/subusers`, {
            email: addEmail.value.trim(),
        });
        if (!data.success) {
            toast.error(data.message || t('serverSubusers.failedToCreate'));
            return;
        }
        toast.success(data.message || t('serverSubusers.created'));
        showAddDialog.value = false;
        await fetchSubusers(1);
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        toast.error(errorMessage);
        console.error('Error creating subuser:', error);
    } finally {
        addLoading.value = false;
    }
}

function getErrorMessage(err: unknown, fallback?: string): string {
    if (typeof err === 'object' && err !== null) {
        const e = err as {
            response?: { data?: { message?: string; error_message?: string; error_code?: string } };
            message?: string;
        };

        // Return the error message from API response
        return (
            e.response?.data?.message || e.response?.data?.error_message || e.message || fallback || t('common.error')
        );
    }

    return fallback || t('common.error');
}

function confirmDelete(sub: { id: number; username?: string; email: string }) {
    confirmDialog.value = {
        title: t('serverSubusers.confirmDeleteTitle'),
        description: t('serverSubusers.confirmDeleteDescription', { email: sub.email }),
        confirmText: t('serverSubusers.confirmDelete'),
        variant: 'destructive',
    };
    confirmAction.value = () => deleteSubuser(sub.id);
    showConfirmDialog.value = true;
}

async function deleteSubuser(id: number) {
    try {
        confirmLoading.value = true;
        deletingId.value = id;
        const { data } = await axios.delete(`/api/user/servers/${route.params.uuidShort}/subusers/${id}`);
        if (!data.success) {
            toast.error(data.message || t('serverSubusers.failedToDelete'));
            return;
        }
        toast.success(t('serverSubusers.deleted'));
        await fetchSubusers(pagination.value.current_page || 1);
        showConfirmDialog.value = false;
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        toast.error(errorMessage);
        console.error('Error deleting subuser:', error);
    } finally {
        deletingId.value = null;
        confirmLoading.value = false;
    }
}

function onConfirmDialog() {
    if (!confirmAction.value) return;
    confirmLoading.value = true;
    confirmAction.value();
}

async function fetchServerBasic() {
    try {
        const { data } = await axios.get(`/api/user/servers/${route.params.uuidShort}`);
        if (data?.success && data?.data) {
            serverBasic.value = { name: data.data.name };
        }
    } catch {
        // non-blocking
    }
}

// Permissions management
async function openPermissionsDialog(sub: { id: number; email: string; permissions?: string[] }) {
    currentSubuser.value = sub;
    selectedPermissions.value = [];

    try {
        permissionsLoading.value = true;

        // Fetch available permissions from API
        const permissionsResponse = await axios.get(`/api/user/servers/${route.params.uuidShort}/subusers/permissions`);
        if (permissionsResponse.data.success) {
            availablePermissions.value = permissionsResponse.data.data?.permissions || [];
            groupedPermissions.value = permissionsResponse.data.data?.grouped_permissions || {};
        }

        // Parse current subuser permissions (now comes as array from backend)
        if (sub.permissions && Array.isArray(sub.permissions)) {
            selectedPermissions.value = sub.permissions;
        } else {
            // If permissions field doesn't exist or is not an array, start with empty
            selectedPermissions.value = [];
        }

        showPermissionsDialog.value = true;
    } catch (error) {
        toast.error(t('serverSubusers.failedToFetch'));
        console.error('Error fetching permissions:', error);
    } finally {
        permissionsLoading.value = false;
    }
}

function togglePermission(permission: string) {
    const index = selectedPermissions.value.indexOf(permission);
    if (index > -1) {
        selectedPermissions.value.splice(index, 1);
    } else {
        selectedPermissions.value.push(permission);
    }
}

function selectAllPermissions() {
    if (allPermissionsSelected.value) {
        selectedPermissions.value = [];
    } else {
        selectedPermissions.value = [...availablePermissions.value];
    }
}

function getPermissionName(permission: string): string {
    const parts = permission.split('.');
    if (parts.length < 2 || !parts[1]) return permission;

    const category = parts[0];
    // Convert kebab-case and snake_case to camelCase (e.g., "read-content" -> "readContent", "view_password" -> "viewPassword")
    let key = parts[1];
    key = key.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());

    const translationKey = `serverSubusers.permissionCategories.${category}.permissions.${key}.name`;
    const translated = t(translationKey);
    // If translation key doesn't exist, fallback to the permission itself
    return translated !== translationKey ? translated : permission;
}

function getPermissionDescription(permission: string): string {
    const parts = permission.split('.');
    if (parts.length < 2 || !parts[1]) return '';

    const category = parts[0];
    // Convert kebab-case and snake_case to camelCase (e.g., "read-content" -> "readContent", "view_password" -> "viewPassword")
    let key = parts[1];
    key = key.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());

    const translationKey = `serverSubusers.permissionCategories.${category}.permissions.${key}.description`;
    const translated = t(translationKey);
    // If translation key doesn't exist, fallback to empty string
    return translated !== translationKey ? translated : '';
}

async function savePermissions() {
    if (!currentSubuser.value) return;

    try {
        permissionsSaving.value = true;

        // Update permissions for the subuser (backend will encode to JSON)
        const { data } = await axios.patch(
            `/api/user/servers/${route.params.uuidShort}/subusers/${currentSubuser.value.id}`,
            {
                permissions: selectedPermissions.value,
            },
        );

        if (!data.success) {
            toast.error(data.message || t('serverSubusers.failedToUpdate'));
            return;
        }

        toast.success(t('serverSubusers.updateSuccess'));
        showPermissionsDialog.value = false;
        await fetchSubusers(pagination.value.current_page || 1);
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        toast.error(errorMessage);
        console.error('Error updating permissions:', error);
    } finally {
        permissionsSaving.value = false;
    }
}

// Lifecycle
onMounted(async () => {
    // Wait for permission check to complete
    while (permissionsLoadingCheck.value) {
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Check if user is the server owner
    if (!isServerOwner.value) {
        toast.error(t('serverSubusers.noSubuserManagementPermission'));
        await router.push(`/server/${route.params.uuidShort}`);
        return;
    }

    fetchServerBasic();
    fetchSubusers();

    // Fetch plugin widgets
    await fetchPluginWidgets();
});

// Optional: auto-search when query changes with small debounce
let searchDebounceHandle: number | null = null;
watch(
    () => searchQuery.value,
    () => {
        if (searchDebounceHandle) window.clearTimeout(searchDebounceHandle);
        searchDebounceHandle = window.setTimeout(() => fetchSubusers(1), 400);
    },
);
</script>

<style scoped></style>
