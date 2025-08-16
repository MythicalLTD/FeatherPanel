<template>
    <div class="min-h-screen bg-background text-foreground">
        <!-- Console Window Header -->
        <div class="bg-sidebar border-b px-4 py-3 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <h1 class="text-lg font-semibold">{{ server?.name || 'Server Console' }}</h1>
                <Badge :variant="getStatusBadgeVariant(server?.status || 'offline')">
                    {{ server?.status || 'offline' }}
                </Badge>
            </div>
            <div class="flex items-center gap-2">
                <Button variant="outline" size="sm" @click="closeWindow">
                    <X class="h-4 w-4 mr-2" />
                    Close Window
                </Button>
            </div>
        </div>

        <!-- Console Output -->
        <div class="p-4">
            <div class="space-y-4">
                <!-- Terminal Console -->
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold">Terminal Console</h3>
                        <div class="flex items-center gap-2">
                            <Button variant="outline" size="sm" @click="showTimestamps = !showTimestamps">
                                <Clock class="h-4 w-4 mr-2" />
                                {{ showTimestamps ? 'Hide' : 'Show' }} Timestamps
                            </Button>
                            <Button variant="outline" size="sm" @click="clearTerminal">
                                <Trash2 class="h-4 w-4 mr-2" />
                                Clear
                            </Button>
                            <Button variant="outline" size="sm" @click="downloadLogs">
                                <Download class="h-4 w-4 mr-2" />
                                Download Logs
                            </Button>
                        </div>
                    </div>

                    <ServerTerminal
                        :terminal-lines="terminalLines"
                        :wings-web-socket="wingsWebSocket"
                        :show-timestamps="showTimestamps"
                        @clear="clearTerminal"
                        @download-logs="downloadLogs"
                        @send-command="sendCommand"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Trash2, Download, Clock } from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import type { Server, TerminalLine } from '@/types/server';
import { useWingsWebSocket } from '@/composables/useWingsWebSocket';
import ServerTerminal from '@/components/server/ServerTerminal.vue';
import Convert from 'ansi-to-html';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const toast = useToast();

// Console settings
const showTimestamps = ref(false);

// ANSI to HTML converter
const ansiConverter = new Convert({
    fg: '#d1d5db', // Default text color (gray-300)
    bg: '#000000', // Default background color (black)
    newline: false,
    escapeXML: true,
    stream: true,
});

// Server data
const server = ref<Server | null>(null);
const terminalLines = ref<TerminalLine[]>([]);

// Wings WebSocket
const isNavigatingAway = ref(false);
const wingsWebSocket = useWingsWebSocket(route.params.uuidShort as string, isNavigatingAway);

// Track recent commands to filter out echoes
const recentCommands = new Set<string>();
const commandTimeouts = new Map<string, number>();

function closeWindow(): void {
    window.close();
}

// Status badge variants
function getStatusBadgeVariant(status: string) {
    switch (status.toLowerCase()) {
        case 'running':
            return 'default';
        case 'starting':
            return 'secondary';
        case 'stopping':
            return 'secondary';
        case 'offline':
        case 'stopped':
            return 'destructive';
        default:
            return 'outline';
    }
}

// Console functions
function clearTerminal(): void {
    terminalLines.value = [];
    toast.success('Terminal cleared');
}

function downloadLogs(): void {
    // TODO: Implement log download
    toast.info('Log download coming soon');
}

function sendCommand(command: string): void {
    if (!command.trim()) return;

    if (!wingsWebSocket.isConnected) {
        toast.warning("Can't reach the Wings daemon at this moment...");
        return;
    }

    // Check if server is offline
    const currentStatus = wingsWebSocket.wingsStatus?.value || server.value?.status || 'unknown';
    if (currentStatus.toLowerCase() === 'offline') {
        toast.warning(`Cannot send commands - server is ${currentStatus}. Start the server first.`);
        return;
    }

    // Add command to terminal
    addTerminalLine(`> ${command}`, 'command');

    // Add command to recent commands set
    recentCommands.add(command.trim());

    // Set a timeout to remove the command from recent commands after a delay
    const timeoutId = setTimeout(() => {
        recentCommands.delete(command.trim());
    }, 1000);
    commandTimeouts.set(command.trim(), timeoutId);

    // Send command via WebSocket
    if (wingsWebSocket.websocket.value && wingsWebSocket.websocket.value.readyState === WebSocket.OPEN) {
        try {
            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'send command',
                    args: [command],
                }),
            );
        } catch (error) {
            addTerminalLine(`Failed to send command: ${error}`, 'error');
            toast.error('Failed to send command to Wings daemon');
        }
    } else {
        addTerminalLine('WebSocket not connected', 'error');
        toast.warning('Cannot send command - Wings daemon connection lost');
    }
}

function addTerminalLine(content: string, type: 'output' | 'error' | 'warning' | 'info' | 'command' = 'output'): void {
    // Process ANSI content for output lines, but not for command/info lines
    const processedContent = type === 'output' || type === 'error' ? processAnsiContent(content) : content;

    const newLine: TerminalLine = {
        id: Date.now() + Math.random(),
        content: processedContent,
        timestamp: new Date().toISOString(),
        type: type,
    };
    terminalLines.value.push(newLine);

    // Keep only last 1000 lines for performance
    if (terminalLines.value.length > 1000) {
        terminalLines.value.shift();
    }

    // Auto-scroll to bottom
    nextTick(() => {
        const container = document.querySelector('.terminal-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    });
}

function processAnsiContent(content: string): string {
    try {
        // Convert ANSI escape codes to HTML
        return ansiConverter.toHtml(content);
    } catch (error) {
        console.warn('Failed to parse ANSI content:', error);
        // Fallback to original content if parsing fails
        return content;
    }
}

// WebSocket message handler
let messageHandler: ((event: MessageEvent) => void) | null = null;

function setupWebSocketHandlers(): void {
    if (!wingsWebSocket.websocket.value) return;

    // Remove old handler if it exists
    if (messageHandler) {
        wingsWebSocket.websocket.value.removeEventListener('message', messageHandler);
    }

    // Create new message handler
    messageHandler = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.event === 'console output') {
                const output = data.args[0];
                const trimmedOutput = output.trim();

                // Filter out command echoes
                let isCommandEcho = false;
                for (const recentCommand of recentCommands) {
                    if (
                        trimmedOutput === recentCommand ||
                        trimmedOutput.startsWith(recentCommand + ' ') ||
                        trimmedOutput.startsWith('> ' + recentCommand)
                    ) {
                        isCommandEcho = true;
                        break;
                    }
                }

                if (!isCommandEcho) {
                    addTerminalLine(output, 'output');
                }
            } else if (data.event === 'status') {
                const newStatus = data.args[0];
                if (server.value) {
                    server.value.status = newStatus;
                }
                addTerminalLine(`Server status changed to: ${newStatus}`, 'info');
            } else if (data.event === 'daemon error') {
                addTerminalLine(`Daemon Error: ${data.args[0]}`, 'error');
            } else if (data.event === 'jwt error') {
                addTerminalLine(`JWT Error: ${data.args[0]}`, 'error');
                toast.error('Authentication error - please refresh the page');
            }
        } catch {
            // Handle raw text output
            addTerminalLine(event.data, 'output');
        }
    };

    // Add the handler
    wingsWebSocket.websocket.value.addEventListener('message', messageHandler);
}

onMounted(async () => {
    await sessionStore.checkSessionOrRedirect(router);

    // Fetch server data
    try {
        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}`);
        if (response.data.success) {
            server.value = response.data.data;
        } else {
            toast.error('Failed to fetch server data');
            window.close();
            return;
        }
    } catch {
        toast.error('Failed to fetch server data');
        window.close();
        return;
    }

    // Connect to Wings WebSocket
    await wingsWebSocket.connect();

    // Set up WebSocket handlers
    watch(
        () => wingsWebSocket.websocket.value,
        (newWebSocket) => {
            if (newWebSocket) {
                setupWebSocketHandlers();
            }
        },
        { immediate: true },
    );

    // Request logs
    if (wingsWebSocket.websocket.value) {
        wingsWebSocket.websocket.value.send(
            JSON.stringify({
                event: 'send logs',
                args: [],
            }),
        );
    }

    // Add initial message
    addTerminalLine('Console window opened - monitoring server output...', 'info');
});

onUnmounted(() => {
    // Clean up message handler
    if (messageHandler && wingsWebSocket.websocket.value) {
        wingsWebSocket.websocket.value.removeEventListener('message', messageHandler);
    }

    // Clean up command tracking
    commandTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    commandTimeouts.clear();
    recentCommands.clear();

    wingsWebSocket.cleanup();
});
</script>
