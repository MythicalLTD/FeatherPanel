<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <!-- Header Section -->
            <div class="space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                            <div class="p-2 rounded-lg bg-primary/10">
                                <Activity class="h-6 w-6 text-primary" />
                            </div>
                            {{ t('serverActivities.title') }}
                        </h1>
                        <p class="text-sm sm:text-base text-muted-foreground mt-2">
                            {{ t('serverActivities.description') }}
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span
                            class="text-sm font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20"
                        >
                            {{ pagination.total_records }} events
                        </span>
                        <Button variant="outline" size="sm" :disabled="loading" @click="refresh">
                            <RefreshCw :class="['h-4 w-4 mr-2', loading && 'animate-spin']" />
                            {{ t('common.refresh') }}
                        </Button>
                    </div>
                </div>

                <!-- Enhanced Search and Filters -->
                <Card class="border-2 shadow-sm hover:shadow-md transition-all">
                    <CardContent class="p-4">
                        <div class="flex flex-col sm:flex-row gap-4">
                            <div class="flex-1 relative">
                                <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Search class="h-5 w-5 text-muted-foreground" />
                                </div>
                                <Input
                                    v-model="searchQuery"
                                    :placeholder="t('serverActivities.searchPlaceholder')"
                                    :disabled="loading"
                                    class="pl-10 pr-4 h-11 border-2 focus:border-primary transition-all"
                                    @keyup.enter="handleSearch"
                                />
                            </div>
                            <div class="flex gap-2">
                                <Select v-model="selectedEventFilter">
                                    <SelectTrigger class="w-48 h-11 border-2">
                                        <SelectValue placeholder="Filter by event" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Events</SelectItem>
                                        <SelectItem value="backup">Backup Events</SelectItem>
                                        <SelectItem value="power">Power Events</SelectItem>
                                        <SelectItem value="console">Console Events</SelectItem>
                                        <SelectItem value="file">File Events</SelectItem>
                                        <SelectItem value="download">Download Events</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" size="sm" class="h-11" @click="clearFilters">
                                    <X class="h-4 w-4 mr-2" />
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="space-y-4">
                <div class="grid gap-4">
                    <div v-for="i in 5" :key="i" class="animate-pulse">
                        <Card class="border-2">
                            <CardContent class="p-4">
                                <div class="flex items-center gap-4">
                                    <div class="w-12 h-12 bg-muted-foreground/20 rounded-lg"></div>
                                    <div class="flex-1 space-y-2">
                                        <div class="h-4 bg-muted-foreground/20 rounded w-1/3"></div>
                                        <div class="h-3 bg-muted-foreground/20 rounded w-2/3"></div>
                                    </div>
                                    <div class="h-8 w-20 bg-muted-foreground/20 rounded"></div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
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
                        <h3 class="text-2xl sm:text-3xl font-bold text-foreground">No Activities Yet</h3>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            {{
                                searchQuery
                                    ? 'No activities match your search criteria.'
                                    : 'Server activities will appear here once actions are performed.'
                            }}
                        </p>
                    </div>
                    <Button v-if="searchQuery" variant="outline" @click="clearFilters">
                        <X class="h-4 w-4 mr-2" />
                        Clear Search
                    </Button>
                </div>
            </div>

            <!-- Activities List -->
            <div v-else class="space-y-4">
                <div v-for="activity in activities" :key="activity.id" class="group">
                    <Card
                        class="border-2 shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/20"
                    >
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
                                            <div class="flex items-center gap-2 mb-1">
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
                                            <div class="flex items-center gap-4 text-xs text-muted-foreground">
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
                <div class="flex items-center justify-between pt-6">
                    <div class="text-sm text-muted-foreground">
                        Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total_records }} events
                    </div>
                    <div class="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="!pagination.has_prev || loading"
                            @click="changePage(pagination.current_page - 1)"
                        >
                            <ChevronLeft class="h-4 w-4 mr-1" />
                            Previous
                        </Button>

                        <div class="flex items-center gap-1">
                            <Button
                                v-for="page in getVisiblePages()"
                                :key="page"
                                :variant="page === pagination.current_page ? 'default' : 'outline'"
                                size="sm"
                                class="w-8 h-8 p-0"
                                :disabled="typeof page === 'string'"
                                @click="typeof page === 'number' && changePage(page)"
                            >
                                {{ page }}
                            </Button>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="!pagination.has_next || loading"
                            @click="changePage(pagination.current_page + 1)"
                        >
                            Next
                            <ChevronRight class="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
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
                                {{ selectedItem ? formatEvent(selectedItem.event) : 'Activity Details' }}
                            </DialogTitle>
                            <DialogDescription class="mt-1">
                                {{
                                    t('serverActivities.recentAction') || 'Detailed information for the selected event.'
                                }}
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
                                    <div class="text-sm font-medium text-muted-foreground">Event Type</div>
                                    <div class="flex items-center gap-2">
                                        <Badge
                                            :variant="
                                                selectedItem ? getEventBadgeVariant(selectedItem.event) : 'outline'
                                            "
                                        >
                                            {{ selectedItem ? getEventCategory(selectedItem.event) : 'Unknown' }}
                                        </Badge>
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    <div class="text-sm font-medium text-muted-foreground">Timestamp</div>
                                    <div class="font-medium">
                                        {{ formatDate(selectedItem?.timestamp || selectedItem?.created_at) }}
                                    </div>
                                    <div class="text-xs text-muted-foreground">
                                        {{ formatRelativeTime(selectedItem?.timestamp || selectedItem?.created_at) }}
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    <div class="text-sm font-medium text-muted-foreground">Event ID</div>
                                    <div class="font-mono text-sm">{{ selectedItem?.id || 'N/A' }}</div>
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
                                    <h3 class="text-lg font-semibold">Message</h3>
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
                                    <h3 class="text-lg font-semibold">Metadata</h3>
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
                                    <h3 class="text-lg font-semibold">Raw JSON</h3>
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
                                        Copy
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
    Power,
    Terminal,
    FileText,
    Download,
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
    [key: string]: unknown;
};

type ActivityItem = {
    id: number;
    server_id: number;
    event: string;
    message?: string;
    metadata?: ActivityMetadata;
    timestamp?: string;
    created_at?: string;
};

// Raw API item where metadata may be unknown
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

// Removed tableColumns as we're using a custom card layout now

async function fetchActivities(page = pagination.value.current_page) {
    try {
        loading.value = true;
        const { data } = await axios.get(`/api/user/servers/${route.params.uuidShort}/activities`, {
            params: { page, per_page: pagination.value.per_page, search: searchQuery.value || undefined },
        });
        if (!data.success) {
            toast.error(data.message || t('serverActivities.failedToFetch'));
            return;
        }
        const apiItems: ApiActivityItem[] = (data.data.activities || []) as ApiActivityItem[];
        activities.value = apiItems.map(
            (a): ActivityItem => ({
                ...a,
                metadata: normalizeMetadata(a.metadata),
            }),
        );

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
    const meta = normalizeMetadata(item.metadata);
    if (meta && typeof meta.message === 'string' && meta.message.trim()) {
        const parsed = tryParseJson(meta.message);
        if (parsed != null) return summarizeJson(parsed);
        return meta.message;
    }
    if (typeof item.message === 'string' && item.message.trim()) {
        const parsed = tryParseJson(item.message);
        if (parsed != null) return summarizeJson(parsed);
        return item.message;
    }
    return displayMessage(item);
});

const detailsPairs = computed(() => {
    const item = selectedItem.value;
    if (!item) return [] as Array<{ key: string; value: string }>;
    const meta = normalizeMetadata(item.metadata);
    if (!meta) return [] as Array<{ key: string; value: string }>;
    const entries = Object.entries(meta as Record<string, unknown>);
    return entries.map(([k, v]) => ({ key: k, value: summarizePrimitive(v) }));
});

const rawJson = computed(() => {
    const item = selectedItem.value;
    if (!item) return '';
    const meta = normalizeMetadata(item.metadata);
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
    if (typeof m === 'object') return m as ActivityMetadata;
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

function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.current_page = 1;
    fetchActivities(1);
}

function formatDate(value?: string) {
    if (!value) return '';
    return new Date(value).toLocaleString();
}

function formatEvent(event: string) {
    // Keep colons to preserve event namespaces; only replace underscores with spaces
    return event.replace(/_/g, ' ');
}

function displayMessage(item: ActivityItem): string {
    const meta = item.metadata;

    // Prefer explicit message
    if (meta && typeof meta.message === 'string' && meta.message.trim()) {
        const parsedMetaMessage = tryParseJson(meta.message);
        if (parsedMetaMessage != null) return summarizeJson(parsedMetaMessage);
        return meta.message;
    }
    if (typeof item.message === 'string' && item.message.trim()) {
        const parsedItemMessage = tryParseJson(item.message);
        if (parsedItemMessage != null) return summarizeJson(parsedItemMessage);
        return item.message;
    }

    // Backup-related event summaries
    if (item.event.includes('backup.created') && meta) {
        const backupName = meta.backup_name || 'Unknown';
        const adapter = meta.adapter || 'Unknown';
        return `Created backup "${backupName}" using ${adapter} storage`;
    }
    if (item.event.includes('backup.deleted') && meta) {
        const backupName = meta.backup_name || 'Unknown';
        return `Deleted backup "${backupName}"`;
    }
    if (item.event.includes('backup.restored') && meta) {
        const backupName = meta.backup_name || 'Unknown';
        const adapter = meta.adapter || 'Unknown';
        const truncate = meta.truncate_directory ? 'with directory truncation' : 'without directory truncation';
        return `Restored backup "${backupName}" from ${adapter} storage (${truncate})`;
    }
    if (item.event.includes('backup.locked') && meta) {
        const backupName = meta.backup_name || 'Unknown';
        return `Locked backup "${backupName}"`;
    }
    if (item.event.includes('backup.unlocked') && meta) {
        const backupName = meta.backup_name || 'Unknown';
        return `Unlocked backup "${backupName}"`;
    }

    // Common event summaries
    if (item.event.includes('console.command') && meta && typeof meta.command === 'string') {
        return `Command: ${meta.command}`;
    }
    if (item.event.includes('sftp.write') && meta && Array.isArray(meta.files)) {
        return `Files written: ${meta.files.join(', ')}`;
    }
    if (item.event.includes('power.') && meta && typeof meta.action === 'string') {
        return `Action: ${meta.action}`;
    }
    if (item.event.includes('crashed') && meta && typeof meta.exit_code !== 'undefined') {
        return `Exit code: ${String(meta.exit_code)}`;
    }

    // Fallbacks
    if (meta && Object.keys(meta).length > 0) {
        // Always present metadata in a summarized/parsed form to avoid noisy blobs
        try {
            return summarizeJson(meta);
        } catch {
            // noop
        }
    }
    return '';
}

function tryParseJson(value: string): unknown | null {
    const t = value.trim();
    if (!(t.startsWith('{') || t.startsWith('['))) return null;
    try {
        return JSON.parse(t);
    } catch {
        return null;
    }
}

function summarizeJson(value: unknown): string {
    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        const sample = value
            .slice(0, 5)
            .map((v) => summarizePrimitive(v))
            .join(', ');
        return value.length > 5 ? `[${sample}, …]` : `[${sample}]`;
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.length === 0) return '{}';
        const sample = entries
            .slice(0, 6)
            .map(([k, v]) => `${k}: ${summarizePrimitive(v)}`)
            .join(', ');
        return entries.length > 6 ? `{ ${sample}, … }` : `{ ${sample} }`;
    }
    return summarizePrimitive(value);
}

function summarizePrimitive(v: unknown): string {
    if (v == null) return 'null';
    if (typeof v === 'string') return v.length > 80 ? `${v.slice(0, 77)}…` : v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (typeof v === 'object') return '{…}';
    return String(v);
}

// New helper functions for the redesigned interface
function getEventIcon(event: string) {
    if (event.includes('backup')) return Archive;
    if (event.includes('power')) return Power;
    if (event.includes('console')) return Terminal;
    if (event.includes('file')) return FileText;
    if (event.includes('download')) return Download;
    if (event.includes('database')) return Database;
    if (event.includes('user')) return Users;
    if (event.includes('setting')) return Settings;
    if (event.includes('start')) return Play;
    if (event.includes('stop')) return Pause;
    if (event.includes('restart')) return RotateCcw;
    if (event.includes('delete')) return Trash2;
    if (event.includes('lock')) return Lock;
    if (event.includes('unlock')) return Unlock;
    return Server;
}

function getEventIconClass(event: string) {
    if (event.includes('backup')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    if (event.includes('power')) return 'bg-green-500/10 text-green-600 dark:text-green-400';
    if (event.includes('console')) return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    if (event.includes('file')) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
    if (event.includes('download')) return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400';
    if (event.includes('database')) return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
    if (event.includes('user')) return 'bg-pink-500/10 text-pink-600 dark:text-pink-400';
    if (event.includes('setting')) return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    if (event.includes('start')) return 'bg-green-500/10 text-green-600 dark:text-green-400';
    if (event.includes('stop')) return 'bg-red-500/10 text-red-600 dark:text-red-400';
    if (event.includes('restart')) return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    if (event.includes('delete')) return 'bg-red-500/10 text-red-600 dark:text-red-400';
    if (event.includes('lock')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    if (event.includes('unlock')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    return 'bg-primary/10 text-primary';
}

function getEventCategory(event: string) {
    if (event.includes('backup')) return 'Backup';
    if (event.includes('power')) return 'Power';
    if (event.includes('console')) return 'Console';
    if (event.includes('file')) return 'File';
    if (event.includes('download')) return 'Download';
    if (event.includes('database')) return 'Database';
    if (event.includes('user')) return 'User';
    if (event.includes('setting')) return 'Settings';
    return 'System';
}

function getEventBadgeVariant(event: string) {
    if (event.includes('backup')) return 'default';
    if (event.includes('power')) return 'secondary';
    if (event.includes('console')) return 'outline';
    if (event.includes('file')) return 'default';
    if (event.includes('download')) return 'secondary';
    if (event.includes('database')) return 'outline';
    if (event.includes('user')) return 'default';
    if (event.includes('setting')) return 'secondary';
    return 'outline';
}

function formatRelativeTime(timestamp?: string) {
    if (!timestamp) return '';

    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

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
            toast.success('Copied to clipboard');
        })
        .catch(() => {
            toast.error('Failed to copy to clipboard');
        });
}
</script>
