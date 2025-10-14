<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6 pb-8">
            <!-- Header Section -->
            <div class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
                            {{ t('serverActivities.title') }}
                        </h1>
                        <p class="text-sm text-muted-foreground">
                            {{ t('serverActivities.description') }}
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Badge variant="secondary" class="text-sm font-semibold px-3 py-1.5">
                            {{ pagination.total_records }} {{ t('serverActivities.events') }}
                        </Badge>
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="loading"
                            class="flex items-center gap-2"
                            @click="refresh"
                        >
                            <RefreshCw :class="['h-3.5 w-3.5', loading && 'animate-spin']" />
                            <span class="text-xs sm:text-sm">{{ t('common.refresh') }}</span>
                        </Button>
                    </div>
                </div>

                <!-- Search and Filters -->
                <Card class="border-2 hover:border-primary/50 transition-colors">
                    <CardContent class="p-4">
                        <div class="flex flex-col sm:flex-row gap-3">
                            <div class="flex-1 relative">
                                <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Search class="h-4 w-4 text-muted-foreground" />
                                </div>
                                <Input
                                    v-model="searchQuery"
                                    :placeholder="t('serverActivities.searchPlaceholder')"
                                    :disabled="loading"
                                    class="pl-10 h-9 text-sm"
                                    @input="debouncedSearch"
                                />
                            </div>
                            <div class="flex gap-2">
                                <Select v-model="selectedEventFilter" @update:model-value="handleFilterChange">
                                    <SelectTrigger class="w-full sm:w-48 h-9 text-sm">
                                        <SelectValue :placeholder="t('serverActivities.filterByEvent')" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{{ t('serverActivities.allEvents') }}</SelectItem>
                                        <SelectItem value="backup">{{ t('serverActivities.backupEvents') }}</SelectItem>
                                        <SelectItem value="power">{{ t('serverActivities.powerEvents') }}</SelectItem>
                                        <SelectItem value="file">{{ t('serverActivities.fileEvents') }}</SelectItem>
                                        <SelectItem value="database">{{
                                            t('serverActivities.databaseEvents')
                                        }}</SelectItem>
                                        <SelectItem value="schedule">{{
                                            t('serverActivities.scheduleEvents')
                                        }}</SelectItem>
                                        <SelectItem value="task">{{ t('serverActivities.taskEvents') }}</SelectItem>
                                        <SelectItem value="subuser">{{
                                            t('serverActivities.subuserEvents')
                                        }}</SelectItem>
                                        <SelectItem value="allocation">{{
                                            t('serverActivities.allocationEvents')
                                        }}</SelectItem>
                                        <SelectItem value="server">{{ t('serverActivities.serverEvents') }}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    class="h-9 flex items-center gap-2"
                                    @click="clearFilters"
                                >
                                    <X class="h-3.5 w-3.5" />
                                    <span class="hidden sm:inline text-xs sm:text-sm">{{ t('common.clear') }}</span>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-16">
                <div class="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"></div>
                <span class="mt-4 text-muted-foreground">{{ t('common.loading') }}</span>
            </div>

            <!-- Empty State -->
            <div v-else-if="activities.length === 0" class="flex flex-col items-center justify-center py-16">
                <div class="text-center max-w-md space-y-6">
                    <div class="flex justify-center">
                        <div class="relative">
                            <div class="absolute inset-0 animate-ping opacity-20">
                                <div class="w-32 h-32 rounded-full bg-primary/20"></div>
                            </div>
                            <div class="relative p-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                                <Activity class="h-16 w-16 text-primary" />
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h3 class="text-2xl sm:text-3xl font-bold text-foreground">
                            {{ t('serverActivities.noActivitiesYet') }}
                        </h3>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            {{
                                searchQuery || selectedEventFilter !== 'all'
                                    ? t('serverActivities.noActivitiesMatch')
                                    : t('serverActivities.activitiesWillAppear')
                            }}
                        </p>
                    </div>
                    <Button v-if="searchQuery || selectedEventFilter !== 'all'" variant="outline" @click="clearFilters">
                        <X class="h-4 w-4 mr-2" />
                        {{ t('serverActivities.clearFilters') }}
                    </Button>
                </div>
            </div>

            <!-- Activities List -->
            <div v-else class="space-y-4">
                <div v-for="activity in activities" :key="activity.id" class="group">
                    <Card class="border-2 hover:border-primary/50 transition-all duration-200">
                        <CardContent class="p-4">
                            <div class="flex items-start gap-4">
                                <!-- Event Icon -->
                                <div class="flex-shrink-0">
                                    <div
                                        class="w-12 h-12 rounded-lg flex items-center justify-center transition-colors"
                                        :class="getEventIconClass(activity.event)"
                                    >
                                        <component :is="getEventIcon(activity.event)" class="h-6 w-6" />
                                    </div>
                                </div>

                                <!-- Activity Content -->
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-start justify-between gap-4">
                                        <div class="min-w-0 flex-1">
                                            <div class="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 class="font-semibold text-base">
                                                    {{ formatEvent(activity.event) }}
                                                </h3>
                                                <Badge :variant="getEventBadgeVariant(activity.event)" class="text-xs">
                                                    {{ getEventCategory(activity.event) }}
                                                </Badge>
                                            </div>
                                            <p class="text-sm text-muted-foreground mb-2 line-clamp-2">
                                                {{ displayMessage(activity) }}
                                            </p>
                                            <div
                                                class="flex items-center gap-4 text-xs text-muted-foreground flex-wrap"
                                            >
                                                <!-- User Info -->
                                                <div v-if="activity.user" class="flex items-center gap-2">
                                                    <Avatar class="h-5 w-5">
                                                        <AvatarImage
                                                            v-if="activity.user.avatar"
                                                            :src="activity.user.avatar"
                                                            :alt="activity.user.username"
                                                        />
                                                        <AvatarFallback>
                                                            {{ activity.user.username[0]?.toUpperCase() }}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span class="font-medium">{{ activity.user.username }}</span>
                                                    <Badge
                                                        v-if="activity.user.role"
                                                        variant="outline"
                                                        class="text-xs px-1.5 py-0"
                                                    >
                                                        {{ activity.user.role }}
                                                    </Badge>
                                                </div>
                                                <div v-else class="flex items-center gap-1">
                                                    <Server class="h-3 w-3" />
                                                    <span class="italic">{{ t('serverActivities.systemEvent') }}</span>
                                                </div>
                                                <div class="flex items-center gap-1">
                                                    <Clock class="h-3 w-3" />
                                                    <span>{{
                                                        formatRelativeTime(activity.timestamp || activity.created_at)
                                                    }}</span>
                                                </div>
                                                <div class="flex items-center gap-1">
                                                    <Calendar class="h-3 w-3" />
                                                    <span>{{
                                                        formatDate(activity.timestamp || activity.created_at)
                                                    }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Action Button -->
                                        <div class="flex-shrink-0">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                class="opacity-0 group-hover:opacity-100 transition-opacity"
                                                @click="openDetails(activity)"
                                            >
                                                <Eye class="h-4 w-4 mr-2" />
                                                {{ t('common.view') || 'View' }}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Pagination -->
                <Card class="border-2">
                    <CardContent class="p-4">
                        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div class="text-sm text-muted-foreground">
                                {{
                                    t('serverActivities.showingEvents', {
                                        from: pagination.from,
                                        to: pagination.to,
                                        total: pagination.total_records,
                                    })
                                }}
                            </div>
                            <div class="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    class="h-9 flex items-center gap-1.5"
                                    :disabled="!pagination.has_prev || loading"
                                    @click="changePage(pagination.current_page - 1)"
                                >
                                    <ChevronLeft class="h-3.5 w-3.5" />
                                    <span class="text-xs sm:text-sm">{{ t('common.prev') }}</span>
                                </Button>

                                <div class="flex items-center gap-1">
                                    <Button
                                        v-for="page in getVisiblePages()"
                                        :key="page"
                                        :variant="page === pagination.current_page ? 'default' : 'outline'"
                                        size="sm"
                                        class="w-9 h-9 p-0 text-xs sm:text-sm"
                                        :disabled="typeof page === 'string'"
                                        @click="typeof page === 'number' && changePage(page)"
                                    >
                                        {{ page }}
                                    </Button>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    class="h-9 flex items-center gap-1.5"
                                    :disabled="!pagination.has_next || loading"
                                    @click="changePage(pagination.current_page + 1)"
                                >
                                    <span class="text-xs sm:text-sm">{{ t('common.next') }}</span>
                                    <ChevronRight class="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

        <!-- Enhanced Activity Details Dialog -->
        <Dialog v-model:open="detailsOpen">
            <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader class="pb-4">
                    <div class="flex items-center gap-3">
                        <div
                            class="w-12 h-12 rounded-lg flex items-center justify-center"
                            :class="selectedItem ? getEventIconClass(selectedItem.event) : ''"
                        >
                            <component
                                :is="selectedItem ? getEventIcon(selectedItem.event) : Activity"
                                class="h-6 w-6"
                            />
                        </div>
                        <div>
                            <DialogTitle class="text-xl">
                                {{
                                    selectedItem
                                        ? formatEvent(selectedItem.event)
                                        : t('serverActivities.activityDetails')
                                }}
                            </DialogTitle>
                            <DialogDescription class="mt-1">
                                {{ t('serverActivities.detailedInformation') }}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div class="space-y-6">
                    <!-- Event Information Card -->
                    <Card class="border-2">
                        <CardContent class="p-6">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div class="space-y-2">
                                    <div class="text-sm font-medium text-muted-foreground">
                                        {{ t('serverActivities.eventType') }}
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <Badge
                                            :variant="
                                                selectedItem ? getEventBadgeVariant(selectedItem.event) : 'outline'
                                            "
                                        >
                                            {{
                                                selectedItem
                                                    ? getEventCategory(selectedItem.event)
                                                    : t('serverActivities.unknown')
                                            }}
                                        </Badge>
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    <div class="text-sm font-medium text-muted-foreground">
                                        {{ t('serverActivities.timestamp') }}
                                    </div>
                                    <div class="font-medium">
                                        {{ formatDate(selectedItem?.timestamp || selectedItem?.created_at) }}
                                    </div>
                                    <div class="text-xs text-muted-foreground">
                                        {{ formatRelativeTime(selectedItem?.timestamp || selectedItem?.created_at) }}
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    <div class="text-sm font-medium text-muted-foreground">
                                        {{ t('serverActivities.eventId') }}
                                    </div>
                                    <div class="font-mono text-sm">{{ selectedItem?.id || t('common.nA') }}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- User Information Card -->
                    <Card v-if="selectedItem?.user" class="border-2">
                        <CardContent class="p-6">
                            <div class="space-y-4">
                                <div class="flex items-center gap-2">
                                    <Users class="h-4 w-4 text-muted-foreground" />
                                    <h3 class="text-lg font-semibold">{{ t('serverActivities.userInformation') }}</h3>
                                </div>
                                <div class="flex items-center gap-4">
                                    <Avatar class="h-12 w-12">
                                        <AvatarImage
                                            v-if="selectedItem.user.avatar"
                                            :src="selectedItem.user.avatar"
                                            :alt="selectedItem.user.username"
                                        />
                                        <AvatarFallback class="text-lg">
                                            {{ selectedItem.user.username[0]?.toUpperCase() }}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div class="flex-1">
                                        <div class="font-semibold text-base">{{ selectedItem.user.username }}</div>
                                        <div v-if="selectedItem.user.role" class="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" class="text-xs">
                                                {{ selectedItem.user.role }}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div v-if="selectedItem.ip" class="text-sm text-muted-foreground">
                                        <div class="text-xs font-medium mb-1">
                                            {{ t('serverActivities.ipAddress') }}
                                        </div>
                                        <code class="bg-muted px-2 py-1 rounded text-xs">{{ selectedItem.ip }}</code>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card v-else class="border-2">
                        <CardContent class="p-6">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                                    <Server class="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <div class="font-semibold">{{ t('serverActivities.systemEvent') }}</div>
                                    <div class="text-sm text-muted-foreground">
                                        {{ t('serverActivities.systemEventDescription') }}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Message Card -->
                    <Card v-if="baseMessage" class="border-2">
                        <CardContent class="p-6">
                            <div class="space-y-3">
                                <div class="flex items-center gap-2">
                                    <FileText class="h-4 w-4 text-muted-foreground" />
                                    <h3 class="text-lg font-semibold">{{ t('serverActivities.message') }}</h3>
                                </div>
                                <div class="bg-muted/30 rounded-lg p-4 border">
                                    <p class="text-sm font-medium break-words">{{ baseMessage }}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Metadata Card -->
                    <Card v-if="detailsPairs.length" class="border-2">
                        <CardContent class="p-6">
                            <div class="space-y-4">
                                <div class="flex items-center gap-2">
                                    <Settings class="h-4 w-4 text-muted-foreground" />
                                    <h3 class="text-lg font-semibold">{{ t('serverActivities.metadata') }}</h3>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div
                                        v-for="pair in detailsPairs"
                                        :key="pair.key"
                                        class="bg-muted/30 rounded-lg p-4 border"
                                    >
                                        <div
                                            class="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide"
                                        >
                                            {{ pair.key }}
                                        </div>
                                        <div class="font-mono text-sm break-words">{{ pair.value }}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Raw JSON Card -->
                    <Card v-if="rawJson" class="border-2">
                        <CardContent class="p-6">
                            <div class="space-y-4">
                                <div class="flex items-center gap-2">
                                    <Terminal class="h-4 w-4 text-muted-foreground" />
                                    <h3 class="text-lg font-semibold">{{ t('serverActivities.rawJson') }}</h3>
                                </div>
                                <div class="relative">
                                    <pre
                                        class="text-xs bg-muted/30 p-4 rounded-lg overflow-x-auto border font-mono"
                                    ><code>{{ rawJson }}</code></pre>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        class="absolute top-2 right-2"
                                        @click="copyToClipboard(rawJson)"
                                    >
                                        <Copy class="h-3 w-3 mr-1" />
                                        {{ t('common.copy') }}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <DialogFooter class="pt-6">
                    <Button variant="outline" @click="detailsOpen = false">
                        <X class="h-4 w-4 mr-2" />
                        {{ t('common.close') }}
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
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Activity,
    RefreshCw,
    Search,
    X,
    Eye,
    Clock,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Archive,
    Terminal,
    FileText,
    Server,
    Database,
    Users,
    Settings,
    Play,
    Pause,
    RotateCcw,
    Trash2,
    Lock,
    Unlock,
    Copy,
    CalendarClock,
    ListTodo,
    Network,
    Edit,
} from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type ActivityMetadata = {
    message?: string;
    command?: string;
    files?: string[];
    action?: string;
    exit_code?: number | string;
    backup_name?: string;
    backup_uuid?: string;
    adapter?: string;
    truncate_directory?: boolean;
    allocation_ip?: string;
    allocation_port?: number;
    server_uuid?: string;
    path?: string;
    filename?: string;
    file_size?: number;
    content_type?: string;
    content_length?: number;
    file_exists?: boolean;
    root?: string;
    file_count?: number;
    database_id?: number;
    database_name?: string;
    username?: string;
    database_host_name?: string;
    schedule_id?: number;
    schedule_name?: string;
    new_status?: string;
    updated_fields?: string[];
    task_id?: number;
    sequence_id?: number;
    subuser_id?: number;
    subusers?: unknown[];
    schedules?: unknown[];
    [key: string]: unknown;
};

type ActivityUser = {
    username: string;
    avatar: string | null;
    role: string | null;
};

type ActivityItem = {
    id: number;
    server_id: number;
    node_id: number;
    user_id: number | null;
    event: string;
    message?: string;
    metadata?: ActivityMetadata | null;
    ip?: string | null;
    timestamp?: string;
    created_at?: string;
    updated_at?: string;
    user?: ActivityUser | null;
};

type ApiActivityItem = Omit<ActivityItem, 'metadata'> & { metadata?: unknown };

const route = useRoute();
const { t } = useI18n();
const toast = useToast();

const activities = ref<ActivityItem[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const selectedEventFilter = ref('all');
const server = ref<{ name: string } | null>(null);
const pagination = ref({
    current_page: 1,
    per_page: 10,
    total_records: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false,
    from: 0,
    to: 0,
});

// Debounce timer
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverActivities.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/activities` },
]);

onMounted(async () => {
    await fetchServer();
    await fetchActivities();
});

async function fetchActivities(page = pagination.value.current_page) {
    try {
        loading.value = true;

        // Build query with proper search filtering
        const params: Record<string, string | number> = {
            page,
            per_page: pagination.value.per_page,
        };

        // Add search query
        if (searchQuery.value.trim()) {
            params.search = searchQuery.value.trim();
        }

        const { data } = await axios.get(`/api/user/servers/${route.params.uuidShort}/activities`, { params });

        if (!data.success) {
            toast.error(data.message || t('serverActivities.failedToFetch'));
            return;
        }

        const apiItems: ApiActivityItem[] = (data.data.activities.data ||
            data.data.activities ||
            []) as ApiActivityItem[];

        // Apply client-side event filter
        let filteredActivities = apiItems.map(
            (a): ActivityItem => ({
                ...a,
                metadata: normalizeMetadata(a.metadata),
            }),
        );

        // Filter by event type if not "all"
        if (selectedEventFilter.value !== 'all') {
            filteredActivities = filteredActivities.filter((a) => {
                const eventLower = a.event.toLowerCase();
                switch (selectedEventFilter.value) {
                    case 'backup':
                        return eventLower.includes('backup');
                    case 'power':
                        return (
                            eventLower.includes('power') ||
                            eventLower.includes('start') ||
                            eventLower.includes('stop') ||
                            eventLower.includes('restart') ||
                            eventLower.includes('kill')
                        );
                    case 'file':
                        return eventLower.includes('file') || eventLower.includes('download');
                    case 'database':
                        return eventLower.includes('database');
                    case 'schedule':
                        return eventLower.includes('schedule');
                    case 'task':
                        return eventLower.includes('task');
                    case 'subuser':
                        return eventLower.includes('subuser');
                    case 'allocation':
                        return eventLower.includes('allocation');
                    case 'server':
                        return eventLower.includes('server') && !eventLower.includes('subuser');
                    default:
                        return true;
                }
            });
        }

        activities.value = filteredActivities;

        const p = data.data.pagination as {
            current_page: number;
            per_page: number;
            total?: number;
            total_records?: number;
            total_pages?: number;
            last_page?: number;
            from?: number;
            to?: number;
        };

        pagination.value = {
            current_page: p.current_page,
            per_page: p.per_page,
            total_records: p.total ?? p.total_records ?? 0,
            total_pages: p.total_pages ?? p.last_page ?? 1,
            has_next: p.current_page < (p.total_pages ?? p.last_page ?? 1),
            has_prev: p.current_page > 1,
            from: p.from ?? 0,
            to: p.to ?? 0,
        };
    } catch {
        toast.error(t('serverActivities.failedToFetch'));
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
        // Non-blocking; breadcrumbs will fallback to generic label
    }
}

// Details dialog state
const detailsOpen = ref(false);
const selectedItem = ref<ActivityItem | null>(null);

const baseMessage = computed(() => {
    const item = selectedItem.value;
    if (!item) return '';
    return displayMessage(item);
});

const detailsPairs = computed(() => {
    const item = selectedItem.value;
    if (!item) return [] as Array<{ key: string; value: string }>;
    const meta = item.metadata;
    if (!meta) return [] as Array<{ key: string; value: string }>;
    const entries = Object.entries(meta as Record<string, unknown>);
    return entries.map(([k, v]) => ({ key: k, value: summarizePrimitive(v) }));
});

const rawJson = computed(() => {
    const item = selectedItem.value;
    if (!item) return '';
    const meta = item.metadata;
    try {
        return meta ? JSON.stringify(meta, null, 2) : '';
    } catch {
        return '';
    }
});

function openDetails(item: ActivityItem) {
    selectedItem.value = item;
    detailsOpen.value = true;
}

function normalizeMetadata(m: unknown): ActivityMetadata | undefined {
    if (m == null) return undefined;
    // Backend now returns metadata already parsed as object
    if (typeof m === 'object') return m as ActivityMetadata;
    // Fallback for any string metadata (shouldn't happen with new backend)
    if (typeof m === 'string') {
        try {
            return JSON.parse(m) as ActivityMetadata;
        } catch {
            return undefined;
        }
    }
    return undefined;
}

function changePage(page: number) {
    if (page < 1) return;
    fetchActivities(page);
}

function refresh() {
    fetchActivities();
}

function debouncedSearch() {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
        pagination.value.current_page = 1;
        fetchActivities(1);
    }, 500);
}

function handleFilterChange() {
    pagination.value.current_page = 1;
    fetchActivities(1);
}

function formatDate(value?: string) {
    if (!value) return '';
    return new Date(value).toLocaleString();
}

function formatEvent(event: string) {
    // Replace underscores and colons with spaces, then capitalize
    return event
        .replace(/_/g, ' ')
        .replace(/:/g, ' ')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function displayMessage(item: ActivityItem): string {
    const meta = item.metadata;

    // Backup events
    if (item.event.includes('backup_created') && meta) {
        const backupName = meta.backup_name || t('serverActivities.unknown');
        const adapter = meta.adapter || t('serverActivities.unknown');
        return t('serverActivities.messages.createdBackup', { backupName, adapter });
    }
    if (item.event.includes('backup_deleted') && meta) {
        const backupName = meta.backup_name || t('serverActivities.unknown');
        return t('serverActivities.messages.deletedBackup', { backupName });
    }
    if (item.event.includes('backup_restored') && meta) {
        const adapter = meta.adapter || t('serverActivities.unknown');
        const truncate = meta.truncate_directory
            ? t('serverActivities.messages.withDirectoryTruncation')
            : t('serverActivities.messages.withoutDirectoryTruncation');
        return t('serverActivities.messages.restoredBackup', { adapter, truncate });
    }
    if (item.event.includes('backup_download_url_generated') && meta) {
        const backupName = meta.backup_name || t('serverActivities.unknown');
        return t('serverActivities.messages.generatedDownloadUrl', { backupName });
    }

    // Allocation events
    if (item.event.includes('allocation_primary_set') && meta) {
        return t('serverActivities.messages.setPrimaryAllocation', {
            ip: meta.allocation_ip || '',
            port: meta.allocation_port || '',
        });
    }
    if (item.event.includes('allocation_auto_allocated') && meta) {
        return t('serverActivities.messages.autoAllocated', {
            ip: meta.allocation_ip || '',
            port: meta.allocation_port || '',
        });
    }
    if (item.event.includes('allocation_deleted') && meta) {
        return t('serverActivities.messages.deletedAllocation', {
            ip: meta.allocation_ip || '',
            port: meta.allocation_port || '',
        });
    }

    // Server events
    if (item.event.includes('server_updated')) {
        return t('serverActivities.messages.serverConfigUpdated');
    }

    // File events
    if (item.event.includes('file_written') && meta) {
        const path = meta.path || t('serverActivities.messages.file');
        const existed = meta.file_exists;
        return existed
            ? t('serverActivities.messages.fileUpdated', { path })
            : t('serverActivities.messages.fileCreated', { path });
    }
    if (item.event.includes('file_viewed') && meta) {
        return t('serverActivities.messages.fileViewed', { path: meta.path || t('serverActivities.messages.file') });
    }
    if (item.event.includes('file_downloaded') && meta) {
        return t('serverActivities.messages.fileDownloaded', {
            filename: meta.filename || meta.path || t('serverActivities.messages.file'),
        });
    }
    if (item.event.includes('files_deleted') && meta) {
        const count = meta.file_count || (Array.isArray(meta.files) ? meta.files.length : 0);
        return t('serverActivities.messages.filesDeleted', {
            count,
            root: meta.root || t('serverActivities.messages.directory'),
        });
    }
    if (item.event.includes('files_listed') && meta) {
        return t('serverActivities.messages.filesListed', { path: meta.path || '/' });
    }
    if (item.event.includes('downloads_list_viewed')) {
        return t('serverActivities.messages.downloadsListViewed');
    }

    // Database events
    if (item.event.includes('database_created') && meta) {
        return t('serverActivities.messages.databaseCreated', {
            databaseName: meta.database_name,
            host: meta.database_host_name,
        });
    }
    if (item.event.includes('database_deleted') && meta) {
        return t('serverActivities.messages.databaseDeleted', {
            databaseName: meta.database_name,
            host: meta.database_host_name,
        });
    }

    // Schedule events
    if (item.event.includes('schedule_created') && meta) {
        return t('serverActivities.messages.scheduleCreated', { scheduleName: meta.schedule_name });
    }
    if (item.event.includes('schedule_updated') && meta) {
        const fields = Array.isArray(meta.updated_fields)
            ? meta.updated_fields.join(', ')
            : t('serverActivities.messages.multipleFields');
        return t('serverActivities.messages.scheduleUpdated', { scheduleName: meta.schedule_name, fields });
    }
    if (item.event.includes('schedule_deleted') && meta) {
        return t('serverActivities.messages.scheduleDeleted', { scheduleName: meta.schedule_name });
    }
    if (item.event.includes('schedule_status_toggled') && meta) {
        return meta.new_status === 'enabled'
            ? t('serverActivities.messages.scheduleEnabled', { scheduleName: meta.schedule_name })
            : t('serverActivities.messages.scheduleDisabled', { scheduleName: meta.schedule_name });
    }
    if (item.event.includes('schedule_retrieved') && meta) {
        return t('serverActivities.messages.scheduleRetrieved', { scheduleName: meta.schedule_name });
    }
    if (item.event.includes('schedules_retrieved')) {
        const count = Array.isArray(meta?.schedules) ? meta.schedules.length : 0;
        return t('serverActivities.messages.schedulesRetrieved', { count });
    }

    // Task events
    if (item.event.includes('task_created') && meta) {
        return t('serverActivities.messages.taskCreated', { scheduleName: meta.schedule_name, action: meta.action });
    }
    if (item.event.includes('task_updated') && meta) {
        const fields = Array.isArray(meta.updated_fields)
            ? meta.updated_fields.join(', ')
            : t('serverActivities.messages.multipleFields');
        return t('serverActivities.messages.taskUpdated', { scheduleName: meta.schedule_name, fields });
    }
    if (item.event.includes('task_deleted') && meta) {
        return t('serverActivities.messages.taskDeleted', { scheduleName: meta.schedule_name, action: meta.action });
    }

    // Subuser events
    if (item.event.includes('subuser_created') && meta) {
        return t('serverActivities.messages.subuserCreated', { id: meta.subuser_id });
    }
    if (item.event.includes('subuser_deleted') && meta) {
        return t('serverActivities.messages.subuserDeleted', { id: meta.subuser_id });
    }
    if (item.event.includes('subusers_retrieved')) {
        const count = Array.isArray(meta?.subusers) ? meta.subusers.length : 0;
        return t('serverActivities.messages.subusersRetrieved', { count });
    }

    // Power events
    if (item.event.includes('server:power')) {
        const action = item.event.split('.')[1] || 'action';
        return t('serverActivities.messages.serverPower', { action });
    }

    // Fallback
    return item.event.replace(/_/g, ' ').replace(/:/g, ' ');
}

function summarizePrimitive(v: unknown): string {
    if (v == null) return 'null';
    if (typeof v === 'string') return v.length > 80 ? `${v.slice(0, 77)}…` : v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return `[${v.length} items]`;
    if (typeof v === 'object') return '{…}';
    return String(v);
}

function getEventIcon(event: string) {
    const eventLower = event.toLowerCase();
    if (eventLower.includes('backup')) return Archive;
    if (eventLower.includes('power') || eventLower.includes('start')) return Play;
    if (eventLower.includes('stop') || eventLower.includes('kill')) return Pause;
    if (eventLower.includes('restart')) return RotateCcw;
    if (eventLower.includes('file') || eventLower.includes('download')) return FileText;
    if (eventLower.includes('database')) return Database;
    if (eventLower.includes('schedule')) return CalendarClock;
    if (eventLower.includes('task')) return ListTodo;
    if (eventLower.includes('subuser') || eventLower.includes('user')) return Users;
    if (eventLower.includes('allocation') || eventLower.includes('network')) return Network;
    if (eventLower.includes('setting') || eventLower.includes('updated')) return Edit;
    if (eventLower.includes('delete') || eventLower.includes('deleted')) return Trash2;
    if (eventLower.includes('lock')) return Lock;
    if (eventLower.includes('unlock')) return Unlock;
    return Server;
}

function getEventIconClass(event: string) {
    const eventLower = event.toLowerCase();
    if (eventLower.includes('backup')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    if (eventLower.includes('start') || eventLower.includes('play'))
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
    if (eventLower.includes('stop') || eventLower.includes('kill'))
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
    if (eventLower.includes('restart')) return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    if (eventLower.includes('power')) return 'bg-green-500/10 text-green-600 dark:text-green-400';
    if (eventLower.includes('file')) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
    if (eventLower.includes('database')) return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
    if (eventLower.includes('schedule')) return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    if (eventLower.includes('task')) return 'bg-pink-500/10 text-pink-600 dark:text-pink-400';
    if (eventLower.includes('subuser') || eventLower.includes('user'))
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400';
    if (eventLower.includes('allocation')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    if (eventLower.includes('delete')) return 'bg-red-500/10 text-red-600 dark:text-red-400';
    if (eventLower.includes('lock')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    if (eventLower.includes('unlock')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    return 'bg-primary/10 text-primary';
}

function getEventCategory(event: string) {
    const eventLower = event.toLowerCase();
    if (eventLower.includes('backup')) return t('serverActivities.categories.backup');
    if (
        eventLower.includes('power') ||
        eventLower.includes('start') ||
        eventLower.includes('stop') ||
        eventLower.includes('restart') ||
        eventLower.includes('kill')
    )
        return t('serverActivities.categories.power');
    if (eventLower.includes('file') || eventLower.includes('download')) return t('serverActivities.categories.file');
    if (eventLower.includes('database')) return t('serverActivities.categories.database');
    if (eventLower.includes('schedule')) return t('serverActivities.categories.schedule');
    if (eventLower.includes('task')) return t('serverActivities.categories.task');
    if (eventLower.includes('subuser')) return t('serverActivities.categories.subuser');
    if (eventLower.includes('allocation')) return t('serverActivities.categories.allocation');
    if (eventLower.includes('server')) return t('serverActivities.categories.server');
    return t('serverActivities.categories.system');
}

function getEventBadgeVariant(event: string) {
    const eventLower = event.toLowerCase();
    if (eventLower.includes('backup')) return 'default';
    if (eventLower.includes('power')) return 'secondary';
    if (eventLower.includes('file')) return 'default';
    if (eventLower.includes('database')) return 'outline';
    if (eventLower.includes('schedule')) return 'secondary';
    if (eventLower.includes('task')) return 'default';
    if (eventLower.includes('subuser')) return 'outline';
    if (eventLower.includes('allocation')) return 'secondary';
    return 'outline';
}

function formatRelativeTime(timestamp?: string) {
    if (!timestamp) return '';

    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t('serverActivities.justNow');
    if (diffInSeconds < 3600) return t('serverActivities.minutesAgo', { minutes: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('serverActivities.hoursAgo', { hours: Math.floor(diffInSeconds / 3600) });
    if (diffInSeconds < 604800) return t('serverActivities.daysAgo', { days: Math.floor(diffInSeconds / 86400) });

    return date.toLocaleDateString();
}

function getVisiblePages() {
    const current = pagination.value.current_page;
    const total = pagination.value.total_pages;
    const pages: (number | string)[] = [];

    if (total <= 7) {
        for (let i = 1; i <= total; i++) {
            pages.push(i);
        }
    } else {
        pages.push(1);

        if (current > 4) {
            pages.push('...');
        }

        const start = Math.max(2, current - 1);
        const end = Math.min(total - 1, current + 1);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (current < total - 3) {
            pages.push('...');
        }

        if (total > 1) {
            pages.push(total);
        }
    }

    return pages.filter((page, index, arr) => {
        if (typeof page === 'string') return true;
        return arr.indexOf(page) === index;
    });
}

function clearFilters() {
    searchQuery.value = '';
    selectedEventFilter.value = 'all';
    pagination.value.current_page = 1;
    fetchActivities(1);
}

function copyToClipboard(text: string) {
    navigator.clipboard
        .writeText(text)
        .then(() => {
            toast.success(t('serverActivities.copiedToClipboard'));
        })
        .catch(() => {
            toast.error(t('serverActivities.failedToCopy'));
        });
}
</script>
