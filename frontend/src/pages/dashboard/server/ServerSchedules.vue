<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6 pb-8">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Header Section -->
            <div class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">{{ t('serverSchedules.title') }}</h1>
                        <p class="text-sm text-muted-foreground">{{ t('serverSchedules.description') }}</p>
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
                            <span>{{ t('serverSchedules.refresh') }}</span>
                        </Button>
                        <Button
                            v-if="canCreateSchedules"
                            size="sm"
                            class="flex items-center gap-2"
                            data-umami-event="Create schedule"
                            @click="openCreateScheduleDrawer"
                        >
                            <Plus class="h-4 w-4" />
                            <span>{{ t('serverSchedules.createSchedule') }}</span>
                        </Button>
                    </div>
                </div>
            </div>

            <!-- Plugin Widgets: After Header -->
            <WidgetRenderer v-if="widgetsAfterHeader.length > 0" :widgets="widgetsAfterHeader" />

            <!-- Loading State -->
            <div v-if="loading && schedules.length === 0" class="flex flex-col items-center justify-center py-16">
                <div class="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"></div>
                <span class="mt-4 text-muted-foreground">{{ t('common.loading') }}</span>
            </div>

            <!-- Empty State -->
            <div
                v-else-if="!loading && schedules.length === 0 && !searchQuery"
                class="flex flex-col items-center justify-center py-16 px-4"
            >
                <div class="text-center max-w-md space-y-6">
                    <div class="flex justify-center">
                        <div class="relative">
                            <div class="absolute inset-0 animate-ping opacity-20">
                                <div class="w-32 h-32 rounded-full bg-primary/20"></div>
                            </div>
                            <div class="relative p-8 rounded-full bg-linear-to-br from-primary/20 to-primary/5">
                                <Calendar class="h-16 w-16 text-primary" />
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h3 class="text-2xl sm:text-3xl font-bold text-foreground">
                            {{ t('serverSchedules.noSchedules') }}
                        </h3>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            {{ t('serverSchedules.noSchedulesDescription') }}
                        </p>
                    </div>
                    <Button
                        v-if="canCreateSchedules"
                        size="lg"
                        class="gap-2 shadow-lg"
                        @click="openCreateScheduleDrawer"
                    >
                        <Plus class="h-5 w-5" />
                        {{ t('serverSchedules.createSchedule') }}
                    </Button>
                </div>
            </div>

            <!-- Plugin Widgets: Before Schedules List -->
            <WidgetRenderer
                v-if="!loading && schedules.length > 0 && widgetsBeforeSchedules.length > 0"
                :widgets="widgetsBeforeSchedules"
            />

            <!-- Schedules List -->
            <Card v-if="!loading && schedules.length > 0" class="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Calendar class="h-5 w-5 text-primary" />
                        </div>
                        <div class="flex-1">
                            <CardTitle class="text-lg">{{ t('serverSchedules.schedules') }}</CardTitle>
                            <CardDescription class="text-sm">{{
                                t('serverSchedules.schedulesDescription')
                            }}</CardDescription>
                        </div>
                        <Badge variant="secondary" class="text-xs">
                            {{ schedules.length }} {{ schedules.length === 1 ? 'schedule' : 'schedules' }}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div class="space-y-3">
                        <div
                            v-for="schedule in schedules"
                            :key="schedule.id"
                            class="group relative rounded-lg border-2 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                        >
                            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div class="flex items-start gap-3 flex-1 min-w-0">
                                    <div
                                        class="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                                        :class="[
                                            schedule.is_processing
                                                ? 'bg-blue-500/10'
                                                : schedule.is_active
                                                  ? 'bg-green-500/10'
                                                  : 'bg-gray-500/10',
                                        ]"
                                    >
                                        <Calendar
                                            class="h-5 w-5"
                                            :class="[
                                                schedule.is_processing
                                                    ? 'text-blue-500'
                                                    : schedule.is_active
                                                      ? 'text-green-500'
                                                      : 'text-gray-500',
                                            ]"
                                        />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 mb-1">
                                            <h3 class="font-semibold text-sm truncate">{{ schedule.name }}</h3>
                                            <Badge :variant="getStatusVariant(schedule)" class="text-xs">
                                                {{ getStatusText(schedule) }}
                                            </Badge>
                                        </div>
                                        <div
                                            class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
                                        >
                                            <span class="flex items-center gap-1 font-mono">
                                                <Clock class="h-3 w-3" />
                                                {{ formatCronExpression(schedule) }}
                                            </span>
                                            <span v-if="schedule.next_run_at" class="flex items-center gap-1">
                                                <CalendarClock class="h-3 w-3" />
                                                {{ formatDate(schedule.next_run_at) }}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Action Buttons -->
                                <div
                                    v-if="canUpdateSchedules || canDeleteSchedules || canReadSchedules"
                                    class="flex flex-wrap items-center gap-2"
                                >
                                    <Button
                                        v-if="canUpdateSchedules"
                                        variant="outline"
                                        size="sm"
                                        class="flex items-center gap-2"
                                        data-umami-event="Edit schedule"
                                        :data-umami-event-schedule="schedule.name"
                                        @click="openEditScheduleDrawer(schedule)"
                                    >
                                        <Pencil class="h-3.5 w-3.5" />
                                        <span class="hidden sm:inline">{{ t('common.edit') }}</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        class="flex items-center gap-2"
                                        @click="navigateToTasks(schedule)"
                                    >
                                        <ListTodo class="h-3.5 w-3.5" />
                                        <span class="hidden sm:inline">{{ t('serverSchedules.tasks') }}</span>
                                    </Button>
                                    <Button
                                        v-if="canUpdateSchedules"
                                        :variant="schedule.is_active ? 'secondary' : 'default'"
                                        size="sm"
                                        class="flex items-center gap-2"
                                        data-umami-event="Toggle schedule"
                                        :data-umami-event-schedule="schedule.name"
                                        @click="toggleScheduleStatus(schedule)"
                                    >
                                        <Power class="h-3.5 w-3.5" />
                                        <span class="hidden sm:inline">{{
                                            schedule.is_active ? t('common.disable') : t('common.enable')
                                        }}</span>
                                    </Button>
                                    <Button
                                        v-if="canDeleteSchedules"
                                        variant="destructive"
                                        size="sm"
                                        class="flex items-center gap-2"
                                        data-umami-event="Delete schedule"
                                        :data-umami-event-schedule="schedule.name"
                                        @click="deleteSchedule(schedule)"
                                    >
                                        <Trash2 class="h-3.5 w-3.5" />
                                        <span class="hidden sm:inline">{{ t('common.delete') }}</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Plugin Widgets: After Schedules List -->
            <WidgetRenderer
                v-if="!loading && schedules.length > 0 && widgetsAfterSchedules.length > 0"
                :widgets="widgetsAfterSchedules"
            />

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
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
import { useServerPermissions } from '@/composables/useServerPermissions';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BadgeVariants } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Plus,
    Pencil,
    Power,
    Trash2,
    Loader2,
    ExternalLink,
    ListTodo,
    Calendar,
    RefreshCw,
    Clock,
    CalendarClock,
    AlertTriangle,
    Info,
} from 'lucide-vue-next';
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
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';

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

// Check server permissions
const { hasPermission: hasServerPermission, isLoading: permissionsLoading } = useServerPermissions();

// Permission checks
const canReadSchedules = computed(() => hasServerPermission('schedule.read'));
const canCreateSchedules = computed(() => hasServerPermission('schedule.create'));
const canUpdateSchedules = computed(() => hasServerPermission('schedule.update'));
const canDeleteSchedules = computed(() => hasServerPermission('schedule.delete'));

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

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('server-schedules');
const widgetsTopOfPage = computed(() => getWidgets('server-schedules', 'top-of-page'));
const widgetsAfterHeader = computed(() => getWidgets('server-schedules', 'after-header'));
const widgetsBeforeSchedules = computed(() => getWidgets('server-schedules', 'before-schedules-list'));
const widgetsAfterSchedules = computed(() => getWidgets('server-schedules', 'after-schedules-list'));
const widgetsBottomOfPage = computed(() => getWidgets('server-schedules', 'bottom-of-page'));

const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverSchedules.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/schedules` },
]);

onMounted(async () => {
    await fetchServer();

    // Wait for permission check to complete
    while (permissionsLoading.value) {
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Check if user has permission to read schedules
    if (!canReadSchedules.value) {
        toast.error(t('serverSchedules.noSchedulePermission'));
        await router.push(`/server/${route.params.uuidShort}`);
        return;
    }

    await fetchSchedules();

    // Fetch plugin widgets
    await fetchPluginWidgets();
});

function refresh() {
    fetchSchedules(pagination.value.current_page || 1);
}

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

function formatDate(value?: string | null) {
    if (!value) return t('common.never');
    return new Date(value).toLocaleString();
}

function formatCronExpression(schedule: ScheduleItem): string {
    return `${schedule.cron_minute} ${schedule.cron_hour} ${schedule.cron_day_of_month} ${schedule.cron_month} ${schedule.cron_day_of_week}`;
}

function getStatusVariant(schedule: ScheduleItem): BadgeVariants['variant'] {
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
