<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from 'vue-toastification';

interface CommandResult {
    stdout: string;
    stderr: string;
    return_code: number;
    execution_time: number;
    command: string;
    working_directory: string;
    timestamp: string;
}

interface CommandResponse {
    success: boolean;
    data: CommandResult;
    message?: string;
}

interface SystemInfoResponse {
    success: boolean;
    data: {
        os: string;
        php_version: string;
        server_software: string;
        server_name: string;
        user: string;
        home: string;
        working_directory: string;
        disk_usage: {
            free: number;
            total: number;
            used: number;
            percentage: number;
        };
        memory_usage: Record<string, number>;
        uptime: string;
    };
    message?: string;
}

interface TerminalLine {
    id: string;
    type: 'command' | 'output' | 'error' | 'info';
    content: string;
    timestamp: string;
    command?: string;
    returnCode?: number;
    executionTime?: number;
}

const commandInput = ref('');
const currentDirectory = ref('');
const isLoading = ref(false);
const terminalLines = ref<TerminalLine[]>([]);
const systemInfo = ref<SystemInfoResponse['data'] | null>(null);
const showSystemInfo = ref(false);
const commandHistory = ref<string[]>([]);
const historyIndex = ref(-1);

const toast = useToast();

// Terminal colors and styling (removed unused function)

const getPrompt = (): string => {
    const user = systemInfo.value?.user || 'www-data';
    const dir = currentDirectory.value.replace(/^.*\//, '~');
    return `${user}@featherpanel:${dir}$`;
};

async function fetchSystemInfo() {
    try {
        const resp = await fetch('/api/admin/console/system-info');
        const text = await resp.text();

        // Check if response contains HTML error messages
        if (text.includes('<br />') || text.includes('<b>')) {
            console.error('Response contains HTML error messages:', text);
            toast.error('Server returned error messages. Check console for details.');
            return;
        }

        let json: SystemInfoResponse;
        try {
            json = JSON.parse(text);
        } catch {
            console.error('Failed to parse JSON response:', text);
            toast.error('Failed to parse server response. Check console for details.');
            return;
        }

        if (json.success) {
            systemInfo.value = json.data;
            currentDirectory.value = json.data.working_directory;
            addTerminalLine('info', `Connected to ${json.data.server_name} (${json.data.os})`);
            addTerminalLine('info', `PHP ${json.data.php_version} | User: ${json.data.user}`);
        } else {
            toast.error('Failed to fetch system info: ' + (json.message || 'Unknown error'));
        }
    } catch (e) {
        console.error('Failed to fetch system info:', e);
        toast.error('Failed to fetch system info: Network error');
    }
}

async function executeCommand() {
    if (!commandInput.value.trim()) return;

    const command = commandInput.value.trim();
    commandHistory.value.unshift(command);
    if (commandHistory.value.length > 100) {
        commandHistory.value = commandHistory.value.slice(0, 100);
    }
    historyIndex.value = -1;

    addTerminalLine('command', `${getPrompt()} ${command}`);
    commandInput.value = '';
    isLoading.value = true;

    try {
        const resp = await fetch('/api/admin/console/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                command: command,
                cwd: currentDirectory.value,
            }),
        });

        const text = await resp.text();

        // Check if response contains HTML error messages
        if (text.includes('<br />') || text.includes('<b>')) {
            console.error('Response contains HTML error messages:', text);
            addTerminalLine('error', 'Server returned error messages. Check browser console for details.');
            return;
        }

        let json: CommandResponse;
        try {
            json = JSON.parse(text);
        } catch {
            console.error('Failed to parse JSON response:', text);
            addTerminalLine('error', 'Failed to parse server response. Check browser console for details.');
            return;
        }

        if (json.success) {
            const result = json.data;

            // Update current directory if cd command was used
            if (command.startsWith('cd ')) {
                // Extract directory from cd command
                const newDir = command.substring(3).trim();
                if (newDir === '~' || newDir === '') {
                    currentDirectory.value = systemInfo.value?.home || '/var/www';
                } else if (newDir.startsWith('/')) {
                    currentDirectory.value = newDir;
                } else {
                    currentDirectory.value = currentDirectory.value + '/' + newDir;
                }
                currentDirectory.value = currentDirectory.value.replace(/\/+/g, '/');
            }

            // Display output
            if (result.stdout) {
                addTerminalLine('output', result.stdout);
            }
            if (result.stderr) {
                addTerminalLine('error', result.stderr);
            }

            // Show command result info
            addTerminalLine('info', `[${result.return_code}] ${result.execution_time}ms`);

            if (result.return_code !== 0 && !result.stderr) {
                toast.warning(`Command failed with exit code ${result.return_code}`);
            }
        } else {
            addTerminalLine('error', `Error: ${json.message || 'Unknown error'}`);
            toast.error('Command execution failed: ' + (json.message || 'Unknown error'));
        }
    } catch (e) {
        console.error('Failed to execute command:', e);
        addTerminalLine('error', `Network error: ${String(e)}`);
        toast.error('Failed to execute command: Network error');
    } finally {
        isLoading.value = false;
        scrollToBottom();
    }
}

function addTerminalLine(
    type: TerminalLine['type'],
    content: string,
    command?: string,
    returnCode?: number,
    executionTime?: number,
) {
    const line: TerminalLine = {
        id: Date.now() + '-' + Math.random(),
        type,
        content,
        timestamp: new Date().toLocaleTimeString(),
        command,
        returnCode,
        executionTime,
    };
    terminalLines.value.push(line);
}

function clearTerminal() {
    terminalLines.value = [];
    addTerminalLine('info', 'Terminal cleared');
}

function scrollToBottom() {
    nextTick(() => {
        const terminal = document.getElementById('terminal-output');
        if (terminal) {
            terminal.scrollTop = terminal.scrollHeight;
        }
    });
}

function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
        event.preventDefault();
        executeCommand();
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (historyIndex.value < commandHistory.value.length - 1) {
            historyIndex.value++;
            commandInput.value = commandHistory.value[historyIndex.value] ?? '';
        }
    } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (historyIndex.value > 0) {
            historyIndex.value--;
            commandInput.value = commandHistory.value[historyIndex.value] ?? '';
        } else if (historyIndex.value === 0) {
            historyIndex.value = -1;
            commandInput.value = '';
        }
    } else if (event.key === 'l' && event.ctrlKey) {
        event.preventDefault();
        clearTerminal();
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function toggleSystemInfo() {
    showSystemInfo.value = !showSystemInfo.value;
}

onMounted(() => {
    fetchSystemInfo();
    addTerminalLine('info', 'FeatherPanel Console - Type "help" for available commands');
});

onUnmounted(() => {
    // Cleanup if needed
});
</script>

<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Dev', href: '/admin/dev' },
            { text: 'Console', isCurrent: true, href: '/admin/dev/console' },
        ]"
    >
        <div class="min-h-screen bg-background">
            <div class="p-6 space-y-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-bold text-foreground mb-1">Console</h1>
                        <p class="text-muted-foreground">Execute commands on the server</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Button variant="outline" @click="toggleSystemInfo">
                            {{ showSystemInfo ? 'Hide' : 'Show' }} System Info
                        </Button>
                        <Button variant="outline" @click="clearTerminal">Clear Terminal</Button>
                        <Button variant="outline" :disabled="isLoading" @click="fetchSystemInfo">Refresh</Button>
                    </div>
                </div>

                <!-- System Info Panel -->
                <Card v-if="showSystemInfo && systemInfo" class="p-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <h3 class="font-semibold mb-2">System</h3>
                            <div class="text-sm space-y-1">
                                <div><span class="text-muted-foreground">OS:</span> {{ systemInfo.os }}</div>
                                <div>
                                    <span class="text-muted-foreground">Server:</span> {{ systemInfo.server_software }}
                                </div>
                                <div><span class="text-muted-foreground">User:</span> {{ systemInfo.user }}</div>
                            </div>
                        </div>
                        <div>
                            <h3 class="font-semibold mb-2">Runtime</h3>
                            <div class="text-sm space-y-1">
                                <div><span class="text-muted-foreground">PHP:</span> {{ systemInfo.php_version }}</div>
                                <div><span class="text-muted-foreground">Uptime:</span> {{ systemInfo.uptime }}</div>
                            </div>
                        </div>
                        <div>
                            <h3 class="font-semibold mb-2">Disk Usage</h3>
                            <div class="text-sm space-y-1">
                                <div>
                                    <span class="text-muted-foreground">Used:</span>
                                    {{ formatBytes(systemInfo.disk_usage.used) }}
                                </div>
                                <div>
                                    <span class="text-muted-foreground">Free:</span>
                                    {{ formatBytes(systemInfo.disk_usage.free) }}
                                </div>
                                <div>
                                    <span class="text-muted-foreground">Usage:</span>
                                    {{ systemInfo.disk_usage.percentage }}%
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                <!-- Terminal -->
                <Card class="p-0 overflow-hidden">
                    <div class="p-4 border-b">
                        <div class="font-semibold">Terminal</div>
                        <div class="text-xs text-muted-foreground mt-1">
                            Use Ctrl+Up/Down for command history, Ctrl+L to clear
                        </div>
                    </div>

                    <!-- Terminal Output -->
                    <div
                        id="terminal-output"
                        class="h-96 bg-black text-green-400 p-4 overflow-auto font-mono text-sm"
                        style="font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace"
                    >
                        <div v-for="line in terminalLines" :key="line.id" class="mb-1">
                            <span v-if="line.type === 'command'" class="text-green-400 font-medium">
                                {{ line.content }}
                            </span>
                            <span v-else-if="line.type === 'error'" class="text-red-400">
                                {{ line.content }}
                            </span>
                            <span v-else-if="line.type === 'info'" class="text-blue-400">
                                [{{ line.timestamp }}] {{ line.content }}
                            </span>
                            <span v-else class="text-gray-300">
                                {{ line.content }}
                            </span>
                        </div>

                        <!-- Loading indicator -->
                        <div v-if="isLoading" class="flex items-center gap-2 text-yellow-400">
                            <div class="animate-pulse">●</div>
                            <span>Executing command...</span>
                        </div>
                    </div>

                    <!-- Command Input -->
                    <div class="p-4 border-t bg-gray-900">
                        <div class="flex items-center gap-2">
                            <span class="text-green-400 font-mono text-sm flex-shrink-0">{{ getPrompt() }}</span>
                            <Input
                                v-model="commandInput"
                                class="bg-transparent border-none text-green-400 font-mono text-sm focus:ring-0 focus:border-none flex-1"
                                placeholder="Enter command..."
                                :disabled="isLoading"
                                autocomplete="off"
                                spellcheck="false"
                                @keydown="handleKeydown"
                            />
                        </div>
                    </div>
                </Card>

                <!-- Quick Commands -->
                <Card class="p-4">
                    <div class="font-semibold mb-3">Quick Commands</div>
                    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        <Button
                            v-for="cmd in [
                                'ls -la',
                                'pwd',
                                'whoami',
                                'date',
                                'df -h',
                                'free -h',
                                'ps aux',
                                'top',
                                'git status',
                                'composer --version',
                                'npm --version',
                                'php --version',
                            ]"
                            :key="cmd"
                            variant="outline"
                            size="sm"
                            class="text-xs"
                            :disabled="isLoading"
                            @click="
                                commandInput = cmd;
                                executeCommand();
                            "
                        >
                            {{ cmd }}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    </DashboardLayout>
</template>

<style scoped>
/* Terminal styling */
#terminal-output {
    scrollbar-width: thin;
    scrollbar-color: #4a5568 #1a202c;
}

#terminal-output::-webkit-scrollbar {
    width: 8px;
}

#terminal-output::-webkit-scrollbar-track {
    background: #1a202c;
}

#terminal-output::-webkit-scrollbar-thumb {
    background: #4a5568;
    border-radius: 4px;
}

#terminal-output::-webkit-scrollbar-thumb:hover {
    background: #718096;
}

/* Command input styling */
:deep(input) {
    font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace !important;
}

/* Blinking cursor effect */
:deep(input:focus) {
    box-shadow: none !important;
    border-color: transparent !important;
}
</style>
