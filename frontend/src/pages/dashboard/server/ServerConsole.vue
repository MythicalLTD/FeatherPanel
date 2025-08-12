<!-- eslint-disable vue/no-v-html -->
<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <!-- Header Section -->
            <ServerHeader
                :server="server"
                :loading="loading"
                :wings-state="wingsState"
                @start="startServer"
                @restart="restartServer"
                @stop="stopServer"
                @kill="killServer"
            />

            <!-- Wings Connection Status Banner -->
            <div
                class="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                :class="{
                    'border-green-200 bg-green-50 dark:bg-green-900/20': wingsConnectionInfo.status === 'healthy',
                    'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20': wingsConnectionInfo.status === 'error',
                    'border-red-200 bg-red-50 dark:bg-red-900/20': wingsConnectionInfo.status === 'disconnected',
                    'border-blue-200 bg-blue-50 dark:bg-blue-900/20': wingsConnectionInfo.status === 'connecting',
                }"
            >
                <span class="text-lg">{{ wingsConnectionInfo.icon }}</span>
                <span class="text-sm font-medium" :class="wingsConnectionInfo.color">
                    {{ wingsConnectionInfo.message }}
                </span>
                <div v-if="wingsConnectionInfo.status === 'connecting'" class="ml-auto">
                    <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
            </div>

            <!-- Server Info Cards -->
            <ServerInfoCards :server="server" :wings-uptime="wingsUptime" :wings-state="wingsState" />

            <!-- Terminal Console -->
            <ServerTerminal
                :terminal-lines="terminalLines"
                :wings-web-socket="wingsWebSocket"
                @clear="clearTerminal"
                @download-logs="downloadLogs"
                @send-command="sendCommand"
            />
            <!-- Performance Monitoring -->
            <ServerPerformance
                :server="server"
                :cpu-data="cpuData"
                :memory-data="memoryData"
                :disk-data="diskData"
                :network-data="networkData"
                :network-stats="networkStats"
            />
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import ServerHeader from '@/components/server/ServerHeader.vue';
import ServerInfoCards from '@/components/server/ServerInfoCards.vue';
import ServerPerformance from '@/components/server/ServerPerformance.vue';
import ServerTerminal from '@/components/server/ServerTerminal.vue';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import type { Server, NetworkStats, TerminalLine } from '@/types/server';
import { useWingsWebSocket, type WingsStats } from '@/composables/useWingsWebSocket';
import Convert from 'ansi-to-html';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const toast = useToast();

// Flag to track if user is navigating away
const isNavigatingAway = ref(false);

// Track if WebSocket handlers are set up to prevent duplicates
const handlersSetup = ref(false);
let messageHandler: ((event: MessageEvent) => void) | null = null;

// Track recent commands to filter out echoes
const recentCommands = new Set<string>();
const commandTimeouts = new Map<string, number>();

const server = ref<Server | null>(null);
const loading = ref(false);
const terminalLines = ref<TerminalLine[]>([]);
const networkStats = ref<NetworkStats>({
    upload: '0 B',
    download: '0 B',
});

// Wings real-time data
const wingsState = ref<string>('');
const wingsUptime = ref<number>(0);

// Terminal and WebSocket functionality
const wingsWebSocket = useWingsWebSocket(route.params.uuidShort as string, isNavigatingAway);

// Stats request interval
let statsInterval: number | null = null;

// Real-time performance data
const cpuData = ref<Array<{ timestamp: number; value: number }>>([]);
const memoryData = ref<Array<{ timestamp: number; value: number }>>([]);
const diskData = ref<Array<{ timestamp: number; value: number }>>([]);
const networkData = ref<Array<{ timestamp: number; value: number }>>([]);

// Performance data configuration
const maxDataPoints = 60; // Keep last 60 data points (1 minute at 1s intervals)

// Initialize charts with initial data point so they always display
const initTimestamp = Date.now();
cpuData.value.push({ timestamp: initTimestamp, value: 0 });
memoryData.value.push({ timestamp: initTimestamp, value: 0 });
diskData.value.push({ timestamp: initTimestamp, value: 0 });
networkData.value.push({ timestamp: initTimestamp, value: 0 });

// ANSI to HTML converter
const ansiConverter = new Convert({
    fg: '#d1d5db', // Default text color (gray-300)
    bg: '#000000', // Default background color (black)
    newline: false,
    escapeXML: true,
    stream: true,
});

const breadcrumbs = computed(() => [
    { text: 'Dashboard', href: '/dashboard' },
    { text: 'Servers', href: '/dashboard' },
    { text: server.value?.name || 'Server', isCurrent: true, href: `/server/${route.params.uuidShort}` },
]);

// Wings connection status display
const wingsConnectionInfo = computed(() => {
    if (!wingsWebSocket.isConnected) {
        return {
            status: 'disconnected',
            message: 'Wings daemon disconnected - Using API fallback mode',
            color: 'text-red-500',
            icon: '🔌',
        };
    } else if (wingsWebSocket.wingsStatus?.value === 'healthy') {
        return {
            status: 'healthy',
            message: 'Wings daemon connected - Server management available',
            color: 'text-green-500',
            icon: '✅',
        };
    } else if (wingsWebSocket.wingsStatus?.value === 'error') {
        return {
            status: 'error',
            message: 'Wings daemon error - Limited functionality',
            color: 'text-yellow-500',
            icon: '⚠️',
        };
    } else {
        return {
            status: 'connecting',
            message: 'Connecting to Wings daemon...',
            color: 'text-blue-500',
            icon: '🔄',
        };
    }
});

onMounted(async () => {
    await sessionStore.checkSessionOrRedirect(router);
    await settingsStore.fetchSettings(); // Load settings for app name
    await fetchServer();

    // Set up navigation detection to prevent false "lost connection" messages
    const unsubscribe = router.beforeEach((to, from, next) => {
        if (from.path.includes('/server/')) {
            isNavigatingAway.value = true;
        }
        next();
    });

    // Clean up navigation listener on unmount
    onUnmounted(() => {
        unsubscribe();
    });

    // Always try to connect to Wings daemon - it's always online and can handle all requests
    await wingsWebSocket.connect();

    // Always request stats and logs - Wings will handle if server is offline gracefully
    requestServerStats();
    requestServerLogs();

    // Always set up periodic stats requests every 5 seconds - Wings handles offline servers
    statsInterval = setInterval(() => {
        if (wingsWebSocket.isConnected) {
            requestServerStats();
        }
    }, 5000);

    // Add informative message for offline servers
    if (server.value?.status !== 'running') {
        addTerminalLine('Console ready - Server is offline. Use the power buttons above to start the server.', 'info');

        // Initialize performance charts with zero data for offline servers
        const timestamp = Date.now();
        addDataPoint(cpuData.value, timestamp, 0);
        addDataPoint(memoryData.value, timestamp, 0);
        addDataPoint(diskData.value, timestamp, 0);
        addDataPoint(networkData.value, timestamp, 0);
    }

    // Set up WebSocket handlers when websocket becomes available
    watch(
        () => wingsWebSocket.websocket.value,
        (newWebSocket) => {
            if (newWebSocket) {
                setupWebSocketHandlers();
            }
        },
        { immediate: true },
    );

    // Re-setup handlers on reconnection and handle connection status changes
    watch(
        () => wingsWebSocket.isConnected.value,
        (isConnected, wasConnected) => {
            if (isConnected && wasConnected === false) {
                // Reconnected - setup handlers again and log the reconnection
                if (wingsWebSocket.websocket.value) {
                    setupWebSocketHandlers();
                }
                console.log('WebSocket reconnected, checking Wings health...');
            }
        },
    );

    // Watch for connection status changes
    watch(
        () => wingsWebSocket.isReconnecting.value,
        (isReconnecting) => {
            if (isReconnecting) {
                // Don't spam users with reconnection attempts - just log it
                console.log(`Reconnecting to Wings daemon... (${wingsWebSocket.reconnectAttempts.value}/5)`);
            }
        },
    );

    // Watch Wings health status for critical changes
    watch(
        () => wingsWebSocket.wingsStatus?.value,
        (wingsStatus, previousStatus) => {
            if (wingsStatus === 'error' && previousStatus === 'healthy') {
                toast.error('⚠️ Wings daemon stopped responding - switching to API fallback mode');
            } else if (wingsStatus === 'healthy' && previousStatus === 'error') {
                // Don't show success toast for recovery - users can see the banner status
                console.log('Wings daemon recovered and is healthy again');
            }
        },
    );
});

onUnmounted(() => {
    // Clean up message handler
    if (messageHandler && wingsWebSocket.websocket.value) {
        wingsWebSocket.websocket.value.removeEventListener('message', messageHandler);
    }
    handlersSetup.value = false;
    messageHandler = null;

    // Clean up command tracking
    commandTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    commandTimeouts.clear();
    recentCommands.clear();

    wingsWebSocket.cleanup();
    if (statsInterval) {
        clearInterval(statsInterval);
        statsInterval = null;
    }
});

async function fetchServer(): Promise<void> {
    loading.value = true;
    try {
        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}`);
        if (response.data.success) {
            server.value = response.data.data;
            // Wings connection is handled in onMounted - no need for conditional logic here
        } else {
            toast.error(t('serverConsole.failedToFetch'));
            router.push('/dashboard');
        }
    } catch {
        toast.error(t('serverConsole.failedToFetch'));
        router.push('/dashboard');
    } finally {
        loading.value = false;
    }
}

function setupWebSocketHandlers(): void {
    if (!wingsWebSocket.websocket.value) return;

    // Remove old handler if it exists to prevent duplicates
    if (messageHandler && handlersSetup.value) {
        wingsWebSocket.websocket.value.removeEventListener('message', messageHandler);
    }

    // Create new message handler
    messageHandler = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.event === 'console output') {
                // Handle console output from Wings
                const output = data.args[0];

                // Filter out command echoes - don't show output that matches recent commands
                const trimmedOutput = output.trim();

                // Check if this output is likely a command echo
                let isCommandEcho = false;
                for (const recentCommand of recentCommands) {
                    // Check exact match or if output starts with the command (handling server prompts)
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
                // Update server status and Wings state
                const newStatus = data.args[0];
                wingsState.value = newStatus;
                if (server.value) {
                    server.value.status = newStatus;
                }

                // Add status change to terminal
                addTerminalLine(`Server status changed to: ${newStatus}`, 'info');

                // Handle specific status transitions
                if (newStatus === 'running') {
                    // Server is now running - request logs and start stats collection
                    requestServerLogs();
                    if (!statsInterval) {
                        statsInterval = setInterval(() => {
                            if (wingsWebSocket.isConnected) {
                                requestServerStats();
                            }
                        }, 5000);
                    }
                } else if (newStatus === 'offline' || newStatus === 'stopped') {
                    // Server is offline - stop stats collection
                    if (statsInterval) {
                        clearInterval(statsInterval);
                        statsInterval = null;
                    }
                }
            } else if (data.event === 'stats') {
                // Update real-time stats
                try {
                    const stats: WingsStats = JSON.parse(data.args[0]);
                    updateServerStats(stats);
                    updatePerformanceCharts(stats);

                    // Update Wings state and uptime
                    wingsState.value = stats.state;
                    wingsUptime.value = stats.uptime;
                } catch (parseError) {
                    console.warn('Failed to parse stats:', parseError);
                }
            } else if (data.event === 'daemon error') {
                addTerminalLine(`Daemon Error: ${data.args[0]}`, 'error');
            } else if (data.event === 'jwt error') {
                addTerminalLine(`JWT Error: ${data.args[0]}`, 'error');
                toast.error('Authentication error - please refresh the page');
            } else if (data.event === 'token expiring') {
                addTerminalLine('Token expiring, attempting to reconnect...', 'warning');
                // Token expiration is handled automatically by the WebSocket composable
            } else if (data.event === 'token expired') {
                addTerminalLine('Token expired, please refresh the page', 'error');
                // Page reload is handled automatically by the WebSocket composable
            } else if (data.event === 'install started') {
                addTerminalLine('Server installation started...', 'info');
            } else if (data.event === 'install output') {
                addTerminalLine(data.args[0], 'info');
            } else if (data.event === 'install completed') {
                addTerminalLine('Server installation completed!', 'info');
                toast.success('Server installation completed');
            } else if (data.event === 'backup completed') {
                addTerminalLine('Backup completed successfully', 'info');
                toast.success('Backup completed successfully');
            } else if (data.event === 'transfer status') {
                addTerminalLine(`Transfer status: ${data.args[0]}`, 'info');
            } else if (data.event === 'transfer logs') {
                addTerminalLine(data.args[0], 'info');
            } else if (data.event === 'deleted') {
                addTerminalLine('Server has been deleted', 'error');
                toast.error('Server has been deleted');
                router.push('/dashboard');
            }
        } catch {
            // Handle raw text output
            addTerminalLine(event.data, 'output');
        }
    };

    // Add the new handler
    wingsWebSocket.websocket.value.addEventListener('message', messageHandler);
    handlersSetup.value = true;
}

function updateServerStats(stats: WingsStats): void {
    if (!server.value) return;

    // Update CPU usage
    server.value.cpu = Math.round(stats.cpu_absolute || 0);

    // Update memory usage (convert bytes to MiB)
    server.value.memory = Math.round((stats.memory_bytes || 0) / (1024 * 1024));

    // Update memory limit (convert bytes to MiB)
    server.value.memoryLimit = Math.round((stats.memory_limit_bytes || 0) / (1024 * 1024));

    // Update disk usage (convert bytes to MiB)
    server.value.disk = Math.round((stats.disk_bytes || 0) / (1024 * 1024));

    // Update network stats
    networkStats.value = {
        upload: formatBytes(stats.network?.tx_bytes || 0),
        download: formatBytes(stats.network?.rx_bytes || 0),
    };
}

function updatePerformanceCharts(stats: WingsStats): void {
    const timestamp = Date.now();

    // Update CPU chart
    addDataPoint(cpuData.value, timestamp, stats.cpu_absolute);

    // Update memory chart (convert to MiB)
    addDataPoint(memoryData.value, timestamp, (stats.memory_bytes || 0) / (1024 * 1024));

    // Update disk chart (convert to MiB)
    addDataPoint(diskData.value, timestamp, (stats.disk_bytes || 0) / (1024 * 1024));

    // Update network chart (total bytes)
    const totalNetwork = (stats.network?.rx_bytes || 0) + (stats.network?.tx_bytes || 0);
    addDataPoint(networkData.value, timestamp, totalNetwork);
}

function addDataPoint(dataArray: Array<{ timestamp: number; value: number }>, timestamp: number, value: number): void {
    dataArray.push({ timestamp, value });

    // Keep only last N data points
    if (dataArray.length > maxDataPoints) {
        dataArray.shift();
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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

/**
 * Replace Pterodactyl/Pelican references with custom app name from settings
 */
function replaceBrandNames(content: string): string {
    if (!content || !settingsStore.appName) return content;

    const customAppName = String(settingsStore.appName);

    // Create replacement patterns with proper case handling
    const replacements = [
        // Exact case matches
        { pattern: /\bPterodactyl\b/g, replacement: customAppName },
        { pattern: /\bpterodactyl\b/g, replacement: customAppName.toLowerCase() },
        { pattern: /\bPTERODACTYL\b/g, replacement: customAppName.toUpperCase() },
        { pattern: /\bPelican\b/g, replacement: customAppName },
        { pattern: /\bpelican\b/g, replacement: customAppName.toLowerCase() },
        { pattern: /\bPELICAN\b/g, replacement: customAppName.toUpperCase() },
    ];

    let result = content;
    for (const { pattern, replacement } of replacements) {
        result = result.replace(pattern, replacement);
    }

    return result;
}

function handleApiError(error: unknown, action: string): void {
    let errorMessage = `${action} failed`;

    if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
            response?: { data?: { message?: string; error_message?: string }; status?: number };
        };

        if (axiosError.response?.data?.message) {
            errorMessage = `${action} failed: ${axiosError.response.data.message}`;
        } else if (axiosError.response?.data?.error_message) {
            errorMessage = `${action} failed: ${axiosError.response.data.error_message}`;
        } else if (axiosError.response?.status) {
            errorMessage = `${action} failed: HTTP ${axiosError.response.status}`;
        }
    } else if (error instanceof Error) {
        errorMessage = `${action} failed: ${error.message}`;
    }

    toast.error(errorMessage);
    console.error(`${action} error:`, error);
}

function addTerminalLine(content: string, type: 'output' | 'error' | 'warning' | 'info' | 'command' = 'output'): void {
    // First replace brand names with custom app name
    const brandReplacedContent = replaceBrandNames(content);

    // Process ANSI content for output lines, but not for command/info lines
    const processedContent =
        type === 'output' || type === 'error' ? processAnsiContent(brandReplacedContent) : brandReplacedContent;

    const newLine: TerminalLine = {
        id: Date.now() + Math.random(),
        content: processedContent,
        timestamp: new Date().toISOString(),
        type: type,
    };
    terminalLines.value.push(newLine);

    // Keep only last 1000 lines to prevent memory issues
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

async function startServer(): Promise<void> {
    try {
        loading.value = true;

        // Prefer Wings WebSocket for immediate response
        if (wingsWebSocket.isConnected && wingsWebSocket.websocket.value) {
            // Immediately update local status to show starting
            if (server.value) {
                server.value.status = 'starting';
            }
            wingsState.value = 'starting';

            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'set state',
                    args: ['start'],
                }),
            );
            toast.success(t('serverConsole.serverStarting'));

            // Set up stats collection for the starting server
            if (!statsInterval) {
                statsInterval = setInterval(() => {
                    if (wingsWebSocket.isConnected) {
                        requestServerStats();
                    }
                }, 5000);
            }
        } else {
            // Fallback to API if Wings not available
            toast.info('Using fallback API mode - Wings daemon unavailable');

            await axios.post(`/api/user/servers/${route.params.uuidShort}/power/start`);
            toast.success(t('serverConsole.serverStarting'));
            await fetchServer();
            await wingsWebSocket.connect();
        }
    } catch (error) {
        // Reset status on error
        if (server.value) {
            server.value.status = 'offline';
        }
        wingsState.value = 'offline';
        handleApiError(error, t('serverConsole.serverStarting'));
    } finally {
        loading.value = false;
    }
}

async function stopServer(): Promise<void> {
    try {
        loading.value = true;

        // Prefer Wings WebSocket for immediate response
        if (wingsWebSocket.isConnected && wingsWebSocket.websocket.value) {
            // Immediately update local status to show stopping
            if (server.value) {
                server.value.status = 'stopping';
            }
            wingsState.value = 'stopping';

            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'set state',
                    args: ['stop'],
                }),
            );
            toast.success(t('serverConsole.serverStopping'));
        } else {
            // Fallback to API if Wings not available
            toast.info('Using fallback API mode - Wings daemon unavailable');

            await axios.post(`/api/user/servers/${route.params.uuidShort}/power/stop`);
            toast.success(t('serverConsole.serverStopping'));
        }

        // Always disconnect WebSocket when stopping server
        // Note: Don't disconnect immediately, let Wings send the final status

        // Clear stats interval since server will be offline
        if (statsInterval) {
            clearInterval(statsInterval);
            statsInterval = null;
        }
    } catch (error) {
        handleApiError(error, t('serverConsole.serverStopping'));
    } finally {
        loading.value = false;
    }
}

async function restartServer(): Promise<void> {
    try {
        loading.value = true;

        // Prefer Wings WebSocket for immediate response
        if (wingsWebSocket.isConnected && wingsWebSocket.websocket.value) {
            // Immediately update local status to show stopping (restart = stop then start)
            if (server.value) {
                server.value.status = 'stopping';
            }
            wingsState.value = 'stopping';

            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'set state',
                    args: ['restart'],
                }),
            );
            toast.success(t('serverConsole.serverRestarting'));
        } else {
            // Fallback to API if Wings not available
            toast.info('Using fallback API mode - Wings daemon unavailable');

            await axios.post(`/api/user/servers/${route.params.uuidShort}/power/restart`);
            toast.success(t('serverConsole.serverRestarting'));

            // Wait a bit for the restart to begin
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Fetch server status and reconnect if running
            await fetchServer();
            await wingsWebSocket.connect();
        }
    } catch (error) {
        handleApiError(error, t('serverConsole.serverRestarting'));
    } finally {
        loading.value = false;
    }
}

async function killServer(): Promise<void> {
    try {
        loading.value = true;

        // Prefer Wings WebSocket for immediate response
        if (wingsWebSocket.isConnected && wingsWebSocket.websocket.value) {
            // Immediately update local status to show offline (kill = immediate stop)
            if (server.value) {
                server.value.status = 'offline';
            }
            wingsState.value = 'offline';

            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'set state',
                    args: ['kill'],
                }),
            );
            toast.success(t('serverConsole.serverKilling'));
        } else {
            // Fallback to API if Wings not available
            toast.info('Using fallback API mode - Wings daemon unavailable');

            await axios.post(`/api/user/servers/${route.params.uuidShort}/power/kill`);
            toast.success(t('serverConsole.serverKilling'));
        }

        // Clear stats interval since server will be offline
        if (statsInterval) {
            clearInterval(statsInterval);
            statsInterval = null;
        }
    } catch (error) {
        handleApiError(error, t('serverConsole.serverKilling'));
    } finally {
        loading.value = false;
    }
}

function clearTerminal(): void {
    terminalLines.value = [];
}

function downloadLogs(): void {
    // TODO: Implement log download
    toast.info(t('serverConsole.logDownloadComingSoon'));
}

function sendCommand(command: string): void {
    if (!command.trim()) return;

    if (!wingsWebSocket.isConnected) {
        toast.warning(
            "Can't reach the Wings daemon at this moment... Please wait for reconnection or use the power buttons",
        );
        return;
    }

    // Check if server is completely offline - only block commands for truly offline servers
    const currentStatus = wingsState.value || server.value?.status || 'unknown';
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
    }, 1000); // 1 second delay
    commandTimeouts.set(command.trim(), timeoutId);

    // Send command via WebSocket using correct API format
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

function requestServerStats(): void {
    if (wingsWebSocket.websocket.value && wingsWebSocket.websocket.value.readyState === WebSocket.OPEN) {
        try {
            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'send stats',
                    args: [],
                }),
            );
        } catch (error) {
            console.warn('Failed to request server stats:', error);
        }
    }
}

function requestServerLogs(): void {
    if (wingsWebSocket.websocket.value && wingsWebSocket.websocket.value.readyState === WebSocket.OPEN) {
        try {
            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'send logs',
                    args: [],
                }),
            );
        } catch (error) {
            console.warn('Failed to request server logs:', error);
        }
    }
}
</script>
