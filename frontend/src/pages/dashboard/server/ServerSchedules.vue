<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <TableComponent
                :title="t('serverSchedules.title')"
                :description="t('serverSchedules.description')"
                :columns="tableColumns"
                :data="schedules"
                :search-placeholder="t('serverSchedules.searchPlaceholder')"
                :server-side-pagination="true"
                :total-records="pagination.total"
                :total-pages="pagination.last_page"
                :current-page="pagination.current_page"
                :has-next="pagination.current_page < pagination.last_page"
                :has-prev="pagination.current_page > 1"
                :from="pagination.from"
                :to="pagination.to"
                local-storage-key="featherpanel-server-schedules-columns"
                @search="handleSearch"
                @page-change="changePage"
                @column-toggle="handleColumnToggle"
            >
                <template #header-actions>
                    <Button @click="openCreateScheduleDrawer">
                        <Plus class="h-4 w-4 mr-2" />
                        {{ t('serverSchedules.createSchedule') }}
                    </Button>
                </template>

                <template #cell-name="{ item }">
                    <div class="font-medium">{{ (item as ScheduleItem).name }}</div>
                </template>

                <template #cell-cron="{ item }">
                    <div class="text-sm font-mono text-muted-foreground">
                        {{ formatCronExpression(item as ScheduleItem) }}
                    </div>
                </template>

                <template #cell-status="{ item }">
                    <Badge :variant="getStatusVariant(item as ScheduleItem)" class="capitalize">
                        {{ getStatusText(item as ScheduleItem) }}
                    </Badge>
                </template>

                <template #cell-next-run="{ item }">
                    <span class="text-sm">{{ formatDate((item as ScheduleItem).next_run_at) }}</span>
                </template>

                <template #cell-last-run="{ item }">
                    <span class="text-sm">{{ formatDate((item as ScheduleItem).last_run_at) }}</span>
                </template>

                <template #cell-actions="{ item }">
                    <div class="flex gap-2">
                        <Button size="sm" variant="outline" @click="openEditScheduleDrawer(item as ScheduleItem)">
                            <Pencil class="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" @click="navigateToTasks(item as ScheduleItem)">
                            <ListTodo class="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            :variant="(item as ScheduleItem).is_active ? 'secondary' : 'default'"
                            @click="toggleScheduleStatus(item as ScheduleItem)"
                        >
                            <Power class="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" @click="deleteSchedule(item as ScheduleItem)">
                            <Trash2 class="h-4 w-4" />
                        </Button>
                    </div>
                </template>
            </TableComponent>
        </div>

        <!-- Create Schedule Drawer -->
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
                    <DrawerTitle>{{ t('serverSchedules.createSchedule') }}</DrawerTitle>
                    <DrawerDescription>{{ t('serverSchedules.createScheduleDescription') }}</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-6 p-6" @submit.prevent="createSchedule">
                    <!-- Schedule Name -->
                    <div class="space-y-2">
                        <Label for="schedule-name" class="text-sm font-medium">
                            {{ t('serverSchedules.name') }}
                        </Label>
                        <Input
                            id="schedule-name"
                            v-model="createForm.name"
                            :placeholder="t('serverSchedules.namePlaceholder')"
                            required
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverSchedules.nameHelp') }}
                        </p>
                    </div>

                    <!-- Cron Expression Fields -->
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <h4 class="text-sm font-medium">{{ t('serverSchedules.cronExpression') }}</h4>
                            <a
                                href="https://cron.help/"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                                <ExternalLink class="h-3 w-3" />
                                {{ t('serverSchedules.cronHelper') }}
                            </a>
                        </div>

                        <div class="grid grid-cols-5 gap-4">
                            <div class="space-y-2">
                                <Label for="cron-minute" class="text-xs font-medium">
                                    {{ t('serverSchedules.minute') }}
                                </Label>
                                <Input
                                    id="cron-minute"
                                    v-model="createForm.cron_minute"
                                    :placeholder="'*/5'"
                                    class="font-mono text-sm"
                                />
                            </div>

                            <div class="space-y-2">
                                <Label for="cron-hour" class="text-xs font-medium">
                                    {{ t('serverSchedules.hour') }}
                                </Label>
                                <Input
                                    id="cron-hour"
                                    v-model="createForm.cron_hour"
                                    :placeholder="'*'"
                                    class="font-mono text-sm"
                                />
                            </div>

                            <div class="space-y-2">
                                <Label for="cron-day" class="text-xs font-medium">
                                    {{ t('serverSchedules.dayOfMonth') }}
                                </Label>
                                <Input
                                    id="cron-day"
                                    v-model="createForm.cron_day_of_month"
                                    :placeholder="'*'"
                                    class="font-mono text-sm"
                                />
                            </div>

                            <div class="space-y-2">
                                <Label for="cron-month" class="text-xs font-medium">
                                    {{ t('serverSchedules.month') }}
                                </Label>
                                <Input
                                    id="cron-month"
                                    v-model="createForm.cron_month"
                                    :placeholder="'*'"
                                    class="font-mono text-sm"
                                />
                            </div>

                            <div class="space-y-2">
                                <Label for="cron-weekday" class="text-xs font-medium">
                                    {{ t('serverSchedules.dayOfWeek') }}
                                </Label>
                                <Input
                                    id="cron-weekday"
                                    v-model="createForm.cron_day_of_week"
                                    :placeholder="'*'"
                                    class="font-mono text-sm"
                                />
                            </div>
                        </div>

                        <p class="text-xs text-muted-foreground">
                            {{ t('serverSchedules.cronHelp') }}
                        </p>
                    </div>

                    <!-- Options -->
                    <div class="space-y-4">
                        <div class="space-y-2">
                            <Label for="only-when-online" class="text-sm font-medium">
                                {{ t('serverSchedules.onlyWhenOnline') }}
                            </Label>
                            <Select v-model="createForm.only_when_online">
                                <SelectTrigger class="w-full">
                                    <SelectValue placeholder="Select option" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">No - Run regardless of server status</SelectItem>
                                    <SelectItem value="1">Yes - Only run when server is online</SelectItem>
                                </SelectContent>
                            </Select>
                            <p class="text-xs text-muted-foreground">
                                {{ t('serverSchedules.onlyWhenOnlineHelp') }}
                            </p>
                        </div>

                        <div class="space-y-2">
                            <Label for="schedule-enabled" class="text-sm font-medium">
                                {{ t('serverSchedules.scheduleEnabled') }}
                            </Label>
                            <Select v-model="createForm.is_active">
                                <SelectTrigger class="w-full">
                                    <SelectValue placeholder="Select option" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Enabled - Schedule will run automatically</SelectItem>
                                    <SelectItem value="0">Disabled - Schedule will not run</SelectItem>
                                </SelectContent>
                            </Select>
                            <p class="text-xs text-muted-foreground">
                                {{ t('serverSchedules.scheduleEnabledHelp') }}
                            </p>
                        </div>
                    </div>

                    <div class="flex justify-end space-x-2">
                        <Button type="button" variant="outline" @click="closeCreateDrawer">
                            {{ t('common.cancel') }}
                        </Button>
                        <Button type="submit" :disabled="creating">
                            <Loader2 v-if="creating" class="h-4 w-4 mr-2 animate-spin" />
                            {{ t('serverSchedules.create') }}
                        </Button>
                    </div>
                </form>
            </DrawerContent>
        </Drawer>

        <!-- Edit Schedule Drawer -->
        <Drawer
            class="w-full"
            :open="editDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeEditDrawer();
                }
            "
        >
            <DrawerContent v-if="editingSchedule">
                <DrawerHeader>
                    <DrawerTitle>{{ t('serverSchedules.editSchedule') }}</DrawerTitle>
                    <DrawerDescription>{{ t('serverSchedules.editScheduleDescription') }}</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-6 p-6" @submit.prevent="updateSchedule">
                    <!-- Schedule Name -->
                    <div class="space-y-2">
                        <Label for="edit-schedule-name" class="text-sm font-medium">
                            {{ t('serverSchedules.name') }}
                        </Label>
                        <Input
                            id="edit-schedule-name"
                            v-model="editForm.name"
                            :placeholder="t('serverSchedules.namePlaceholder')"
                            required
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverSchedules.nameHelp') }}
                        </p>
                    </div>

                    <!-- Cron Expression Fields -->
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <h4 class="text-sm font-medium">{{ t('serverSchedules.cronExpression') }}</h4>
                            <a
                                href="https://cron.help/"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                                <ExternalLink class="h-3 w-3" />
                                {{ t('serverSchedules.cronHelper') }}
                            </a>
                        </div>

                        <div class="grid grid-cols-5 gap-4">
                            <div class="space-y-2">
                                <Label for="edit-cron-minute" class="text-xs font-medium">
                                    {{ t('serverSchedules.minute') }}
                                </Label>
                                <Input
                                    id="edit-cron-minute"
                                    v-model="editForm.cron_minute"
                                    :placeholder="'*/5'"
                                    class="font-mono text-sm"
                                />
                            </div>

                            <div class="space-y-2">
                                <Label for="edit-cron-hour" class="text-xs font-medium">
                                    {{ t('serverSchedules.hour') }}
                                </Label>
                                <Input
                                    id="edit-cron-hour"
                                    v-model="editForm.cron_hour"
                                    :placeholder="'*'"
                                    class="font-mono text-sm"
                                />
                            </div>

                            <div class="space-y-2">
                                <Label for="edit-cron-day" class="text-xs font-medium">
                                    {{ t('serverSchedules.dayOfMonth') }}
                                </Label>
                                <Input
                                    id="edit-cron-day"
                                    v-model="editForm.cron_day_of_month"
                                    :placeholder="'*'"
                                    class="font-mono text-sm"
                                />
                            </div>

                            <div class="space-y-2">
                                <Label for="edit-cron-month" class="text-xs font-medium">
                                    {{ t('serverSchedules.month') }}
                                </Label>
                                <Input
                                    id="edit-cron-month"
                                    v-model="editForm.cron_month"
                                    :placeholder="'*'"
                                    class="font-mono text-sm"
                                />
                            </div>

                            <div class="space-y-2">
                                <Label for="edit-cron-weekday" class="text-xs font-medium">
                                    {{ t('serverSchedules.dayOfWeek') }}
                                </Label>
                                <Input
                                    id="edit-cron-weekday"
                                    v-model="editForm.cron_day_of_week"
                                    :placeholder="'*'"
                                    class="font-mono text-sm"
                                />
                            </div>
                        </div>

                        <p class="text-xs text-muted-foreground">
                            {{ t('serverSchedules.cronHelp') }}
                        </p>
                    </div>

                    <!-- Options -->
                    <div class="space-y-4">
                        <div class="space-y-2">
                            <Label for="edit-only-when-online" class="text-sm font-medium">
                                {{ t('serverSchedules.onlyWhenOnline') }}
                            </Label>
                            <Select v-model="editForm.only_when_online">
                                <SelectTrigger class="w-full">
                                    <SelectValue placeholder="Select option" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">No - Run regardless of server status</SelectItem>
                                    <SelectItem value="1">Yes - Only run when server is online</SelectItem>
                                </SelectContent>
                            </Select>
                            <p class="text-xs text-muted-foreground">
                                {{ t('serverSchedules.onlyWhenOnlineHelp') }}
                            </p>
                        </div>

                        <div class="space-y-2">
                            <Label for="edit-schedule-enabled" class="text-sm font-medium">
                                {{ t('serverSchedules.scheduleEnabled') }}
                            </Label>
                            <Select v-model="editForm.is_active">
                                <SelectTrigger class="w-full">
                                    <SelectValue placeholder="Select option" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Enabled - Schedule will run automatically</SelectItem>
                                    <SelectItem value="0">Disabled - Schedule will not run</SelectItem>
                                </SelectContent>
                            </Select>
                            <p class="text-xs text-muted-foreground">
                                {{ t('serverSchedules.scheduleEnabledHelp') }}
                            </p>
                        </div>
                    </div>

                    <div class="flex justify-end space-x-2">
                        <Button type="button" variant="outline" @click="closeEditDrawer">
                            {{ t('common.cancel') }}
                        </Button>
                        <Button type="submit" :disabled="updating">
                            <Loader2 v-if="updating" class="h-4 w-4 mr-2 animate-spin" />
                            {{ t('serverSchedules.update') }}
                        </Button>
                    </div>
                </form>
            </DrawerContent>
        </Drawer>

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
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Power, Trash2, Loader2, ExternalLink, ListTodo } from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import TableComponent from '@/kit/TableComponent.vue';
import type { TableColumn } from '@/kit/types';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type ScheduleItem = {
    id: number;
    server_id: number;
    name: string;
    cron_day_of_week: string;
    cron_month: string;
    cron_day_of_month: string;
    cron_hour: string;
    cron_minute: string;
    is_active: number;
    is_processing: number;
    only_when_online: number;
    last_run_at: string | null;
    next_run_at: string | null;
    created_at: string;
    updated_at: string;
};

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();

const schedules = ref<ScheduleItem[]>([]);
const loading = ref(false);
const creating = ref(false);
const updating = ref(false);
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
const editDrawerOpen = ref(false);
const editingSchedule = ref<ScheduleItem | null>(null);

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
    name: '',
    cron_minute: '*/5',
    cron_hour: '*',
    cron_day_of_month: '*',
    cron_month: '*',
    cron_day_of_week: '*',
    only_when_online: '0',
    is_active: '1',
});

const editForm = ref({
    name: '',
    cron_minute: '',
    cron_hour: '',
    cron_day_of_month: '',
    cron_month: '',
    cron_day_of_week: '',
    only_when_online: '0',
    is_active: '1',
});

const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverSchedules.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/schedules` },
]);

onMounted(async () => {
    await fetchServer();
    await fetchSchedules();
});

const tableColumns: TableColumn[] = [
    { key: 'name', label: t('serverSchedules.name'), searchable: true },
    { key: 'cron', label: t('serverSchedules.schedule') },
    { key: 'status', label: t('serverSchedules.status') },
    { key: 'next-run', label: t('serverSchedules.nextRun') },
    { key: 'last-run', label: t('serverSchedules.lastRun') },
    { key: 'actions', label: t('common.actions'), headerClass: 'w-[200px] font-semibold' },
];

async function fetchSchedules(page = pagination.value.current_page) {
    try {
        loading.value = true;
        const { data } = await axios.get(`/api/user/servers/${route.params.uuidShort}/schedules`, {
            params: { page, per_page: pagination.value.per_page, search: searchQuery.value || undefined },
        });
        if (!data.success) {
            toast.error(data.message || t('serverSchedules.failedToFetch'));
            return;
        }
        schedules.value = data.data.data || [];
        pagination.value = data.data.pagination;
    } catch {
        toast.error(t('serverSchedules.failedToFetch'));
    } finally {
        loading.value = false;
    }
}

async function fetchServer() {
    try {
        const { data } = await axios.get(`/api/user/servers/${route.params.uuidShort}`);
        if (data?.success && data?.data) {
            server.value = { name: data.data.name };
        }
    } catch {
        // non-blocking
    }
}

function changePage(page: number) {
    if (page < 1) return;
    fetchSchedules(page);
}

function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.current_page = 1;
    fetchSchedules(1);
}

function handleColumnToggle(columns: string[]) {
    console.log('Columns changed:', columns);
}

function formatDate(value?: string | null) {
    if (!value) return t('common.never');
    return new Date(value).toLocaleString();
}

function formatCronExpression(schedule: ScheduleItem): string {
    return `${schedule.cron_minute} ${schedule.cron_hour} ${schedule.cron_day_of_month} ${schedule.cron_month} ${schedule.cron_day_of_week}`;
}

function getStatusVariant(schedule: ScheduleItem): 'default' | 'secondary' | 'destructive' {
    if (schedule.is_processing) return 'secondary';
    if (schedule.is_active) return 'default';
    return 'destructive';
}

function getStatusText(schedule: ScheduleItem): string {
    if (schedule.is_processing) return t('serverSchedules.statusProcessing');
    if (schedule.is_active) return t('serverSchedules.statusActive');
    return t('serverSchedules.statusInactive');
}

// Create schedule
function openCreateScheduleDrawer() {
    createDrawerOpen.value = true;
    createForm.value = {
        name: '',
        cron_minute: '*/5',
        cron_hour: '*',
        cron_day_of_month: '*',
        cron_month: '*',
        cron_day_of_week: '*',
        only_when_online: '0',
        is_active: '1',
    };
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
}

async function createSchedule() {
    try {
        creating.value = true;
        const { data } = await axios.post(`/api/user/servers/${route.params.uuidShort}/schedules`, {
            ...createForm.value,
            only_when_online: Number(createForm.value.only_when_online),
            is_active: Number(createForm.value.is_active),
        });

        if (data.success) {
            toast.success(t('serverSchedules.createSuccess'));
            closeCreateDrawer();
            await fetchSchedules();
        } else {
            toast.error(data.message || t('serverSchedules.createFailed'));
        }
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        toast.error(axiosError.response?.data?.message || t('serverSchedules.createFailed'));
    } finally {
        creating.value = false;
    }
}

// Edit schedule
function openEditScheduleDrawer(schedule: ScheduleItem) {
    editingSchedule.value = schedule;
    editForm.value = {
        name: schedule.name,
        cron_minute: schedule.cron_minute,
        cron_hour: schedule.cron_hour,
        cron_day_of_month: schedule.cron_day_of_month,
        cron_month: schedule.cron_month,
        cron_day_of_week: schedule.cron_day_of_week,
        only_when_online: String(schedule.only_when_online),
        is_active: String(schedule.is_active),
    };
    editDrawerOpen.value = true;
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
    editingSchedule.value = null;
}

async function updateSchedule() {
    if (!editingSchedule.value) return;

    try {
        updating.value = true;
        const { data } = await axios.put(
            `/api/user/servers/${route.params.uuidShort}/schedules/${editingSchedule.value.id}`,
            {
                ...editForm.value,
                only_when_online: Number(editForm.value.only_when_online),
                is_active: Number(editForm.value.is_active),
            },
        );

        if (data.success) {
            toast.success(t('serverSchedules.updateSuccess'));
            closeEditDrawer();
            await fetchSchedules();
        } else {
            toast.error(data.message || t('serverSchedules.updateFailed'));
        }
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        toast.error(axiosError.response?.data?.message || t('serverSchedules.updateFailed'));
    } finally {
        updating.value = false;
    }
}

// Toggle schedule status
async function toggleScheduleStatus(schedule: ScheduleItem) {
    try {
        const { data } = await axios.post(
            `/api/user/servers/${route.params.uuidShort}/schedules/${schedule.id}/toggle`,
        );

        if (data.success) {
            toast.success(t('serverSchedules.toggleSuccess'));
            await fetchSchedules();
        } else {
            toast.error(data.message || t('serverSchedules.toggleFailed'));
        }
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        toast.error(axiosError.response?.data?.message || t('serverSchedules.toggleFailed'));
    }
}

// Delete schedule
function deleteSchedule(schedule: ScheduleItem) {
    confirmDialog.value = {
        title: t('serverSchedules.confirmDeleteTitle'),
        description: t('serverSchedules.confirmDeleteDescription', { scheduleName: schedule.name }),
        confirmText: t('serverSchedules.confirmDelete'),
        variant: 'destructive',
    };
    confirmAction.value = () => deleteScheduleConfirm(schedule.id);
    showConfirmDialog.value = true;
}

async function deleteScheduleConfirm(scheduleId: number) {
    try {
        confirmLoading.value = true;
        const { data } = await axios.delete(`/api/user/servers/${route.params.uuidShort}/schedules/${scheduleId}`);

        if (data.success) {
            toast.success(t('serverSchedules.deleteSuccess'));
            await fetchSchedules();
            showConfirmDialog.value = false;
        } else {
            toast.error(data.message || t('serverSchedules.deleteFailed'));
        }
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        toast.error(axiosError.response?.data?.message || t('serverSchedules.deleteFailed'));
    } finally {
        confirmLoading.value = false;
    }
}

// Navigate to tasks page
function navigateToTasks(schedule: ScheduleItem) {
    router.push(`/server/${route.params.uuidShort}/schedules/${schedule.id}/tasks`);
}

function onConfirmDialog() {
    if (!confirmAction.value) return;
    confirmLoading.value = true;
    confirmAction.value();
}
</script>
