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

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

interface QuilldJwtResponse {
    success: boolean;
    message?: string;
    data?: {
        token: string;
        socket: string;
    };
    error_message?: string | null;
}

interface QuilldWsMessage {
    event?: string;
    args?: unknown[];
}

export interface UseQuilldWebSocketOptions {
    /** Panel endpoint that returns `{ token, socket }`, e.g. `/api/admin/webspaces/{uuid}/jwt`. */
    jwtEndpoint: string;
    enabled?: boolean;
    /** Called when the WebSocket path fails (JWT fetch, connect, or early close). */
    onFallback?: () => void;
    /** How long to wait before treating WS as failed and invoking onFallback. */
    fallbackAfterMs?: number;
}

export interface UseQuilldWebSocketReturn {
    lines: string[];
    isConnected: boolean;
    connectionStatus: 'idle' | 'connecting' | 'connected' | 'error' | 'fallback';
    /** Send a console command when connected; no-op otherwise. */
    sendCommand: (command: string) => void;
}

/**
 * Quilld console WebSocket: fetch JWT → connect → auth → collect `console output` / send commands.
 */
export function useQuilldWebSocket({
    jwtEndpoint,
    enabled = true,
    onFallback,
    fallbackAfterMs = 3000,
}: UseQuilldWebSocketOptions): UseQuilldWebSocketReturn {
    const [lines, setLines] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<
        'idle' | 'connecting' | 'connected' | 'error' | 'fallback'
    >('idle');

    const wsRef = useRef<WebSocket | null>(null);
    const onFallbackRef = useRef(onFallback);
    const fallbackFiredRef = useRef(false);
    const connectedRef = useRef(false);

    useEffect(() => {
        onFallbackRef.current = onFallback;
    }, [onFallback]);

    const fireFallback = useCallback(() => {
        if (fallbackFiredRef.current) return;
        fallbackFiredRef.current = true;
        setConnectionStatus('fallback');
        setIsConnected(false);
        onFallbackRef.current?.();
    }, []);

    const sendCommand = useCallback((command: string) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || !connectedRef.current) return;
        const trimmed = command.trimEnd();
        if (!trimmed) return;
        ws.send(
            JSON.stringify({
                event: 'send command',
                args: [trimmed],
            }),
        );
    }, []);

    useEffect(() => {
        if (!enabled || !jwtEndpoint) {
            setConnectionStatus('idle');
            setIsConnected(false);
            return;
        }

        let cleanedUp = false;
        fallbackFiredRef.current = false;
        connectedRef.current = false;
        setLines([]);
        setIsConnected(false);
        setConnectionStatus('connecting');

        const fallbackTimer = window.setTimeout(() => {
            if (cleanedUp || connectedRef.current) return;
            if (wsRef.current) {
                try {
                    wsRef.current.close();
                } catch {
                    // ignore
                }
                wsRef.current = null;
            }
            fireFallback();
        }, fallbackAfterMs);

        const markConnected = (authSettleTimer?: number) => {
            if (!connectedRef.current) {
                connectedRef.current = true;
                setIsConnected(true);
                setConnectionStatus('connected');
                window.clearTimeout(fallbackTimer);
                if (authSettleTimer !== undefined) window.clearTimeout(authSettleTimer);
            }
        };

        const connect = async () => {
            try {
                const response = await axios.post<QuilldJwtResponse>(jwtEndpoint);
                if (cleanedUp) return;

                if (!response.data.success || !response.data.data?.token || !response.data.data?.socket) {
                    throw new Error(response.data.error_message || response.data.message || 'Failed to get JWT');
                }

                const { token, socket: socketUrl } = response.data.data;
                const ws = new WebSocket(socketUrl);
                wsRef.current = ws;
                let authSettleTimer: number | undefined;

                ws.onopen = () => {
                    if (cleanedUp || ws !== wsRef.current) return;
                    ws.send(
                        JSON.stringify({
                            event: 'auth',
                            args: [token],
                        }),
                    );
                    // Daemon closes immediately on bad JWT; settle after a short open window.
                    authSettleTimer = window.setTimeout(() => {
                        if (cleanedUp || ws !== wsRef.current || ws.readyState !== WebSocket.OPEN) return;
                        markConnected(authSettleTimer);
                    }, 400);
                };

                ws.onmessage = (event) => {
                    if (cleanedUp || ws !== wsRef.current) return;
                    try {
                        const data = JSON.parse(String(event.data)) as QuilldWsMessage;
                        const evt = data.event ?? '';
                        if (evt === 'auth success' || evt === 'auth_success') {
                            markConnected(authSettleTimer);
                            return;
                        }
                        if (evt === 'console output' || evt === 'console_output') {
                            markConnected(authSettleTimer);
                            const chunk =
                                typeof data.args?.[0] === 'string' ? data.args[0] : String(data.args?.[0] ?? '');
                            setLines((prev) => [...prev, chunk]);
                        }
                    } catch {
                        // ignore non-JSON frames
                    }
                };

                ws.onerror = () => {
                    if (cleanedUp || ws !== wsRef.current) return;
                    setConnectionStatus('error');
                    if (authSettleTimer !== undefined) window.clearTimeout(authSettleTimer);
                    fireFallback();
                };

                ws.onclose = () => {
                    if (ws !== wsRef.current) return;
                    wsRef.current = null;
                    setIsConnected(false);
                    if (authSettleTimer !== undefined) window.clearTimeout(authSettleTimer);
                    if (!cleanedUp && !connectedRef.current) {
                        fireFallback();
                    } else if (!cleanedUp) {
                        setConnectionStatus('error');
                    }
                };
            } catch (err) {
                console.error('[Quilld WS] Connection failed:', err);
                if (!cleanedUp) {
                    setConnectionStatus('error');
                    fireFallback();
                }
            }
        };

        void connect();

        return () => {
            cleanedUp = true;
            window.clearTimeout(fallbackTimer);
            if (wsRef.current) {
                try {
                    wsRef.current.close();
                } catch {
                    // ignore
                }
                wsRef.current = null;
            }
        };
    }, [jwtEndpoint, enabled, fallbackAfterMs, fireFallback]);

    return { lines, isConnected, connectionStatus, sendCommand };
}
