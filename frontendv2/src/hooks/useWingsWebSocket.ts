/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';

interface WingsMessage {
    event: string;
    args?: unknown[];
}

interface WingsStats {
    uptime?: number;
    cpu_absolute?: number;
    memory_bytes?: number;
    memory_limit_bytes?: number;
    disk_bytes?: number;
    network_rx_bytes?: number;
    network_tx_bytes?: number;
    network?: {
        rx_bytes: number;
        tx_bytes: number;
    };
    state?: string;
}

interface WingsJWTResponse {
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

interface WingsWebSocketOptions {
    serverUuid: string;
    onMessage?: (data: WingsMessage) => void;
    onStats?: (stats: WingsStats) => void;
    onStatus?: (status: string) => void;
    onConsoleOutput?: (output: string) => void;
    onTokenExpiring?: () => void;
    onInstallOutput?: (output: string) => void;
    onInstallStarted?: () => void;
    onInstallCompleted?: () => void;
    onBackupComplete?: () => void;
    onTransferLogs?: (log: string) => void;
    onTransferStatus?: (status: string) => void;
    connect?: boolean;
}

interface WingsWebSocketReturn {
    isConnected: boolean;
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
    ping: number | null;
    stats: WingsStats | null;
    sendCommand: (command: string) => void;
    sendPowerAction: (action: 'start' | 'stop' | 'restart' | 'kill') => Promise<void>;
    reconnect: () => void;
    requestStats: () => void;
    requestLogs: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 12;
const RECONNECT_BASE_DELAY_MS = 3000;
const RECONNECT_MAX_DELAY_MS = 30000;

export function useWingsWebSocket({
    serverUuid,
    onMessage,
    onStats,
    onStatus,
    onConsoleOutput,
    onTokenExpiring,
    onInstallOutput,
    onInstallStarted,
    onInstallCompleted,
    onBackupComplete,
    onTransferLogs,
    onTransferStatus,
    connect: shouldConnect = true,
}: WingsWebSocketOptions): WingsWebSocketReturn {
    const wsRef = useRef<WebSocket | null>(null);
    const jwtTokenRef = useRef<string>('');
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>(
        'disconnected',
    );
    const [ping, setPing] = useState<number | null>(null);
    const [stats, setStats] = useState<WingsStats | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const reconnectAttemptsRef = useRef(0);
    const connectionBlockedRef = useRef(false);
    const lastStatsRequestTimeRef = useRef<number | null>(null);
    const consoleOutputQueueRef = useRef<string[]>([]);
    const consoleFlushRafRef = useRef<number | null>(null);

    // Store callbacks in refs to avoid triggering useEffect on every render
    const onMessageRef = useRef(onMessage);
    const onStatsRef = useRef(onStats);
    const onStatusRef = useRef(onStatus);
    const onConsoleOutputRef = useRef(onConsoleOutput);
    const onTokenExpiringRef = useRef(onTokenExpiring);
    const onInstallOutputRef = useRef(onInstallOutput);
    const onInstallStartedRef = useRef(onInstallStarted);
    const onInstallCompletedRef = useRef(onInstallCompleted);
    const onBackupCompleteRef = useRef(onBackupComplete);
    const onTransferLogsRef = useRef(onTransferLogs);
    const onTransferStatusRef = useRef(onTransferStatus);

    // Update refs when callbacks change
    useEffect(() => {
        onMessageRef.current = onMessage;
        onStatsRef.current = onStats;
        onStatusRef.current = onStatus;
        onConsoleOutputRef.current = onConsoleOutput;
        onTokenExpiringRef.current = onTokenExpiring;
        onInstallOutputRef.current = onInstallOutput;
        onInstallStartedRef.current = onInstallStarted;
        onInstallCompletedRef.current = onInstallCompleted;
        onBackupCompleteRef.current = onBackupComplete;
        onTransferLogsRef.current = onTransferLogs;
        onTransferStatusRef.current = onTransferStatus;
    }, [
        onMessage,
        onStats,
        onStatus,
        onConsoleOutput,
        onTokenExpiring,
        onInstallOutput,
        onInstallStarted,
        onInstallCompleted,
        onBackupComplete,
        onTransferLogs,
        onTransferStatus,
    ]);

    const flushConsoleOutputQueue = useCallback(() => {
        consoleFlushRafRef.current = null;
        const batch = consoleOutputQueueRef.current;
        consoleOutputQueueRef.current = [];
        const handler = onConsoleOutputRef.current;
        if (!handler || batch.length === 0) {
            return;
        }
        for (const chunk of batch) {
            handler(chunk);
        }
    }, []);

    const enqueueConsoleOutput = useCallback(
        (output: string) => {
            consoleOutputQueueRef.current.push(output);
            if (consoleFlushRafRef.current !== null) {
                return;
            }
            consoleFlushRafRef.current = requestAnimationFrame(flushConsoleOutputQueue);
        },
        [flushConsoleOutputQueue],
    );

    const clearConsoleOutputQueue = useCallback(() => {
        if (consoleFlushRafRef.current !== null) {
            cancelAnimationFrame(consoleFlushRafRef.current);
            consoleFlushRafRef.current = null;
        }
        consoleOutputQueueRef.current = [];
    }, []);

    const scheduleReconnect = useCallback((establishConnection: () => void) => {
        if (connectionBlockedRef.current || reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            setConnectionStatus('error');
            return;
        }

        reconnectAttemptsRef.current += 1;
        const delay = Math.min(RECONNECT_BASE_DELAY_MS * reconnectAttemptsRef.current, RECONNECT_MAX_DELAY_MS);

        reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[Wings WS] Attempting reconnection...');
            establishConnection();
        }, delay);
    }, []);

    const sendCommand = useCallback(
        (command: string) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                console.log(`[Wings WS] Sending command: ${command}`);
                wsRef.current.send(
                    JSON.stringify({
                        event: 'send command',
                        args: [command],
                    }),
                );
            } else {
                console.error('[Wings WS] Cannot send command: WebSocket is not open', {
                    readyState: wsRef.current?.readyState,
                    status: connectionStatus,
                });
            }
        },
        [connectionStatus],
    );

    const sendPowerAction = useCallback(
        async (action: 'start' | 'stop' | 'restart' | 'kill') => {
            // Route power actions through panel API so lifecycle hooks execute.
            await axios.post(`/api/user/servers/${serverUuid}/power/${action}`);
        },
        [serverUuid],
    );

    const refreshToken = useCallback(async () => {
        try {
            console.log('[Wings WS] Refreshing token...');
            const response = await axios.post<WingsJWTResponse>(`/api/user/servers/${serverUuid}/jwt`);

            if (response.data.success && wsRef.current?.readyState === WebSocket.OPEN) {
                const { token } = response.data.data;
                jwtTokenRef.current = token;

                // Re-authenticate with new token
                wsRef.current.send(
                    JSON.stringify({
                        event: 'auth',
                        args: [token],
                    }),
                );

                console.log('[Wings WS] Token refreshed successfully');
            }
        } catch (error) {
            console.error('[Wings WS] Failed to refresh token:', error);
        }
    }, [serverUuid]);

    useEffect(() => {
        if (!serverUuid) return;

        let isCleanedUp = false;
        connectionBlockedRef.current = false;
        reconnectAttemptsRef.current = 0;

        const establishConnection = async () => {
            // Don't connect if we've already cleaned up or connecting is disabled
            if (isCleanedUp || !shouldConnect || connectionBlockedRef.current) return;

            setConnectionStatus('connecting');

            try {
                // Get JWT token and connection string from API
                const response = await axios.post<WingsJWTResponse>(`/api/user/servers/${serverUuid}/jwt`);

                if (!response.data.success) {
                    throw new Error(response.data.error_message || 'Failed to get JWT token');
                }

                const { token, connection_string } = response.data.data;
                jwtTokenRef.current = token;

                console.log('[Wings WS] Connecting to:', connection_string);

                // Close any existing connection before creating a new one
                if (wsRef.current) {
                    console.log('[Wings WS] Closing existing connection');
                    wsRef.current.close();
                    wsRef.current = null;
                }

                // Connect to Wings WebSocket
                const ws = new WebSocket(connection_string);
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log('[Wings WS] Connection opened, authenticating...');

                    // Send authentication with JWT token
                    ws.send(
                        JSON.stringify({
                            event: 'auth',
                            args: [jwtTokenRef.current],
                        }),
                    );
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data) as WingsMessage;

                        // Handle auth success
                        if (data.event === 'auth success') {
                            console.log('[Wings WS] Authenticated successfully');
                            reconnectAttemptsRef.current = 0;
                            setIsConnected(true);
                            setConnectionStatus('connected');
                            return;
                        }

                        // Handle auth error
                        if (data.event === 'auth_error' || data.event === 'auth error') {
                            console.error('[Wings WS] Authentication failed');
                            setConnectionStatus('error');
                            ws.close();
                            return;
                        }

                        // Handle token expiring - refresh token
                        if (data.event === 'token expiring') {
                            console.log('[Wings WS] Token expiring, refreshing...');
                            refreshToken();
                            if (onTokenExpiringRef.current) {
                                onTokenExpiringRef.current();
                            }
                            return;
                        }

                        // Handle token expired
                        if (data.event === 'token expired') {
                            console.error('[Wings WS] Token expired');
                            setConnectionStatus('error');
                            ws.close();
                            return;
                        }

                        // Handle console output (batched off the WebSocket thread to avoid UI freezes)
                        if (data.event === 'console output' && onConsoleOutputRef.current) {
                            enqueueConsoleOutput((data.args?.[0] as string) || '');
                            return;
                        }

                        // Wings/FeatherWings: Docker/power failures and other inbound handler errors (SendErrorJson)
                        if (data.event === 'daemon error' && onConsoleOutputRef.current) {
                            const raw =
                                (data.args?.[0] as string) || 'An error occurred while handling a daemon request.';
                            enqueueConsoleOutput(`\u001b[31m${raw}\u001b[0m`);
                            return;
                        }

                        if (data.event === 'jwt error' && onConsoleOutputRef.current) {
                            const raw = (data.args?.[0] as string) || 'WebSocket authentication error.';
                            enqueueConsoleOutput(`\u001b[31m[JWT] ${raw}\u001b[0m`);
                            return;
                        }

                        // Optional daemon notices published as events (same as stock Wings "daemon message")
                        if (data.event === 'daemon message' && onConsoleOutputRef.current) {
                            enqueueConsoleOutput((data.args?.[0] as string) || '');
                            return;
                        }

                        if (data.event === 'throttled' && onConsoleOutputRef.current) {
                            enqueueConsoleOutput(
                                '\u001b[33m[FeatherPanel] Console output is being rate-limited by the node.\u001b[0m',
                            );
                            return;
                        }

                        // Handle stats
                        if (data.event === 'stats') {
                            // data.args[0] is a JSON string, need to parse it
                            let statsData: WingsStats | null = null;
                            try {
                                const statsArg = data.args?.[0];
                                if (typeof statsArg === 'string') {
                                    statsData = JSON.parse(statsArg) as WingsStats;
                                } else {
                                    statsData = statsArg as WingsStats;
                                }
                            } catch (error) {
                                console.error('[Wings WS] Failed to parse stats:', error);
                                statsData = null;
                            }

                            setStats(statsData);

                            if (onStatsRef.current && statsData) {
                                onStatsRef.current(statsData);
                            }

                            // Calculate ping based on round-trip time
                            if (lastStatsRequestTimeRef.current !== null) {
                                const roundTripTime = Date.now() - lastStatsRequestTimeRef.current;
                                setPing(roundTripTime);
                                lastStatsRequestTimeRef.current = null;
                            }
                            return;
                        }

                        // Handle status
                        if (data.event === 'status' && onStatusRef.current) {
                            onStatusRef.current(data.args?.[0] as string);
                            return;
                        }

                        // Handle install output
                        if (data.event === 'install output' && onInstallOutputRef.current) {
                            onInstallOutputRef.current(data.args?.[0] as string);
                            return;
                        }

                        // Handle install started
                        if (data.event === 'install started' && onInstallStartedRef.current) {
                            onInstallStartedRef.current();
                            return;
                        }

                        // Handle install completed
                        if (data.event === 'install completed' && onInstallCompletedRef.current) {
                            onInstallCompletedRef.current();
                            return;
                        }

                        // Handle backup complete
                        if (data.event === 'backup complete' && onBackupCompleteRef.current) {
                            onBackupCompleteRef.current();
                            return;
                        }

                        // Handle transfer logs
                        if (data.event === 'transfer logs' && onTransferLogsRef.current) {
                            onTransferLogsRef.current(data.args?.[0] as string);
                            return;
                        }

                        // Handle transfer status
                        if (data.event === 'transfer status' && onTransferStatusRef.current) {
                            onTransferStatusRef.current(data.args?.[0] as string);
                            return;
                        }

                        // Generic message handler
                        if (onMessageRef.current) {
                            onMessageRef.current(data);
                        }
                    } catch (err) {
                        console.error('[Wings WS] Failed to parse message:', err);
                    }
                };

                ws.onerror = () => {
                    // Browser WebSocket "error" events are opaque and commonly followed by onclose.
                    // Avoid noisy [object Event] logs and let onclose handle lifecycle/reconnect state.
                    if (isCleanedUp || ws !== wsRef.current) {
                        return;
                    }
                    if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
                        return;
                    }
                    console.warn('[Wings WS] Socket error event while connection is active');
                };

                ws.onclose = () => {
                    console.log('[Wings WS] Disconnected');
                    setIsConnected(false);
                    setConnectionStatus('disconnected');
                    setPing(null);
                    setStats(null);

                    // Only attempt reconnection if not cleaned up and connecting is still enabled
                    if (!isCleanedUp && shouldConnect) {
                        scheduleReconnect(establishConnection);
                    }
                };
            } catch (err) {
                console.error('[Wings WS] Connection failed:', err);

                if (axios.isAxiosError(err) && err.response?.status === 403) {
                    connectionBlockedRef.current = true;
                    setConnectionStatus('error');
                    return;
                }

                setConnectionStatus('error');

                if (!isCleanedUp && shouldConnect) {
                    scheduleReconnect(establishConnection);
                }
            }
        };

        if (shouldConnect) {
            establishConnection();
        } else {
            setIsConnected(false);
            setConnectionStatus('disconnected');
        }

        return () => {
            console.log('[Wings WS] Cleaning up connection');
            isCleanedUp = true;
            clearConsoleOutputQueue();
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [serverUuid, refreshToken, shouldConnect, enqueueConsoleOutput, clearConsoleOutputQueue, scheduleReconnect]);

    const reconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
        }
        // The useEffect will handle reconnection
    }, []);

    const requestStats = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            lastStatsRequestTimeRef.current = Date.now();
            wsRef.current.send(
                JSON.stringify({
                    event: 'send stats',
                    args: [],
                }),
            );
        }
    }, []);

    const requestLogs = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
                JSON.stringify({
                    event: 'send logs',
                    args: [],
                }),
            );
        }
    }, []);

    return {
        isConnected,
        connectionStatus,
        ping,
        stats,
        sendCommand,
        sendPowerAction,
        reconnect,
        requestStats,
        requestLogs,
    };
}
