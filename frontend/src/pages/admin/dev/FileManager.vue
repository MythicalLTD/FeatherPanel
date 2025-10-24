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
const isEditorFullscreen = ref(false);
const editorWindowPosition = ref({ x: 100, y: 100 });
const editorWindowSize = ref({ width: 1200, height: 800 });
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

const toast = useToast();

const showWarning = ref(true);

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

function toggleEditorFullscreen() {
    isEditorFullscreen.value = !isEditorFullscreen.value;
    if (isEditorFullscreen.value) {
        // Center the window when opening
        editorWindowPosition.value = {
            x: Math.max(50, (window.innerWidth - editorWindowSize.value.width) / 2),
            y: Math.max(50, (window.innerHeight - editorWindowSize.value.height) / 2),
        };
    }
}

function startDrag(event: MouseEvent) {
    if (!isEditorFullscreen.value) return;

    isDragging.value = true;
    const rect = (event.target as HTMLElement).closest('.editor-window')?.getBoundingClientRect();
    if (rect) {
        dragOffset.value = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
    event.preventDefault();
}

function handleDrag(event: MouseEvent) {
    if (!isDragging.value) return;

    editorWindowPosition.value = {
        x: Math.max(0, Math.min(window.innerWidth - editorWindowSize.value.width, event.clientX - dragOffset.value.x)),
        y: Math.max(
            0,
            Math.min(window.innerHeight - editorWindowSize.value.height, event.clientY - dragOffset.value.y),
        ),
    };
}

function stopDrag() {
    isDragging.value = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
}

// Cleanup event listeners
onMounted(() => {
    browseDirectory();
});

onUnmounted(() => {
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
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
                        <Button
                            variant="outline"
                            :disabled="loading"
                            data-umami-event="Refresh file manager"
                            @click="browseDirectory(currentPath)"
                            >Refresh</Button
                        >
                        <Button data-umami-event="Create file" @click="showCreateDialog = true">Create File</Button>
                    </div>
                </div>

                <div
                    v-if="showWarning"
                    class="relative rounded-lg border border-yellow-500 bg-black/60 text-yellow-100 p-6 mb-6 flex flex-col items-center justify-center shadow-lg backdrop-blur"
                >
                    <Button
                        variant="ghost"
                        size="sm"
                        class="absolute top-2 right-2 text-yellow-200 hover:text-white"
                        @click="showWarning = false"
                    >
                        ✕
                    </Button>
                    <div class="text-4xl font-extrabold text-yellow-300 mb-2 text-center">
                        ⚠️ WOAHHHH BRRR SKRRRRRRRRRRR WAIT A BIT SKIDOOO ⚠️
                    </div>
                    <div class="text-lg font-semibold text-yellow-200 text-center mb-1">
                        Please do <span class="underline">NOT</span> modify files directly from here!
                    </div>
                    <div class="text-base text-yellow-100/90 text-center">
                        Every update here will <span class="font-bold">overwrite</span> those files.<br />
                        <span class="font-semibold">Only secure folders to write or read are:</span>
                        <ul class="list-disc list-inside mt-2 text-yellow-100">
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
                    <Card class="p-0 overflow-hidden" :class="{ 'opacity-50 pointer-events-none': isEditorFullscreen }">
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
                    <Card class="p-0 overflow-hidden" :class="{ hidden: isEditorFullscreen }">
                        <div class="p-4 border-b flex items-center justify-between">
                            <div class="font-semibold">
                                {{ selectedFile ? selectedFile.name : 'No file selected' }}
                            </div>
                            <div class="flex items-center gap-2">
                                <Button
                                    v-if="selectedFile"
                                    variant="ghost"
                                    size="sm"
                                    :title="'Open in Window'"
                                    @click="toggleEditorFullscreen"
                                >
                                    🗖
                                </Button>
                                <div v-if="selectedFile && !isBinary" class="flex items-center gap-2">
                                    <Button size="sm" :disabled="saving" @click="saveFile">
                                        {{ saving ? 'Saving...' : 'Save' }}
                                    </Button>
                                </div>
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

                <!-- Editor Window -->
                <div
                    v-if="isEditorFullscreen && selectedFile"
                    class="editor-window"
                    :style="{
                        left: editorWindowPosition.x + 'px',
                        top: editorWindowPosition.y + 'px',
                        width: editorWindowSize.width + 'px',
                        height: editorWindowSize.height + 'px',
                    }"
                >
                    <!-- Window Header -->
                    <div class="window-header" @mousedown="startDrag">
                        <div class="flex items-center gap-2">
                            <div class="window-controls">
                                <div class="window-control close" @click="toggleEditorFullscreen"></div>
                                <div class="window-control minimize"></div>
                                <div class="window-control maximize"></div>
                            </div>
                            <div class="window-title">📄 {{ selectedFile.name }}</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <Button size="sm" :disabled="saving" variant="ghost" @click="saveFile">
                                {{ saving ? 'Saving...' : 'Save' }}
                            </Button>
                        </div>
                    </div>

                    <!-- Window Content -->
                    <div class="window-content">
                        <div v-if="isBinary" class="flex items-center justify-center h-full text-muted-foreground">
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

/* Editor Window Styles */
.editor-window {
    position: fixed;
    z-index: 1000;
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    box-shadow:
        0 20px 25px -5px rgba(0, 0, 0, 0.1),
        0 10px 10px -5px rgba(0, 0, 0, 0.04),
        0 0 0 1px rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(16px);
    display: flex;
    flex-direction: column;
    min-width: 400px;
    min-height: 300px;
    transform: translateZ(0); /* Hardware acceleration */
}

/* Window Header */
.window-header {
    background: hsl(var(--muted) / 0.5);
    border-bottom: 1px solid hsl(var(--border));
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: move;
    border-radius: 8px 8px 0 0;
    user-select: none;
}

.window-header:hover {
    background: hsl(var(--muted) / 0.7);
}

/* Window Controls */
.window-controls {
    display: flex;
    gap: 8px;
    margin-right: 12px;
}

.window-control {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
}

.window-control.close {
    background: #ff5f56;
    border: 1px solid #e04a3f;
}

.window-control.minimize {
    background: #ffbd2e;
    border: 1px solid #dea123;
}

.window-control.maximize {
    background: #27ca3f;
    border: 1px solid #1dad2b;
}

.window-control:hover {
    opacity: 0.8;
    transform: scale(1.1);
}

.window-control.close:hover::after {
    content: '✕';
    color: #921419;
    font-size: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
}

/* Window Title */
.window-title {
    font-size: 14px;
    font-weight: 600;
    color: hsl(var(--foreground));
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

/* Window Content */
.window-content {
    flex: 1;
    border-radius: 0 0 8px 8px;
    overflow: hidden;
    background: hsl(var(--background));
}

/* Dragging state */
.editor-window:has(.window-header:active) {
    cursor: grabbing;
    user-select: none;
}

/* Smooth transitions */
.editor-window {
    transition: transform 0.1s ease-out;
}

/* Backdrop when window is open */
.editor-window::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.1);
    z-index: -1;
    pointer-events: none;
}
</style>
