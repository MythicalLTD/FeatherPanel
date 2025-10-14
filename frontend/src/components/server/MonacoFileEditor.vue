<template>
    <div class="flex flex-col h-full border-2 rounded-lg overflow-hidden shadow-sm">
        <!-- Editor Header -->
        <div
            class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b bg-muted/30 gap-3 sm:gap-0"
        >
            <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <component :is="getFileIcon()" class="h-4 w-4 text-primary" />
                </div>
                <div class="min-w-0 flex-1">
                    <h3 class="font-semibold text-sm truncate">{{ fileName }}</h3>
                    <p class="text-xs text-muted-foreground truncate">{{ filePath }}</p>
                </div>
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto">
                <!-- Language Selector -->
                <Select v-model="selectedLanguage" @update:model-value="changeLanguage">
                    <SelectTrigger class="w-24 sm:w-32 text-xs h-8">
                        <SelectValue :placeholder="t('fileEditor.language')" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem v-for="lang in availableLanguages" :key="lang.value" :value="lang.value">
                            {{ lang.label }}
                        </SelectItem>
                    </SelectContent>
                </Select>

                <!-- Theme Toggle -->
                <Button variant="outline" size="sm" class="gap-1.5 h-8" @click="toggleTheme">
                    <Monitor v-if="editorTheme === 'chrome'" class="h-3.5 w-3.5" />
                    <Sun v-else-if="editorTheme === 'github'" class="h-3.5 w-3.5" />
                    <Moon v-else class="h-3.5 w-3.5" />
                    <span class="hidden sm:inline text-xs">{{
                        editorTheme === 'monokai'
                            ? t('fileEditor.themeDark')
                            : editorTheme === 'github'
                              ? t('fileEditor.themeLight')
                              : t('fileEditor.themeChrome')
                    }}</span>
                </Button>

                <!-- Save Button -->
                <Button :disabled="!hasChanges || saving || readonly" size="sm" class="gap-1.5 h-8" @click="saveFile">
                    <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin" />
                    <Save v-else class="h-3.5 w-3.5" />
                    <span class="hidden sm:inline text-xs">{{
                        saving ? t('fileEditor.saving') : t('fileEditor.save')
                    }}</span>
                </Button>

                <!-- Close Button -->
                <Button variant="outline" size="sm" class="h-8 gap-1.5" @click="closeEditor">
                    <X class="h-3.5 w-3.5" />
                    <span class="hidden sm:inline text-xs">{{ t('common.close') }}</span>
                </Button>
            </div>
        </div>

        <!-- File Info Bar -->
        <div
            class="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 sm:px-4 py-2 bg-background border-b text-xs sm:text-sm gap-2 sm:gap-0"
        >
            <div class="flex items-center gap-2 sm:gap-4 flex-wrap">
                <span class="text-muted-foreground">
                    {{ t('fileEditor.size') }}: {{ formatFileSize(originalContent.length) }}
                </span>
                <span class="text-muted-foreground"> {{ t('fileEditor.lines') }}: {{ lineCount }} </span>
                <span class="hidden sm:inline text-muted-foreground"> {{ t('fileEditor.encoding') }}: UTF-8 </span>
            </div>
            <div class="flex items-center gap-2 sm:gap-4 flex-wrap">
                <span v-if="hasChanges" class="text-orange-600 dark:text-orange-400 text-xs">
                    {{ t('fileEditor.unsavedChanges') }}
                </span>
                <span class="text-muted-foreground">
                    {{ t('fileEditor.position') }}: {{ cursorPosition.line }}:{{ cursorPosition.column }}
                </span>
            </div>
        </div>

        <!-- ACE Editor -->
        <div class="flex-1 relative">
            <v-ace-editor
                ref="aceEditor"
                v-model:value="editorContent"
                :lang="selectedLanguage"
                :theme="editorTheme"
                :options="editorOptions"
                class="h-full"
                style="height: 100%; width: 100%"
                @init="onEditorMount"
                @change="onContentChange"
            />
        </div>

        <!-- Editor Footer -->
        <div
            class="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 sm:px-4 py-2.5 border-t bg-muted/20 text-xs gap-2 sm:gap-0"
        >
            <div class="flex items-center gap-2 flex-wrap">
                <Button
                    variant="ghost"
                    size="sm"
                    :disabled="!canFormat"
                    class="h-7 text-xs gap-1.5"
                    @click="formatDocument"
                >
                    <AlignLeft class="h-3.5 w-3.5" />
                    <span>{{ t('fileEditor.format') }}</span>
                </Button>
                <Button variant="ghost" size="sm" class="h-7 text-xs gap-1.5" @click="findAndReplace">
                    <Search class="h-3.5 w-3.5" />
                    <span>{{ t('fileEditor.findReplace') }}</span>
                </Button>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-muted-foreground text-xs font-mono">{{ selectedLanguage.toUpperCase() }}</span>
                <Separator orientation="vertical" class="h-3" />
                <span class="text-muted-foreground text-xs">{{
                    editorTheme === 'monokai'
                        ? t('fileEditor.themeDark')
                        : editorTheme === 'github'
                          ? t('fileEditor.themeLight')
                          : t('fileEditor.themeChrome')
                }}</span>
            </div>
        </div>
    </div>
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

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast, TYPE } from 'vue-toastification';
import { VAceEditor } from 'vue3-ace-editor';

// Import ACE Editor modes and themes
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-typescript';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/mode-css';
import 'ace-builds/src-noconflict/mode-scss';
import 'ace-builds/src-noconflict/mode-php';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/mode-golang';
import 'ace-builds/src-noconflict/mode-rust';
import 'ace-builds/src-noconflict/mode-ruby';
import 'ace-builds/src-noconflict/mode-swift';
import 'ace-builds/src-noconflict/mode-kotlin';
import 'ace-builds/src-noconflict/mode-scala';
import 'ace-builds/src-noconflict/mode-vue';
import 'ace-builds/src-noconflict/mode-xml';
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/mode-markdown';
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/mode-sh';
import 'ace-builds/src-noconflict/mode-dockerfile';
import 'ace-builds/src-noconflict/mode-ini';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-chrome';
import 'ace-builds/src-noconflict/ext-searchbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Save,
    X,
    Monitor,
    Sun,
    Moon,
    Loader2,
    AlignLeft,
    Search,
    FileText,
    Code,
    Image,
    Video,
    Music,
    Archive,
    File,
} from 'lucide-vue-next';

interface Props {
    fileName: string;
    filePath: string;
    content: string;
    readonly?: boolean;
}

interface Emits {
    (e: 'save', content: string): void;
    (e: 'close'): void;
}

const props = withDefaults(defineProps<Props>(), {
    readonly: false,
});

const emit = defineEmits<Emits>();

const { t } = useI18n();
const toast = useToast();

// Editor state
const aceEditor = ref();
const editorContent = ref(props.content);
const originalContent = ref(props.content);
const saving = ref(false);
const selectedLanguage = ref('text');
const editorTheme = ref<'monokai' | 'chrome' | 'github'>('monokai');

// Editor position tracking
const cursorPosition = ref({ line: 1, column: 1 });

// Available languages for ACE Editor
const availableLanguages = [
    { value: 'text', label: 'Plain Text' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'json', label: 'JSON' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'scss', label: 'SCSS' },
    { value: 'php', label: 'PHP' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'c_cpp', label: 'C/C++' },
    { value: 'golang', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'scala', label: 'Scala' },
    { value: 'vue', label: 'Vue' },
    { value: 'xml', label: 'XML' },
    { value: 'yaml', label: 'YAML' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'sql', label: 'SQL' },
    { value: 'sh', label: 'Shell' },
    { value: 'dockerfile', label: 'Dockerfile' },
    { value: 'ini', label: 'INI/Config' },
];

// ACE Editor options
const editorOptions = computed(() => {
    return {
        fontSize: isMobile.value ? 12 : 14,
        fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
        showLineNumbers: true,
        showGutter: true,
        wrap: true,
        showPrintMargin: false,
        readOnly: props.readonly,
        tabSize: 4,
        useSoftTabs: true,
        enableBasicAutocompletion: !isMobile.value,
        enableLiveAutocompletion: !isMobile.value,
        enableSnippets: !isMobile.value,
        highlightActiveLine: true,
        highlightSelectedWord: true,
        fixedWidthGutter: true,
        scrollPastEnd: false,
        behavioursEnabled: true,
        wrapBehavioursEnabled: true,
        autoScrollEditorIntoView: true,
        mergeUndoDeltas: true,
    };
});

// Computed properties
const hasChanges = computed(() => editorContent.value !== originalContent.value);

const lineCount = computed(() => editorContent.value.split('\n').length);

const canFormat = computed(() => {
    const formattableLanguages = ['javascript', 'typescript', 'json', 'html', 'css', 'scss', 'php', 'python'];
    return formattableLanguages.includes(selectedLanguage.value);
});

// Detect language from file extension
const detectLanguage = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
        js: 'javascript',
        ts: 'typescript',
        vue: 'vue',
        html: 'html',
        htm: 'html',
        css: 'css',
        scss: 'scss',
        sass: 'scss',
        less: 'css',
        php: 'php',
        py: 'python',
        java: 'java',
        cpp: 'c_cpp',
        c: 'c_cpp',
        go: 'golang',
        rs: 'rust',
        rb: 'ruby',
        swift: 'swift',
        kt: 'kotlin',
        scala: 'scala',
        json: 'json',
        xml: 'xml',
        yml: 'yaml',
        yaml: 'yaml',
        md: 'markdown',
        sql: 'sql',
        sh: 'sh',
        bash: 'sh',
        zsh: 'sh',
        dockerfile: 'dockerfile',
        ini: 'ini',
        conf: 'ini',
        config: 'ini',
        env: 'ini',
        properties: 'ini',
        toml: 'ini',
    };
    return languageMap[ext || ''] || 'text';
};

// Get file icon based on extension/language
const getFileIcon = () => {
    const ext = props.fileName.split('.').pop()?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext || '')) return Image;
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext || '')) return Video;
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(ext || '')) return Music;
    if (['zip', 'tar', 'gz', 'rar', '7z', 'bz2'].includes(ext || '')) return Archive;
    if (['js', 'ts', 'vue', 'html', 'css', 'php', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'rb'].includes(ext || ''))
        return Code;
    if (['txt', 'md', 'json', 'xml', 'yml', 'yaml', 'log', 'conf'].includes(ext || '')) return FileText;

    return File;
};

// Format file size
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Editor event handlers
const onEditorMount = (editor: unknown) => {
    const aceEditorInstance = editor as {
        on: (event: string, callback: () => void) => void;
        getCursorPosition: () => { row: number; column: number };
        commands: {
            addCommand: (command: { name: string; bindKey: { win: string; mac: string }; exec: () => void }) => void;
        };
        focus: () => void;
    };

    aceEditor.value = aceEditorInstance;

    // Track cursor position
    aceEditorInstance.on('changeSelection', () => {
        const position = aceEditorInstance.getCursorPosition();
        cursorPosition.value = {
            line: position.row + 1,
            column: position.column + 1,
        };
    });

    // Add keyboard shortcuts
    aceEditorInstance.commands.addCommand({
        name: 'saveFile',
        bindKey: { win: 'Ctrl-S', mac: 'Cmd-S' },
        exec: () => {
            if (!props.readonly) saveFile();
        },
    });

    aceEditorInstance.commands.addCommand({
        name: 'closeEditor',
        bindKey: { win: 'Ctrl-W', mac: 'Cmd-W' },
        exec: () => {
            closeEditor();
        },
    });

    // Focus the editor
    aceEditorInstance.focus();
};

const onContentChange = () => {
    // Content change is automatically handled by v-model
};

// Actions
const saveFile = async () => {
    if (props.readonly || saving.value) return;

    saving.value = true;
    try {
        emit('save', editorContent.value);
        originalContent.value = editorContent.value;
    } catch (error) {
        console.error('Error saving file:', error);
    } finally {
        saving.value = false;
    }
};

const closeEditor = () => {
    if (hasChanges.value) {
        if (confirm(t('fileEditor.confirmClose'))) {
            emit('close');
        }
    } else {
        emit('close');
    }
};

const changeLanguage = (newLanguage: unknown) => {
    if (typeof newLanguage === 'string') {
        selectedLanguage.value = newLanguage;
    }
};

const toggleTheme = () => {
    const themes: Array<'chrome' | 'github' | 'monokai'> = ['chrome', 'github', 'monokai'];
    const currentIndex = themes.indexOf(editorTheme.value);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    if (nextTheme) {
        editorTheme.value = nextTheme;
    }
};

const formatDocument = () => {
    if (aceEditor.value) {
        // ACE Editor doesn't have built-in formatting, but we can beautify some languages
        try {
            const content = aceEditor.value.getValue();
            // Basic JSON formatting
            if (selectedLanguage.value === 'json') {
                const formatted = JSON.stringify(JSON.parse(content), null, 2);
                aceEditor.value.setValue(formatted);
                toast(t('fileEditor.formatSuccess'), { type: TYPE.SUCCESS });
            } else {
                toast(t('fileEditor.formatNotSupported'), { type: TYPE.WARNING });
            }
        } catch {
            toast(t('fileEditor.formatError'), { type: TYPE.ERROR });
        }
    }
};

const findAndReplace = () => {
    if (aceEditor.value) {
        aceEditor.value.execCommand('find');
    }
};

// Keyboard shortcut handling
const handleKeydown = (event: KeyboardEvent) => {
    // Prevent browser shortcuts when editor is focused
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (!props.readonly) saveFile();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'w') {
        event.preventDefault();
        closeEditor();
    }
};

// Mobile detection and resize handling
const isMobile = ref(window.innerWidth < 640);

const handleResize = () => {
    isMobile.value = window.innerWidth < 640;
    // Trigger editor layout update when switching between mobile/desktop
    if (aceEditor.value) {
        aceEditor.value.resize();
    }
};

// Lifecycle
onMounted(() => {
    // Auto-detect language from filename
    selectedLanguage.value = detectLanguage(props.fileName);

    // Add keyboard shortcuts
    document.addEventListener('keydown', handleKeydown);

    // Add resize listener for mobile/desktop switching
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('resize', handleResize);
});

// Watch for prop changes
watch(
    () => props.content,
    (newContent) => {
        editorContent.value = newContent;
        originalContent.value = newContent;
    },
);
</script>

<style scoped>
/* Custom scrollbar for ACE Editor */
:deep(.ace_scrollbar) {
    background-color: hsl(var(--muted-foreground) / 0.3);
}

:deep(.ace_scrollbar:hover) {
    background-color: hsl(var(--muted-foreground) / 0.5);
}

/* Custom editor focus ring */
:deep(.ace_editor.ace_focus) {
    outline: 2px solid hsl(var(--primary));
    outline-offset: 2px;
}

/* ACE Editor styling */
:deep(.ace_editor) {
    font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace;
    border-radius: 0;
}

/* Mobile optimizations for ACE Editor */
@media (max-width: 640px) {
    :deep(.ace_editor) {
        font-size: 12px;
    }
}
</style>
