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
import { toast } from 'sonner';

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
    disk_io?: {
        read_bytes: number;
        write_bytes: number;
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

export interface FileOperationEvent {
    event: string;
    operationId: string;
    args?: unknown[];
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
    /** Calagopus file-op progress/completed/error/aborted events */
    onFileOperation?: (event: FileOperationEvent) => void;
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
    onFileOperation,
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
    const intentionalCloseRef = useRef(false);
    const isRefreshingTokenRef = useRef(false);
    const isConnectingRef = useRef(false);
    const lastStatsRequestTimeRef = useRef<number | null>(null);
    const consoleOutputQueueRef = useRef<string[]>([]);
    const consoleFlushRafRef = useRef<number | null>(null);
    const establishConnectionRef = useRef<(() => Promise<void>) | null>(null);

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
    const onFileOperationRef = useRef(onFileOperation);
    // Tracks toast ids raised for in-flight file operations so they can be dismissed on
    // socket close / unmount instead of being left dangling (e.g. a "progress" toast whose
    // "completed"/"error"/"aborted" event never arrives because the socket dropped).
    const fileOpToastIdsRef = useRef<Set<string>>(new Set());
    const fileOpToastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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
        onFileOperationRef.current = onFileOperation;
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
        onFileOperation,
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

    const clearReconnectTimer = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = undefined;
        }
    }, []);

    const closeSocketIntentionally = useCallback(() => {
        intentionalCloseRef.current = true;
        clearReconnectTimer();
        if (wsRef.current) {
            const ws = wsRef.current;
            wsRef.current = null;
            try {
                ws.close();
            } catch {
                // ignore
            }
        }
    }, [clearReconnectTimer]);

    const scheduleReconnect = useCallback(
        (establishConnection: () => void) => {
            if (connectionBlockedRef.current || reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                setConnectionStatus('error');
                return;
            }

            clearReconnectTimer();
            reconnectAttemptsRef.current += 1;
            const delay = Math.min(RECONNECT_BASE_DELAY_MS * reconnectAttemptsRef.current, RECONNECT_MAX_DELAY_MS);

            reconnectTimeoutRef.current = setTimeout(() => {
                console.log('[Wings WS] Attempting reconnection...');
                establishConnection();
            }, delay);
        },
        [clearReconnectTimer],
    );

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

    /**
     * Do not re-auth on the same socket — close and reconnect with a fresh JWT
     * (matches useServersWebSocket / CHANGELOG guidance).
     */
    const refreshToken = useCallback(async () => {
        if (isRefreshingTokenRef.current || connectionBlockedRef.current) {
            return;
        }

        try {
            isRefreshingTokenRef.current = true;
            console.log('[Wings WS] Token refresh: closing socket and reconnecting...');
            setIsConnected(false);
            setConnectionStatus('connecting');
            closeSocketIntentionally();

            const establish = establishConnectionRef.current;
            if (establish) {
                await establish();
            }
            console.log('[Wings WS] Token refresh reconnect started');
        } catch (error) {
            console.error('[Wings WS] Failed to refresh token:', error);
            setConnectionStatus('error');
        } finally {
            isRefreshingTokenRef.current = false;
        }
    }, [closeSocketIntentionally]);

    useEffect(() => {
        if (!serverUuid) return;

        let isCleanedUp = false;
        connectionBlockedRef.current = false;
        reconnectAttemptsRef.current = 0;
        intentionalCloseRef.current = false;
        isRefreshingTokenRef.current = false;
        isConnectingRef.current = false;

        const clearFileOpToastTimer = (id: string) => {
            const timer = fileOpToastTimersRef.current.get(id);
            if (timer !== undefined) {
                clearTimeout(timer);
                fileOpToastTimersRef.current.delete(id);
            }
        };
        const untrackFileOpToast = (id: string) => {
            clearFileOpToastTimer(id);
            fileOpToastIdsRef.current.delete(id);
        };
        const trackFileOpToast = (id: string) => {
            clearFileOpToastTimer(id);
            fileOpToastIdsRef.current.add(id);
            const timer = setTimeout(() => {
                fileOpToastIdsRef.current.delete(id);
                fileOpToastTimersRef.current.delete(id);
            }, 15000);
            fileOpToastTimersRef.current.set(id, timer);
        };
        const dismissAllFileOpToasts = () => {
            fileOpToastTimersRef.current.forEach((timer) => clearTimeout(timer));
            fileOpToastTimersRef.current.clear();
            fileOpToastIdsRef.current.forEach((id) => toast.dismiss(id));
            fileOpToastIdsRef.current.clear();
        };

        const establishConnection = async () => {
            // Don't connect if we've already cleaned up or connecting is disabled
            if (isCleanedUp || !shouldConnect || connectionBlockedRef.current) return;
            if (isConnectingRef.current) return;

            isConnectingRef.current = true;
            intentionalCloseRef.current = false;
            clearReconnectTimer();
            setConnectionStatus('connecting');

            try {
                // Get JWT token and connection string from API
                const response = await axios.post<WingsJWTResponse>(`/api/user/servers/${serverUuid}/jwt`);

                if (isCleanedUp || !shouldConnect || connectionBlockedRef.current) {
                    return;
                }

                if (!response.data.success) {
                    throw new Error(response.data.error_message || 'Failed to get JWT token');
                }

                const { token, connection_string } = response.data.data;
                jwtTokenRef.current = token;

                console.log('[Wings WS] Connecting to:', connection_string);

                // Close any existing connection before creating a new one
                if (wsRef.current) {
                    console.log('[Wings WS] Closing existing connection');
                    const existing = wsRef.current;
                    wsRef.current = null;
                    try {
                        existing.close();
                    } catch {
                        // ignore
                    }
                }

                // Connect to Wings WebSocket
                const ws = new WebSocket(connection_string);
                wsRef.current = ws;

                ws.onopen = () => {
                    if (isCleanedUp || ws !== wsRef.current) {
                        return;
                    }
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
                    if (isCleanedUp || ws !== wsRef.current) {
                        return;
                    }

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
                            intentionalCloseRef.current = false;
                            ws.close();
                            return;
                        }

                        // Handle token expiring — full reconnect with new JWT (not in-place re-auth)
                        if (data.event === 'token expiring') {
                            console.log('[Wings WS] Token expiring, refreshing via reconnect...');
                            if (onTokenExpiringRef.current) {
                                onTokenExpiringRef.current();
                            }
                            void refreshToken();
                            return;
                        }

                        // Handle token expired
                        if (data.event === 'token expired') {
                            console.error('[Wings WS] Token expired');
                            setConnectionStatus('error');
                            intentionalCloseRef.current = false;
                            ws.close();
                            return;
                        }

                        // JWT errors are fatal — close and reconnect (do not leave a half-alive session)
                        if (data.event === 'jwt error') {
                            const raw = (data.args?.[0] as string) || 'WebSocket authentication error.';
                            console.error('[Wings WS] JWT error:', raw);
                            if (onConsoleOutputRef.current) {
                                enqueueConsoleOutput(`\u001b[31m[JWT] ${raw}\u001b[0m`);
                            }
                            setIsConnected(false);
                            setConnectionStatus('error');
                            intentionalCloseRef.current = false;
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

                        // Calagopus file operation progress / completed / error / aborted
                        const FILE_OPERATION_EVENTS = new Set([
                            'operation progress',
                            'operation completed',
                            'operation error',
                            'operation aborted',
                        ]);
                        if (typeof data.event === 'string' && FILE_OPERATION_EVENTS.has(data.event)) {
                            const operationId = String(data.args?.[0] ?? '');
                            const payload: FileOperationEvent = {
                                event: data.event,
                                operationId,
                                args: data.args,
                            };
                            if (onFileOperationRef.current) {
                                onFileOperationRef.current(payload);
                            } else if (operationId) {
                                const toastId = `file-op-${operationId}`;
                                if (data.event === 'operation progress') {
                                    trackFileOpToast(toastId);
                                    toast.loading('File operation in progress…', { id: toastId, duration: 15000 });
                                } else if (data.event === 'operation completed') {
                                    untrackFileOpToast(toastId);
                                    toast.success('File operation completed', { id: toastId });
                                } else if (data.event === 'operation error') {
                                    untrackFileOpToast(toastId);
                                    const message =
                                        typeof data.args?.[1] === 'string' && data.args[1]
                                            ? data.args[1]
                                            : 'File operation failed';
                                    toast.error(message, { id: toastId });
                                } else if (data.event === 'operation aborted') {
                                    untrackFileOpToast(toastId);
                                    toast.message('File operation aborted', { id: toastId });
                                }
                            } else if (data.event === 'operation progress') {
                                // No stable operation id — fire an untracked toast so it
                                // cannot collide with or be bulk-dismissed by other ops.
                                toast.loading('File operation in progress…', { duration: 15000 });
                            } else if (data.event === 'operation completed') {
                                toast.success('File operation completed');
                            } else if (data.event === 'operation error') {
                                const message =
                                    typeof data.args?.[1] === 'string' && data.args[1]
                                        ? data.args[1]
                                        : 'File operation failed';
                                toast.error(message);
                            } else if (data.event === 'operation aborted') {
                                toast.message('File operation aborted');
                            }
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
                    // Ignore stale closes from sockets we already replaced or intentionally nulled
                    if (ws !== wsRef.current) {
                        return;
                    }

                    console.log('[Wings WS] Disconnected');
                    dismissAllFileOpToasts();
                    setIsConnected(false);
                    setPing(null);
                    setStats(null);
                    wsRef.current = null;

                    const wasIntentional = intentionalCloseRef.current;
                    intentionalCloseRef.current = false;

                    if (wasIntentional || isCleanedUp || !shouldConnect || isRefreshingTokenRef.current) {
                        if (!isRefreshingTokenRef.current && !isCleanedUp) {
                            setConnectionStatus('disconnected');
                        }
                        return;
                    }

                    setConnectionStatus('disconnected');
                    scheduleReconnect(establishConnection);
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
            } finally {
                isConnectingRef.current = false;
            }
        };

        establishConnectionRef.current = establishConnection;

        if (shouldConnect) {
            establishConnection();
        } else {
            setIsConnected(false);
            setConnectionStatus('disconnected');
        }

        return () => {
            console.log('[Wings WS] Cleaning up connection');
            isCleanedUp = true;
            establishConnectionRef.current = null;
            clearConsoleOutputQueue();
            clearReconnectTimer();
            intentionalCloseRef.current = true;
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            // Dismiss any file-operation toasts still awaiting a completion/error/abort event
            // so a dropped connection doesn't leave a stuck "in progress" toast behind.
            dismissAllFileOpToasts();
        };
    }, [
        serverUuid,
        refreshToken,
        shouldConnect,
        enqueueConsoleOutput,
        clearConsoleOutputQueue,
        scheduleReconnect,
        clearReconnectTimer,
    ]);

    const reconnect = useCallback(() => {
        reconnectAttemptsRef.current = 0;
        connectionBlockedRef.current = false;
        closeSocketIntentionally();
        setConnectionStatus('connecting');
        const establish = establishConnectionRef.current;
        if (establish) {
            void establish();
        }
    }, [closeSocketIntentionally]);

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
