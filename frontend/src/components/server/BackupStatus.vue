<template>
    <div class="space-y-3">
        <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ t('serverBackups.title') }}
            </h3>
            <Button variant="outline" size="sm" @click="$emit('create-backup')">
                <Plus class="h-4 w-4 mr-2" />
                {{ t('serverBackups.createBackup') }}
            </Button>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-4">
            <Loader2 class="h-5 w-5 animate-spin text-gray-400" />
        </div>

        <div v-else-if="backups.length === 0" class="text-center py-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ t('serverBackups.noBackups') }}
            </p>
        </div>

        <div v-else class="space-y-2">
            <div
                v-for="backup in recentBackups"
                :key="backup.id"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
                <div class="flex-1 min-w-0">
                    <div class="flex items-center space-x-2">
                        <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {{ backup.name }}
                        </h4>
                        <Badge
                            :variant="getStatusVariant(backup.is_successful, backup.is_locked) as any"
                            size="sm"
                            class="text-xs"
                        >
                            {{ getStatusText(backup.is_successful, backup.is_locked) }}
                        </Badge>
                    </div>
                    <div class="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{{ formatBytes(backup.bytes) }}</span>
                        <span>{{ formatDate(backup.created_at) }}</span>
                        <span>{{ backup.disk }}</span>
                    </div>
                </div>

                <div class="flex items-center space-x-1 ml-2">
                    <Button
                        v-if="backup.is_successful"
                        variant="ghost"
                        size="sm"
                        title="Restore backup"
                        @click="$emit('restore-backup', backup)"
                    >
                        <RotateCcw class="h-4 w-4" />
                    </Button>
                    <Button
                        v-if="backup.is_successful"
                        variant="ghost"
                        size="sm"
                        title="Download backup"
                        @click="$emit('download-backup', backup)"
                    >
                        <Download class="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Delete backup" @click="$emit('delete-backup', backup)">
                        <Trash2 class="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div v-if="backups.length > 3" class="text-center">
                <Button variant="link" size="sm" @click="$emit('view-all-backups')">
                    {{ t('serverBackups.viewAllBackups', { count: backups.length }) }}
                </Button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, RotateCcw, Download, Trash2, Loader2 } from 'lucide-vue-next';
import axios from 'axios';

interface BackupItem {
    id: number;
    server_id: number;
    uuid: string;
    name: string;
    ignored_files: string;
    disk: string;
    is_successful: number;
    is_locked: number;
    bytes: number;
    created_at: string;
    updated_at: string;
    completed_at?: string;
}

interface Props {
    serverUuid: string;
}

interface Emits {
    (e: 'create-backup'): void;
    (e: 'restore-backup', backup: BackupItem): void;
    (e: 'download-backup', backup: BackupItem): void;
    (e: 'delete-backup', backup: BackupItem): void;
    (e: 'view-all-backups'): void;
}

const props = defineProps<Props>();
defineEmits<Emits>();
const { t } = useI18n();

const backups = ref<BackupItem[]>([]);
const loading = ref(false);

const recentBackups = computed(() => {
    return backups.value.slice(0, 3);
});

onMounted(async () => {
    await fetchBackups();
});

async function fetchBackups() {
    try {
        loading.value = true;
        const { data } = await axios.get(`/api/user/servers/${props.serverUuid}/backups`, {
            params: { per_page: 10 },
        });

        if (data.success) {
            backups.value = data.data.data || [];
        }
    } catch {
        console.error('Failed to fetch backups');
    } finally {
        loading.value = false;
    }
}

function formatDate(value?: string): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString();
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusVariant(isSuccessful: number, isLocked: number): string {
    if (isLocked) return 'secondary';
    if (isSuccessful) return 'default';
    return 'destructive';
}

function getStatusText(isSuccessful: number, isLocked: number): string {
    if (isLocked) return t('serverBackups.statusLocked');
    if (isSuccessful) return t('serverBackups.statusSuccessful');
    return t('serverBackups.statusFailed');
}
</script>
