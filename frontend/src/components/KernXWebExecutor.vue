<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { X, Play, RotateCcw, Copy, Terminal, Zap, Save, FolderOpen, FileText } from 'lucide-vue-next';

interface ExecutorSettings {
    fontSize: number;
    autoExecute: boolean;
    showTimestamp: boolean;
    maxHistory: number;
    theme: 'dark' | 'light';
}

interface CommandHistory {
    id: string;
    timestamp: number;
    command: string;
    result: any;
    type: 'success' | 'error' | 'info';
    executionTime: number;
}

const isVisible = ref(false);
const commandInput = ref('');
const commandHistory = ref<CommandHistory[]>([]);
const currentPosition = ref({ x: 150, y: 100 });
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const showSettings = ref(false);
const activeTab = ref('console');
const scriptContent = ref('// Write your JavaScript code here...\n\n');

// Initialize console with welcome messages
const initializeConsole = () => {
    const now = Date.now();
    const initMessages = [
        {
            id: 'init_1',
            timestamp: now,
            command: 'INIT',
            result: 'KernX WebExecutor v2.0.0 initialized',
            type: 'info' as const,
            executionTime: 0,
        },
        {
            id: 'init_2',
            timestamp: now + 1,
            command: 'READY',
            result: 'JavaScript engine ready',
            type: 'success' as const,
            executionTime: 0,
        },
    ];
    commandHistory.value = initMessages;
};

// Settings
const settings = ref<ExecutorSettings>({
    fontSize: 14,
    autoExecute: false,
    showTimestamp: true,
    maxHistory: 100,
    theme: 'dark',
});

// Load settings from localStorage
const loadSettings = () => {
    try {
        const saved = localStorage.getItem('kernx-executor-settings');
        if (saved) {
            const parsed = JSON.parse(saved) as ExecutorSettings;
            Object.assign(settings.value, parsed);
        }

        const savedPosition = localStorage.getItem('kernx-executor-position');
        if (savedPosition) {
            const parsed = JSON.parse(savedPosition) as { x: number; y: number };
            currentPosition.value = parsed;
        }
    } catch (error) {
        console.warn('Failed to load executor settings:', error);
    }
};

// Save settings to localStorage
const saveSettings = () => {
    try {
        localStorage.setItem('kernx-executor-settings', JSON.stringify(settings.value));
        localStorage.setItem('kernx-executor-position', JSON.stringify(currentPosition.value));
    } catch (error) {
        console.warn('Failed to save executor settings:', error);
    }
};

// Toggle executor with Ctrl+Shift+E
const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        toggleExecutor();
    }
};

const toggleExecutor = () => {
    isVisible.value = !isVisible.value;
    if (isVisible.value) {
        // Focus input when opening
        setTimeout(() => {
            const input = document.querySelector('.executor-input') as HTMLInputElement;
            if (input) input.focus();
        }, 100);
    }
};

// Dragging functionality
const startDrag = (event: MouseEvent) => {
    isDragging.value = true;
    const rect = (event.target as HTMLElement).closest('.executor-window')?.getBoundingClientRect();
    if (rect) {
        dragOffset.value = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
};

const handleDrag = (event: MouseEvent) => {
    if (!isDragging.value) return;

    const newX = event.clientX - dragOffset.value.x;
    const newY = event.clientY - dragOffset.value.y;

    // Keep window within viewport bounds
    const maxX = window.innerWidth - 600;
    const maxY = window.innerHeight - 400;

    currentPosition.value = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
    };
};

const stopDrag = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
    saveSettings();
};

// Command execution
const executeCommand = async () => {
    const command = commandInput.value.trim();
    if (!command) return;

    const startTime = Date.now();
    const timestamp = Date.now();

    try {
        let result: any;

        // Handle special commands
        if (command.startsWith('!')) {
            result = await handleSpecialCommand(command);
        } else {
            // Execute JavaScript
            result = await executeJavaScript(command);
        }

        const executionTime = Date.now() - startTime;

        // Add to history
        const historyItem: CommandHistory = {
            id: `cmd_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp,
            command,
            result,
            type: 'success',
            executionTime,
        };

        commandHistory.value.unshift(historyItem);

        // Limit history size
        if (commandHistory.value.length > settings.value.maxHistory) {
            commandHistory.value = commandHistory.value.slice(0, settings.value.maxHistory);
        }

        commandInput.value = '';

        // Auto-execute next command if enabled
        if (settings.value.autoExecute && commandInput.value.trim()) {
            setTimeout(executeCommand, 100);
        }
    } catch (error) {
        const executionTime = Date.now() - startTime;

        const historyItem: CommandHistory = {
            id: `cmd_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp,
            command,
            result: error instanceof Error ? error.message : String(error),
            type: 'error',
            executionTime,
        };

        commandHistory.value.unshift(historyItem);
        commandInput.value = '';
    }

    saveSettings();
};

const executeJavaScript = async (code: string): Promise<any> => {
    // Create a safe execution context
    const context = {
        console: {
            log: (...args: any[]) => {
                console.log('[KernX]', ...args);
                return args;
            },
            error: (...args: any[]) => {
                console.error('[KernX]', ...args);
                return args;
            },
            warn: (...args: any[]) => {
                console.warn('[KernX]', ...args);
                return args;
            },
        },
        window,
        document,
        localStorage,
        sessionStorage,
        fetch,
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
    };

    // Create function with context - fixed syntax
    const func = new Function(
        ...Object.keys(context),
        `
        "use strict";
        try {
            return (function() { ${code} })();
        } catch (error) {
            throw error;
        }
    `,
    );

    return func(...Object.values(context));
};

const handleSpecialCommand = async (command: string): Promise<any> => {
    const [cmd] = command.slice(1).split(' ');

    if (!cmd) {
        throw new Error('No command specified. Type !help for available commands.');
    }

    switch (cmd.toLowerCase()) {
        case 'clear':
        case 'cls': {
            commandHistory.value = [];
            return 'History cleared';
        }

        case 'help': {
            return `
Available commands:
!clear / !cls     - Clear command history
!help            - Show this help
!save            - Save current settings
!load            - Load saved settings
!export          - Export command history
!info            - Show system information
!version         - Show KernX version
            `.trim();
        }

        case 'save': {
            saveSettings();
            return 'Settings saved';
        }

        case 'load': {
            loadSettings();
            return 'Settings loaded';
        }

        case 'export': {
            const exportData = {
                history: commandHistory.value,
                settings: settings.value,
                timestamp: Date.now(),
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kernx-export-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            return 'History exported';
        }

        case 'info': {
            return {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                screenResolution: `${screen.width}x${screen.height}`,
                viewportSize: `${window.innerWidth}x${window.innerHeight}`,
                url: window.location.href,
                title: document.title,
            };
        }

        case 'version': {
            return 'KernX WebExecutor v2.0.0';
        }

        default: {
            throw new Error(`Unknown command: ${cmd}. Type !help for available commands.`);
        }
    }
};

const copyToClipboard = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
    }
};

const formatResult = (result: any): string => {
    if (result === null) return 'null';
    if (result === undefined) return 'undefined';
    if (typeof result === 'string') return `"${result}"`;
    if (typeof result === 'function') return result.toString();
    if (result instanceof Error) return `Error: ${result.message}`;
    if (typeof result === 'object') {
        try {
            return JSON.stringify(result, null, 2);
        } catch {
            return String(result);
        }
    }
    return String(result);
};

const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

const getResultColor = (type: string): string => {
    switch (type) {
        case 'success':
            return 'text-green-400';
        case 'error':
            return 'text-red-400';
        case 'info':
            return 'text-blue-400';
        default:
            return 'text-gray-300';
    }
};

const getStatusIcon = (type: string): string => {
    switch (type) {
        case 'success':
            return '✓';
        case 'error':
            return '✗';
        case 'info':
            return 'ℹ';
        default:
            return '→';
    }
};

const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        executeCommand();
    }
};

const executeScript = () => {
    const script = scriptContent.value.trim();
    if (script) {
        commandInput.value = script;
        executeCommand();
    }
};

const openFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.js,.txt';
    input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                scriptContent.value = (e.target?.result as string) || '';
            };
            reader.readAsText(file);
        }
    };
    input.click();
};

const saveFile = () => {
    const blob = new Blob([scriptContent.value], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kernx-script.js';
    a.click();
    URL.revokeObjectURL(url);
};

const getLineCount = (): number => {
    return scriptContent.value.split('\n').length;
};

const getCharCount = (): number => {
    return scriptContent.value.length;
};

onMounted(() => {
    document.addEventListener('keydown', handleKeyDown);
    loadSettings();
    initializeConsole();
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
});

// Expose methods for parent component
defineExpose({
    toggleExecutor,
});
</script>

<template>
    <Transition name="executor-panel" appear>
        <div v-if="isVisible" class="fixed inset-0 z-[9998] pointer-events-none">
            <!-- Backdrop -->
            <div class="fixed inset-0 bg-black/20 backdrop-blur-sm"></div>

            <!-- Executor Window -->
            <div
                class="executor-window absolute w-[800px] h-[700px] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl backdrop-blur-md pointer-events-auto flex flex-col"
                :style="{
                    left: `${currentPosition.x}px`,
                    top: `${currentPosition.y}px`,
                    fontSize: `${settings.fontSize}px`,
                }"
            >
                <!-- Header -->
                <div
                    class="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700 cursor-move select-none rounded-t-lg"
                    @mousedown="startDrag"
                >
                    <div class="flex items-center gap-4">
                        <div class="flex items-center gap-3">
                            <div class="relative">
                                <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <div
                                    class="absolute inset-0 w-3 h-3 bg-blue-400 rounded-full animate-pulse opacity-75"
                                ></div>
                            </div>
                            <Zap :size="18" class="text-blue-400" />
                            <h3 class="font-bold text-white text-base tracking-wide">KernX WebExecutor</h3>
                            <span class="text-xs text-blue-300 bg-blue-900/30 px-2 py-1 rounded border border-blue-700"
                                >v2.0.0</span
                            >
                        </div>
                        <div class="flex items-center gap-2 text-xs text-gray-400">
                            <div class="w-2 h-2 bg-gray-500 rounded-full"></div>
                            <span>Idle</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1">
                        <button
                            :class="
                                showSettings
                                    ? 'text-blue-400 bg-blue-500/10'
                                    : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                            "
                            class="p-2 rounded-lg transition-all duration-200"
                            title="Settings"
                            @click="showSettings = !showSettings"
                        >
                            <Terminal :size="16" />
                        </button>
                        <button
                            class="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-all duration-200"
                            @click="toggleExecutor"
                        >
                            <X :size="16" />
                        </button>
                    </div>
                </div>

                <!-- Settings Panel -->
                <div v-if="showSettings" class="px-6 py-4 bg-gray-850 border-b border-gray-700">
                    <div class="grid grid-cols-3 gap-6">
                        <div>
                            <label class="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 block"
                                >Font Size</label
                            >
                            <input
                                v-model.number="settings.fontSize"
                                type="range"
                                min="10"
                                max="18"
                                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                                @change="saveSettings"
                            />
                            <div class="text-xs text-gray-400 mt-1">{{ settings.fontSize }}px</div>
                        </div>
                        <div>
                            <label class="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 block"
                                >Theme</label
                            >
                            <select
                                v-model="settings.theme"
                                class="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg text-gray-300 focus:border-blue-500 focus:outline-none"
                                @change="saveSettings"
                            >
                                <option value="dark">Dark</option>
                                <option value="light">Light</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 block"
                                >Options</label
                            >
                            <div class="space-y-2">
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input
                                        v-model="settings.autoExecute"
                                        type="checkbox"
                                        class="w-3 h-3 text-blue-500 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                                        @change="saveSettings"
                                    />
                                    <span class="text-xs text-gray-300">Auto-execute</span>
                                </label>
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input
                                        v-model="settings.showTimestamp"
                                        type="checkbox"
                                        class="w-3 h-3 text-blue-500 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                                        @change="saveSettings"
                                    />
                                    <span class="text-xs text-gray-300">Show timestamps</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="flex-1 flex">
                    <!-- Left Panel - Script Editor -->
                    <div class="w-1/2 border-r border-gray-700 flex flex-col">
                        <!-- Script Editor Header -->
                        <div class="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                            <div class="flex items-center gap-3">
                                <FileText :size="16" class="text-gray-400" />
                                <span class="text-sm font-semibold text-gray-300">JavaScript Editor</span>
                                <span class="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">script.js</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <button
                                    class="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                                    title="Open file"
                                    @click="openFile"
                                >
                                    <FolderOpen :size="14" />
                                </button>
                                <button
                                    class="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all duration-200"
                                    title="Save file"
                                    @click="saveFile"
                                >
                                    <Save :size="14" />
                                </button>
                            </div>
                        </div>

                        <!-- Script Editor -->
                        <div class="flex-1 relative">
                            <textarea
                                v-model="scriptContent"
                                class="w-full h-full p-4 bg-gray-900 text-gray-300 font-mono text-sm border-none outline-none resize-none"
                                placeholder="// Write your JavaScript code here..."
                                spellcheck="false"
                            ></textarea>
                        </div>

                        <!-- Script Editor Footer -->
                        <div class="flex items-center justify-between px-4 py-3 bg-gray-800 border-t border-gray-700">
                            <div class="flex items-center gap-4 text-xs text-gray-400">
                                <span>Lines: {{ getLineCount() }}</span>
                                <span>Chars: {{ getCharCount() }}</span>
                                <span>JavaScript ES6+</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <button
                                    class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                    title="Clear script"
                                    @click="scriptContent = '// Write your JavaScript code here...\n\n'"
                                >
                                    <RotateCcw :size="14" />
                                </button>
                                <button
                                    class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 font-medium"
                                    @click="executeScript"
                                >
                                    <Play :size="14" />
                                    Execute Script
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Right Panel - Console -->
                    <div class="w-1/2 flex flex-col">
                        <!-- Console Tabs -->
                        <div class="flex border-b border-gray-700">
                            <button
                                :class="
                                    activeTab === 'console'
                                        ? 'border-b-2 border-blue-500 text-blue-400 bg-gray-800'
                                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                                "
                                class="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200"
                                @click="activeTab = 'console'"
                            >
                                <Terminal :size="14" />
                                Console
                            </button>
                            <button
                                :class="
                                    activeTab === 'history'
                                        ? 'border-b-2 border-blue-500 text-blue-400 bg-gray-800'
                                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                                "
                                class="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200"
                                @click="activeTab = 'history'"
                            >
                                <FileText :size="14" />
                                History
                            </button>
                        </div>

                        <!-- Console Output -->
                        <div v-if="activeTab === 'console'" class="flex-1 flex flex-col">
                            <!-- Console Input -->
                            <div class="p-4 border-b border-gray-700">
                                <div class="flex gap-2">
                                    <div class="flex-1 relative">
                                        <input
                                            v-model="commandInput"
                                            type="text"
                                            placeholder="Enter JavaScript command or !help for commands..."
                                            class="executor-input w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg text-gray-300 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                            @keydown="handleKeyPress"
                                        />
                                    </div>
                                    <button
                                        :disabled="!commandInput.trim()"
                                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium"
                                        @click="executeCommand"
                                    >
                                        <Play :size="14" />
                                        Execute
                                    </button>
                                </div>
                            </div>

                            <!-- Console Output Area -->
                            <div class="flex-1 overflow-y-auto p-4 bg-gray-900">
                                <div v-for="item in commandHistory.slice(0, 20)" :key="item.id" class="mb-1 last:mb-0">
                                    <!-- Console Output Format like KestrelClient -->
                                    <div class="flex items-start gap-2 text-sm font-mono">
                                        <span class="text-blue-400 whitespace-nowrap">{{
                                            formatTimestamp(item.timestamp)
                                        }}</span>
                                        <span :class="getResultColor(item.type)" class="font-bold">
                                            {{ item.type.toUpperCase() }}
                                        </span>
                                        <span :class="getResultColor(item.type)" class="flex-1">
                                            {{ formatResult(item.result) }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- History Tab -->
                        <div v-if="activeTab === 'history'" class="flex-1 overflow-y-auto p-4 bg-gray-900">
                            <div v-if="commandHistory.length === 0" class="text-center py-8">
                                <div class="text-gray-400 text-sm mb-2">No command history</div>
                                <div class="text-gray-500 text-xs">Execute some commands to see them here</div>
                            </div>

                            <div
                                v-for="item in commandHistory"
                                :key="item.id"
                                class="mb-6 last:mb-0 border-b border-gray-800 last:border-b-0 pb-4"
                            >
                                <div class="flex items-center justify-between mb-2">
                                    <div class="flex items-center gap-2">
                                        <span :class="getResultColor(item.type)" class="text-sm font-bold">
                                            {{ getStatusIcon(item.type) }}
                                        </span>
                                        <span class="text-xs text-gray-400 font-mono">
                                            {{ formatTimestamp(item.timestamp) }}
                                        </span>
                                        <span class="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                                            {{ item.executionTime }}ms
                                        </span>
                                    </div>
                                    <button
                                        class="text-xs text-gray-400 hover:text-gray-200 p-1 hover:bg-gray-700 rounded transition-all duration-200"
                                        title="Copy command"
                                        @click="copyToClipboard(item.command)"
                                    >
                                        <Copy :size="12" />
                                    </button>
                                </div>

                                <div
                                    class="text-sm font-mono bg-gray-800 border border-gray-700 p-3 rounded mb-2 text-gray-300"
                                >
                                    {{ item.command }}
                                </div>

                                <pre
                                    :class="getResultColor(item.type)"
                                    class="text-sm bg-gray-800 border border-gray-700 p-3 rounded whitespace-pre-wrap break-all"
                                    >{{ formatResult(item.result) }}</pre
                                >
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
/* Custom slider styling */
.slider::-webkit-slider-thumb {
    appearance: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: 2px solid #1f2937;
}

.slider::-moz-range-thumb {
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: 2px solid #1f2937;
}

/* Custom scrollbar for dark theme */
.scrollbar-thin {
    scrollbar-width: thin;
}

.scrollbar-thumb-gray-600 {
    scrollbar-color: #4b5563 #1f2937;
}

.scrollbar-track-gray-800 {
    scrollbar-color: #4b5563 #1f2937;
}

/* Webkit scrollbar styling */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

::-webkit-scrollbar-track {
    background: #1f2937;
    border-radius: 3px;
}

::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 3px;
    border: 1px solid #374151;
}

::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
}

::-webkit-scrollbar-corner {
    background: #1f2937;
}

/* Animation for status indicator */
@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Executor panel enter/leave animations */
.executor-panel-enter-active,
.executor-panel-leave-active {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.executor-panel-enter-from {
    opacity: 0;
    transform: translateX(100%) scale(0.95);
}

.executor-panel-leave-to {
    opacity: 0;
    transform: translateX(50%) scale(0.95);
}
</style>
