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

import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { AlertTriangle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ServerTerminal, { type ServerTerminalRef } from '@/components/server/ServerTerminal';
import { useSystemPackageWebSocket, appendPackageTerminalOutput } from '@/hooks/useSystemPackageWebSocket';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';

export interface SystemPackageTerminalPanelRef {
    clear: () => void;
    ensureConnected: () => Promise<boolean>;
    writeln: (line: string) => void;
}

interface SystemPackageTerminalPanelProps {
    nodeId: string;
    enabled?: boolean;
    onCompleted?: (packageId: string) => void;
    onFailed?: (packageId: string, message: string) => void;
}

export const SystemPackageTerminalPanel = forwardRef<SystemPackageTerminalPanelRef, SystemPackageTerminalPanelProps>(
    function SystemPackageTerminalPanel({ nodeId, enabled = true, onCompleted, onFailed }, ref) {
        const { t } = useTranslation();
        const terminalRef = useRef<ServerTerminalRef>(null);

        const handleOutput = useCallback((_packageId: string, chunk: string) => {
            appendPackageTerminalOutput(terminalRef.current, chunk);
        }, []);

        const handleStarted = useCallback((packageId: string) => {
            terminalRef.current?.writeln(`\u001b[33m[FeatherPanel] ${packageId} started...\u001b[0m`);
        }, []);

        const handleCompleted = useCallback(
            (packageId: string) => {
                terminalRef.current?.writeln(`\u001b[32m[FeatherPanel] ${packageId} completed.\u001b[0m`);
                onCompleted?.(packageId);
            },
            [onCompleted],
        );

        const handleFailed = useCallback(
            (packageId: string, message: string) => {
                terminalRef.current?.writeln(`\u001b[31m[FeatherPanel] ${packageId} failed: ${message}\u001b[0m`);
                onFailed?.(packageId, message);
            },
            [onFailed],
        );

        const { connectionStatus, ensureConnected, disconnect } = useSystemPackageWebSocket({
            nodeId,
            enabled,
            onStarted: handleStarted,
            onOutput: handleOutput,
            onCompleted: handleCompleted,
            onFailed: handleFailed,
        });

        const reconnect = useCallback(async () => {
            disconnect();
            await ensureConnected();
        }, [disconnect, ensureConnected]);

        useImperativeHandle(
            ref,
            () => ({
                clear: () => terminalRef.current?.clear(),
                ensureConnected,
                writeln: (line: string) => terminalRef.current?.writeln(line),
            }),
            [ensureConnected],
        );

        const connectionInfo = (() => {
            switch (connectionStatus) {
                case 'connecting':
                    return {
                        icon: Loader2,
                        message: t('servers.console.connection.connecting'),
                        color: 'text-blue-500',
                        bgColor: 'bg-blue-500/10 border-blue-500/20',
                        iconClass: 'animate-spin',
                    };
                case 'connected':
                    return {
                        icon: Wifi,
                        message: t('servers.console.connection.connected'),
                        color: 'text-green-500',
                        bgColor: 'bg-green-500/10 border-green-500/20',
                        iconClass: '',
                    };
                case 'error':
                    return {
                        icon: AlertTriangle,
                        message: t('servers.console.connection.error'),
                        color: 'text-yellow-500',
                        bgColor: 'bg-yellow-500/10 border-yellow-500/20',
                        iconClass: '',
                    };
                default:
                    return {
                        icon: WifiOff,
                        message: t('servers.console.connection.disconnected'),
                        color: 'text-red-500',
                        bgColor: 'bg-red-500/10 border-red-500/20',
                        iconClass: '',
                    };
            }
        })();

        return (
            <div className='space-y-4'>
                {enabled && connectionStatus !== 'connected' && connectionStatus !== 'idle' && (
                    <Card className={`border-2 ${connectionInfo.bgColor}`}>
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
                                        {t('servers.console.connection.info')}
                                    </p>
                                </div>
                                {connectionStatus === 'error' && (
                                    <Button size='sm' variant='outline' onClick={() => void reconnect()}>
                                        {t('common.retry')}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <ServerTerminal
                    ref={terminalRef}
                    canSendCommands={false}
                    serverStatus='offline'
                    showPopoutButton={false}
                />
            </div>
        );
    },
);
