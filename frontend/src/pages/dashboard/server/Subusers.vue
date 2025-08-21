<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <TableComponent
                :title="t('serverSubusers.title')"
                :description="t('serverSubusers.description')"
                :columns="tableColumns"
                :data="subusers"
                :search-placeholder="t('serverSubusers.searchPlaceholder')"
                :server-side-pagination="true"
                :total-records="pagination.total"
                :total-pages="pagination.last_page"
                :current-page="pagination.current_page"
                :has-next="pagination.current_page < pagination.last_page"
                :has-prev="pagination.current_page > 1"
                :from="pagination.from"
                :to="pagination.to"
                local-storage-key="featherpanel-server-subusers-columns"
                @search="handleSearch"
                @page-change="changePage"
                @column-toggle="handleColumnToggle"
            >
                <template #header-actions>
                    <Button variant="outline" size="sm" :disabled="loading" @click="refresh">
                        <RefreshCw class="h-4 w-4 mr-2" />
                        {{ t('common.refresh') }}
                    </Button>
                    <Button @click="openCreateSubuserDrawer">
                        <Plus class="h-4 w-4 mr-2" />
                        {{ t('serverSubusers.addSubuser') }}
                    </Button>
                </template>

                <template #cell-username="{ item }">
                    <div class="font-medium">{{ (item as SubuserItem).username }}</div>
                </template>

                <template #cell-email="{ item }">
                    <div class="text-sm text-muted-foreground">{{ (item as SubuserItem).email }}</div>
                </template>

                <template #cell-permissions>
                    <Badge variant="default" class="text-xs">
                        {{ t('serverSubusers.fullAccess') }}
                    </Badge>
                </template>

                <template #cell-created="{ item }">
                    <span class="text-sm">{{ formatDate((item as SubuserItem).created_at) }}</span>
                </template>

                <template #cell-actions="{ item }">
                    <div class="flex gap-2">
                        <Button size="sm" variant="destructive" @click="deleteSubuser(item as SubuserItem)">
                            <Trash2 class="h-4 w-4" />
                        </Button>
                    </div>
                </template>
            </TableComponent>
        </div>

        <!-- Create Subuser Drawer -->
        <Drawer
            class="w-full"
            :open="createDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeCreateDrawer();
                }
            "
        >
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{{ t('serverSubusers.addSubuser') }}</DrawerTitle>
                    <DrawerDescription>{{ t('serverSubusers.addSubuserDescription') }}</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-6 p-6" @submit.prevent="createSubuser">
                    <!-- Email -->
                    <div class="space-y-2">
                        <Label for="subuser-email" class="text-sm font-medium">
                            {{ t('common.email') }}
                        </Label>
                        <Input
                            id="subuser-email"
                            v-model="createForm.email"
                            type="email"
                            :placeholder="t('common.emailPlaceholder')"
                            required
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverSubusers.emailHelp') }}
                        </p>
                    </div>

                    <!-- Permissions Info -->
                    <div class="space-y-2">
                        <Label class="text-sm font-medium">{{ t('serverSubusers.permissions') }}</Label>
                        <div class="p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div class="flex items-start gap-2">
                                <Info class="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div class="text-sm text-blue-800">
                                    <p class="font-medium mb-1">{{ t('serverSubusers.fullAccessGranted') }}:</p>
                                    <p class="text-xs">{{ t('serverSubusers.fullAccessDescription') }}</p>
                                </div>
                            </div>
                        </div>
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverSubusers.permissionsHelp') }}
                        </p>
                    </div>

                    <DrawerFooter>
                        <Button type="submit" :disabled="creating">
                            <Loader2 v-if="creating" class="h-4 w-4 mr-2 animate-spin" />
                            {{ t('serverSubusers.addSubuser') }}
                        </Button>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </Drawer>

        <!-- Confirmation Dialog -->
        <AlertDialog v-model:open="showConfirmDialog">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ confirmDialog.title }}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {{ confirmDialog.description }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{{ t('common.cancel') }}</AlertDialogCancel>
                    <AlertDialogAction
                        :class="
                            confirmDialog.variant === 'destructive'
                                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                : ''
                        "
                        @click="onConfirmDialog"
                    >
                        <Loader2 v-if="confirmLoading" class="h-4 w-4 mr-2 animate-spin" />
                        {{ confirmDialog.confirmText }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import TableComponent from '@/kit/TableComponent.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
} from '@/components/ui/drawer';
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
import { RefreshCw, Plus, Trash2, Loader2, Info } from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import type { TableColumn } from '@/kit/types';

type SubuserItem = {
    id: number;
    user_id: number;
    server_id: number;
    username: string;
    email: string;
    permissions: string[];
    created_at: string;
    updated_at: string;
};

const route = useRoute();
const { t } = useI18n();
const toast = useToast();

const subusers = ref<SubuserItem[]>([]);
const loading = ref(false);
const creating = ref(false);
const searchQuery = ref('');
const server = ref<{ name: string } | null>(null);
const pagination = ref({
    current_page: 1,
    per_page: 20,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
});

// Drawer states
const createDrawerOpen = ref(false);

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

// Form data
const createForm = ref({
    email: '',
});

// Computed
const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverSubusers.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/users` },
]);

const tableColumns: TableColumn[] = [
    { key: 'username', label: t('common.username'), searchable: true },
    { key: 'email', label: t('common.email'), searchable: true },
    { key: 'permissions', label: t('serverSubusers.permissions') },
    { key: 'created', label: t('serverSubusers.createdAt') },
    { key: 'actions', label: t('common.actions'), headerClass: 'w-[200px] font-semibold' },
];

// Lifecycle
onMounted(async () => {
    await fetchSubusers();
});

// Methods
async function fetchSubusers(page = pagination.value.current_page) {
    try {
        loading.value = true;
        const { data } = await axios.get(`/api/user/servers/${route.params.uuidShort}/subusers`, {
            params: { page, per_page: pagination.value.per_page, search: searchQuery.value || undefined },
        });
        if (!data.success) {
            toast.error(data.message || t('serverSubusers.failedToFetch'));
            return;
        }
        subusers.value = data.data.data || [];
        pagination.value = data.data.pagination;
    } catch {
        toast.error(t('serverSubusers.failedToFetch'));
    } finally {
        loading.value = false;
    }
}

function changePage(page: number) {
    if (page < 1) return;
    fetchSubusers(page);
}

function refresh() {
    fetchSubusers();
}

function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.current_page = 1;
    fetchSubusers(1);
}

function handleColumnToggle(columns: string[]) {
    console.log('Columns changed:', columns);
}

function formatDate(value?: string | null) {
    if (!value) return t('common.never');
    return new Date(value).toLocaleString();
}

// Create subuser
function openCreateSubuserDrawer() {
    createDrawerOpen.value = true;
    createForm.value = {
        email: '',
    };
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
}

async function createSubuser() {
    try {
        creating.value = true;
        const { data } = await axios.post(`/api/user/servers/${route.params.uuidShort}/subusers`, createForm.value);

        if (!data.success) {
            // Show the actual API error message
            toast.error(data.message || data.error_message || t('serverSubusers.createFailed'));
            return;
        }

        toast.success(t('serverSubusers.createSuccess'));
        closeCreateDrawer();
        await fetchSubusers();
    } catch (error: unknown) {
        // Handle axios errors and show the actual error message
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            if (axiosError.response?.data?.message) {
                toast.error(axiosError.response.data.message);
            } else if (axiosError.response?.data?.error_message) {
                toast.error(axiosError.response.data.error_message);
            } else {
                toast.error(t('serverSubusers.createFailed'));
            }
        } else {
            toast.error(t('serverSubusers.createFailed'));
        }
        console.error('Error creating subuser:', error);
    } finally {
        creating.value = false;
    }
}

// Delete subuser
function deleteSubuser(subuser: SubuserItem) {
    confirmDialog.value = {
        title: t('serverSubusers.confirmDeleteTitle'),
        description: t('serverSubusers.confirmDeleteDescription', { username: subuser.username }),
        confirmText: t('serverSubusers.confirmDelete'),
        variant: 'destructive',
    };
    confirmAction.value = () => deleteSubuserConfirm(subuser.id);
    showConfirmDialog.value = true;
}

async function deleteSubuserConfirm(subuserId: number) {
    try {
        confirmLoading.value = true;
        const { data } = await axios.delete(`/api/user/servers/${route.params.uuidShort}/subusers/${subuserId}`);

        if (!data.success) {
            toast.error(data.message || data.error_message || t('serverSubusers.deleteFailed'));
            return;
        }

        toast.success(t('serverSubusers.deleteSuccess'));
        showConfirmDialog.value = false;
        await fetchSubusers();
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            if (axiosError.response?.data?.message) {
                toast.error(axiosError.response.data.message);
            } else if (axiosError.response?.data?.error_message) {
                toast.error(axiosError.response.data.error_message);
            } else {
                toast.error(t('serverSubusers.deleteFailed'));
            }
        } else {
            toast.error(t('serverSubusers.deleteFailed'));
        }
        console.error('Error deleting subuser:', error);
    } finally {
        confirmLoading.value = false;
    }
}

function onConfirmDialog() {
    if (!confirmAction.value) return;
    confirmLoading.value = true;
    confirmAction.value();
}
</script>
