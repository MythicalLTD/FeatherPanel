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

import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';

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
    const { t } = useI18n();
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
    const onAuthSuccessCallbacks = ref<Set<() => void>>(new Set()); // Callbacks to run after auth success

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
                            wingsStatus.value = 'healthy';

                            // Clear any pending health check timeout
                            if (healthCheckTimeout.value) {
                                clearTimeout(healthCheckTimeout.value);
                                healthCheckTimeout.value = null;
                            }

                            // Trigger auth success callbacks
                            triggerAuthSuccess();
                        } else if (data.event === 'auth_error') {
                            connectionStatus.value = 'disconnected';
                            wingsStatus.value = 'error';
                            if (!isNavigatingAway?.value) {
                                toast.error(t('serverConsole.authenticationFailed'));
                            }
                            websocket.value?.close();
                        } else if (data.event === 'token expired' || data.event === 'jwt error') {
                            // Token expired - try to refresh token first before reloading
                            if (!isNavigatingAway?.value) {
                                console.warn('Token expired, attempting to refresh...');
                                refreshToken().catch(() => {
                                    // If refresh fails, then reload
                                    toast.error(t('serverConsole.sessionExpiredReloading'));
                                    setTimeout(() => {
                                        window.location.reload();
                                    }, 2000);
                                });
                            }
                        } else if (data.event === 'daemon error') {
                            wingsStatus.value = 'error';
                            // Don't show toast for every daemon error - can be too noisy
                        } else if (data.event === 'stats' || data.event === 'status') {
                            // Stats/status received - Wings is healthy
                            if (wingsStatus.value !== 'healthy') {
                                wingsStatus.value = 'healthy';
                            }
                        }
                    } catch {
                        // Ignore parsing errors for non-JSON messages
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

                // Set authentication timeout (15 seconds instead of 10 for slower connections)
                const authTimeout = setTimeout(() => {
                    if (connectionStatus.value === 'connecting') {
                        connectionStatus.value = 'disconnected';
                        if (!isNavigatingAway?.value) {
                            toast.error(t('serverConsole.authenticationTimeout'));
                        }
                        websocket.value?.close();
                    }
                }, 15000); // 15 second timeout

                // The authTimeout will be cleared when onmessage receives 'auth success' or 'auth_error'
                // Store reference to the websocket for the closure
                const ws = websocket.value;
                const originalOnMessage = ws.onmessage;
                ws.onmessage = (event) => {
                    // Clear auth timeout on any message (connection is working)
                    clearTimeout(authTimeout);
                    // Call the original handler
                    if (originalOnMessage && ws) {
                        originalOnMessage.call(ws, event);
                    }
                };
            } else {
                throw new Error('Failed to get JWT token');
            }
        } catch (error) {
            connectionStatus.value = 'disconnected';
            wingsStatus.value = 'error';

            // Only show error notification if not navigating away
            if (!isNavigatingAway?.value) {
                toast.error(t('serverConsole.failedToConnectFallback'));
            }
            console.error('Connection error:', error);

            // Attempt to reconnect if not manually disconnected and not navigating away
            if (!isReconnecting.value && reconnectAttempts.value < maxReconnectAttempts && !isNavigatingAway?.value) {
                scheduleReconnect();
            }
        }
    }

    async function refreshToken(): Promise<void> {
        if (isNavigatingAway?.value) return;

        try {
            console.log(t('serverConsole.refreshingToken'));

            // Close current WebSocket connection gracefully
            if (websocket.value) {
                websocket.value.close();
                websocket.value = null;
            }

            // Clear connection status temporarily
            connectionStatus.value = 'connecting';

            // Get new JWT token
            const response = await axios.post<WingsJWTResponse>(`/api/user/servers/${serverUuid}/jwt`);
            if (response.data.success) {
                jwtToken.value = response.data.data.token;
                jwtExpiresAt.value = response.data.data.expires_at;
                const connectionString = response.data.data.connection_string;

                // Set up new token expiration timer
                setupTokenExpirationTimer();

                // Reconnect WebSocket with new token
                websocket.value = new WebSocket(connectionString);

                websocket.value.onopen = () => {
                    // Send authentication message with new JWT token
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
                            wingsStatus.value = 'healthy';
                            console.log('Token refreshed successfully');

                            // Clear any pending health check timeout
                            if (healthCheckTimeout.value) {
                                clearTimeout(healthCheckTimeout.value);
                                healthCheckTimeout.value = null;
                            }

                            // Trigger auth success callbacks
                            triggerAuthSuccess();
                        } else if (data.event === 'auth_error') {
                            connectionStatus.value = 'disconnected';
                            wingsStatus.value = 'error';
                            if (!isNavigatingAway?.value) {
                                toast.error(t('serverConsole.authenticationFailedAfterRefresh'));
                            }
                            websocket.value?.close();
                        } else if (data.event === 'token expired' || data.event === 'jwt error') {
                            // Token expired during refresh - this shouldn't happen, but handle gracefully
                            if (!isNavigatingAway?.value) {
                                console.error('Token expired during refresh, reloading page...');
                                toast.error(t('serverConsole.sessionExpiredReloading'));
                                setTimeout(() => {
                                    window.location.reload();
                                }, 2000);
                            }
                        } else if (data.event === 'daemon error') {
                            wingsStatus.value = 'error';
                        } else if (data.event === 'stats' || data.event === 'status') {
                            if (wingsStatus.value !== 'healthy') {
                                wingsStatus.value = 'healthy';
                            }
                        }
                    } catch {
                        // Ignore parsing errors for non-JSON messages
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
                    console.error('WebSocket error after token refresh:', error);

                    // Only attempt to reconnect if not manually disconnected and not navigating away
                    if (
                        !isReconnecting.value &&
                        reconnectAttempts.value < maxReconnectAttempts &&
                        !isNavigatingAway?.value
                    ) {
                        scheduleReconnect();
                    }
                };
            } else {
                throw new Error('Failed to refresh JWT token');
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            toast.error(t('serverConsole.failedToRefreshSession'));
            connectionStatus.value = 'disconnected';
            wingsStatus.value = 'error';
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
        if (timeUntilExpiration > 60000) {
            // Only set timer if more than 1 minute remaining
            // Refresh token 1 minute before it expires
            const refreshTime = timeUntilExpiration - 60000; // 1 minute before expiration
            const refreshTimeInMinutes = Math.floor(refreshTime / 1000 / 60);

            console.log(
                `Token expires in ${Math.floor(timeUntilExpiration / 1000 / 60)} minutes. Will refresh in ${refreshTimeInMinutes} minutes.`,
            );

            // Set timer to refresh token before it expires
            tokenExpirationTimer.value = setTimeout(
                async () => {
                    if (!isNavigatingAway?.value && connectionStatus.value === 'connected') {
                        console.log('Refreshing token before expiration...');
                        await refreshToken();
                    }
                },
                Math.max(refreshTime, 5000), // Minimum 5 seconds
            );
        }
    }

    function scheduleReconnect(): void {
        if (reconnectAttempts.value >= maxReconnectAttempts) {
            if (!isNavigatingAway?.value) {
                toast.error(t('serverConsole.maxReconnectionAttempts'));
            }
            return;
        }

        isReconnecting.value = true;
        reconnectAttempts.value++;

        // Only show toast for first few attempts to avoid spam
        if (reconnectAttempts.value <= 2 && !isNavigatingAway?.value) {
            toast.info(
                t('serverConsole.connectionLostRetrying', {
                    current: reconnectAttempts.value,
                    max: maxReconnectAttempts,
                }),
            );
        }

        reconnectTimeout.value = setTimeout(() => {
            connect();
        }, reconnectDelay * reconnectAttempts.value); // Exponential backoff
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

    // Register callback to run after auth success
    function onAuthSuccess(callback: () => void): void {
        onAuthSuccessCallbacks.value.add(callback);
    }

    // Remove callback
    function removeAuthSuccessCallback(callback: () => void): void {
        onAuthSuccessCallbacks.value.delete(callback);
    }

    // Trigger all callbacks
    function triggerAuthSuccess(): void {
        onAuthSuccessCallbacks.value.forEach((callback) => {
            try {
                callback();
            } catch (error) {
                console.error('Error in auth success callback:', error);
            }
        });
    }

    // Cleanup function
    function cleanup(): void {
        disconnect();
        onAuthSuccessCallbacks.value.clear();
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
        onAuthSuccess,
        removeAuthSuccessCallback,
    };
}
