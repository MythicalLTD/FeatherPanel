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
                @column-toggle="handleColumnToggle"
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
                    <div class="text-sm text-muted-foreground">
                        {{ displayMessage(item as ActivityItem) }}
                    </div>
                </template>

                <template #cell-timestamp="{ item }">
                    <span class="text-sm">{{
                        formatDate((item as ActivityItem).timestamp || (item as ActivityItem).created_at)
                    }}</span>
                </template>
            </TableComponent>
        </div>
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

function handleColumnToggle(columns: string[]) {
    console.log('Columns changed:', columns);
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
        return meta.message;
    }
    if (typeof item.message === 'string' && item.message.trim()) {
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
        try {
            return JSON.stringify(meta);
        } catch {
            // noop
        }
    }
    return '';
}
</script>
