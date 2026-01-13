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

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useWingsWebSocket } from '@/hooks/useWingsWebSocket';
import ServerHeader from '@/components/server/ServerHeader';
import ServerInfoCards from '@/components/server/ServerInfoCards';
import ServerTerminal, { ServerTerminalRef } from '@/components/server/ServerTerminal';
import ServerPerformance from '@/components/server/ServerPerformance';
import { Card, CardContent } from '@/components/ui/card';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { AlertTriangle, Wifi, WifiOff, Loader2 } from 'lucide-react';

import { useTranslation } from '@/contexts/TranslationContext';
import { useFeatureDetector } from '@/hooks/useFeatureDetector';
import { EulaDialog } from '@/components/server/features/EulaDialog';
import { JavaVersionDialog } from '@/components/server/features/JavaVersionDialog';
import { PidLimitDialog } from '@/components/server/features/PidLimitDialog';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

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

const formatUptime = (uptimeMs: number): string => {
    // Wings sends uptime in milliseconds, convert to seconds
    const seconds = Math.floor(uptimeMs / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
};

export default function ServerConsolePage() {
    const { t } = useTranslation();
    const params = useParams();
    const serverUuid = params.uuidShort as string;
    const terminalRef = useRef<ServerTerminalRef>(null);

    // Ref to store previous network stats for rate calculation
    const prevNetworkRef = useRef({ rx: 0, tx: 0, timestamp: 0 });
    // Ref to prevent server status overwriting WebSocket events
    const hasInitializedStatus = useRef(false);

    // Permissions hook provides server data from context
    const { hasPermission, loading: permissionsLoading, server } = useServerPermissions(serverUuid);
    const [serverStatus, setServerStatus] = useState('offline');
    const [wingsUptime, setWingsUptime] = useState<string>('');

    // Initialize server status when server data is loaded
    useEffect(() => {
        if (server?.status && !hasInitializedStatus.current) {
            // Defer state update to avoid synchronous render loop warning/linter error
            const timer = setTimeout(() => {
                setServerStatus(server.status);
                hasInitializedStatus.current = true;
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [server?.status]);

    // Performance data
    const [cpuData, setCpuData] = useState<Array<{ timestamp: number; value: number }>>([]);
    const [memoryData, setMemoryData] = useState<Array<{ timestamp: number; value: number }>>([]);
    const [diskData, setDiskData] = useState<Array<{ timestamp: number; value: number }>>([]);
    const [networkData, setNetworkData] = useState<Array<{ timestamp: number; value: number }>>([]);
    const maxDataPoints = 60; // Keep last 60 data points

    // Current resource usage
    const [currentCpu, setCurrentCpu] = useState(0);
    const [currentMemory, setCurrentMemory] = useState(0);
    const [currentDisk, setCurrentDisk] = useState(0);
    const [currentNetworkRx, setCurrentNetworkRx] = useState(0);
    const [currentNetworkTx, setCurrentNetworkTx] = useState(0);

    // Feature Detector
    const {
        processLog,
        eulaOpen,
        setEulaOpen,
        javaVersionOpen,
        setJavaVersionOpen,
        pidLimitOpen,
        setPidLimitOpen,
        detectedData,
    } = useFeatureDetector();

    // Permissions
    const canConnect = hasPermission('websocket.connect');

    // Plugin Widgets
    const { fetchWidgets, getWidgets } = usePluginWidgets('server-console');

    // Fetch widgets on mount
    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    // Handler for console output
    const handleConsoleOutput = useCallback(
        (output: string) => {
            processLog(output);
            if (terminalRef.current) {
                terminalRef.current.writeln(output);
            }
        },
        [processLog],
    );

    // Handler for server status updates
    const handleStatusUpdate = useCallback((status: string) => {
        setServerStatus(status);
    }, []);

    // Handler for stats updates
    const handleStatsUpdate = useCallback((stats: WingsStats) => {
        const timestamp = new Date().getTime();

        // Update uptime
        if (stats.uptime) {
            setWingsUptime(formatUptime(stats.uptime));
        }

        // Update CPU data
        if (stats.cpu_absolute !== undefined && stats.cpu_absolute !== null) {
            const cpuValue = Number(stats.cpu_absolute) || 0;
            setCurrentCpu(cpuValue);
            setCpuData((prev) => {
                const newData = [...prev, { timestamp, value: cpuValue }];
                return newData.slice(-maxDataPoints);
            });
        }

        // Update Memory data (convert bytes to MiB)
        if (stats.memory_bytes !== undefined && stats.memory_bytes !== null) {
            const memoryMiB = Number(stats.memory_bytes) / (1024 * 1024);
            setCurrentMemory(memoryMiB);
            setMemoryData((prev) => {
                const newData = [...prev, { timestamp, value: memoryMiB }];
                return newData.slice(-maxDataPoints);
            });
        }

        // Update Disk data (convert bytes to MiB)
        if (stats.disk_bytes !== undefined && stats.disk_bytes !== null) {
            const diskMiB = Number(stats.disk_bytes) / (1024 * 1024);
            setCurrentDisk(diskMiB);
            setDiskData((prev) => {
                const newData = [...prev, { timestamp, value: diskMiB }];
                return newData.slice(-maxDataPoints);
            });
        }

        // Update Network data (Calculate Rate)
        if (stats.network && stats.network.rx_bytes !== undefined && stats.network.tx_bytes !== undefined) {
            const currentRxBytes = Number(stats.network.rx_bytes);
            const currentTxBytes = Number(stats.network.tx_bytes);
            const now = new Date().getTime();

            // Calculate rate if we have previous data
            if (prevNetworkRef.current.timestamp > 0) {
                const timeDiff = (now - prevNetworkRef.current.timestamp) / 1000; // seconds
                if (timeDiff > 0) {
                    const rxRate = Math.max(0, currentRxBytes - prevNetworkRef.current.rx) / timeDiff;
                    const txRate = Math.max(0, currentTxBytes - prevNetworkRef.current.tx) / timeDiff;

                    setCurrentNetworkRx(rxRate);
                    setCurrentNetworkTx(txRate);

                    // For the chart, we can show total bandwidth or just RX+TX rate
                    const totalRate = rxRate + txRate;
                    setNetworkData((prev) => {
                        const newData = [...prev, { timestamp, value: totalRate }];
                        return newData.slice(-maxDataPoints);
                    });
                }
            }

            // Update refs
            prevNetworkRef.current = {
                rx: currentRxBytes,
                tx: currentTxBytes,
                timestamp: now,
            };
        }
    }, []);

    // Wings WebSocket connection
    const { connectionStatus, ping, sendCommand, sendPowerAction, requestStats, requestLogs } = useWingsWebSocket({
        serverUuid,
        connect: canConnect,
        onConsoleOutput: handleConsoleOutput,
        onStatus: handleStatusUpdate,
        onStats: handleStatsUpdate,
    });
    // Request stats periodically for ping measurement
    useEffect(() => {
        if (connectionStatus !== 'connected' || !requestStats) return;

        // Request stats immediately on connect
        requestStats();
        // Request logs history
        requestLogs();

        // Then request every 5 seconds for ping measurement
        const interval = setInterval(() => {
            requestStats();
        }, 5000);

        return () => clearInterval(interval);
    }, [connectionStatus, requestStats, requestLogs]);

    // Initialize charts with zero data point if empty
    useEffect(() => {
        if (cpuData.length === 0) {
            // Defer to satisfy lint rule about synchronous updates in effect (which can cause loops)
            const timer = setTimeout(() => {
                const timestamp = Date.now();
                setCpuData([{ timestamp, value: 0 }]);
                setMemoryData([{ timestamp, value: 0 }]);
                setDiskData([{ timestamp, value: 0 }]);
                setNetworkData([{ timestamp, value: 0 }]);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [cpuData.length]);

    const getConnectionStatusInfo = () => {
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
    };

    if (permissionsLoading) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='flex flex-col items-center gap-4'>
                    <Loader2 className='h-8 w-8 animate-spin text-primary' />
                    <p className='text-muted-foreground'>{t('servers.console.loading')}</p>
                </div>
            </div>
        );
    }

    if (!server) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='text-center'>
                    <AlertTriangle className='h-12 w-12 text-destructive mx-auto mb-4' />
                    <h2 className='text-2xl font-bold mb-2'>{t('servers.console.not_found.title')}</h2>
                    <p className='text-muted-foreground'>{t('servers.console.not_found.message')}</p>
                </div>
            </div>
        );
    }

    const connectionInfo = getConnectionStatusInfo();

    return (
        <div className='space-y-6 pb-8'>
            {/* Plugin Widgets: Top Of Page */}
            <WidgetRenderer widgets={getWidgets('server-console', 'top-of-page')} />

            {/* Server Header */}
            <ServerHeader
                serverName={server.name}
                serverStatus={serverStatus}
                serverUuid={server.uuid}
                serverUuidShort={server.uuidShort}
                nodeLocation={server.location?.name || server.node?.name}
                nodeLocationFlag={server.location?.flag_code}
                canStart={hasPermission('control.start')}
                canStop={hasPermission('control.stop')}
                canRestart={hasPermission('control.restart')}
                canKill={hasPermission('control.stop')}
                onStart={() => sendPowerAction('start')}
                onStop={() => sendPowerAction('stop')}
                onRestart={() => sendPowerAction('restart')}
                onKill={() => sendPowerAction('kill')}
            />

            {/* Plugin Widgets: After Header */}
            <WidgetRenderer widgets={getWidgets('server-console', 'after-header')} />

            <div className='grid grid-cols-1 xl:grid-cols-12 gap-6 items-start'>
                {/* Main Column: Terminal & Status Messages */}
                <div className='xl:col-span-9 flex flex-col gap-6'>
                    {/* Wings Connection Status (only show if not connected and has permission) */}
                    {canConnect && connectionStatus !== 'connected' && (
                        <Card className={`border-2 ${connectionInfo.bgColor}`}>
                            <CardContent className='p-4'>
                                <div className='flex items-center gap-4'>
                                    <div
                                        className={`h-12 w-12 rounded-lg flex items-center justify-center ${connectionInfo.bgColor}`}
                                    >
                                        <connectionInfo.icon
                                            className={`h-6 w-6 ${connectionInfo.color} ${connectionInfo.iconClass}`}
                                        />
                                    </div>
                                    <div className='flex-1'>
                                        <p className={`font-semibold ${connectionInfo.color}`}>
                                            {connectionInfo.message}
                                        </p>
                                        <p className='text-sm text-muted-foreground'>
                                            {t('servers.console.connection.info')}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Plugin Widgets: After Wings Status */}
                    <WidgetRenderer widgets={getWidgets('server-console', 'after-wings-status')} />

                    {/* Permission Error */}
                    {!canConnect && (
                        <Card className='border-2 border-yellow-500/20 bg-yellow-500/10'>
                            <CardContent className='p-4'>
                                <div className='flex items-center gap-4'>
                                    <div className='h-12 w-12 rounded-lg flex items-center justify-center bg-yellow-500/10 border-yellow-500/20'>
                                        <AlertTriangle className='h-6 w-6 text-yellow-500' />
                                    </div>
                                    <div className='flex-1'>
                                        <p className='font-semibold text-yellow-500'>
                                            {t('serverConsole.subuserNoAccess')}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Plugin Widgets: Before Terminal */}
                    <WidgetRenderer widgets={getWidgets('server-console', 'before-terminal')} />

                    {/* Terminal Console */}
                    {canConnect && (
                        <ServerTerminal
                            ref={terminalRef}
                            onSendCommand={sendCommand}
                            canSendCommands={connectionStatus === 'connected' && hasPermission('control.console')}
                            serverStatus={serverStatus}
                        />
                    )}

                    {/* Plugin Widgets: After Terminal */}
                    <WidgetRenderer widgets={getWidgets('server-console', 'after-terminal')} />
                </div>

                {/* Sidebar Column: Info Cards */}
                <div className='xl:col-span-3 space-y-6'>
                    {/* Server Info Cards */}
                    {canConnect && (
                        <ServerInfoCards
                            serverIp={server.allocation?.ip || server.allocation?.ip_alias || ''}
                            serverPort={server.allocation?.port || 0}
                            cpuLimit={server.cpu || 0}
                            memoryLimit={server.memory || 0}
                            diskLimit={server.disk || 0}
                            wingsUptime={wingsUptime}
                            ping={ping}
                            cpuUsage={currentCpu}
                            memoryUsage={currentMemory}
                            diskUsage={currentDisk}
                            networkRx={currentNetworkRx}
                            networkTx={currentNetworkTx}
                            className='xl:grid-cols-1'
                        />
                    )}

                    {/* Plugin Widgets: Under Server Info Cards */}
                    <WidgetRenderer widgets={getWidgets('server-console', 'under-server-info-cards')} />
                </div>
            </div>

            {/* Plugin Widgets: Before Performance */}
            <WidgetRenderer widgets={getWidgets('server-console', 'before-performance')} />

            {/* Performance Monitoring */}
            {server && canConnect && (
                <ServerPerformance
                    cpuData={cpuData}
                    memoryData={memoryData}
                    diskData={diskData}
                    networkData={networkData}
                    cpuLimit={server.cpu || 0}
                    memoryLimit={server.memory || 0}
                    diskLimit={server.disk || 0}
                />
            )}

            {/* Plugin Widgets: After Performance */}
            <WidgetRenderer widgets={getWidgets('server-console', 'after-performance')} />

            {/* Plugin Widgets: Bottom Of Page */}
            <WidgetRenderer widgets={getWidgets('server-console', 'bottom-of-page')} />

            {/* Feature Detection Dialogs */}
            {server && (
                <>
                    <EulaDialog
                        isOpen={eulaOpen}
                        onClose={() => setEulaOpen(false)}
                        server={server}
                        onAccepted={() => {
                            // Optionally restart server or just close
                        }}
                    />
                    <JavaVersionDialog
                        isOpen={javaVersionOpen}
                        onClose={() => setJavaVersionOpen(false)}
                        server={server}
                        detectedIssue={
                            detectedData.javaVersion &&
                            (detectedData.javaVersion as { detectedVersion?: string }).detectedVersion
                                ? t('features.javaVersion.detectedVersion', {
                                      version:
                                          (detectedData.javaVersion as { detectedVersion?: string }).detectedVersion ||
                                          '',
                                  })
                                : undefined
                        }
                    />
                    <PidLimitDialog isOpen={pidLimitOpen} onClose={() => setPidLimitOpen(false)} server={server} />
                </>
            )}
        </div>
    );
}
