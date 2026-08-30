/*
This file is part of FeatherPanel.
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

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

interface PackageWsMessage {
    event?: string;
    args?: unknown[];
}

export interface UseSystemPackageWebSocketOptions {
    nodeId: string;
    enabled?: boolean;
    onOutput?: (packageId: string, chunk: string) => void;
    onStarted?: (packageId: string) => void;
    onCompleted?: (packageId: string) => void;
    onFailed?: (packageId: string, message: string) => void;
}

export function stripPackageTerminalText(text: string): string {
    return text
        .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
        .replace(/\x1b\][^\x07]*\x07/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
}

export function isPackageProgressNoise(line: string): boolean {
    const trimmed = line.trim();
    return /^\(Reading database \.\.\./.test(trimmed) || /^\(Reading database \.\.\. \d+%\)$/.test(trimmed);
}

function isWebSocketOpen(ws: WebSocket | null | undefined): boolean {
    return ws != null && ws.readyState === WebSocket.OPEN;
}

export function appendPackageTerminalOutput(
    terminal: { writeln: (line: string) => void } | null | undefined,
    chunk: string,
) {
    if (!chunk || !terminal) return;

    const text = stripPackageTerminalText(chunk);
    for (const line of text.split('\n')) {
        const trimmed = line.trimEnd();
        if (!trimmed || isPackageProgressNoise(trimmed)) continue;
        terminal.writeln(trimmed);
    }
}

export function useSystemPackageWebSocket({
    nodeId,
    enabled = true,
    onOutput,
    onStarted,
    onCompleted,
    onFailed,
}: UseSystemPackageWebSocketOptions) {
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const wsRef = useRef<WebSocket | null>(null);
    const generationRef = useRef(0);
    const connectingRef = useRef(false);

    const onOutputRef = useRef(onOutput);
    const onStartedRef = useRef(onStarted);
    const onCompletedRef = useRef(onCompleted);
    const onFailedRef = useRef(onFailed);

    useEffect(() => {
        onOutputRef.current = onOutput;
        onStartedRef.current = onStarted;
        onCompletedRef.current = onCompleted;
        onFailedRef.current = onFailed;
    }, [onOutput, onStarted, onCompleted, onFailed]);

    const disconnect = useCallback(() => {
        generationRef.current += 1;
        connectingRef.current = false;
        if (wsRef.current) {
            try {
                wsRef.current.close();
            } catch {
                // ignore
            }
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const ensureConnected = useCallback(async () => {
        if (!enabled || !nodeId) return false;
        if (isWebSocketOpen(wsRef.current)) return true;
        if (connectingRef.current) {
            for (let i = 0; i < 50; i++) {
                await new Promise((resolve) => window.setTimeout(resolve, 100));
                if (isWebSocketOpen(wsRef.current)) return true;
            }
        }
        if (connectingRef.current) return false;

        connectingRef.current = true;
        const generation = ++generationRef.current;
        setConnectionStatus('connecting');

        try {
            const { data } = await axios.get(`/api/admin/web-nodes/${nodeId}/packages/socket`);
            const socketUrl = data?.data?.connection_string || data?.data?.socket;
            if (!data?.success || !socketUrl) {
                throw new Error(data?.message || 'Missing package WebSocket URL');
            }

            if (generation !== generationRef.current) return false;

            if (wsRef.current) {
                try {
                    wsRef.current.close();
                } catch {
                    // ignore
                }
                wsRef.current = null;
            }

            await new Promise<void>((resolve, reject) => {
                const ws = new WebSocket(socketUrl);
                wsRef.current = ws;

                const timeout = window.setTimeout(() => {
                    if (generation !== generationRef.current) return;
                    reject(new Error('Package WebSocket connection timed out'));
                }, 10000);

                ws.onopen = () => {
                    if (generation !== generationRef.current) {
                        ws.close();
                        return;
                    }
                };

                ws.onmessage = (event) => {
                    if (generation !== generationRef.current) return;

                    try {
                        const payload = JSON.parse(String(event.data)) as PackageWsMessage;
                        const evt = payload.event ?? '';
                        const args = payload.args ?? [];

                        if (evt === 'auth success') {
                            window.clearTimeout(timeout);
                            setIsConnected(true);
                            setConnectionStatus('connected');
                            resolve();
                            return;
                        }

                        const packageId = String(args[0] ?? '');
                        if (evt === 'package started') {
                            onStartedRef.current?.(packageId);
                        } else if (evt === 'package output') {
                            onOutputRef.current?.(packageId, stripPackageTerminalText(String(args[1] ?? '')));
                        } else if (evt === 'package completed') {
                            onCompletedRef.current?.(packageId);
                        } else if (evt === 'package failed') {
                            onFailedRef.current?.(packageId, String(args[1] ?? 'Package operation failed'));
                        }
                    } catch {
                        // ignore malformed frames
                    }
                };

                ws.onerror = () => {
                    if (generation !== generationRef.current) return;
                    window.clearTimeout(timeout);
                    reject(new Error('Package WebSocket connection failed'));
                };

                ws.onclose = () => {
                    if (generation !== generationRef.current) return;
                    if (wsRef.current === ws) {
                        wsRef.current = null;
                        setIsConnected(false);
                        setConnectionStatus('error');
                    }
                };
            });

            return generation === generationRef.current;
        } catch {
            if (generation === generationRef.current) {
                setConnectionStatus('error');
                setIsConnected(false);
            }
            return false;
        } finally {
            connectingRef.current = false;
        }
    }, [enabled, nodeId]);

    useEffect(() => {
        if (!enabled || !nodeId) {
            disconnect();
            setConnectionStatus('idle');
            return;
        }

        void ensureConnected();

        return () => {
            disconnect();
        };
    }, [disconnect, enabled, ensureConnected, nodeId]);

    return {
        isConnected,
        connectionStatus,
        ensureConnected,
        disconnect,
    };
}
