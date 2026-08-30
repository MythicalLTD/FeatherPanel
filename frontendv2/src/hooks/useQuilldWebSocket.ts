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

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

interface QuilldWsMessage {
    event?: string;
    args?: unknown[];
}

interface QuilldJwtResponse {
    success: boolean;
    message?: string;
    data?: {
        token: string;
        socket?: string;
        connection_string?: string;
    };
    error_message?: string | null;
}

export interface QuilldStats {
    cpu_absolute?: number;
    memory_bytes?: number;
    memory_limit_bytes?: number;
    disk_bytes?: number;
    disk_limit_bytes?: number;
    network_rx_bytes?: number;
    network_tx_bytes?: number;
    network?: {
        rx_bytes: number;
        tx_bytes: number;
    };
    bandwidth_used_bytes?: number;
    bandwidth_limit_bytes?: number;
    bandwidth_over_quota?: boolean;
    state?: string;
}

export interface UseQuilldWebSocketOptions {
    /** Panel endpoint that returns `{ token, socket }`, e.g. `/api/admin/webspaces/{uuid}/jwt`. */
    jwtEndpoint: string;
    enabled?: boolean;
    /** When true, never fall back to HTTP polling (install flows). */
    wsOnly?: boolean;
    onFallback?: () => void;
    fallbackAfterMs?: number;
    onStatus?: (status: string) => void;
    onInstallOutput?: (output: string) => void;
    onInstallStarted?: () => void;
    onInstallCompleted?: () => void;
    onInstallFailed?: (message: string) => void;
    onConsoleOutput?: (output: string) => void;
    onStats?: (stats: QuilldStats) => void;
}

export interface UseQuilldWebSocketReturn {
    lines: string[];
    installLines: string[];
    isConnected: boolean;
    connectionStatus: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error' | 'fallback';
    webspaceStatus: string | null;
    stats: QuilldStats | null;
    sendCommand: (command: string) => void;
    reconnect: () => void;
    requestStats: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 20;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15000;

export function useQuilldWebSocket({
    jwtEndpoint,
    enabled = true,
    wsOnly = false,
    onFallback,
    fallbackAfterMs = 5000,
    onStatus,
    onInstallOutput,
    onInstallStarted,
    onInstallCompleted,
    onInstallFailed,
    onConsoleOutput,
    onStats,
}: UseQuilldWebSocketOptions): UseQuilldWebSocketReturn {
    const [lines, setLines] = useState<string[]>([]);
    const [installLines, setInstallLines] = useState<string[]>([]);
    const [stats, setStats] = useState<QuilldStats | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [webspaceStatus, setWebspaceStatus] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<
        'idle' | 'connecting' | 'connected' | 'disconnected' | 'error' | 'fallback'
    >('idle');

    const wsRef = useRef<WebSocket | null>(null);
    const jwtTokenRef = useRef('');
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const reconnectAttemptsRef = useRef(0);
    const intentionalCloseRef = useRef(false);
    const isConnectingRef = useRef(false);
    const establishRef = useRef<(() => Promise<void>) | null>(null);

    const onFallbackRef = useRef(onFallback);
    const onStatusRef = useRef(onStatus);
    const onInstallOutputRef = useRef(onInstallOutput);
    const onInstallStartedRef = useRef(onInstallStarted);
    const onInstallCompletedRef = useRef(onInstallCompleted);
    const onInstallFailedRef = useRef(onInstallFailed);
    const onConsoleOutputRef = useRef(onConsoleOutput);
    const onStatsRef = useRef(onStats);

    useEffect(() => {
        onFallbackRef.current = onFallback;
        onStatusRef.current = onStatus;
        onInstallOutputRef.current = onInstallOutput;
        onInstallStartedRef.current = onInstallStarted;
        onInstallCompletedRef.current = onInstallCompleted;
        onInstallFailedRef.current = onInstallFailed;
        onConsoleOutputRef.current = onConsoleOutput;
        onStatsRef.current = onStats;
    }, [
        onFallback,
        onStatus,
        onInstallOutput,
        onInstallStarted,
        onInstallCompleted,
        onInstallFailed,
        onConsoleOutput,
        onStats,
    ]);

    const appendInstall = useCallback((chunk: string) => {
        if (!chunk) return;
        const normalized = chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        for (const line of normalized.split('\n')) {
            setInstallLines((prev) => [...prev, line]);
            onInstallOutputRef.current?.(line);
        }
    }, []);

    const appendConsole = useCallback((chunk: string) => {
        if (!chunk) return;
        const normalized = chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        for (const line of normalized.split('\n')) {
            setLines((prev) => [...prev, line]);
            onConsoleOutputRef.current?.(line);
        }
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

    const fireFallback = useCallback(() => {
        if (wsOnly) return;
        setConnectionStatus('fallback');
        onFallbackRef.current?.();
    }, [wsOnly]);

    const scheduleReconnect = useCallback(
        (establishConnection: () => void) => {
            if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                setConnectionStatus('error');
                fireFallback();
                return;
            }

            clearReconnectTimer();
            reconnectAttemptsRef.current += 1;
            const delay = Math.min(RECONNECT_BASE_DELAY_MS * reconnectAttemptsRef.current, RECONNECT_MAX_DELAY_MS);

            reconnectTimeoutRef.current = setTimeout(() => {
                establishConnection();
            }, delay);
        },
        [clearReconnectTimer, fireFallback],
    );

    const markConnected = useCallback(() => {
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        setConnectionStatus('connected');
    }, []);

    const sendCommand = useCallback((command: string) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const trimmed = command.trimEnd();
        if (!trimmed) return;
        ws.send(JSON.stringify({ event: 'send command', args: [trimmed] }));
    }, []);

    const requestStats = useCallback(() => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ event: 'send stats', args: [] }));
    }, []);

    const reconnect = useCallback(() => {
        reconnectAttemptsRef.current = 0;
        closeSocketIntentionally();
        setConnectionStatus('connecting');
        const establish = establishRef.current;
        if (establish) void establish();
    }, [closeSocketIntentionally]);

    useEffect(() => {
        if (!enabled || !jwtEndpoint) {
            setConnectionStatus('idle');
            setIsConnected(false);
            return;
        }

        let cleanedUp = false;
        intentionalCloseRef.current = false;
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        setLines([]);
        setInstallLines([]);
        setIsConnected(false);
        setConnectionStatus('connecting');

        const establishConnection = async () => {
            if (cleanedUp || !enabled || isConnectingRef.current) return;

            isConnectingRef.current = true;
            intentionalCloseRef.current = false;
            clearReconnectTimer();
            setConnectionStatus('connecting');

            try {
                const response = await axios.post<QuilldJwtResponse>(jwtEndpoint);
                if (cleanedUp || !enabled) return;

                if (!response.data.success || !response.data.data?.token) {
                    throw new Error(response.data.error_message || response.data.message || 'Failed to get JWT');
                }

                const socketUrl = response.data.data.connection_string || response.data.data.socket;
                if (!socketUrl) {
                    throw new Error('Missing WebSocket connection string');
                }

                jwtTokenRef.current = response.data.data.token;

                if (wsRef.current) {
                    const existing = wsRef.current;
                    wsRef.current = null;
                    try {
                        existing.close();
                    } catch {
                        // ignore
                    }
                }

                const ws = new WebSocket(socketUrl);
                wsRef.current = ws;

                const fallbackTimer = wsOnly
                    ? undefined
                    : window.setTimeout(() => {
                          if (cleanedUp || wsRef.current !== ws) return;
                          if (ws.readyState === WebSocket.OPEN) return;
                          fireFallback();
                      }, fallbackAfterMs);

                ws.onopen = () => {
                    if (cleanedUp || ws !== wsRef.current) return;
                    ws.send(
                        JSON.stringify({
                            event: 'auth',
                            args: [jwtTokenRef.current],
                        }),
                    );
                };

                ws.onmessage = (event) => {
                    if (cleanedUp || ws !== wsRef.current) return;
                    window.clearTimeout(fallbackTimer);

                    try {
                        const data = JSON.parse(String(event.data)) as QuilldWsMessage;
                        const evt = data.event ?? '';

                        if (evt === 'auth success' || evt === 'auth_success') {
                            markConnected();
                            return;
                        }

                        if (evt === 'auth error' || evt === 'auth_error' || evt === 'jwt error') {
                            setConnectionStatus('error');
                            intentionalCloseRef.current = false;
                            ws.close();
                            return;
                        }

                        if (evt === 'status') {
                            markConnected();
                            const status = String(data.args?.[0] ?? '');
                            setWebspaceStatus(status);
                            onStatusRef.current?.(status);
                            return;
                        }

                        if (evt === 'install started') {
                            markConnected();
                            onInstallStartedRef.current?.();
                            return;
                        }

                        if (evt === 'install output') {
                            markConnected();
                            appendInstall(String(data.args?.[0] ?? ''));
                            return;
                        }

                        if (evt === 'install completed') {
                            markConnected();
                            setWebspaceStatus('installed');
                            onInstallCompletedRef.current?.();
                            return;
                        }

                        if (evt === 'install failed') {
                            markConnected();
                            const msg = String(data.args?.[0] ?? 'Install failed');
                            setWebspaceStatus('installation_failed');
                            onInstallFailedRef.current?.(msg);
                            return;
                        }

                        if (evt === 'console output' || evt === 'console_output') {
                            markConnected();
                            appendConsole(String(data.args?.[0] ?? ''));
                            return;
                        }

                        if (evt === 'stats') {
                            markConnected();
                            let statsData: QuilldStats | null = null;
                            try {
                                const statsArg = data.args?.[0];
                                if (typeof statsArg === 'string') {
                                    statsData = JSON.parse(statsArg) as QuilldStats;
                                } else if (statsArg && typeof statsArg === 'object') {
                                    statsData = statsArg as QuilldStats;
                                }
                            } catch {
                                statsData = null;
                            }

                            if (statsData) {
                                setStats(statsData);
                                onStatsRef.current?.(statsData);
                            }
                        }
                    } catch {
                        // ignore malformed frames
                    }
                };

                ws.onerror = () => {
                    if (cleanedUp || ws !== wsRef.current) return;
                    if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) return;
                };

                ws.onclose = () => {
                    if (ws !== wsRef.current) return;
                    window.clearTimeout(fallbackTimer);
                    wsRef.current = null;
                    setIsConnected(false);

                    const wasIntentional = intentionalCloseRef.current;
                    intentionalCloseRef.current = false;

                    if (wasIntentional || cleanedUp) {
                        if (!cleanedUp) setConnectionStatus('disconnected');
                        return;
                    }

                    setConnectionStatus('disconnected');
                    scheduleReconnect(establishConnection);
                };
            } catch (err) {
                console.error('[Quilld WS] Connection failed:', err);
                if (!cleanedUp) {
                    setConnectionStatus('error');
                    scheduleReconnect(establishConnection);
                    fireFallback();
                }
            } finally {
                isConnectingRef.current = false;
            }
        };

        establishRef.current = establishConnection;
        void establishConnection();

        return () => {
            cleanedUp = true;
            establishRef.current = null;
            clearReconnectTimer();
            intentionalCloseRef.current = true;
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [
        jwtEndpoint,
        enabled,
        wsOnly,
        fallbackAfterMs,
        fireFallback,
        appendConsole,
        appendInstall,
        markConnected,
        scheduleReconnect,
        clearReconnectTimer,
    ]);

    return {
        lines,
        installLines,
        isConnected,
        connectionStatus,
        webspaceStatus,
        stats,
        sendCommand,
        reconnect,
        requestStats,
    };
}
