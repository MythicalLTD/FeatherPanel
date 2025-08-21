<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <!-- Header with back button and create task button -->
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <Button variant="outline" size="sm" @click="$router.back()">
                        <ArrowLeft class="h-4 w-4 mr-2" />
                        {{ t('common.back') }}
                    </Button>
                    <div>
                        <h1 class="text-2xl font-bold">{{ t('serverTasks.title') }}</h1>
                        <p class="text-muted-foreground">
                            {{ t('serverTasks.description', { scheduleName: schedule?.name || '' }) }}
                        </p>
                    </div>
                </div>
                <Button @click="openCreateTaskDrawer">
                    <Plus class="h-4 w-4 mr-2" />
                    {{ t('serverTasks.createTask') }}
                </Button>
            </div>

            <!-- Task List -->
            <div class="space-y-4">
                <div v-if="loading" class="flex justify-center py-8">
                    <Loader2 class="h-8 w-8 animate-spin" />
                </div>

                <div v-else-if="tasks.length === 0" class="text-center py-8">
                    <div class="text-muted-foreground">
                        <ListCheck class="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p class="text-lg font-medium">{{ t('serverTasks.noTasks') }}</p>
                        <p class="text-sm">{{ t('serverTasks.noTasksDescription') }}</p>
                    </div>
                </div>

                <div v-else class="space-y-3">
                    <div
                        v-for="task in sortedTasks"
                        :key="task.id"
                        class="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="flex items-center gap-2">
                                    <Badge variant="outline" class="text-xs">
                                        {{ task.sequence_id }}
                                    </Badge>
                                    <Badge :variant="getActionVariant(task.action)" class="capitalize">
                                        {{ task.action }}
                                    </Badge>
                                    <Badge v-if="task.is_queued" variant="secondary">
                                        {{ t('serverTasks.queued') }}
                                    </Badge>
                                </div>
                                <div class="text-sm text-muted-foreground">
                                    {{ task.payload || t('serverTasks.noPayload') }}
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <!-- Sequence Controls -->
                                <div class="flex items-center gap-1">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        :disabled="task.sequence_id <= 1"
                                        @click="moveTaskUp(task)"
                                    >
                                        <ChevronUp class="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        :disabled="task.sequence_id >= sortedTasks.length"
                                        @click="moveTaskDown(task)"
                                    >
                                        <ChevronDown class="h-3 w-3" />
                                    </Button>
                                </div>

                                <!-- Action Buttons -->
                                <Button size="sm" variant="outline" @click="openEditTaskDrawer(task)">
                                    <Pencil class="h-4 w-4" />
                                </Button>

                                <Button size="sm" variant="destructive" @click="deleteTask(task)">
                                    <Trash2 class="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <!-- Task Details -->
                        <div class="mt-3 text-xs text-muted-foreground space-y-1">
                            <div class="flex items-center gap-4">
                                <span v-if="task.time_offset > 0">
                                    {{ t('serverTasks.timeOffset', { offset: task.time_offset }) }}
                                </span>
                                <span v-if="task.continue_on_failure">
                                    {{ t('serverTasks.continueOnFailure') }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Create Task Drawer -->
        <Drawer
            class="w-full"
            :open="createDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeCreateTaskDrawer();
                }
            "
        >
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{{ t('serverTasks.createTask') }}</DrawerTitle>
                    <DrawerDescription>{{ t('serverTasks.createTaskDescription') }}</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-6 p-6" @submit.prevent="createTask">
                    <!-- Task Action -->
                    <div class="space-y-2">
                        <Label for="task-action" class="text-sm font-medium">
                            {{ t('serverTasks.action') }}
                        </Label>
                        <Select v-model="createForm.action" required>
                            <SelectTrigger class="w-full">
                                <SelectValue placeholder="Select action type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="power">{{ t('serverTasks.actionPower') }}</SelectItem>
                                <SelectItem value="backup">{{ t('serverTasks.actionBackup') }}</SelectItem>
                                <SelectItem value="command">{{ t('serverTasks.actionCommand') }}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverTasks.actionHelp') }}
                        </p>
                    </div>

                    <!-- Task Payload -->
                    <div class="space-y-2">
                        <Label for="task-payload" class="text-sm font-medium">
                            {{ t('serverTasks.payload') }}
                        </Label>

                        <!-- Power Action Dropdown -->
                        <div v-if="createForm.action === 'power'">
                            <Select v-model="createForm.payload" required>
                                <SelectTrigger class="w-full">
                                    <SelectValue placeholder="Select power action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="start">Start Server</SelectItem>
                                    <SelectItem value="stop">Stop Server</SelectItem>
                                    <SelectItem value="restart">Restart Server</SelectItem>
                                    <SelectItem value="kill">Kill Server</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <!-- Backup Ignored Files -->
                        <div v-else-if="createForm.action === 'backup'">
                            <Input
                                id="task-payload"
                                v-model="createForm.payload"
                                placeholder="*.log,temp/*,cache/* (optional ignored files)"
                            />
                        </div>

                        <!-- Command Input -->
                        <div v-else-if="createForm.action === 'command'">
                            <Input
                                id="task-payload"
                                v-model="createForm.payload"
                                placeholder="Enter command to execute"
                                required
                            />
                        </div>

                        <!-- Default Input -->
                        <div v-else>
                            <Input
                                id="task-payload"
                                v-model="createForm.payload"
                                :placeholder="getPayloadPlaceholder(createForm.action)"
                                required
                            />
                        </div>

                        <p class="text-xs text-muted-foreground">
                            {{ getPayloadHelp(createForm.action) }}
                        </p>
                    </div>

                    <!-- Time Offset -->
                    <div class="space-y-2">
                        <Label for="task-time-offset" class="text-sm font-medium">
                            {{ t('serverTasks.timeOffset') }}
                        </Label>
                        <Input
                            id="task-time-offset"
                            v-model="createForm.time_offset"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverTasks.timeOffsetHelp') }}
                        </p>
                    </div>

                    <!-- Continue on Failure -->
                    <div class="space-y-2">
                        <Label for="task-continue-on-failure" class="text-sm font-medium">
                            {{ t('serverTasks.continueOnFailure') }}
                        </Label>
                        <Select v-model="createForm.continue_on_failure">
                            <SelectTrigger class="w-full">
                                <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">{{ t('serverTasks.stopOnFailure') }}</SelectItem>
                                <SelectItem value="1">{{ t('serverTasks.continueOnFailure') }}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverTasks.continueOnFailureHelp') }}
                        </p>
                    </div>

                    <div class="flex justify-end space-x-2">
                        <Button type="button" variant="outline" @click="closeCreateTaskDrawer">
                            {{ t('common.cancel') }}
                        </Button>
                        <Button type="submit" :disabled="creating">
                            <Loader2 v-if="creating" class="h-4 w-4 mr-2 animate-spin" />
                            {{ t('serverTasks.create') }}
                        </Button>
                    </div>
                </form>
            </DrawerContent>
        </Drawer>

        <!-- Edit Task Drawer -->
        <Drawer
            class="w-full"
            :open="editDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeEditTaskDrawer();
                }
            "
        >
            <DrawerContent v-if="editingTask">
                <DrawerHeader>
                    <DrawerTitle>{{ t('serverTasks.editTask') }}</DrawerTitle>
                    <DrawerDescription>{{ t('serverTasks.editTaskDescription') }}</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-6 p-6" @submit.prevent="updateTask">
                    <!-- Task Action -->
                    <div class="space-y-2">
                        <Label for="edit-task-action" class="text-sm font-medium">
                            {{ t('serverTasks.action') }}
                        </Label>
                        <Select v-model="editForm.action" required>
                            <SelectTrigger class="w-full">
                                <SelectValue placeholder="Select action type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="power">{{ t('serverTasks.actionPower') }}</SelectItem>
                                <SelectItem value="backup">{{ t('serverTasks.actionBackup') }}</SelectItem>
                                <SelectItem value="command">{{ t('serverTasks.actionCommand') }}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <!-- Sequence ID -->
                    <div class="space-y-2">
                        <Label for="edit-task-sequence" class="text-sm font-medium">
                            {{ t('serverTasks.sequenceId') }}
                        </Label>
                        <Input
                            id="edit-task-sequence"
                            v-model="editForm.sequence_id"
                            type="number"
                            min="1"
                            :max="Math.max(sortedTasks.length, parseInt(editForm.sequence_id) || 1)"
                            step="1"
                            placeholder="1"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverTasks.sequenceIdHelp') }}
                        </p>
                    </div>

                    <!-- Task Payload -->
                    <div class="space-y-2">
                        <Label for="edit-task-payload" class="text-sm font-medium">
                            {{ t('serverTasks.payload') }}
                        </Label>

                        <!-- Power Action Dropdown -->
                        <div v-if="editForm.action === 'power'">
                            <Select v-model="editForm.payload" required>
                                <SelectTrigger class="w-full">
                                    <SelectValue placeholder="Select power action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="start">Start Server</SelectItem>
                                    <SelectItem value="stop">Stop Server</SelectItem>
                                    <SelectItem value="restart">Restart Server</SelectItem>
                                    <SelectItem value="kill">Kill Server</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <!-- Backup Ignored Files -->
                        <div v-else-if="editForm.action === 'backup'">
                            <Input
                                id="edit-task-payload"
                                v-model="editForm.payload"
                                placeholder="*.log,temp/*,cache/* (optional ignored files)"
                            />
                        </div>

                        <!-- Command Input -->
                        <div v-else-if="editForm.action === 'command'">
                            <Input
                                id="edit-task-payload"
                                v-model="editForm.payload"
                                placeholder="Enter command to execute"
                                required
                            />
                        </div>

                        <!-- Default Input -->
                        <div v-else>
                            <Input
                                id="edit-task-payload"
                                v-model="editForm.payload"
                                :placeholder="getPayloadPlaceholder(editForm.action)"
                                required
                            />
                        </div>

                        <p class="text-xs text-muted-foreground">
                            {{ getPayloadHelp(editForm.action) }}
                        </p>
                    </div>

                    <!-- Time Offset -->
                    <div class="space-y-2">
                        <Label for="edit-task-time-offset" class="text-sm font-medium">
                            {{ t('serverTasks.timeOffset') }}
                        </Label>
                        <Input
                            id="edit-task-time-offset"
                            v-model="editForm.time_offset"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                        />
                    </div>

                    <!-- Continue on Failure -->
                    <div class="space-y-2">
                        <Label for="edit-task-continue-on-failure" class="text-sm font-medium">
                            {{ t('serverTasks.continueOnFailure') }}
                        </Label>
                        <Select v-model="editForm.continue_on_failure">
                            <SelectTrigger class="w-full">
                                <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">{{ t('serverTasks.stopOnFailure') }}</SelectItem>
                                <SelectItem value="1">{{ t('serverTasks.continueOnFailure') }}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div class="flex justify-end space-x-2">
                        <Button type="button" variant="outline" @click="closeEditTaskDrawer">
                            {{ t('common.cancel') }}
                        </Button>
                        <Button type="submit" :disabled="updating">
                            <Loader2 v-if="updating" class="h-4 w-4 mr-2 animate-spin" />
                            {{ t('serverTasks.update') }}
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
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, ListCheck, ChevronUp, ChevronDown } from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type TaskItem = {
    id: number;
    schedule_id: number;
    sequence_id: number;
    action: string;
    payload: string;
    time_offset: number;
    is_queued: number;
    continue_on_failure: number;
    created_at: string;
    updated_at: string;
};

type ScheduleItem = {
    id: number;
    name: string;
    server_id: number;
};

const route = useRoute();
const { t } = useI18n();
const toast = useToast();

const tasks = ref<TaskItem[]>([]);
const schedule = ref<ScheduleItem | null>(null);
const loading = ref(false);
const creating = ref(false);
const updating = ref(false);

// Drawer states
const createDrawerOpen = ref(false);
const editDrawerOpen = ref(false);
const editingTask = ref<TaskItem | null>(null);

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
    action: '',
    payload: '',
    time_offset: '0',
    continue_on_failure: '0',
});

const editForm = ref({
    action: '',
    payload: '',
    time_offset: '0',
    continue_on_failure: '0',
    sequence_id: '1',
});

const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverSchedules.title'), href: `/server/${route.params.uuidShort}/schedules` },
    {
        text: t('serverTasks.title'),
        isCurrent: true,
        href: `/server/${route.params.uuidShort}/schedules/${route.params.scheduleId}/tasks`,
    },
]);

const sortedTasks = computed(() => {
    return [...tasks.value].sort((a, b) => a.sequence_id - b.sequence_id);
});

onMounted(async () => {
    await fetchSchedule();
    await fetchTasks();
});

async function fetchSchedule() {
    try {
        const { data } = await axios.get(
            `/api/user/servers/${route.params.uuidShort}/schedules/${route.params.scheduleId}`,
        );
        if (data.success) {
            schedule.value = data.data;
        }
    } catch (error) {
        console.error('Failed to fetch schedule:', error);
    }
}

async function fetchTasks() {
    try {
        loading.value = true;
        const { data } = await axios.get(
            `/api/user/servers/${route.params.uuidShort}/schedules/${route.params.scheduleId}/tasks`,
        );
        if (data.success) {
            tasks.value = data.data.data || [];
        } else {
            toast.error(data.message || t('serverTasks.failedToFetch'));
        }
    } catch {
        toast.error(t('serverTasks.failedToFetch'));
    } finally {
        loading.value = false;
    }
}

function getActionVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (action) {
        case 'power':
            return 'default';
        case 'backup':
            return 'secondary';
        case 'command':
            return 'outline';
        default:
            return 'outline';
    }
}

function getPayloadPlaceholder(action: string): string {
    switch (action) {
        case 'power':
            return 'Select power action from dropdown';
        case 'backup':
            return '*.log,temp/*,cache/* (optional ignored files)';
        case 'command':
            return 'Enter command to execute';
        default:
            return 'payload value';
    }
}

function getPayloadHelp(action: string): string {
    switch (action) {
        case 'power':
            return 'Select the power action to perform on the server';
        case 'backup':
            return 'Optional comma-separated file patterns to ignore during backup (e.g., *.log,temp/*,cache/*)';
        case 'command':
            return 'Command to execute on the server';
        default:
            return 'Additional data for the task';
    }
}

// Create task
function openCreateTaskDrawer() {
    createDrawerOpen.value = true;
    createForm.value = {
        action: '',
        payload: '',
        time_offset: '0',
        continue_on_failure: '0',
    };
}

function closeCreateTaskDrawer() {
    createDrawerOpen.value = false;
}

async function createTask() {
    try {
        creating.value = true;
        const { data } = await axios.post(
            `/api/user/servers/${route.params.uuidShort}/schedules/${route.params.scheduleId}/tasks`,
            {
                ...createForm.value,
                time_offset: Number(createForm.value.time_offset),
                continue_on_failure: Number(createForm.value.continue_on_failure),
            },
        );

        if (data.success) {
            toast.success(t('serverTasks.createSuccess'));
            closeCreateTaskDrawer();
            await fetchTasks();
        } else {
            toast.error(data.message || t('serverTasks.createFailed'));
        }
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        toast.error(axiosError.response?.data?.message || t('serverTasks.createFailed'));
    } finally {
        creating.value = false;
    }
}

// Edit task
function openEditTaskDrawer(task: TaskItem) {
    editingTask.value = task;
    editForm.value = {
        action: task.action,
        payload: task.payload,
        time_offset: String(task.time_offset),
        continue_on_failure: String(task.continue_on_failure),
        sequence_id: String(task.sequence_id),
    };
    editDrawerOpen.value = true;
}

function closeEditTaskDrawer() {
    editDrawerOpen.value = false;
    editingTask.value = null;
}

async function updateTask() {
    if (!editingTask.value) return;

    try {
        updating.value = true;
        const { data } = await axios.put(
            `/api/user/servers/${route.params.uuidShort}/schedules/${route.params.scheduleId}/tasks/${editingTask.value.id}`,
            {
                ...editForm.value,
                time_offset: Number(editForm.value.time_offset),
                continue_on_failure: Number(editForm.value.continue_on_failure),
            },
        );

        if (data.success) {
            toast.success(t('serverTasks.updateSuccess'));
            closeEditTaskDrawer();
            await fetchTasks();
        } else {
            toast.error(data.message || t('serverTasks.updateFailed'));
        }
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        toast.error(axiosError.response?.data?.message || t('serverTasks.updateFailed'));
    } finally {
        updating.value = false;
    }
}

// Delete task
function deleteTask(task: TaskItem) {
    confirmDialog.value = {
        title: t('serverTasks.confirmDeleteTitle'),
        description: t('serverTasks.confirmDeleteDescription', {
            action: task.action,
            payload: task.payload || t('serverTasks.noPayload'),
        }),
        confirmText: t('serverTasks.confirmDelete'),
        variant: 'destructive',
    };
    confirmAction.value = () => deleteTaskConfirm(task.id);
    showConfirmDialog.value = true;
}

async function deleteTaskConfirm(taskId: number) {
    try {
        confirmLoading.value = true;
        const { data } = await axios.delete(
            `/api/user/servers/${route.params.uuidShort}/schedules/${route.params.scheduleId}/tasks/${taskId}`,
        );

        if (data.success) {
            toast.success(t('serverTasks.deleteSuccess'));
            await fetchTasks();
            showConfirmDialog.value = false;
        } else {
            toast.error(data.message || t('serverTasks.deleteFailed'));
        }
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        toast.error(axiosError.response?.data?.message || t('serverTasks.deleteFailed'));
    } finally {
        confirmLoading.value = false;
    }
}

// Move task up in sequence
async function moveTaskUp(task: TaskItem) {
    if (task.sequence_id <= 1) return;

    try {
        const newSequenceId = task.sequence_id - 1;
        const { data } = await axios.put(
            `/api/user/servers/${route.params.uuidShort}/schedules/${route.params.scheduleId}/tasks/${task.id}/sequence`,
            { sequence_id: newSequenceId },
        );

        if (data.success) {
            toast.success(t('serverTasks.moveUpSuccess'));
            await fetchTasks();
        } else {
            toast.error(data.message || t('serverTasks.moveUpFailed'));
        }
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        toast.error(axiosError.response?.data?.message || t('serverTasks.moveUpFailed'));
    }
}

// Move task down in sequence
async function moveTaskDown(task: TaskItem) {
    if (task.sequence_id >= sortedTasks.value.length) return;

    try {
        const newSequenceId = task.sequence_id + 1;
        const { data } = await axios.put(
            `/api/user/servers/${route.params.uuidShort}/schedules/${route.params.scheduleId}/tasks/${task.id}/sequence`,
            { sequence_id: newSequenceId },
        );

        if (data.success) {
            toast.success(t('serverTasks.moveDownSuccess'));
            await fetchTasks();
        } else {
            toast.error(data.message || t('serverTasks.moveDownFailed'));
        }
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        toast.error(axiosError.response?.data?.message || t('serverTasks.moveDownFailed'));
    }
}

function onConfirmDialog() {
    if (!confirmAction.value) return;
    confirmAction.value();
}
</script>
