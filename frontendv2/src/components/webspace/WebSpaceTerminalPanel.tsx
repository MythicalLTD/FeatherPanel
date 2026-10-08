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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ServerTerminal, { type ServerTerminalRef } from '@/components/server/ServerTerminal';
import { useQuilldWebSocket, type QuilldStats } from '@/hooks/useQuilldWebSocket';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';

interface WebSpaceTerminalPanelProps {
    jwtEndpoint: string;
    enabled?: boolean;
    runtimeState?: string;
    /** When true, streams install events. When "auto", follows WS status. */
    installMode?: boolean | 'auto';
    canSendCommands?: boolean;
    onInstallCompleted?: () => void;
    onInstallFailed?: (message: string) => void;
    onStatus?: (status: string) => void;
    onStats?: (stats: QuilldStats) => void;
    onConnectionChange?: (status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error' | 'fallback') => void;
    showPopoutButton?: boolean;
}

export function WebSpaceTerminalPanel({
    jwtEndpoint,
    enabled = true,
    runtimeState,
    installMode = false,
    canSendCommands = false,
    onInstallCompleted,
    onInstallFailed,
    onStatus,
    onStats,
    onConnectionChange,
    showPopoutButton = true,
}: WebSpaceTerminalPanelProps) {
    const { t } = useTranslation();
    const terminalRef = useRef<ServerTerminalRef>(null);
    const installStartedRef = useRef(false);

    useEffect(() => {
        installStartedRef.current = false;
    }, [jwtEndpoint]);

    const [state, setState] = useState(runtimeState ?? 'stopped');
    const [webspaceStatus, setWebspaceStatus] = useState<string | null>(null);

    useEffect(() => {
        if (runtimeState) setState(runtimeState);
    }, [runtimeState]);

    const writeTerminalOutput = useCallback((output: string) => {
        if (!output) return;
        const normalized = output.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        for (const line of normalized.split('\n')) {
            terminalRef.current?.writeln(line);
        }
    }, []);

    const handleInstallOutput = writeTerminalOutput;

    const handleInstallStarted = useCallback(() => {
        if (installStartedRef.current) return;
        installStartedRef.current = true;
        terminalRef.current?.writeln('\u001b[33m[FeatherPanel] Install started...\u001b[0m');
    }, []);

    const handleInstallCompleted = useCallback(() => {
        terminalRef.current?.writeln('\u001b[32m[FeatherPanel] Install completed.\u001b[0m');
        onInstallCompleted?.();
    }, [onInstallCompleted]);

    const handleInstallFailed = useCallback(
        (message: string) => {
            terminalRef.current?.writeln(`\u001b[31m[FeatherPanel] Install failed: ${message}\u001b[0m`);
            onInstallFailed?.(message);
        },
        [onInstallFailed],
    );

    const handleStatus = useCallback(
        (status: string) => {
            setWebspaceStatus(status);
            onStatus?.(status);
            if (['running', 'stopped', 'starting', 'stopping', 'offline'].includes(status)) {
                setState(status);
            }
        },
        [onStatus],
    );

    const isInstallFlow = useMemo(() => {
        if (installMode === true) return true;
        if (installMode === 'auto') {
            return webspaceStatus === 'installing' || webspaceStatus === 'reinstalling';
        }
        return false;
    }, [installMode, webspaceStatus]);

    const listenInstall = installMode === true || installMode === 'auto';

    const { connectionStatus, reconnect, sendCommand, requestStats } = useQuilldWebSocket({
        jwtEndpoint,
        enabled,
        wsOnly: true,
        onConsoleOutput: writeTerminalOutput,
        onInstallOutput: listenInstall ? handleInstallOutput : undefined,
        onInstallStarted: listenInstall ? handleInstallStarted : undefined,
        onInstallCompleted: listenInstall ? handleInstallCompleted : undefined,
        onInstallFailed: listenInstall ? handleInstallFailed : undefined,
        onStatus: handleStatus,
        onStats,
    });

    useEffect(() => {
        onConnectionChange?.(connectionStatus);
    }, [connectionStatus, onConnectionChange]);

    useEffect(() => {
        if (connectionStatus !== 'connected') return;
        requestStats();
    }, [connectionStatus, requestStats]);

    const connectionInfo = (() => {
        switch (connectionStatus) {
            case 'connecting':
                return {
                    icon: Loader2,
                    message: t('webSpaces.console.connection.connecting'),
                    color: 'text-blue-500',
                    bgColor: 'bg-blue-500/10 border-blue-500/20',
                    iconClass: 'animate-spin',
                };
            case 'connected':
                return {
                    icon: Wifi,
                    message: t('webSpaces.console.connection.connected'),
                    color: 'text-green-500',
                    bgColor: 'bg-green-500/10 border-green-500/20',
                    iconClass: '',
                };
            case 'error':
                return {
                    icon: AlertTriangle,
                    message: t('webSpaces.console.connection.error'),
                    color: 'text-yellow-500',
                    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
                    iconClass: '',
                };
            default:
                return {
                    icon: WifiOff,
                    message: t('webSpaces.console.connection.disconnected'),
                    color: 'text-red-500',
                    bgColor: 'bg-red-500/10 border-red-500/20',
                    iconClass: '',
                };
        }
    })();

    return (
        <div className='flex min-h-0 flex-1 flex-col gap-4'>
            {enabled && connectionStatus !== 'connected' && connectionStatus !== 'idle' && (
                <Card className={`shrink-0 border-2 ${connectionInfo.bgColor}`}>
                    <CardContent className='p-4'>
                        <div className='flex items-center gap-4'>
                            <div
                                className={`flex h-12 w-12 items-center justify-center rounded-lg ${connectionInfo.bgColor}`}
                            >
                                <connectionInfo.icon
                                    className={`h-6 w-6 ${connectionInfo.color} ${connectionInfo.iconClass}`}
                                />
                            </div>
                            <div className='min-w-0 flex-1'>
                                <p className={`font-semibold ${connectionInfo.color}`}>{connectionInfo.message}</p>
                                <p className='text-muted-foreground text-sm'>
                                    {t('webSpaces.console.connection.info')}
                                </p>
                            </div>
                            {connectionStatus === 'error' && (
                                <Button size='sm' variant='outline' onClick={reconnect}>
                                    {t('common.retry')}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className='flex min-h-0 flex-1 flex-col'>
                <ServerTerminal
                    ref={terminalRef}
                    serverStatus={state}
                    fillContainer
                    showPopoutButton={showPopoutButton && !isInstallFlow}
                    subtitle={t('webSpaces.console.terminalSubtitle')}
                    onSendCommand={isInstallFlow ? undefined : sendCommand}
                    canSendCommands={!isInstallFlow && canSendCommands && connectionStatus === 'connected'}
                />
            </div>
        </div>
    );
}
