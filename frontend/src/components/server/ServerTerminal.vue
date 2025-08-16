<!-- eslint-disable vue/no-v-html -->
<template>
    <Card>
        <CardHeader>
            <CardTitle class="flex items-center gap-2">
                <Terminal class="h-5 w-5" />
                {{ t('serverConsole.consoleOutput') }}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div class="space-y-4">
                <!-- Terminal Controls -->
                <div class="flex items-center gap-2">
                    <Button variant="outline" size="sm" @click="$emit('clear')">
                        <Trash2 class="h-4 w-4 mr-2" />
                        {{ t('serverConsole.clear') }}
                    </Button>
                    <Button variant="outline" size="sm" @click="$emit('downloadLogs')">
                        <Download class="h-4 w-4 mr-2" />
                        {{ t('serverConsole.downloadLogs') }}
                    </Button>
                    <div class="flex-1"></div>
                    <div class="text-sm text-muted-foreground">
                        {{ terminalLines.length }} {{ t('serverConsole.lines') }}
                    </div>
                </div>

                <!-- Terminal Display -->
                <div class="terminal-container bg-black rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto relative">
                    <div v-if="terminalLines.length === 0" class="text-muted-foreground">
                        {{ t('serverConsole.noConsoleOutput') }}
                    </div>
                    <div v-else class="space-y-0">
                        <div
                            v-for="line in terminalLines"
                            :key="line.id"
                            class="terminal-line whitespace-pre-wrap leading-relaxed"
                            :class="getLineClasses(line)"
                        >
                            <span v-if="showTimestamps" class="text-gray-500 mr-2">
                                {{ new Date(line.timestamp).toLocaleTimeString() }}
                            </span>
                            <span v-html="line.content"></span>
                        </div>
                    </div>
                </div>

                <!-- Terminal Input -->
                <div class="flex gap-2">
                    <Input
                        v-model="terminalInput"
                        :placeholder="t('serverConsole.enterCommand')"
                        class="command-input font-mono"
                        @keyup.enter="sendCommand"
                        @keydown.up="navigateHistory('up')"
                        @keydown.down="navigateHistory('down')"
                    />
                    <Button @click="sendCommand">
                        <Send class="h-4 w-4 mr-2" />
                        {{ t('serverConsole.send') }}
                    </Button>
                </div>
            </div>
        </CardContent>
    </Card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal, Trash2, Download, Send } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import type { TerminalLine } from '@/types/server';

const { t } = useI18n();

interface Props {
    terminalLines: TerminalLine[];
    wingsWebSocket: ReturnType<typeof import('@/composables/useWingsWebSocket').useWingsWebSocket>;
    showTimestamps?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
    clear: [];
    downloadLogs: [];
    sendCommand: [command: string];
}>();

const terminalInput = ref('');
const commandHistory = ref<string[]>([]);
const historyIndex = ref(-1);
const originalInput = ref('');

function sendCommand(): void {
    if (!terminalInput.value.trim()) return;

    const command = terminalInput.value.trim();

    // Add command to history
    if (commandHistory.value[commandHistory.value.length - 1] !== command) {
        commandHistory.value.push(command);
        if (commandHistory.value.length > 100) {
            commandHistory.value.shift();
        }
    }

    // Emit command to parent
    emit('sendCommand', command);

    terminalInput.value = '';
    historyIndex.value = -1;
    originalInput.value = '';
}

function getLineClasses(line: TerminalLine): string {
    const baseClasses = 'py-0.5';

    if (line.type === 'command') {
        return `${baseClasses} text-blue-400 font-semibold`;
    }

    if (line.type === 'error') {
        return `${baseClasses} text-red-400`;
    }

    if (line.type === 'warning') {
        return `${baseClasses} text-yellow-400`;
    }

    if (line.type === 'info') {
        return `${baseClasses} text-cyan-400`;
    }

    return `${baseClasses} text-green-400`;
}

// Command history navigation
function navigateHistory(direction: 'up' | 'down'): void {
    if (commandHistory.value.length === 0) return;

    if (direction === 'up') {
        if (historyIndex.value === -1) {
            originalInput.value = terminalInput.value;
        }

        if (historyIndex.value < commandHistory.value.length - 1) {
            historyIndex.value++;
            terminalInput.value = commandHistory.value[commandHistory.value.length - 1 - historyIndex.value];
        }
    } else if (direction === 'down') {
        if (historyIndex.value > 0) {
            historyIndex.value--;
            terminalInput.value = commandHistory.value[commandHistory.value.length - 1 - historyIndex.value];
        } else if (historyIndex.value === 0) {
            historyIndex.value = -1;
            terminalInput.value = originalInput.value;
        }
    }
}
</script>

<style scoped>
/* Terminal styling */
.terminal-line {
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
    line-height: 1.4;
}

/* Terminal scrollbar styling */
.terminal-container::-webkit-scrollbar {
    width: 8px;
}

.terminal-container::-webkit-scrollbar-track {
    background: #1f2937;
    border-radius: 4px;
}

.terminal-container::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 4px;
}

.terminal-container::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
}

/* Smooth scrolling */
.terminal-container {
    scroll-behavior: smooth;
}

/* Command input styling */
.command-input {
    border: 1px solid #374151;
    background: #111827;
    color: #f9fafb;
}

.command-input:focus {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
}

/* Terminal line animations */
.terminal-line {
    animation: fadeIn 0.1s ease-in-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(2px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
