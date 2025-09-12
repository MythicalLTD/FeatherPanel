<template>
    <div class="flex flex-col h-full">
        <!-- Editor Header -->
        <div
            class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b bg-muted/50 gap-3 sm:gap-0"
        >
            <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <component :is="getFileIcon()" class="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                <div class="min-w-0 flex-1">
                    <h3 class="font-semibold text-sm sm:text-base truncate">{{ fileName }}</h3>
                    <p class="text-xs sm:text-sm text-muted-foreground truncate">{{ filePath }}</p>
                </div>
            </div>
            <div class="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
                <!-- Language Selector -->
                <Select v-model="selectedLanguage" @update:model-value="changeLanguage">
                    <SelectTrigger class="w-24 sm:w-32 text-xs sm:text-sm">
                        <SelectValue :placeholder="t('fileEditor.language')" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem v-for="lang in availableLanguages" :key="lang.value" :value="lang.value">
                            {{ lang.label }}
                        </SelectItem>
                    </SelectContent>
                </Select>

                <!-- Theme Toggle -->
                <Button
                    variant="outline"
                    size="sm"
                    class="gap-1 h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3"
                    @click="toggleTheme"
                >
                    <Monitor v-if="editorTheme === 'vs'" class="h-3 w-3 sm:h-4 sm:w-4" />
                    <Sun v-else-if="editorTheme === 'vs-light'" class="h-3 w-3 sm:h-4 sm:w-4" />
                    <Moon v-else class="h-3 w-3 sm:h-4 sm:w-4" />
                    <span class="hidden sm:inline">{{
                        editorTheme === 'vs-dark' ? 'Dark' : editorTheme === 'vs-light' ? 'Light' : 'Auto'
                    }}</span>
                </Button>

                <!-- Save Button -->
                <Button :disabled="!hasChanges || saving" class="gap-1 h-8 sm:h-9 text-xs sm:text-sm" @click="saveFile">
                    <Loader2 v-if="saving" class="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    <Save v-else class="h-3 w-3 sm:h-4 sm:w-4" />
                    <span class="hidden sm:inline">{{ saving ? t('fileEditor.saving') : t('fileEditor.save') }}</span>
                </Button>

                <!-- Close Button -->
                <Button variant="outline" class="h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3" @click="closeEditor">
                    <X class="h-3 w-3 sm:h-4 sm:w-4" />
                    <span class="hidden sm:inline ml-1">{{ t('common.close') }}</span>
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

        <!-- Monaco Editor -->
        <div class="flex-1 relative">
            <MonacoEditor
                ref="monacoEditor"
                v-model:value="editorContent"
                :language="selectedLanguage"
                :theme="editorTheme"
                :options="editorOptions"
                class="h-full"
                @mount="onEditorMount"
                @change="onContentChange"
            />
        </div>

        <!-- Editor Footer -->
        <div
            class="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 sm:px-4 py-2 border-t bg-muted/30 text-xs sm:text-sm gap-2 sm:gap-0"
        >
            <div class="flex items-center gap-2 sm:gap-4 flex-wrap">
                <Button variant="ghost" size="sm" :disabled="!canFormat" class="h-8 text-xs" @click="formatDocument">
                    <AlignLeft class="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span class="hidden sm:inline">{{ t('fileEditor.format') }}</span>
                </Button>
                <Button variant="ghost" size="sm" class="h-8 text-xs" @click="findAndReplace">
                    <Search class="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span class="hidden sm:inline">{{ t('fileEditor.findReplace') }}</span>
                </Button>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-muted-foreground text-xs">{{ selectedLanguage.toUpperCase() }}</span>
                <Separator orientation="vertical" class="h-3 sm:h-4" />
                <span class="text-muted-foreground text-xs">{{
                    editorTheme === 'vs-dark' ? 'Dark' : editorTheme === 'vs-light' ? 'Light' : 'Auto'
                }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast, TYPE } from 'vue-toastification';
import MonacoEditor from 'monaco-editor-vue3';
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
const monacoEditor = ref();
const editorContent = ref(props.content);
const originalContent = ref(props.content);
const saving = ref(false);
const selectedLanguage = ref('plaintext');
const editorTheme = ref<'vs' | 'vs-light' | 'vs-dark'>('vs-dark');

// Editor position tracking
const cursorPosition = ref({ line: 1, column: 1 });

// Available languages for Monaco Editor
const availableLanguages = [
    { value: 'plaintext', label: 'Plain Text' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'json', label: 'JSON' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'scss', label: 'SCSS' },
    { value: 'php', label: 'PHP' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'go', label: 'Go' },
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
    { value: 'shell', label: 'Shell' },
    { value: 'dockerfile', label: 'Dockerfile' },
    { value: 'ini', label: 'INI/Config' },
];

// Monaco Editor options
const editorOptions = computed(() => {
    return {
        automaticLayout: true,
        fontSize: isMobile.value ? 12 : 14,
        fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: props.readonly,
        minimap: { enabled: !isMobile.value }, // Disable minimap on mobile
        wordWrap: 'on',
        tabSize: 4,
        insertSpaces: true,
        detectIndentation: true,
        trimAutoWhitespace: true,
        formatOnPaste: true,
        formatOnType: true,
        suggestOnTriggerCharacters: true,
        snippetSuggestions: 'top',
        quickSuggestions: !isMobile.value, // Disable quick suggestions on mobile for better performance
        parameterHints: { enabled: !isMobile.value }, // Disable parameter hints on mobile
        hover: { enabled: !isMobile.value }, // Disable hover on mobile
        contextmenu: !isMobile.value, // Disable context menu on mobile
        mouseWheelZoom: !isMobile.value, // Disable mouse wheel zoom on mobile
        bracketPairColorization: { enabled: true },
        guides: {
            bracketPairs: !isMobile.value, // Disable bracket pair guides on mobile
            indentation: true,
        },
        renderWhitespace: isMobile.value ? 'none' : 'selection', // Less visual clutter on mobile
        renderControlCharacters: !isMobile.value, // Disable control characters on mobile
        // Mobile-specific optimizations
        scrollbar: {
            vertical: isMobile.value ? 'auto' : 'auto',
            horizontal: isMobile.value ? 'auto' : 'auto',
            verticalScrollbarSize: isMobile.value ? 8 : 12,
            horizontalScrollbarSize: isMobile.value ? 8 : 12,
        },
        // Touch-friendly settings
        mouseWheelScrollSensitivity: isMobile.value ? 0.5 : 1,
        fastScrollSensitivity: isMobile.value ? 0.5 : 1,
        // Disable some features that don't work well on mobile
        folding: !isMobile.value,
        foldingStrategy: isMobile.value ? 'indentation' : 'auto',
        showFoldingControls: isMobile.value ? 'never' : 'mouseover',
        // Better mobile keyboard handling
        acceptSuggestionOnCommitCharacter: !isMobile.value,
        acceptSuggestionOnEnter: isMobile.value ? 'smart' : 'on',
        // Optimize for touch
        multiCursorModifier: isMobile.value ? 'ctrlCmd' : 'alt',
        accessibilitySupport: 'off', // Disable for better mobile performance
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
        cpp: 'cpp',
        c: 'c',
        go: 'go',
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
        sh: 'shell',
        bash: 'shell',
        zsh: 'shell',
        dockerfile: 'dockerfile',
        ini: 'ini',
        conf: 'ini',
        config: 'ini',
        env: 'ini',
        properties: 'ini',
        toml: 'ini',
    };
    return languageMap[ext || ''] || 'plaintext';
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
    const monacoEditor = editor as {
        onDidChangeCursorPosition: (
            callback: (e: { position: { lineNumber: number; column: number } }) => void,
        ) => void;
        addCommand: (keybinding: number, action: () => void) => void;
        KeyMod: { CtrlCmd: number };
        KeyCode: { KeyS: number; KeyW: number };
        focus: () => void;
    };

    // Track cursor position
    monacoEditor.onDidChangeCursorPosition((e: { position: { lineNumber: number; column: number } }) => {
        cursorPosition.value = {
            line: e.position.lineNumber,
            column: e.position.column,
        };
    });

    // Add keyboard shortcuts
    monacoEditor.addCommand(monacoEditor.KeyMod.CtrlCmd | monacoEditor.KeyCode.KeyS, () => {
        if (!props.readonly) saveFile();
    });

    monacoEditor.addCommand(monacoEditor.KeyMod.CtrlCmd | monacoEditor.KeyCode.KeyW, () => {
        closeEditor();
    });

    // Focus the editor
    monacoEditor.focus();
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
    const themes: Array<'vs' | 'vs-light' | 'vs-dark'> = ['vs-light', 'vs', 'vs-dark'];
    const currentIndex = themes.indexOf(editorTheme.value);
    editorTheme.value = themes[(currentIndex + 1) % themes.length];
};

const formatDocument = () => {
    if (monacoEditor.value?.getEditor) {
        const editor = monacoEditor.value.getEditor();
        editor.getAction('editor.action.formatDocument')?.run();
        toast(t('fileEditor.formatSuccess'), { type: TYPE.SUCCESS });
    }
};

const findAndReplace = () => {
    if (monacoEditor.value?.getEditor) {
        const editor = monacoEditor.value.getEditor();
        editor.getAction('editor.action.startFindReplaceAction')?.run();
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
    if (monacoEditor.value?.getEditor) {
        const editor = monacoEditor.value.getEditor();
        editor.layout();
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
/* Custom scrollbar for editor */
:deep(.monaco-editor .monaco-scrollable-element > .scrollbar > .slider) {
    background-color: hsl(var(--muted-foreground) / 0.3);
}

:deep(.monaco-editor .monaco-scrollable-element > .scrollbar > .slider:hover) {
    background-color: hsl(var(--muted-foreground) / 0.5);
}

/* Custom editor focus ring */
:deep(.monaco-editor.focused) {
    outline: 2px solid hsl(var(--primary));
    outline-offset: 2px;
}
</style>
