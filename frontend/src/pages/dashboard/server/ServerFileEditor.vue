<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen flex flex-col">
            <MonacoFileEditor
                v-if="!loading && fileContent !== null && server"
                :file-name="fileName || 'unknown.txt'"
                :file-path="filePath || '/'"
                :content="fileContent || ''"
                :readonly="readonly"
                @save="handleSave"
                @close="handleClose"
            />
            <div v-else-if="loading" class="flex items-center justify-center py-8 px-4">
                <div
                    class="animate-spin h-6 w-6 sm:h-8 sm:w-8 border-2 border-primary border-t-transparent rounded-full"
                ></div>
                <span class="ml-2 text-sm sm:text-base">{{ t('serverFiles.loading') }}</span>
            </div>
            <div v-else class="flex items-center justify-center py-8 px-4">
                <div class="text-center max-w-md">
                    <h3 class="text-base sm:text-lg font-semibold text-muted-foreground">
                        {{ t('fileEditor.loadError') }}
                    </h3>
                    <p class="text-xs sm:text-sm text-muted-foreground mt-2">
                        {{ t('serverFiles.failedToFetchServer') }}
                    </p>
                    <Button class="mt-4 w-full sm:w-auto" @click="handleClose">
                        {{ t('common.back') }}
                    </Button>
                </div>
            </div>
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast, TYPE } from 'vue-toastification';
import axios from 'axios';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import MonacoFileEditor from '@/components/server/MonacoFileEditor.vue';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import type { Server } from '@/types/server';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();

// Server state (following ServerFiles pattern)
const server = ref<Server | null>(null);

// Props from route params and query (with defensive initialization)
const serverUuid = route.params.uuidShort as string;
const fileName = ref<string>((route.query.file as string) || 'unknown.txt');
const filePath = ref<string>((route.query.path as string) || '/');
const readonly = ref<boolean>((route.query.readonly as string) === 'true');

// Editor state
const fileContent = ref<string | null>(null);
const loading = ref(true);

// Computed breadcrumbs (following ServerFiles pattern with defensive checks)
const breadcrumbs = computed(() => {
    const serverName = server.value?.name || t('common.server');
    const currentFileName = fileName.value || 'unknown.txt';

    return [
        { text: t('common.dashboard'), href: '/dashboard' },
        { text: t('common.servers'), href: '/dashboard' },
        { text: serverName, href: `/server/${route.params.uuidShort}` },
        { text: t('serverFiles.title'), href: `/server/${route.params.uuidShort}/files` },
        { text: `${t('serverFiles.edit')}: ${currentFileName}`, isCurrent: true },
    ];
});

// Server fetching (following ServerFiles pattern)
async function fetchServer(): Promise<void> {
    try {
        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}`);
        if (response.data.success) {
            server.value = response.data.data;
        } else {
            toast(t('serverFiles.failedToFetchServer'), { type: TYPE.ERROR });
            router.push('/dashboard');
        }
    } catch {
        toast(t('serverFiles.failedToFetchServer'), { type: TYPE.ERROR });
        router.push('/dashboard');
    }
}

// Load file content
const loadFileContent = async () => {
    if (!serverUuid || !fileName.value) {
        toast(t('fileEditor.loadError'), { type: TYPE.ERROR });
        router.push(`/server/${serverUuid}/files`);
        return;
    }

    try {
        const response = await axios.get(`/api/user/servers/${serverUuid}/file`, {
            params: {
                path: `${filePath.value}/${fileName.value}`.replace(/\/+/g, '/'),
            },
        });

        // Handle different response types (matching ServerFiles pattern)
        if (typeof response.data === 'string') {
            fileContent.value = response.data;
        } else if (response.data && typeof response.data === 'object') {
            if (response.data.content) {
                fileContent.value = response.data.content;
            } else if (response.data.data) {
                fileContent.value = response.data.data;
            } else {
                fileContent.value = JSON.stringify(response.data, null, 2);
            }
        } else {
            fileContent.value = String(response.data || '');
        }
    } catch (error) {
        console.error('Error loading file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast(err.response?.data?.message || t('fileEditor.loadError'), { type: TYPE.ERROR });
        router.push(`/server/${serverUuid}/files`);
    } finally {
        loading.value = false;
    }
};

// Save file content (matching ServerFiles pattern)
const handleSave = async (content: string) => {
    try {
        const fullPath = `${filePath.value}/${fileName.value}`.replace(/\/+/g, '/');

        const response = await axios.post(
            `/api/user/servers/${serverUuid}/write-file?path=${encodeURIComponent(fullPath)}`,
            content,
            {
                headers: {
                    'Content-Type': 'text/plain',
                },
            },
        );

        if (response.data.success) {
            toast(t('fileEditor.saveSuccess'), { type: TYPE.SUCCESS });
        } else {
            throw new Error(response.data.message || 'Failed to save file');
        }
    } catch (error) {
        console.error('Error saving file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast(err.response?.data?.message || t('fileEditor.saveError'), { type: TYPE.ERROR });
        throw error; // Re-throw to let the editor know saving failed
    }
};

// Close editor
const handleClose = () => {
    router.push(`/server/${serverUuid}/files`);
};

// Lifecycle (following ServerFiles pattern with error handling)
onMounted(async () => {
    try {
        // Validate required params
        if (!serverUuid) {
            toast(t('fileEditor.loadError'), { type: TYPE.ERROR });
            router.push('/dashboard');
            return;
        }

        await sessionStore.checkSessionOrRedirect(router);
        await settingsStore.fetchSettings();
        await fetchServer();
        await loadFileContent();
    } catch (error) {
        console.error('Error in ServerFileEditor onMounted:', error);
        toast(t('fileEditor.loadError'), { type: TYPE.ERROR });
        router.push('/dashboard');
    }
});
</script>

<style scoped>
/* Full height layout */
:deep(.dashboard-layout) {
    height: 100vh;
    overflow: hidden;
}

:deep(.dashboard-content) {
    height: 100%;
    overflow: hidden;
}

/* Mobile optimizations */
@media (max-width: 640px) {
    :deep(.dashboard-layout) {
        height: 100vh;
        height: 100dvh; /* Use dynamic viewport height for mobile */
    }

    /* Ensure ACE editor takes full available space on mobile */
    :deep(.ace_editor) {
        min-height: calc(100vh - 200px);
        min-height: calc(100dvh - 200px);
    }

    /* Better touch targets for mobile */
    :deep(.ace_editor .ace_content) {
        touch-action: pan-x pan-y;
    }

    /* Optimize scrollbars for mobile */
    :deep(.ace_editor .ace_scrollbar) {
        -webkit-overflow-scrolling: touch;
    }
}
</style>
