<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <!-- Header -->
            <div class="space-y-4">
                <div>
                    <h1 class="text-xl sm:text-2xl font-bold">{{ t('serverSubusers.title') }}</h1>
                    <p class="text-sm sm:text-base text-muted-foreground">{{ t('serverSubusers.description') }}</p>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" :disabled="loading" class="flex-1 sm:flex-none" @click="refresh">
                        <RefreshCw class="h-4 w-4 sm:mr-2" />
                        <span class="hidden sm:inline">{{ t('serverSubusers.refresh') }}</span>
                    </Button>
                    <Button :disabled="loading" class="flex-1 sm:flex-none" @click="openAddDialog">
                        <Plus class="h-4 w-4 sm:mr-2" />
                        <span class="hidden sm:inline">{{ t('serverSubusers.addSubuser') }}</span>
                    </Button>
                </div>
            </div>

            <!-- Subusers Table -->
            <Card>
                <CardHeader>
                    <CardTitle>{{ t('serverSubusers.subusers') }}</CardTitle>
                    <CardDescription>{{ t('serverSubusers.subusersDescription') }}</CardDescription>
                    <div class="mt-4 flex flex-col sm:flex-row gap-2">
                        <div class="relative w-full">
                            <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                v-model="searchQuery"
                                type="text"
                                :placeholder="t('serverSubusers.searchPlaceholder')"
                                class="w-full pl-8 pr-3 py-2 border rounded-md bg-background"
                                @keyup.enter="onRunSearch"
                            />
                        </div>
                        <Button variant="outline" :disabled="loading" class="w-full sm:w-auto" @click="onRunSearch">
                            {{ t('serverSubusers.search') }}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div v-if="loading" class="flex items-center justify-center py-8">
                        <Loader2 class="h-8 w-8 animate-spin" />
                    </div>

                    <div v-else-if="subusers.length === 0" class="flex flex-col items-center justify-center py-12">
                        <div class="text-center max-w-md space-y-6">
                            <div class="flex justify-center">
                                <div class="relative">
                                    <div class="absolute inset-0 animate-ping opacity-20">
                                        <div class="w-32 h-32 rounded-full bg-primary/20"></div>
                                    </div>
                                    <div
                                        class="relative p-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5"
                                    >
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

                    <div v-else class="space-y-3">
                        <div
                            v-for="sub in subusers"
                            :key="sub.id"
                            class="flex items-center justify-between p-3 sm:p-4 border rounded-lg"
                        >
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 sm:gap-3">
                                    <div
                                        class="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0"
                                    >
                                        <Users class="h-3 w-3 sm:h-4 sm:w-4" />
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <div class="font-medium text-sm sm:text-base truncate">
                                            {{ sub.username || sub.email }}
                                        </div>
                                        <div class="text-xs sm:text-sm text-muted-foreground truncate">
                                            {{ sub.email }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 flex-shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    :disabled="deletingId === sub.id"
                                    class="h-8 w-8 p-0"
                                    @click="confirmDelete(sub)"
                                >
                                    <Trash2 class="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                            </div>
                        </div>

                        <!-- Pagination -->
                        <div
                            v-if="pagination.total > pagination.per_page"
                            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2"
                        >
                            <div class="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                                {{ t('serverSubusers.showing') }} {{ pagination.from }}-{{ pagination.to }}
                                {{ t('serverSubusers.of') }}
                                {{ pagination.total }}
                            </div>
                            <div class="flex items-center justify-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    :disabled="pagination.current_page <= 1 || loading"
                                    class="flex-1 sm:flex-none"
                                    @click="goToPage(pagination.current_page - 1)"
                                >
                                    <span class="hidden sm:inline">{{ t('common.prev') }}</span>
                                    <span class="sm:hidden">‹</span>
                                </Button>
                                <div class="text-xs sm:text-sm px-2">
                                    {{ pagination.current_page }} / {{ pagination.last_page }}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    :disabled="pagination.current_page >= pagination.last_page || loading"
                                    class="flex-1 sm:flex-none"
                                    @click="goToPage(pagination.current_page + 1)"
                                >
                                    <span class="hidden sm:inline">{{ t('common.next') }}</span>
                                    <span class="sm:hidden">›</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Add Subuser Dialog -->
        <Dialog v-model:open="showAddDialog">
            <DialogContent class="mx-4 sm:mx-0">
                <DialogHeader>
                    <DialogTitle>{{ t('serverSubusers.addSubuser') }}</DialogTitle>
                    <DialogDescription>{{ t('serverSubusers.addSubuserDialogDescription') }}</DialogDescription>
                </DialogHeader>
                <div class="space-y-3">
                    <label class="block text-sm font-medium">{{ t('serverSubusers.emailLabel') }}</label>
                    <input
                        v-model="addEmail"
                        type="email"
                        :placeholder="t('serverSubusers.emailPlaceholder')"
                        class="w-full px-3 py-2 border rounded-md bg-background"
                        @keyup.enter="createSubuser"
                    />
                </div>
                <DialogFooter class="flex flex-col sm:flex-row gap-3">
                    <Button
                        variant="outline"
                        :disabled="addLoading"
                        class="w-full sm:w-auto"
                        @click="showAddDialog = false"
                    >
                        {{ t('common.cancel') }}
                    </Button>
                    <Button
                        :disabled="addLoading || !isValidEmail(addEmail)"
                        class="w-full sm:w-auto"
                        @click="createSubuser"
                    >
                        <Loader2 v-if="addLoading" class="h-4 w-4 mr-2 animate-spin" />
                        {{ t('serverSubusers.add') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

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
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { RefreshCw, Users, Plus, Trash2, Search, Loader2 } from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';

const route = useRoute();
const toast = useToast();
const { t } = useI18n();

// State
const loading = ref(false);
const deletingId = ref<number | null>(null);
const subusers = ref<Array<{ id: number; username?: string; email: string }>>([]);
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

// Computed
const serverBasic = ref<{ name?: string } | null>(null);
const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: serverBasic.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverSubusers.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/users` },
]);

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
        toast.error(t('serverSubusers.failedToCreate'));
        console.error('Error creating subuser:', error);
    } finally {
        addLoading.value = false;
    }
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
        toast.error(t('serverSubusers.failedToDelete'));
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

// Lifecycle
onMounted(() => {
    fetchServerBasic();
    fetchSubusers();
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
