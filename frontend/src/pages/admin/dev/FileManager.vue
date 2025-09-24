<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from 'vue-toastification';
import { VAceEditor } from 'vue3-ace-editor';

// Import ACE Editor modes and themes
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-typescript';
import 'ace-builds/src-noconflict/mode-php';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/mode-xml';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/mode-css';
import 'ace-builds/src-noconflict/mode-scss';
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/mode-markdown';
import 'ace-builds/src-noconflict/mode-text';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-searchbox';

interface FileItem {
    name: string;
    path: string;
    isDirectory: boolean;
    size: number | null;
    modified: number;
    permissions: string;
}

interface BrowseResponse {
    success: boolean;
    data: {
        path: string;
        items: FileItem[];
        parent: string | null;
    };
    message?: string;
}

interface FileResponse {
    success: boolean;
    data: {
        path: string;
        content: string | null;
        isBinary: boolean;
        mimeType: string;
        extension: string;
        size: number;
        modified: number;
    };
    message?: string;
}

const currentPath = ref('');
const items = ref<FileItem[]>([]);
const selectedFile = ref<FileItem | null>(null);
const fileContent = ref('');
const isBinary = ref(false);
const loading = ref(false);
const saving = ref(false);
const showCreateDialog = ref(false);
const newFileName = ref('');
const createAsDirectory = ref(false);

const toast = useToast();

// ACE Editor language mapping
const getLanguageFromExtension = (extension: string): string => {
    const langMap: Record<string, string> = {
        js: 'javascript',
        ts: 'typescript',
        vue: 'html',
        php: 'php',
        py: 'python',
        json: 'json',
        yaml: 'yaml',
        yml: 'yaml',
        xml: 'xml',
        html: 'html',
        css: 'css',
        scss: 'scss',
        sql: 'sql',
        md: 'markdown',
        txt: 'text',
        log: 'text',
        fplog: 'text',
    };
    return langMap[extension.toLowerCase()] || 'text';
};

async function browseDirectory(path: string = '') {
    loading.value = true;
    try {
        const params = new URLSearchParams();
        if (path) params.append('path', path);

        const resp = await fetch(`/api/admin/file-manager/browse?${params}`);
        const json: BrowseResponse = await resp.json();

        if (json.success) {
            currentPath.value = json.data.path;
            items.value = json.data.items;
        } else {
            toast.error('Failed to browse directory: ' + (json.message || 'Unknown error'));
        }
    } catch (e) {
        console.error('Failed to browse directory:', e);
        toast.error('Failed to browse directory: Network error');
    } finally {
        loading.value = false;
    }
}

async function openFile(file: FileItem) {
    if (file.isDirectory) {
        browseDirectory(file.path);
        return;
    }

    loading.value = true;
    try {
        const params = new URLSearchParams({ path: file.path });
        const resp = await fetch(`/api/admin/file-manager/read?${params}`);
        const json: FileResponse = await resp.json();

        if (json.success) {
            selectedFile.value = file;
            isBinary.value = json.data.isBinary;

            if (json.data.isBinary) {
                fileContent.value = 'Binary file - cannot edit';
                toast.warning('Binary file detected - cannot edit');
            } else {
                fileContent.value = json.data.content || '';
                toast.success(`Opened ${file.name}`);
            }
        } else {
            toast.error('Failed to open file: ' + (json.message || 'Unknown error'));
        }
    } catch (e) {
        console.error('Failed to open file:', e);
        toast.error('Failed to open file: Network error');
    } finally {
        loading.value = false;
    }
}

// Get current file language for ACE Editor
const getCurrentLanguage = () => {
    if (!selectedFile.value) return 'text';
    const extension = selectedFile.value.name.split('.').pop() || '';
    return getLanguageFromExtension(extension);
};

async function saveFile() {
    if (!selectedFile.value || isBinary.value) return;

    saving.value = true;
    try {
        const resp = await fetch('/api/admin/file-manager/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                path: selectedFile.value.path,
                content: fileContent.value,
            }),
        });

        const json = await resp.json();
        if (json.success) {
            toast.success(`File ${selectedFile.value.name} saved successfully`);
            // Refresh the file list to update modification time
            browseDirectory(currentPath.value);
        } else {
            toast.error('Failed to save file: ' + (json.message || 'Unknown error'));
        }
    } catch (e) {
        console.error('Failed to save file:', e);
        toast.error('Failed to save file: Network error');
    } finally {
        saving.value = false;
    }
}

async function createFile() {
    if (!newFileName.value.trim()) {
        toast.warning('Please enter a file name');
        return;
    }

    try {
        const fullPath = currentPath.value ? `${currentPath.value}/${newFileName.value}` : newFileName.value;

        const resp = await fetch('/api/admin/file-manager/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                path: fullPath,
                isDirectory: createAsDirectory.value.toString(),
            }),
        });

        const json = await resp.json();
        if (json.success) {
            const itemType = createAsDirectory.value ? 'directory' : 'file';
            toast.success(
                `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} ${newFileName.value} created successfully`,
            );
            showCreateDialog.value = false;
            newFileName.value = '';
            createAsDirectory.value = false;
            browseDirectory(currentPath.value);
        } else {
            toast.error(
                'Failed to create ' +
                    (createAsDirectory.value ? 'directory' : 'file') +
                    ': ' +
                    (json.message || 'Unknown error'),
            );
        }
    } catch (e) {
        console.error('Failed to create file:', e);
        toast.error('Failed to create ' + (createAsDirectory.value ? 'directory' : 'file') + ': Network error');
    }
}

async function deleteFile(file: FileItem) {
    if (!confirm(`Are you sure you want to delete ${file.isDirectory ? 'directory' : 'file'} "${file.name}"?`)) {
        return;
    }

    try {
        const resp = await fetch('/api/admin/file-manager/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                path: file.path,
            }),
        });

        const json = await resp.json();
        if (json.success) {
            const itemType = file.isDirectory ? 'directory' : 'file';
            toast.success(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} ${file.name} deleted successfully`);
            browseDirectory(currentPath.value);
            if (selectedFile.value?.path === file.path) {
                selectedFile.value = null;
                fileContent.value = '';
            }
        } else {
            toast.error(
                'Failed to delete ' +
                    (file.isDirectory ? 'directory' : 'file') +
                    ': ' +
                    (json.message || 'Unknown error'),
            );
        }
    } catch (e) {
        console.error('Failed to delete file:', e);
        toast.error('Failed to delete ' + (file.isDirectory ? 'directory' : 'file') + ': Network error');
    }
}

function formatFileSize(bytes: number | null): string {
    if (bytes === null) return '-';
    if (bytes === 0) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
}

function goUp() {
    if (currentPath.value) {
        const parent = currentPath.value.split('/').slice(0, -1).join('/');
        browseDirectory(parent);
    }
}

onMounted(() => {
    browseDirectory();
});

onUnmounted(() => {
    // ACE Editor doesn't need manual cleanup
});
</script>

<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Dev', href: '/admin/dev' },
            { text: 'File Manager', isCurrent: true, href: '/admin/dev/files' },
        ]"
    >
        <div class="min-h-screen bg-background">
            <div class="p-6 space-y-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-bold text-foreground mb-1">File Manager</h1>
                        <p class="text-muted-foreground">Browse and edit project files</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Button variant="outline" :disabled="loading" @click="browseDirectory(currentPath)"
                            >Refresh</Button
                        >
                        <Button @click="showCreateDialog = true">Create File</Button>
                    </div>
                </div>

                <div
                    class="rounded-lg border-2 border-yellow-400 bg-yellow-100 p-6 mb-6 flex flex-col items-center justify-center shadow-lg"
                >
                    <div class="text-4xl font-extrabold text-yellow-600 mb-2 text-center">
                        ⚠️ WOAHHHH BRRR SKRRRRRRRRRRR WAIT A BIT SKIDOOO ⚠️
                    </div>
                    <div class="text-lg font-semibold text-yellow-700 text-center mb-1">
                        Please do <span class="underline">NOT</span> modify files directly from here!
                    </div>
                    <div class="text-base text-yellow-800 text-center">
                        Every update here will <span class="font-bold">overwrite</span> those files.<br />
                        <span class="font-semibold">Only secure folders to write or read are:</span>
                        <ul class="list-disc list-inside mt-2 text-yellow-900">
                            <li><code>storage/addons</code></li>
                            <li><code>public/attachements</code></li>
                            <li><code>public/</code></li>
                        </ul>
                        <div class="mt-2">
                            <span class="italic"
                                >Editing outside these folders may break your panel or be lost on update!</span
                            >
                        </div>
                    </div>
                </div>

                <!-- Current Path -->
                <Card class="p-4">
                    <div class="flex items-center gap-2">
                        <Button variant="ghost" size="sm" :disabled="!currentPath" @click="goUp">← Up</Button>
                        <span class="text-sm text-muted-foreground"> Current: {{ currentPath || '/' }} </span>
                    </div>
                </Card>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- File Browser -->
                    <Card class="p-0 overflow-hidden">
                        <div class="p-4 border-b">
                            <div class="font-semibold">Files & Directories</div>
                        </div>
                        <div class="max-h-[600px] overflow-auto">
                            <div v-if="loading" class="flex items-center justify-center py-8">
                                <div
                                    class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"
                                ></div>
                            </div>
                            <div v-else class="divide-y">
                                <div
                                    v-for="item in items"
                                    :key="item.path"
                                    class="p-3 hover:bg-muted/50 cursor-pointer flex items-center justify-between group"
                                    @click="openFile(item)"
                                >
                                    <div class="flex items-center gap-3">
                                        <div class="text-lg">
                                            {{ item.isDirectory ? '📁' : '📄' }}
                                        </div>
                                        <div>
                                            <div class="font-medium">{{ item.name }}</div>
                                            <div class="text-xs text-muted-foreground">
                                                {{ formatDate(item.modified) }}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div class="text-xs text-muted-foreground">
                                            {{ item.isDirectory ? 'DIR' : formatFileSize(item.size) }}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="opacity-0 group-hover:opacity-100"
                                            @click.stop="deleteFile(item)"
                                        >
                                            🗑️
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <!-- File Editor -->
                    <Card class="p-0 overflow-hidden">
                        <div class="p-4 border-b flex items-center justify-between">
                            <div class="font-semibold">
                                {{ selectedFile ? selectedFile.name : 'No file selected' }}
                            </div>
                            <div v-if="selectedFile && !isBinary" class="flex items-center gap-2">
                                <Button size="sm" :disabled="saving" @click="saveFile">
                                    {{ saving ? 'Saving...' : 'Save' }}
                                </Button>
                            </div>
                        </div>
                        <div class="h-[600px]">
                            <div
                                v-if="!selectedFile"
                                class="flex items-center justify-center h-full text-muted-foreground"
                            >
                                Select a file to edit
                            </div>
                            <div
                                v-else-if="isBinary"
                                class="flex items-center justify-center h-full text-muted-foreground"
                            >
                                Binary file - cannot edit
                            </div>
                            <v-ace-editor
                                v-else
                                v-model:value="fileContent"
                                :lang="getCurrentLanguage()"
                                theme="monokai"
                                style="height: 100%; width: 100%"
                                :options="{
                                    fontSize: 14,
                                    showPrintMargin: false,
                                    wrap: true,
                                    enableBasicAutocompletion: true,
                                    enableLiveAutocompletion: true,
                                    enableSnippets: true,
                                    showLineNumbers: true,
                                    tabSize: 2,
                                    useSoftTabs: true,
                                    highlightActiveLine: true,
                                    showGutter: true,
                                    fixedWidthGutter: true,
                                }"
                            />
                        </div>
                    </Card>
                </div>

                <!-- Create File Dialog -->
                <div v-if="showCreateDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card class="w-96 p-6">
                        <div class="mb-4">
                            <h3 class="text-lg font-semibold mb-2">Create New</h3>
                            <div class="space-y-4">
                                <div>
                                    <label class="text-sm font-medium">Name</label>
                                    <Input v-model="newFileName" placeholder="filename.txt" />
                                </div>
                                <div class="flex items-center gap-2">
                                    <input id="createAsDirectory" v-model="createAsDirectory" type="checkbox" />
                                    <label for="createAsDirectory" class="text-sm">Create as directory</label>
                                </div>
                            </div>
                        </div>
                        <div class="flex justify-end gap-2">
                            <Button variant="outline" @click="showCreateDialog = false">Cancel</Button>
                            <Button @click="createFile">Create</Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    </DashboardLayout>
</template>

<style scoped>
/* ACE Editor styles */
:deep(.ace_editor) {
    border-radius: 0;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style>
