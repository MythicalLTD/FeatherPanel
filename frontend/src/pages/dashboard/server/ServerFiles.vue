<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold">{{ t('serverFiles.title') }}</h1>
                    <p class="text-muted-foreground">{{ t('serverFiles.description') }}</p>
                </div>
                <div class="flex gap-2">
                    <Button variant="outline" :disabled="loading" @click="refreshFiles">
                        <RefreshCw class="h-4 w-4 mr-2" />
                        {{ t('common.refresh') }}
                    </Button>
                    <Button variant="outline" :disabled="loading" @click="showUploadDialog = true">
                        <Upload class="h-4 w-4 mr-2" />
                        {{ t('serverFiles.uploadFile') }}
                    </Button>
                    <Button :disabled="loading" @click="showCreateFolderDialog = true">
                        <FolderPlus class="h-4 w-4 mr-2" />
                        {{ t('serverFiles.createFolder') }}
                    </Button>
                </div>
            </div>

            <!-- Breadcrumb Navigation -->
            <Card>
                <CardContent class="p-4">
                    <div class="flex items-center gap-2">
                        <Button variant="ghost" size="sm" :disabled="loading" @click="navigateToPath('/')">
                            <Home class="h-4 w-4" />
                        </Button>
                        <Separator orientation="vertical" class="h-4" />
                        <div class="flex items-center gap-1">
                            <template v-for="(segment, index) in pathSegments" :key="index">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    class="text-muted-foreground hover:text-foreground"
                                    :disabled="loading"
                                    @click="navigateToPath(getPathUpTo(index))"
                                >
                                    {{ segment }}
                                </Button>
                                <ChevronRight
                                    v-if="index < pathSegments.length - 1"
                                    class="h-4 w-4 text-muted-foreground"
                                />
                            </template>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- File Actions Toolbar -->
            <Card v-if="selectedFiles.length > 0">
                <CardContent class="p-4">
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-muted-foreground">
                            {{ t('serverFiles.selectedFiles', { count: selectedFiles.length }) }}
                        </span>
                        <div class="flex gap-2">
                            <Button variant="outline" size="sm" :disabled="loading" @click="downloadSelected">
                                <Download class="h-4 w-4 mr-2" />
                                {{ t('serverFiles.download') }}
                            </Button>
                            <Button variant="outline" size="sm" :disabled="loading" @click="copySelected">
                                <Copy class="h-4 w-4 mr-2" />
                                {{ t('serverFiles.copy') }}
                            </Button>
                            <Button variant="outline" size="sm" :disabled="loading" @click="compressSelected">
                                <Archive class="h-4 w-4 mr-2" />
                                {{ t('serverFiles.compress') }}
                            </Button>
                            <Button variant="destructive" size="sm" :disabled="loading" @click="deleteSelected">
                                <Trash2 class="h-4 w-4 mr-2" />
                                {{ t('serverFiles.delete') }}
                            </Button>
                            <Button variant="ghost" size="sm" @click="clearSelection">
                                <X class="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Files List -->
            <Card>
                <CardHeader>
                    <CardTitle class="flex items-center gap-2">
                        <FolderOpen class="h-5 w-5" />
                        {{ t('serverFiles.fileManager') }}
                    </CardTitle>
                    <CardDescription>{{ t('serverFiles.currentPath') }}: {{ currentPath }}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div v-if="loading" class="flex items-center justify-center py-8">
                        <div
                            class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
                        ></div>
                        <span class="ml-2">{{ t('serverFiles.loading') }}</span>
                    </div>

                    <div v-else-if="files.length === 0" class="text-center py-8 text-muted-foreground">
                        {{ t('serverFiles.emptyFolder') }}
                    </div>

                    <div v-else>
                        <!-- File List Header -->
                        <div class="border-b pb-4 mb-4">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-4">
                                    <div class="flex items-center gap-2">
                                        <!-- Custom Select All Checkbox -->
                                        <div
                                            class="relative flex items-center justify-center w-4 h-4 border-2 rounded-sm cursor-pointer transition-all duration-200"
                                            :class="{
                                                'border-primary bg-primary': allFilesSelected || someFilesSelected,
                                                'border-muted-foreground hover:border-primary':
                                                    !allFilesSelected && !someFilesSelected && files.length > 0,
                                                'border-muted bg-muted cursor-not-allowed': files.length === 0,
                                            }"
                                            @click="files.length > 0 && toggleSelectAll(!allFilesSelected)"
                                        >
                                            <!-- Full selection checkmark -->
                                            <svg
                                                v-if="allFilesSelected"
                                                class="w-3 h-3 text-primary-foreground"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fill-rule="evenodd"
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                    clip-rule="evenodd"
                                                />
                                            </svg>
                                            <!-- Partial selection dash -->
                                            <div
                                                v-else-if="someFilesSelected"
                                                class="w-2 h-0.5 bg-primary-foreground rounded"
                                            ></div>
                                        </div>
                                        <span class="text-sm font-medium">{{ t('serverFiles.name') }}</span>
                                    </div>
                                </div>
                                <div class="flex items-center gap-4">
                                    <span class="text-sm font-medium w-20">{{ t('serverFiles.size') }}</span>
                                    <span class="text-sm font-medium w-24">{{ t('serverFiles.modified') }}</span>
                                    <span class="text-sm font-medium w-20">{{ t('serverFiles.actions') }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Go Up Directory -->
                        <div v-if="currentPath !== '/'" class="border-b hover:bg-muted/50 transition-colors">
                            <div class="flex items-center gap-4 p-4 cursor-pointer" @click="navigateUp">
                                <div class="flex items-center gap-2">
                                    <div class="w-4"></div>
                                    <FolderUp class="h-4 w-4 text-muted-foreground" />
                                    <span class="text-sm">{{ t('serverFiles.parentDirectory') }}</span>
                                </div>
                                <div class="flex-1"></div>
                                <div class="w-20"></div>
                                <div class="w-24"></div>
                                <div class="w-20"></div>
                            </div>
                        </div>

                        <!-- File Rows -->
                        <div class="space-y-1">
                            <div
                                v-for="file in files"
                                :key="file.name"
                                class="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                            >
                                <div class="flex items-center gap-4 p-4">
                                    <div class="flex items-center gap-2 flex-1">
                                        <!-- Custom File Checkbox -->
                                        <div
                                            class="relative flex items-center justify-center w-4 h-4 border-2 rounded-sm cursor-pointer transition-all duration-200"
                                            :class="{
                                                'border-primary bg-primary': selectedFiles.includes(file.name),
                                                'border-muted-foreground hover:border-primary': !selectedFiles.includes(
                                                    file.name,
                                                ),
                                            }"
                                            @click="toggleFileSelection(file.name)"
                                        >
                                            <svg
                                                v-if="selectedFiles.includes(file.name)"
                                                class="w-3 h-3 text-primary-foreground"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fill-rule="evenodd"
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                    clip-rule="evenodd"
                                                />
                                            </svg>
                                        </div>
                                        <component
                                            :is="getFileIcon(file)"
                                            class="h-4 w-4 text-muted-foreground flex-shrink-0"
                                        />
                                        <span
                                            class="text-sm truncate cursor-pointer hover:text-primary"
                                            @click="handleFileClick(file)"
                                        >
                                            {{ file.name }}
                                        </span>
                                    </div>
                                    <div class="w-20 text-sm text-muted-foreground">
                                        {{ file.file ? formatFileSize(file.size) : '-' }}
                                    </div>
                                    <div class="w-24 text-sm text-muted-foreground">
                                        {{ formatDate(file.modified) }}
                                    </div>
                                    <div class="w-20">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger as-child>
                                                <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
                                                    <MoreVertical class="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem v-if="file.file" @click="openMonacoEditor(file)">
                                                    <Code class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.edit') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem @click="renameFile(file)">
                                                    <FileEdit class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.rename') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem v-if="file.file" @click="downloadFile(file)">
                                                    <Download class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.download') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem @click="copyFile(file)">
                                                    <Copy class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.copy') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    v-if="file.file && isArchive(file)"
                                                    @click="extractFile(file)"
                                                >
                                                    <Archive class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.extract') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem @click="changePermissions(file)">
                                                    <Settings class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.permissions') }}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    class="text-destructive focus:text-destructive"
                                                    @click="deleteFile(file)"
                                                >
                                                    <Trash2 class="h-4 w-4 mr-2" />
                                                    {{ t('serverFiles.delete') }}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Upload File Dialog -->
        <Dialog v-model:open="showUploadDialog">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ t('serverFiles.uploadFile') }}</DialogTitle>
                    <DialogDescription>{{ t('serverFiles.uploadFileDescription') }}</DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="space-y-2">
                        <Label for="uploadFile">{{ t('serverFiles.selectFile') }}</Label>
                        <Input
                            id="uploadFile"
                            ref="fileInput"
                            type="file"
                            :disabled="uploading"
                            @change="handleFileSelect"
                        />
                    </div>
                    <div v-if="uploadProgress > 0" class="space-y-2">
                        <div class="flex justify-between text-sm">
                            <span>{{ t('serverFiles.uploading') }}</span>
                            <span>{{ uploadProgress }}%</span>
                        </div>
                        <div class="w-full bg-secondary rounded-full h-2">
                            <div
                                class="bg-primary h-2 rounded-full transition-all"
                                :style="{ width: uploadProgress + '%' }"
                            ></div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" :disabled="uploading" @click="showUploadDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button :disabled="!selectedFile || uploading" @click="uploadFile">
                        <Upload class="h-4 w-4 mr-2" />
                        {{ uploading ? t('serverFiles.uploading') : t('serverFiles.upload') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Create Folder Dialog -->
        <Dialog v-model:open="showCreateFolderDialog">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ t('serverFiles.createFolder') }}</DialogTitle>
                    <DialogDescription>{{ t('serverFiles.createFolderDescription') }}</DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="space-y-2">
                        <Label for="folderName">{{ t('serverFiles.folderName') }}</Label>
                        <Input
                            id="folderName"
                            v-model="newFolderName"
                            :placeholder="t('serverFiles.folderNamePlaceholder')"
                            @keyup.enter="createFolder"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" @click="showCreateFolderDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button :disabled="!newFolderName" @click="createFolder">
                        <FolderPlus class="h-4 w-4 mr-2" />
                        {{ t('serverFiles.create') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Rename Dialog -->
        <Dialog v-model:open="showRenameDialog">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ t('serverFiles.renameFile') }}</DialogTitle>
                    <DialogDescription>{{ t('serverFiles.renameFileDescription') }}</DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="space-y-2">
                        <Label for="newName">{{ t('serverFiles.newName') }}</Label>
                        <Input id="newName" v-model="newFileName" @keyup.enter="confirmRename" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" @click="showRenameDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button :disabled="!newFileName" @click="confirmRename">
                        <FileEdit class="h-4 w-4 mr-2" />
                        {{ t('serverFiles.rename') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Permissions Dialog -->
        <Dialog v-model:open="showPermissionsDialog">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ t('serverFiles.changePermissions') }}</DialogTitle>
                    <DialogDescription>{{ t('serverFiles.changePermissionsDescription') }}</DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="space-y-2">
                        <Label for="permissions">{{ t('serverFiles.permissions') }}</Label>
                        <Input
                            id="permissions"
                            v-model="newPermissions"
                            placeholder="755"
                            @keyup.enter="confirmPermissions"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" @click="showPermissionsDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button :disabled="!newPermissions" @click="confirmPermissions">
                        <Settings class="h-4 w-4 mr-2" />
                        {{ t('serverFiles.change') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Pull File Dialog -->
        <Dialog v-model:open="showPullDialog">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ t('serverFiles.pullFile') }}</DialogTitle>
                    <DialogDescription>{{ t('serverFiles.pullFileDescription') }}</DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="space-y-2">
                        <Label for="pullUrl">{{ t('serverFiles.fileUrl') }}</Label>
                        <Input id="pullUrl" v-model="pullUrl" placeholder="https://example.com/file.zip" type="url" />
                    </div>
                    <div class="space-y-2">
                        <Label for="pullFileName">{{ t('serverFiles.fileName') }} ({{ t('common.optional') }})</Label>
                        <Input
                            id="pullFileName"
                            v-model="pullFileName"
                            :placeholder="t('serverFiles.fileNamePlaceholder')"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" @click="showPullDialog = false">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button :disabled="!pullUrl" @click="pullFile">
                        <Download class="h-4 w-4 mr-2" />
                        {{ t('serverFiles.pull') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Removed shadcn-vue Checkbox import - using custom implementation
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    RefreshCw,
    Upload,
    FolderPlus,
    Home,
    ChevronRight,
    Download,
    Copy,
    Archive,
    Trash2,
    X,
    FolderOpen,
    FolderUp,
    File,
    FileText,
    Image,
    Video,
    Music,
    Code,
    Settings,
    MoreVertical,
    FileEdit,
    Folder,
} from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import type { Server } from '@/types/server';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const toast = useToast();

// Server and loading state
const server = ref<Server | null>(null);
const loading = ref(false);

const uploading = ref(false);

// File data
const files = ref<FileItem[]>([]);
const currentPath = ref('/');
const selectedFiles = ref<string[]>([]);

// Dialog states
const showUploadDialog = ref(false);
const showCreateFolderDialog = ref(false);

const showRenameDialog = ref(false);
const showPermissionsDialog = ref(false);
const showPullDialog = ref(false);

// Form data
const selectedFile = ref<File | null>(null);
const uploadProgress = ref(0);
const newFolderName = ref('');

const renamingFile = ref<FileItem | null>(null);
const newFileName = ref('');
const permissionsFile = ref<FileItem | null>(null);
const newPermissions = ref('');
const pullUrl = ref('');
const pullFileName = ref('');

// File input ref
const fileInput = ref<HTMLInputElement>();

// Types
interface FileItem {
    name: string;
    size: number;
    directory: boolean;
    file: boolean;
    symlink: boolean;
    mime: string;
    created: string;
    modified: string;
    mode: string;
    mode_bits: string;
}

// Computed properties
const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverFiles.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/files` },
]);

const pathSegments = computed(() => {
    return currentPath.value.split('/').filter((segment) => segment.length > 0);
});

const allFilesSelected = computed(() => {
    return files.value.length > 0 && selectedFiles.value.length === files.value.length;
});

const someFilesSelected = computed(() => {
    return selectedFiles.value.length > 0 && selectedFiles.value.length < files.value.length;
});

// Lifecycle
onMounted(async () => {
    await sessionStore.checkSessionOrRedirect(router);
    await settingsStore.fetchSettings();
    await fetchServer();
    await refreshFiles();
});

// Server fetching (following ServerLogs pattern)
async function fetchServer(): Promise<void> {
    try {
        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}`);
        if (response.data.success) {
            server.value = response.data.data;
        } else {
            toast.error(t('serverFiles.failedToFetchServer'));
            router.push('/dashboard');
        }
    } catch {
        toast.error(t('serverFiles.failedToFetchServer'));
        router.push('/dashboard');
    }
}

// File operations
const refreshFiles = async () => {
    loading.value = true;
    try {
        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}/files`, {
            params: { path: currentPath.value },
        });

        if (response.data.success) {
            files.value = response.data.data.contents || [];
            clearSelection();
        } else {
            toast.error(response.data.message || t('serverFiles.errorLoadingFiles'));
        }
    } catch (error) {
        console.error('Error loading files:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.errorLoadingFiles'));
    } finally {
        loading.value = false;
    }
};

const navigateToPath = (path: string) => {
    currentPath.value = path;
    refreshFiles();
};

const navigateUp = () => {
    const segments = currentPath.value.split('/').filter((s) => s.length > 0);
    segments.pop();
    navigateToPath('/' + segments.join('/'));
};

const getPathUpTo = (index: number) => {
    const segments = pathSegments.value.slice(0, index + 1);
    return '/' + segments.join('/');
};

const toggleSelectAll = (checked: boolean) => {
    if (checked) {
        // Select all files and folders
        selectedFiles.value = [...files.value.map((f) => f.name)];
    } else {
        clearSelection();
    }
};

const toggleFileSelection = (fileName: string) => {
    const index = selectedFiles.value.indexOf(fileName);
    if (index > -1) {
        selectedFiles.value.splice(index, 1);
    } else {
        selectedFiles.value.push(fileName);
    }
};

const clearSelection = () => {
    selectedFiles.value = [];
};

const handleFileClick = (file: FileItem) => {
    if (file.file) {
        openMonacoEditor(file);
    } else {
        const newPath = currentPath.value.endsWith('/')
            ? currentPath.value + file.name
            : currentPath.value + '/' + file.name;
        navigateToPath(newPath);
    }
};

const getFileIcon = (file: FileItem) => {
    if (!file.file) return Folder;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const mime = file.mime?.toLowerCase();

    if (mime?.startsWith('image/')) return Image;
    if (mime?.startsWith('video/')) return Video;
    if (mime?.startsWith('audio/')) return Music;

    // Programming/code files
    if (
        [
            'js',
            'ts',
            'vue',
            'html',
            'css',
            'php',
            'py',
            'java',
            'cpp',
            'c',
            'go',
            'rs',
            'rb',
            'swift',
            'kt',
            'scala',
        ].includes(ext || '')
    ) {
        return Code;
    }

    // Text files (including weird extensions like txtd, logd, etc.)
    if (
        ext &&
        ([
            'txt',
            'md',
            'json',
            'xml',
            'yml',
            'yaml',
            'log',
            'conf',
            'config',
            'ini',
            'env',
            'sh',
            'bash',
            'zsh',
        ].includes(ext) ||
            ext.startsWith('txt') || // txtd, txt1, etc.
            ext.startsWith('log') || // logd, log1, etc.
            ext.startsWith('conf') || // confd, conf1, etc.
            mime?.includes('text/') ||
            mime?.includes('application/json') ||
            mime?.includes('application/xml'))
    ) {
        return FileText;
    }

    return File;
};

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
};

const isArchive = (file: FileItem) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const mime = file.mime?.toLowerCase();

    // Check by extension (including weird ones)
    const archiveExtensions = ['zip', 'tar', 'gz', 'tgz', '7z', 'rar', 'bz2', 'xz', 'lzma', 'cab', 'iso', 'dmg'];
    if (ext && archiveExtensions.includes(ext)) return true;

    // Check by MIME type
    if (
        mime &&
        (mime.includes('zip') ||
            mime.includes('tar') ||
            mime.includes('gzip') ||
            mime.includes('compress') ||
            mime.includes('archive') ||
            mime.includes('x-7z') ||
            mime.includes('x-rar'))
    ) {
        return true;
    }

    return false;
};

// File operation implementations
const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    selectedFile.value = target.files?.[0] || null;
};

const uploadFile = async () => {
    if (!selectedFile.value) return;

    uploading.value = true;
    uploadProgress.value = 0;

    try {
        const response = await axios.post(
            `/api/user/servers/${route.params.uuidShort}/upload-file?path=${encodeURIComponent(currentPath.value)}&filename=${encodeURIComponent(selectedFile.value.name)}`,
            selectedFile.value,
            {
                headers: {
                    'Content-Type': 'application/octet-stream',
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    }
                },
            },
        );

        if (response.data.success) {
            toast.success(t('serverFiles.uploadSuccess'));
            showUploadDialog.value = false;
            selectedFile.value = null;
            uploadProgress.value = 0;
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.uploadError'));
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.uploadError'));
    } finally {
        uploading.value = false;
        if (fileInput.value) {
            fileInput.value.value = '';
        }
    }
};

const createFolder = async () => {
    if (!newFolderName.value) return;

    try {
        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/create-directory`, {
            name: newFolderName.value,
            path: currentPath.value,
        });

        if (response.data.success) {
            toast.success(t('serverFiles.folderCreated'));
            showCreateFolderDialog.value = false;
            newFolderName.value = '';
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.createFolderError'));
        }
    } catch (error) {
        console.error('Error creating folder:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.createFolderError'));
    }
};

const openMonacoEditor = (file: FileItem) => {
    if (!file.file) return;

    router.push({
        name: 'ServerFileEditor',
        params: { uuidShort: route.params.uuidShort },
        query: {
            file: file.name,
            path: currentPath.value,
            readonly: 'false',
        },
    });
};

const downloadFile = (file: FileItem) => {
    const filePath = currentPath.value.endsWith('/')
        ? currentPath.value + file.name
        : currentPath.value + '/' + file.name;

    const url = `/api/user/servers/${route.params.uuidShort}/download-file?path=${encodeURIComponent(filePath)}`;
    window.open(url, '_blank');
};

const renameFile = (file: FileItem) => {
    renamingFile.value = file;
    newFileName.value = file.name;
    showRenameDialog.value = true;
};

const confirmRename = async () => {
    if (!renamingFile.value || !newFileName.value) return;

    try {
        const response = await axios.put(`/api/user/servers/${route.params.uuidShort}/rename`, {
            root: currentPath.value,
            files: [
                {
                    from: renamingFile.value.name,
                    to: newFileName.value,
                },
            ],
        });

        if (response.data.success) {
            toast.success(t('serverFiles.fileRenamed'));
            showRenameDialog.value = false;
            renamingFile.value = null;
            newFileName.value = '';
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.renameError'));
        }
    } catch (error) {
        console.error('Error renaming file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.renameError'));
    }
};

const deleteFile = async (file: FileItem) => {
    if (!confirm(t('serverFiles.confirmDelete', { name: file.name }))) return;

    try {
        const response = await axios.delete(`/api/user/servers/${route.params.uuidShort}/delete-files`, {
            data: {
                root: currentPath.value,
                files: [file.name],
            },
        });

        if (response.data.success) {
            toast.success(t('serverFiles.fileDeleted'));
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.deleteError'));
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.deleteError'));
    }
};

const deleteSelected = async () => {
    if (selectedFiles.value.length === 0) {
        toast.error(t('serverFiles.noFilesSelected'));
        return;
    }

    const fileNames = selectedFiles.value.join(', ');
    if (!confirm(t('serverFiles.confirmDeleteSelected', { count: selectedFiles.value.length, files: fileNames })))
        return;

    loading.value = true;
    try {
        const response = await axios.delete(`/api/user/servers/${route.params.uuidShort}/delete-files`, {
            data: {
                root: currentPath.value,
                files: selectedFiles.value,
            },
        });

        if (response.data.success) {
            toast.success(t('serverFiles.filesDeleted', { count: selectedFiles.value.length }));
            clearSelection();
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.deleteError'));
        }
    } catch (error) {
        console.error('Error deleting files:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.deleteError'));
    } finally {
        loading.value = false;
    }
};

const copyFile = (file: FileItem) => {
    // Implementation for copy functionality
    const filePath = currentPath.value.endsWith('/')
        ? currentPath.value + file.name
        : currentPath.value + '/' + file.name;

    // For now, copy the path to clipboard
    navigator.clipboard
        .writeText(filePath)
        .then(() => {
            toast.success(t('serverFiles.pathCopied'));
        })
        .catch(() => {
            toast.error(t('serverFiles.copyError'));
        });
};

const copySelected = () => {
    // Implementation for copy selected functionality
    const paths = selectedFiles.value.map((fileName) => {
        return currentPath.value.endsWith('/') ? currentPath.value + fileName : currentPath.value + '/' + fileName;
    });

    navigator.clipboard
        .writeText(paths.join('\n'))
        .then(() => {
            toast.success(t('serverFiles.pathsCopied'));
        })
        .catch(() => {
            toast.error(t('serverFiles.copyError'));
        });
};

const compressSelected = async () => {
    if (selectedFiles.value.length === 0) {
        toast.error(t('serverFiles.noFilesSelected'));
        return;
    }

    loading.value = true;
    try {
        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/compress-files`, {
            root: currentPath.value,
            files: selectedFiles.value,
        });

        if (response.data.success) {
            toast.success(t('serverFiles.filesCompressed', { count: selectedFiles.value.length }));
            clearSelection();
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.compressError'));
        }
    } catch (error) {
        console.error('Error compressing files:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.compressError'));
    } finally {
        loading.value = false;
    }
};

const extractFile = async (file: FileItem) => {
    try {
        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/decompress-archive`, {
            file: file.name,
            root: currentPath.value,
        });

        if (response.data.success) {
            toast.success(t('serverFiles.fileExtracted'));
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.extractError'));
        }
    } catch (error) {
        console.error('Error extracting file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.extractError'));
    }
};

const changePermissions = (file: FileItem) => {
    permissionsFile.value = file;
    newPermissions.value = file.mode_bits || '755';
    showPermissionsDialog.value = true;
};

const confirmPermissions = async () => {
    if (!permissionsFile.value || !newPermissions.value) return;

    try {
        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/change-permissions`, {
            root: currentPath.value,
            files: [
                {
                    file: permissionsFile.value.name,
                    mode: newPermissions.value,
                },
            ],
        });

        if (response.data.success) {
            toast.success(t('serverFiles.permissionsChanged'));
            showPermissionsDialog.value = false;
            permissionsFile.value = null;
            newPermissions.value = '';
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.permissionsError'));
        }
    } catch (error) {
        console.error('Error changing permissions:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.permissionsError'));
    }
};

const pullFile = async () => {
    if (!pullUrl.value) return;

    try {
        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/pull-file`, {
            url: pullUrl.value,
            root: currentPath.value,
            fileName: pullFileName.value || undefined,
        });

        if (response.data.success) {
            toast.success(t('serverFiles.pullStarted'));
            showPullDialog.value = false;
            pullUrl.value = '';
            pullFileName.value = '';
            refreshFiles();
        } else {
            toast.error(response.data.message || t('serverFiles.pullError'));
        }
    } catch (error) {
        console.error('Error pulling file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || t('serverFiles.pullError'));
    }
};

const downloadSelected = () => {
    if (selectedFiles.value.length === 0) {
        toast.error(t('serverFiles.noFilesSelected'));
        return;
    }

    const filesToDownload = selectedFiles.value.filter((fileName) => {
        const file = files.value.find((f) => f.name === fileName);
        return file?.file; // Only download actual files, not directories
    });

    if (filesToDownload.length === 0) {
        toast.error(t('serverFiles.noDownloadableFiles'));
        return;
    }

    filesToDownload.forEach((fileName) => {
        const file = files.value.find((f) => f.name === fileName);
        if (file) {
            downloadFile(file);
        }
    });

    toast.success(t('serverFiles.downloadStarted', { count: filesToDownload.length }));
};
</script>
