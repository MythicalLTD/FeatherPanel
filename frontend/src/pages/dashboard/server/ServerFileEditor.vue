<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen flex flex-col space-y-6 pb-8">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- File Editor Header -->
            <div v-if="!loading && fileContent !== null && server" class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">{{ t('serverFiles.edit') }}</h1>
                        <p class="text-sm text-muted-foreground">
                            {{ fileName }}
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Badge
                            v-if="!canUpdateFiles"
                            variant="outline"
                            class="text-sm px-3 py-1.5 bg-linear-to-r from-orange-500/20 to-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"
                        >
                            {{ t('common.readonly') }}
                        </Badge>
                    </div>
                </div>
            </div>

            <!-- Plugin Widgets: After Header -->
            <WidgetRenderer
                v-if="!loading && fileContent !== null && server && widgetsAfterHeader.length > 0"
                :widgets="widgetsAfterHeader"
            />

            <!-- Monaco Editor -->
            <MonacoFileEditor
                v-if="!loading && fileContent !== null && server"
                :file-name="fileName || 'unknown.txt'"
                :file-path="filePath || '/'"
                :content="fileContent || ''"
                :readonly="readonly"
                @save="handleSave"
                @close="handleClose"
            />

            <!-- Loading State -->
            <div v-else-if="loading" class="flex flex-col items-center justify-center py-16">
                <div class="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"></div>
                <span class="mt-4 text-muted-foreground">{{ t('common.loading') }}</span>
            </div>

            <!-- Error State -->
            <div v-else class="flex flex-col items-center justify-center py-16 px-4">
                <div class="text-center max-w-md space-y-6">
                    <div class="flex justify-center">
                        <div class="relative">
                            <div class="absolute inset-0 animate-ping opacity-20">
                                <div class="w-32 h-32 rounded-full bg-destructive/20"></div>
                            </div>
                            <div class="relative p-8 rounded-full bg-linear-to-br from-destructive/20 to-destructive/5">
                                <AlertCircle class="h-16 w-16 text-destructive" />
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h3 class="text-2xl sm:text-3xl font-bold text-foreground">
                            {{ t('fileEditor.loadError') }}
                        </h3>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            {{ t('serverFiles.failedToFetchServer') }}
                        </p>
                    </div>
                    <Button size="lg" class="gap-2 shadow-lg" @click="handleClose">
                        <ArrowLeft class="h-4 w-4" />
                        {{ t('common.back') }}
                    </Button>
                </div>
            </div>

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>
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
import { useToast, TYPE } from 'vue-toastification';
import axios from 'axios';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import MonacoFileEditor from '@/components/server/MonacoFileEditor.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowLeft } from 'lucide-vue-next';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import { useServerPermissions } from '@/composables/useServerPermissions';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import type { Server } from '@/types/server';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();

// Check server permissions
const { hasPermission: hasServerPermission, isLoading: permissionsLoading } = useServerPermissions();

// Permission checks
const canReadFiles = computed(() => hasServerPermission('file.read'));
const canUpdateFiles = computed(() => hasServerPermission('file.update'));

// Server state (following ServerFiles pattern)
const server = ref<Server | null>(null);

// Props from route params and query (with defensive initialization)
const serverUuid = route.params.uuidShort as string;
const fileName = ref<string>((route.query.file as string) || 'unknown.txt');
const filePath = ref<string>((route.query.path as string) || '/');

// Computed readonly state based on permissions and query param
const readonly = computed(() => {
    // If the route explicitly says readonly, make it readonly
    if ((route.query.readonly as string) === 'true') return true;
    // Otherwise, check if user has update permission
    return !canUpdateFiles.value;
});

// Editor state
const fileContent = ref<string | null>(null);
const loading = ref(true);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('server-file-editor');
const widgetsTopOfPage = computed(() => getWidgets('server-file-editor', 'top-of-page'));
const widgetsAfterHeader = computed(() => getWidgets('server-file-editor', 'after-header'));
const widgetsBottomOfPage = computed(() => getWidgets('server-file-editor', 'bottom-of-page'));

// File size limit - 5MB
const FILE_SIZE_LIMIT = 5 * 1024 * 1024;

// Check if a file is editable based on extension
const isFileEditable = (filename: string): boolean => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    // Binary file extensions that should NOT be editable
    const binaryExtensions = [
        // Archives
        'zip',
        'tar',
        'gz',
        'tgz',
        '7z',
        'rar',
        'bz2',
        'xz',
        'lzma',
        'cab',
        'iso',
        'dmg',
        'jar',
        'war',
        'ear',
        // Images
        'jpg',
        'jpeg',
        'png',
        'gif',
        'bmp',
        'svg',
        'ico',
        'webp',
        'tiff',
        'tif',
        'psd',
        // Videos
        'mp4',
        'avi',
        'mov',
        'wmv',
        'flv',
        'mkv',
        'webm',
        'm4v',
        'mpg',
        'mpeg',
        // Audio
        'mp3',
        'wav',
        'flac',
        'aac',
        'ogg',
        'wma',
        'm4a',
        'opus',
        // Executables
        'exe',
        'dll',
        'so',
        'dylib',
        'bin',
        'app',
        'deb',
        'rpm',
        'msi',
        // Documents (binary formats)
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'ppt',
        'pptx',
        'odt',
        'ods',
        'odp',
        // Fonts
        'ttf',
        'otf',
        'woff',
        'woff2',
        'eot',
        // Database files
        'db',
        'sqlite',
        'sqlite3',
        'mdb',
        // Other binary
        'class',
        'pyc',
        'pyo',
        'o',
        'a',
        'lib',
    ];

    return !binaryExtensions.includes(ext);
};

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
        router.push({
            name: 'ServerFiles',
            params: { uuidShort: serverUuid },
            query: { path: (filePath.value || '/').replace(/\/+$/, '') || '/' },
        });
        return;
    }

    // Check if file is editable
    if (!isFileEditable(fileName.value)) {
        toast(
            t('fileEditor.cannotEditBinaryFile', {
                defaultValue: 'Cannot edit binary files. Please download the file instead.',
            }),
            { type: TYPE.ERROR },
        );
        router.push({
            name: 'ServerFiles',
            params: { uuidShort: serverUuid },
            query: { path: (filePath.value || '/').replace(/\/+$/, '') || '/' },
        });
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

        // Check file size after loading
        // fileContent.value can be string or null, but BlobPart does not accept null
        const contentString = fileContent.value ?? '';
        const contentSize = new Blob([contentString]).size;
        if (contentSize > FILE_SIZE_LIMIT) {
            toast(
                t('fileEditor.fileTooLarge', {
                    defaultValue: 'File is too large to edit (max 5MB). Please download it instead.',
                }),
                { type: TYPE.ERROR },
            );
            router.push({
                name: 'ServerFiles',
                params: { uuidShort: serverUuid },
                query: { path: (filePath.value || '/').replace(/\/+$/, '') || '/' },
            });
            return;
        }
    } catch (error) {
        console.error('Error loading file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast(err.response?.data?.message || t('fileEditor.loadError'), { type: TYPE.ERROR });
        router.push({
            name: 'ServerFiles',
            params: { uuidShort: serverUuid },
            query: { path: (filePath.value || '/').replace(/\/+$/, '') || '/' },
        });
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
    router.push({
        name: 'ServerFiles',
        params: { uuidShort: serverUuid },
        query: { path: (filePath.value || '/').replace(/\/+$/, '') || '/' },
    });
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

        // Wait for permission check to complete
        while (permissionsLoading.value) {
            await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Check if user has permission to read files
        if (!canReadFiles.value) {
            toast(t('serverFiles.noFileReadPermission'), { type: TYPE.ERROR });
            router.push({
                name: 'ServerFiles',
                params: { uuidShort: serverUuid },
                query: { path: (filePath.value || '/').replace(/\/+$/, '') || '/' },
            });
            return;
        }

        await loadFileContent();

        // Fetch plugin widgets
        await fetchPluginWidgets();
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
