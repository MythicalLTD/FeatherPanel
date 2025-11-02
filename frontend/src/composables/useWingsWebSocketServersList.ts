/*
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { ref } from 'vue';
import axios from 'axios';
import type { WingsStats } from './useWingsWebSocket';

export interface WingsWebSocketMessage {
    event: string;
    data?: string;
    args?: string[];
    timestamp?: number;
}

export interface WingsJWTResponse {
    success: boolean;
    message: string;
    data: {
        token: string;
        expires_at: number;
        server_uuid: string;
        user_uuid: string;
        permissions: string[];
        connection_string: string;
    };
    error: boolean;
    error_message: string | null;
    error_code: string | null;
}

export interface ServerConnectionState {
    connectionStatus: 'disconnected' | 'connecting' | 'connected';
    wingsStatus: 'unknown' | 'healthy' | 'error';
    websocket: WebSocket | null;
    jwtToken: string;
    jwtExpiresAt: number;
    reconnectAttempts: number;
    reconnectTimeout: number | null;
    tokenExpirationTimer: number | null;
    statsInterval: number | null;
    isRefreshingToken: boolean;
}

export interface ServerStats {
    cpuUsage: number; // Percentage
    memoryUsage: number; // MB
    diskUsage: number; // MB
    networkRx: number; // Bytes
    networkTx: number; // Bytes
    state: string;
    uptime: number;
}

export interface ServerLiveData {
    status: string | null;
    stats: ServerStats | null;
    lastUpdate: number | null;
}

// Store connections per server UUID
const serverConnections = ref<Map<string, ServerConnectionState>>(new Map());
const serverLiveData = ref<Map<string, ServerLiveData>>(new Map());

// Reactive map for Vue to track changes
const reactiveServerLiveData = ref<Record<string, ServerLiveData>>({});
const maxReconnectAttempts = 5;
const reconnectDelay = 5000; // 5 seconds
const statsRequestInterval = 5000; // Request stats every 5 seconds

export function useWingsWebSocketServersList() {
    // Get connection state for a specific server
    function getConnectionState(serverUuid: string): ServerConnectionState | undefined {
        return serverConnections.value.get(serverUuid);
    }

    // Get live data for a specific server
    function getServerLiveData(serverUuid: string): ServerLiveData | undefined {
        return serverLiveData.value.get(serverUuid);
    }

    // Check if server is connected
    function isServerConnected(serverUuid: string): boolean {
        const state = serverConnections.value.get(serverUuid);
        return state?.connectionStatus === 'connected';
    }

    // Check if server is connecting
    function isServerConnecting(serverUuid: string): boolean {
        const state = serverConnections.value.get(serverUuid);
        return state?.connectionStatus === 'connecting';
    }

    // Check if Wings daemon is healthy for a server
    function isWingsHealthy(serverUuid: string): boolean {
        const state = serverConnections.value.get(serverUuid);
        return state?.wingsStatus === 'healthy';
    }

    // Get server status
    function getServerStatus(serverUuid: string): string | null {
        const liveData = serverLiveData.value.get(serverUuid);
        return liveData?.status || null;
    }

    // Get server stats
    function getServerStats(serverUuid: string): ServerStats | null {
        const liveData = serverLiveData.value.get(serverUuid);
        return liveData?.stats || null;
    }

    // Initialize connection state for a server
    function initializeServerConnection(serverUuid: string): ServerConnectionState {
        const state: ServerConnectionState = {
            connectionStatus: 'disconnected',
            wingsStatus: 'unknown',
            websocket: null,
            jwtToken: '',
            jwtExpiresAt: 0,
            reconnectAttempts: 0,
            reconnectTimeout: null,
            tokenExpirationTimer: null,
            statsInterval: null,
            isRefreshingToken: false,
        };
        serverConnections.value.set(serverUuid, state);
        return state;
    }

    // Setup token expiration timer for a server
    function setupTokenExpirationTimer(serverUuid: string): void {
        const state = serverConnections.value.get(serverUuid);
        if (!state) return;

        // Clear any existing timer
        if (state.tokenExpirationTimer) {
            clearTimeout(state.tokenExpirationTimer);
            state.tokenExpirationTimer = null;
        }

        if (!state.jwtExpiresAt) return;

        // Calculate time until expiration
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = state.jwtExpiresAt;
        const timeUntilExpiration = (expiresAt - now) * 1000;

        if (timeUntilExpiration <= 0) {
            // Token already expired, refresh immediately
            if (state.connectionStatus === 'connected') {
                refreshToken(serverUuid).catch((error) => {
                    console.error(`Failed to refresh expired token for server ${serverUuid}:`, error);
                });
            }
            return;
        }

        // Refresh 1 minute before expiration
        const refreshTime = Math.max(timeUntilExpiration - 60000, 5000);
        state.tokenExpirationTimer = window.setTimeout(async () => {
            const currentState = serverConnections.value.get(serverUuid);
            if (currentState && currentState.connectionStatus === 'connected') {
                await refreshToken(serverUuid);
            }
        }, refreshTime);
    }

    // Request server stats
    function requestServerStats(serverUuid: string): void {
        const state = serverConnections.value.get(serverUuid);
        if (!state || !state.websocket || state.websocket.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            state.websocket.send(
                JSON.stringify({
                    event: 'send stats',
                    args: [],
                }),
            );
        } catch (error) {
            console.warn(`Failed to request stats for server ${serverUuid}:`, error);
        }
    }

    // Setup stats interval for a server
    function setupStatsInterval(serverUuid: string): void {
        const state = serverConnections.value.get(serverUuid);
        if (!state) return;

        // Clear existing interval
        if (state.statsInterval) {
            clearInterval(state.statsInterval);
            state.statsInterval = null;
        }

        // Only request stats if server is running/starting
        const liveData = serverLiveData.value.get(serverUuid);
        if (liveData?.status === 'running' || liveData?.status === 'starting') {
            state.statsInterval = window.setInterval(() => {
                if (isServerConnected(serverUuid)) {
                    requestServerStats(serverUuid);
                }
            }, statsRequestInterval);
        }
    }

    // Update server live data
    function updateServerLiveData(serverUuid: string, updates: Partial<ServerLiveData>): void {
        const existing = serverLiveData.value.get(serverUuid);
        const updated: ServerLiveData = {
            status: updates.status !== undefined ? updates.status : existing?.status || null,
            stats: updates.stats !== undefined ? updates.stats : existing?.stats || null,
            lastUpdate: updates.lastUpdate !== undefined ? updates.lastUpdate : Date.now(),
        };
        serverLiveData.value.set(serverUuid, updated);
        // Update reactive object for Vue reactivity
        reactiveServerLiveData.value = {
            ...reactiveServerLiveData.value,
            [serverUuid]: updated,
        };
    }

    // Connect to a server's Wings WebSocket
    async function connectServer(serverUuid: string): Promise<void> {
        let state = serverConnections.value.get(serverUuid);
        if (!state) {
            state = initializeServerConnection(serverUuid);
        }

        if (state.connectionStatus === 'connected' || state.connectionStatus === 'connecting') {
            return;
        }

        try {
            state.connectionStatus = 'connecting';

            // Get JWT token for WebSocket connection
            const response = await axios.post<WingsJWTResponse>(`/api/user/servers/${serverUuid}/jwt`);
            if (response.data.success) {
                state.jwtToken = response.data.data.token;
                state.jwtExpiresAt = response.data.data.expires_at;
                const connectionString = response.data.data.connection_string;

                // Set up token expiration timer
                setupTokenExpirationTimer(serverUuid);

                // Connect to WebSocket
                state.websocket = new WebSocket(connectionString);

                state.websocket.onopen = () => {
                    // Send authentication message
                    if (state.websocket) {
                        state.websocket.send(
                            JSON.stringify({
                                event: 'auth',
                                args: [state.jwtToken],
                            }),
                        );
                    }
                };

                state.websocket.onmessage = (event) => {
                    try {
                        const data: WingsWebSocketMessage = JSON.parse(event.data);

                        if (data.event === 'auth success') {
                            state.connectionStatus = 'connected';
                            state.reconnectAttempts = 0;
                            state.wingsStatus = 'healthy';

                            // Request initial stats
                            requestServerStats(serverUuid);

                            // Setup stats interval
                            setupStatsInterval(serverUuid);
                        } else if (data.event === 'auth_error') {
                            state.connectionStatus = 'disconnected';
                            state.wingsStatus = 'error';
                            state.websocket?.close();
                        } else if (data.event === 'token expired' || data.event === 'jwt error') {
                            // Try to refresh token
                            refreshToken(serverUuid).catch(() => {
                                // If refresh fails, disconnect
                                disconnectServer(serverUuid);
                            });
                        } else if (data.event === 'daemon error') {
                            state.wingsStatus = 'error';
                        } else if (data.event === 'status') {
                            const newStatus = data.args?.[0] || null;
                            updateServerLiveData(serverUuid, { status: newStatus });
                            state.wingsStatus = 'healthy';

                            // Update stats interval based on new status
                            setupStatsInterval(serverUuid);

                            // If server just started running, request stats
                            if (newStatus === 'running') {
                                requestServerStats(serverUuid);
                            }
                        } else if (data.event === 'stats') {
                            try {
                                const stats: WingsStats = JSON.parse(data.args?.[0] || '{}');
                                const serverStats: ServerStats = {
                                    cpuUsage: Math.round(stats.cpu_absolute || 0),
                                    memoryUsage: Math.round((stats.memory_bytes || 0) / (1024 * 1024)),
                                    diskUsage: Math.round((stats.disk_bytes || 0) / (1024 * 1024)),
                                    networkRx: stats.network?.rx_bytes || 0,
                                    networkTx: stats.network?.tx_bytes || 0,
                                    state: stats.state || '',
                                    uptime: stats.uptime || 0,
                                };

                                updateServerLiveData(serverUuid, {
                                    status: stats.state,
                                    stats: serverStats,
                                });

                                state.wingsStatus = 'healthy';
                            } catch (parseError) {
                                console.warn(`Failed to parse stats for server ${serverUuid}:`, parseError);
                            }
                        }
                    } catch {
                        // Ignore parsing errors for non-JSON messages
                    }
                };

                state.websocket.onclose = () => {
                    state.connectionStatus = 'disconnected';
                    state.websocket = null;

                    // Clear stats interval
                    if (state.statsInterval) {
                        clearInterval(state.statsInterval);
                        state.statsInterval = null;
                    }

                    // Attempt to reconnect if not manually disconnected and not refreshing token
                    if (!state.isRefreshingToken && state.reconnectAttempts < maxReconnectAttempts) {
                        scheduleReconnect(serverUuid);
                    }
                };

                state.websocket.onerror = () => {
                    state.connectionStatus = 'disconnected';
                    state.websocket = null;

                    // Clear stats interval
                    if (state.statsInterval) {
                        clearInterval(state.statsInterval);
                        state.statsInterval = null;
                    }

                    // Attempt to reconnect if not manually disconnected and not refreshing token
                    if (!state.isRefreshingToken && state.reconnectAttempts < maxReconnectAttempts) {
                        scheduleReconnect(serverUuid);
                    }
                };

                // Set authentication timeout
                const authTimeout = setTimeout(() => {
                    const currentState = serverConnections.value.get(serverUuid);
                    if (currentState && currentState.connectionStatus === 'connecting') {
                        currentState.connectionStatus = 'disconnected';
                        currentState.websocket?.close();
                    }
                }, 15000);

                // Store original onmessage and wrap it to clear timeout
                const ws = state.websocket;
                const originalOnMessage = ws.onmessage;
                ws.onmessage = (event) => {
                    clearTimeout(authTimeout);
                    if (originalOnMessage) {
                        originalOnMessage.call(ws, event);
                    }
                };
            } else {
                throw new Error('Failed to get JWT token');
            }
        } catch (error) {
            state.connectionStatus = 'disconnected';
            state.wingsStatus = 'error';
            console.error(`Connection error for server ${serverUuid}:`, error);

            // Attempt to reconnect
            if (state.reconnectAttempts < maxReconnectAttempts) {
                scheduleReconnect(serverUuid);
            }
        }
    }

    // Refresh token for a server
    async function refreshToken(serverUuid: string): Promise<void> {
        const state = serverConnections.value.get(serverUuid);
        if (!state) return;

        try {
            state.isRefreshingToken = true;

            // Close current WebSocket connection
            if (state.websocket) {
                state.websocket.close();
                state.websocket = null;
            }

            // Clear stats interval
            if (state.statsInterval) {
                clearInterval(state.statsInterval);
                state.statsInterval = null;
            }

            state.connectionStatus = 'connecting';

            // Get new JWT token
            const response = await axios.post<WingsJWTResponse>(`/api/user/servers/${serverUuid}/jwt`);
            if (response.data.success) {
                state.jwtToken = response.data.data.token;
                state.jwtExpiresAt = response.data.data.expires_at;
                const connectionString = response.data.data.connection_string;

                // Set up new token expiration timer
                setupTokenExpirationTimer(serverUuid);

                // Reconnect WebSocket with new token
                state.websocket = new WebSocket(connectionString);

                state.websocket.onopen = () => {
                    if (state.websocket) {
                        state.websocket.send(
                            JSON.stringify({
                                event: 'auth',
                                args: [state.jwtToken],
                            }),
                        );
                    }
                };

                state.websocket.onmessage = (event) => {
                    try {
                        const data: WingsWebSocketMessage = JSON.parse(event.data);
                        if (data.event === 'auth success') {
                            state.connectionStatus = 'connected';
                            state.reconnectAttempts = 0;
                            state.wingsStatus = 'healthy';
                            state.isRefreshingToken = false;

                            // Request stats and setup interval
                            requestServerStats(serverUuid);
                            setupStatsInterval(serverUuid);
                        } else if (data.event === 'auth_error') {
                            state.connectionStatus = 'disconnected';
                            state.wingsStatus = 'error';
                            state.isRefreshingToken = false;
                            state.websocket?.close();
                        }
                    } catch {
                        // Ignore parsing errors
                    }
                };
            } else {
                throw new Error('Failed to refresh JWT token');
            }
        } catch (error) {
            console.error(`Token refresh error for server ${serverUuid}:`, error);
            state.connectionStatus = 'disconnected';
            state.wingsStatus = 'error';
            state.isRefreshingToken = false;
        }
    }

    // Schedule reconnect for a server
    function scheduleReconnect(serverUuid: string): void {
        const state = serverConnections.value.get(serverUuid);
        if (!state) return;

        if (state.reconnectAttempts >= maxReconnectAttempts) {
            return;
        }

        state.reconnectAttempts++;
        state.connectionStatus = 'disconnected';

        if (state.reconnectTimeout) {
            clearTimeout(state.reconnectTimeout);
        }

        state.reconnectTimeout = window.setTimeout(() => {
            connectServer(serverUuid);
        }, reconnectDelay * state.reconnectAttempts);
    }

    // Disconnect from a server's Wings WebSocket
    function disconnectServer(serverUuid: string): void {
        const state = serverConnections.value.get(serverUuid);
        if (!state) return;

        // Clear reconnect timeout
        if (state.reconnectTimeout) {
            clearTimeout(state.reconnectTimeout);
            state.reconnectTimeout = null;
        }

        // Clear token expiration timer
        if (state.tokenExpirationTimer) {
            clearTimeout(state.tokenExpirationTimer);
            state.tokenExpirationTimer = null;
        }

        // Clear stats interval
        if (state.statsInterval) {
            clearInterval(state.statsInterval);
            state.statsInterval = null;
        }

        // Close WebSocket
        if (state.websocket) {
            state.websocket.close();
            state.websocket = null;
        }

        state.connectionStatus = 'disconnected';
        state.wingsStatus = 'unknown';
        state.reconnectAttempts = 0;
        state.isRefreshingToken = false;
    }

    // Connect to multiple servers
    async function connectServers(serverUuids: string[]): Promise<void> {
        await Promise.all(serverUuids.map((uuid) => connectServer(uuid)));
    }

    // Disconnect from multiple servers
    function disconnectServers(serverUuids: string[]): void {
        serverUuids.forEach((uuid) => disconnectServer(uuid));
    }

    // Disconnect from all servers
    function disconnectAll(): void {
        serverConnections.value.forEach((state, serverUuid) => {
            disconnectServer(serverUuid);
        });
    }

    // Cleanup: disconnect all and clear data
    function cleanup(): void {
        disconnectAll();
        serverConnections.value.clear();
        serverLiveData.value.clear();
    }

    // Remove server data (when server is deleted)
    function removeServer(serverUuid: string): void {
        disconnectServer(serverUuid);
        serverConnections.value.delete(serverUuid);
        serverLiveData.value.delete(serverUuid);
        // Remove from reactive object
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [serverUuid]: _removed, ...rest } = reactiveServerLiveData.value;
        reactiveServerLiveData.value = rest;
    }

    // Get reactive live data (for Vue reactivity)
    function getReactiveLiveData() {
        return reactiveServerLiveData;
    }

    return {
        // Getters
        getConnectionState,
        getServerLiveData,
        getReactiveLiveData,
        isServerConnected,
        isServerConnecting,
        isWingsHealthy,
        getServerStatus,
        getServerStats,

        // Connection management
        connectServer,
        disconnectServer,
        connectServers,
        disconnectServers,
        disconnectAll,
        removeServer,
        cleanup,

        // Stats
        requestServerStats,
    };
}
