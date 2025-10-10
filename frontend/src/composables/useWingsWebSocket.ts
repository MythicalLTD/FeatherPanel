/*
MIT License

Copyright (c) 2025 MythicalSystems
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

import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import axios from 'axios';
import { useToast } from 'vue-toastification';

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

export interface WingsStats {
    cpu_absolute: number;
    disk_bytes: number;
    memory_bytes: number;
    memory_limit_bytes: number;
    network: {
        rx_bytes: number;
        tx_bytes: number;
    };
    state: string;
    uptime: number;
}

export function useWingsWebSocket(serverUuid: string, isNavigatingAway?: Ref<boolean>) {
    const toast = useToast();
    const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const wingsStatus = ref<'unknown' | 'healthy' | 'error'>('unknown'); // Track Wings daemon health
    const websocket = ref<WebSocket | null>(null);
    const jwtToken = ref<string>('');
    const jwtExpiresAt = ref<number>(0);
    const tokenExpirationTimer = ref<number | null>(null);
    const reconnectAttempts = ref(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = 5000; // 5 seconds
    const reconnectTimeout = ref<number | null>(null);
    const isReconnecting = ref(false);
    const healthCheckTimeout = ref<number | null>(null); // Health check timeout

    const isConnected = computed(() => connectionStatus.value === 'connected');
    const isConnecting = computed(() => connectionStatus.value === 'connecting');
    const isDisconnected = computed(() => connectionStatus.value === 'disconnected');
    const isWingsHealthy = computed(() => wingsStatus.value === 'healthy');

    async function connect(): Promise<void> {
        if (connectionStatus.value === 'connected' || connectionStatus.value === 'connecting') {
            return;
        }

        try {
            connectionStatus.value = 'connecting';
            isReconnecting.value = false;

            // Get JWT token for WebSocket connection
            const response = await axios.post<WingsJWTResponse>(`/api/user/servers/${serverUuid}/jwt`);
            if (response.data.success) {
                jwtToken.value = response.data.data.token;
                jwtExpiresAt.value = response.data.data.expires_at;
                const connectionString = response.data.data.connection_string;

                // Set up token expiration timer to reload page
                setupTokenExpirationTimer();

                // Connect to WebSocket
                websocket.value = new WebSocket(connectionString);

                websocket.value.onopen = () => {
                    // Send authentication message with JWT token
                    if (websocket.value) {
                        websocket.value.send(
                            JSON.stringify({
                                event: 'auth',
                                args: [jwtToken.value],
                            }),
                        );
                    }
                };

                websocket.value.onmessage = (event) => {
                    try {
                        const data: WingsWebSocketMessage = JSON.parse(event.data);
                        if (data.event === 'auth success') {
                            connectionStatus.value = 'connected';
                            reconnectAttempts.value = 0;
                            isReconnecting.value = false;

                            // Wings is connected successfully - set as healthy immediately
                            // We don't need to wait for stats/status since server might be offline
                            wingsStatus.value = 'healthy';

                            // Clear any pending health check timeout
                            if (healthCheckTimeout.value) {
                                clearTimeout(healthCheckTimeout.value);
                                healthCheckTimeout.value = null;
                            }
                        } else if (data.event === 'auth_error') {
                            connectionStatus.value = 'disconnected';
                            wingsStatus.value = 'error';
                            toast.error('Authentication failed with Wings daemon');
                            websocket.value?.close();
                        } else if (data.event === 'token expired' || data.event === 'jwt error') {
                            // Token expired - reload page immediately
                            if (!isNavigatingAway?.value) {
                                toast.error('Session expired - Reloading page...');
                                setTimeout(() => {
                                    window.location.reload();
                                }, 1000);
                            }
                        } else if (data.event === 'daemon error') {
                            wingsStatus.value = 'error';
                            toast.error('Wings daemon error - server management may be limited');
                        } else if (data.event === 'stats' || data.event === 'status') {
                            // Stats/status received - Wings is definitely healthy (but we already set it as healthy)
                            // This is just confirmation for running servers
                            if (wingsStatus.value !== 'healthy') {
                                wingsStatus.value = 'healthy';
                            }
                        }
                    } catch {
                        // Ignore parsing errors for auth messages
                    }
                };

                websocket.value.onclose = () => {
                    connectionStatus.value = 'disconnected';
                    websocket.value = null;

                    // Only attempt to reconnect if not manually disconnected and not navigating away
                    if (
                        !isReconnecting.value &&
                        reconnectAttempts.value < maxReconnectAttempts &&
                        !isNavigatingAway?.value
                    ) {
                        scheduleReconnect();
                    }
                };

                websocket.value.onerror = (error) => {
                    connectionStatus.value = 'disconnected';
                    websocket.value = null;
                    console.error('WebSocket error:', error);

                    // Only attempt to reconnect if not manually disconnected and not navigating away
                    if (
                        !isReconnecting.value &&
                        reconnectAttempts.value < maxReconnectAttempts &&
                        !isNavigatingAway?.value
                    ) {
                        scheduleReconnect();
                    }
                };

                // Set authentication timeout
                const authTimeout = setTimeout(() => {
                    if (connectionStatus.value === 'connecting') {
                        connectionStatus.value = 'disconnected';
                        toast.error('Authentication timeout');
                        websocket.value?.close();
                    }
                }, 10000); // 10 second timeout

                // Clear timeout on successful authentication
                websocket.value.addEventListener('message', function authHandler(event) {
                    try {
                        const data: WingsWebSocketMessage = JSON.parse(event.data);
                        if (data.event === 'auth success' || data.event === 'auth_error') {
                            clearTimeout(authTimeout);
                            websocket.value?.removeEventListener('message', authHandler);
                        }
                    } catch {
                        // Ignore parsing errors
                    }
                });
            } else {
                throw new Error('Failed to get JWT token');
            }
        } catch (error) {
            connectionStatus.value = 'disconnected';
            wingsStatus.value = 'error';

            // Only show error notification if not navigating away
            if (!isNavigatingAway?.value) {
                toast.error('🚨 Failed to connect to Wings daemon - Server management will use API fallback mode');
            }
            console.error('Connection error:', error);

            // Attempt to reconnect if not manually disconnected and not navigating away
            if (!isReconnecting.value && reconnectAttempts.value < maxReconnectAttempts && !isNavigatingAway?.value) {
                scheduleReconnect();
            }
        }
    }

    function setupTokenExpirationTimer(): void {
        // Clear any existing timer
        if (tokenExpirationTimer.value) {
            clearTimeout(tokenExpirationTimer.value);
            tokenExpirationTimer.value = null;
        }

        if (!jwtExpiresAt.value) return;

        // Calculate time until expiration (expires_at is Unix timestamp in seconds)
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = jwtExpiresAt.value;
        const timeUntilExpiration = (expiresAt - now) * 1000; // Convert to milliseconds

        // Only set timer if token expires in the future
        if (timeUntilExpiration > 0) {
            console.log(`JWT token expires in ${Math.floor(timeUntilExpiration / 1000 / 60)} minutes`);

            tokenExpirationTimer.value = setTimeout(() => {
                if (!isNavigatingAway?.value) {
                    toast.warning('Session expired - Reloading page...');
                    // Wait a moment for the toast to show, then reload
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            }, timeUntilExpiration);
        }
    }

    function scheduleReconnect(): void {
        if (reconnectAttempts.value >= maxReconnectAttempts) {
            toast.error('Max reconnection attempts reached');
            return;
        }

        isReconnecting.value = true;
        reconnectAttempts.value++;

        toast.info(`Connection lost... trying again in 5s... (${reconnectAttempts.value}/${maxReconnectAttempts})`);

        reconnectTimeout.value = setTimeout(() => {
            connect();
        }, reconnectDelay);
    }

    function disconnect(): void {
        // Clear any pending reconnection
        if (reconnectTimeout.value) {
            clearTimeout(reconnectTimeout.value);
            reconnectTimeout.value = null;
        }

        // Clear health check timeout
        if (healthCheckTimeout.value) {
            clearTimeout(healthCheckTimeout.value);
            healthCheckTimeout.value = null;
        }

        // Clear token expiration timer
        if (tokenExpirationTimer.value) {
            clearTimeout(tokenExpirationTimer.value);
            tokenExpirationTimer.value = null;
        }

        isReconnecting.value = false;
        wingsStatus.value = 'unknown'; // Reset Wings status

        if (websocket.value) {
            websocket.value.close();
            websocket.value = null;
        }

        connectionStatus.value = 'disconnected';
    }

    function sendMessage(message: WingsWebSocketMessage): boolean {
        if (websocket.value && websocket.value.readyState === WebSocket.OPEN) {
            try {
                websocket.value.send(JSON.stringify(message));
                return true;
            } catch (error) {
                console.error('Failed to send message:', error);
                return false;
            }
        }
        return false;
    }

    // Cleanup function
    function cleanup(): void {
        disconnect();
    }

    return {
        // State
        connectionStatus,
        websocket,
        jwtToken,
        reconnectAttempts,
        isReconnecting,
        wingsStatus,

        // Computed
        isConnected,
        isConnecting,
        isDisconnected,
        isWingsHealthy,

        // Methods
        connect,
        disconnect,
        sendMessage,
        cleanup,
    };
}
