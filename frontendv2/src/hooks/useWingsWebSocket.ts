/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
    sendPowerAction: (action: 'start' | 'stop' | 'restart' | 'kill') => void;
    reconnect: () => void;
    requestStats: () => void;
    requestLogs: () => void;
}

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
    connect = true,
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
    const lastStatsRequestTimeRef = useRef<number | null>(null);

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

    const sendPowerAction = useCallback((action: 'start' | 'stop' | 'restart' | 'kill') => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
                JSON.stringify({
                    event: 'set state',
                    args: [action],
                }),
            );
        }
    }, []);

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

        const connect = async () => {
            // Don't connect if we've already cleaned up
            if (isCleanedUp) return;

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

                        // Handle console output
                        if (data.event === 'console output' && onConsoleOutputRef.current) {
                            onConsoleOutputRef.current((data.args?.[0] as string) || '');
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
                            onStatusRef.current((data.args?.[0] as string) || 'offline');
                            return;
                        }

                        // Handle install output
                        if (data.event === 'install output' && onInstallOutputRef.current) {
                            onInstallOutputRef.current((data.args?.[0] as string) || '');
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
                            onTransferLogsRef.current((data.args?.[0] as string) || '');
                            return;
                        }

                        // Handle transfer status
                        if (data.event === 'transfer status' && onTransferStatusRef.current) {
                            onTransferStatusRef.current((data.args?.[0] as string) || '');
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

                ws.onerror = (error) => {
                    console.error('[Wings WS] Error:', error);
                    setConnectionStatus('error');
                };

                ws.onclose = () => {
                    console.log('[Wings WS] Disconnected');
                    setIsConnected(false);
                    setConnectionStatus('disconnected');
                    setPing(null);
                    setStats(null);

                    // Only attempt reconnection if not cleaned up
                    if (!isCleanedUp) {
                        reconnectTimeoutRef.current = setTimeout(() => {
                            console.log('[Wings WS] Attempting reconnection...');
                            connect();
                        }, 5000);
                    }
                };
            } catch (err) {
                console.error('[Wings WS] Connection failed:', err);
                setConnectionStatus('error');

                // Only attempt reconnection if not cleaned up
                if (!isCleanedUp) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log('[Wings WS] Attempting reconnection after error...');
                        connect();
                    }, 5000);
                }
            }
        };

        if (connect) {
            connect();
        }

        return () => {
            console.log('[Wings WS] Cleaning up connection');
            isCleanedUp = true;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [serverUuid, refreshToken, connect]); // Only depend on serverUuid, refreshToken and connect

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
