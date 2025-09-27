<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <TableComponent
                :title="t('serverActivities.title')"
                :description="t('serverActivities.description')"
                :columns="tableColumns"
                :data="activities"
                :search-placeholder="t('serverActivities.searchPlaceholder')"
                :server-side-pagination="true"
                :total-records="pagination.total_records"
                :total-pages="pagination.total_pages"
                :current-page="pagination.current_page"
                :has-next="pagination.has_next"
                :has-prev="pagination.has_prev"
                :from="pagination.from"
                :to="pagination.to"
                local-storage-key="featherpanel-server-activities-columns"
                @search="handleSearch"
                @page-change="changePage"
            >
                <template #header-actions>
                    <Button variant="outline" size="sm" :disabled="loading" @click="refresh">
                        <RefreshCw class="h-4 w-4 mr-2" />
                        {{ t('common.refresh') }}
                    </Button>
                </template>

                <template #cell-event="{ item }">
                    <div class="font-medium">{{ formatEvent((item as ActivityItem).event) }}</div>
                </template>

                <template #cell-message="{ item }">
                    <div class="text-sm text-muted-foreground flex items-center justify-between gap-2">
                        <span class="truncate">{{ displayMessage(item as ActivityItem) }}</span>
                        <Button variant="outline" size="sm" @click="openDetails(item as ActivityItem)">{{
                            t('common.view') || 'View'
                        }}</Button>
                    </div>
                </template>

                <template #cell-timestamp="{ item }">
                    <span class="text-sm">{{
                        formatDate((item as ActivityItem).timestamp || (item as ActivityItem).created_at)
                    }}</span>
                </template>
            </TableComponent>
        </div>

        <!-- Activity Details Dialog -->
        <Dialog v-model:open="detailsOpen">
            <DialogContent class="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{{ t('serverActivities.title') }} - {{ selectedItem?.event }}</DialogTitle>
                    <DialogDescription>
                        {{ t('serverActivities.recentAction') || 'Detailed information for the selected event.' }}
                    </DialogDescription>
                </DialogHeader>

                <div class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <div class="text-xs text-muted-foreground">Event</div>
                            <div class="font-medium break-words">{{ selectedItem?.event }}</div>
                        </div>
                        <div>
                            <div class="text-xs text-muted-foreground">Time</div>
                            <div class="font-medium">
                                {{ formatDate(selectedItem?.timestamp || selectedItem?.created_at) }}
                            </div>
                        </div>
                        <div class="md:col-span-2">
                            <div class="text-xs text-muted-foreground">Message</div>
                            <div class="font-medium break-words">{{ baseMessage }}</div>
                        </div>
                    </div>

                    <div v-if="detailsPairs.length" class="bg-muted/30 rounded-md p-3 border">
                        <h4 class="text-sm font-medium mb-2">Metadata</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div v-for="pair in detailsPairs" :key="pair.key" class="text-sm">
                                <div class="text-xs text-muted-foreground">{{ pair.key }}</div>
                                <div class="font-mono break-words">{{ pair.value }}</div>
                            </div>
                        </div>
                    </div>

                    <div v-if="rawJson" class="space-y-1">
                        <div class="text-xs text-muted-foreground">Raw JSON</div>
                        <pre
                            class="text-xs bg-muted/30 p-3 rounded-md overflow-x-auto border"
                        ><code>{{ rawJson }}</code></pre>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" @click="detailsOpen = false">{{ t('common.close') }}</Button>
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
import { RefreshCw } from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import TableComponent from '@/kit/TableComponent.vue';
import type { TableColumn } from '@/kit/types';
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

const tableColumns: TableColumn[] = [
    { key: 'event', label: t('serverActivities.event'), searchable: true },
    { key: 'message', label: t('serverActivities.message'), searchable: true },
    { key: 'timestamp', label: t('serverActivities.time') },
];

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
</script>
