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
import { useParams, useSearchParams } from 'next/navigation';
import { useWingsWebSocket } from '@/hooks/useWingsWebSocket';
import ServerHeader from '@/components/server/ServerHeader';
import ServerInfoCards from '@/components/server/ServerInfoCards';
import ServerTerminal, { ServerTerminalRef, ConsoleFilterRule } from '@/components/server/ServerTerminal';
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
    const searchParams = useSearchParams();
    const serverUuid = params.uuidShort as string;
    const terminalRef = useRef<ServerTerminalRef>(null);
    const pendingActionResolveRef = useRef<(() => void) | null>(null);

    const prevNetworkRef = useRef({ rx: 0, tx: 0, timestamp: 0 });

    const hasInitializedStatus = useRef(false);

    const { hasPermission, loading: permissionsLoading, server } = useServerPermissions(serverUuid);
    const [serverStatus, setServerStatus] = useState('offline');
    const [wingsUptime, setWingsUptime] = useState<string>('');

    useEffect(() => {
        if (server?.status && !hasInitializedStatus.current) {
            const timer = setTimeout(() => {
                setServerStatus(server.status);
                hasInitializedStatus.current = true;
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [server?.status]);

    const [cpuData, setCpuData] = useState<Array<{ timestamp: number; value: number }>>([]);
    const [memoryData, setMemoryData] = useState<Array<{ timestamp: number; value: number }>>([]);
    const [diskData, setDiskData] = useState<Array<{ timestamp: number; value: number }>>([]);
    const [networkData, setNetworkData] = useState<Array<{ timestamp: number; value: number }>>([]);
    const maxDataPoints = 60;

    const [currentCpu, setCurrentCpu] = useState(0);
    const [currentMemory, setCurrentMemory] = useState(0);
    const [currentDisk, setCurrentDisk] = useState(0);
    const [currentNetworkRx, setCurrentNetworkRx] = useState(0);
    const [currentNetworkTx, setCurrentNetworkTx] = useState(0);

    const [consoleFilters, setConsoleFilters] = useState<ConsoleFilterRule[]>([]);

    const isPopout = searchParams?.get('consolePopout') === '1';

    useEffect(() => {
        if (!serverUuid) return;
        try {
            const stored = localStorage.getItem(`featherpanel_console_filters_${serverUuid}`);
            if (stored) {
                const parsed = JSON.parse(stored) as ConsoleFilterRule[];

                setTimeout(() => {
                    setConsoleFilters(parsed);
                }, 0);
            }
        } catch { }
    }, [serverUuid]);

    useEffect(() => {
        if (!serverUuid) return;
        try {
            localStorage.setItem(`featherpanel_console_filters_${serverUuid}`, JSON.stringify(consoleFilters));
        } catch { }
    }, [serverUuid, consoleFilters]);

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

    const canConnect = hasPermission('websocket.connect');

    const { fetchWidgets, getWidgets } = usePluginWidgets('server-console');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const handleConsoleOutput = useCallback(
        (output: string) => {
            const applyFilters = (text: string): string => {
                if (!consoleFilters.length) return text;

                const colorToAnsi: Record<NonNullable<ConsoleFilterRule['color']>, string> = {
                    red: '\u001b[31m',
                    green: '\u001b[32m',
                    yellow: '\u001b[33m',
                    blue: '\u001b[34m',
                    magenta: '\u001b[35m',
                    cyan: '\u001b[36m',
                    gray: '\u001b[90m',
                };

                const resetAnsi = '\u001b[0m';

                return text
                    .split('\n')
                    .map((line) => {
                        let currentLine: string | null = line;

                        for (const rule of consoleFilters) {
                            if (!rule.enabled || !rule.pattern || currentLine === null) continue;

                            let regex: RegExp | null = null;
                            try {
                                regex = new RegExp(rule.pattern, rule.flags || 'g');
                            } catch {
                                continue;
                            }

                            if (rule.type === 'hide') {
                                if (regex.test(currentLine)) {
                                    currentLine = null;
                                    break;
                                }
                            } else if (rule.type === 'replace') {
                                currentLine = currentLine.replace(
                                    regex,
                                    rule.replacement !== undefined ? rule.replacement : '',
                                );
                            } else if (rule.type === 'color') {
                                const color = rule.color || 'yellow';
                                const ansiColor = colorToAnsi[color];
                                currentLine = currentLine.replace(regex, (match) => {
                                    return `${ansiColor}${match}${resetAnsi}`;
                                });
                            }
                        }

                        return currentLine;
                    })
                    .filter((line) => line !== null)
                    .join('\n');
            };

            const filtered = applyFilters(output);
            if (!filtered) {
                return;
            }

            processLog(filtered);
            if (terminalRef.current) {
                terminalRef.current.writeln(filtered);
            }
        },
        [processLog, consoleFilters],
    );

    const handleStatusUpdate = useCallback((status: string) => {
        setServerStatus(status);
        if (pendingActionResolveRef.current) {
            pendingActionResolveRef.current();
            pendingActionResolveRef.current = null;
        }
    }, []);

    const handleStatsUpdate = useCallback((stats: WingsStats) => {
        const timestamp = new Date().getTime();

        if (stats.uptime) {
            setWingsUptime(formatUptime(stats.uptime));
        }

        if (stats.cpu_absolute !== undefined && stats.cpu_absolute !== null) {
            const cpuValue = Number(stats.cpu_absolute) || 0;
            setCurrentCpu(cpuValue);
            setCpuData((prev) => {
                const newData = [...prev, { timestamp, value: cpuValue }];
                return newData.slice(-maxDataPoints);
            });
        }

        if (stats.memory_bytes !== undefined && stats.memory_bytes !== null) {
            const memoryMiB = Number(stats.memory_bytes) / (1024 * 1024);
            setCurrentMemory(memoryMiB);
            setMemoryData((prev) => {
                const newData = [...prev, { timestamp, value: memoryMiB }];
                return newData.slice(-maxDataPoints);
            });
        }

        if (stats.disk_bytes !== undefined && stats.disk_bytes !== null) {
            const diskMiB = Number(stats.disk_bytes) / (1024 * 1024);
            setCurrentDisk(diskMiB);
            setDiskData((prev) => {
                const newData = [...prev, { timestamp, value: diskMiB }];
                return newData.slice(-maxDataPoints);
            });
        }

        if (stats.network && stats.network.rx_bytes !== undefined && stats.network.tx_bytes !== undefined) {
            const currentRxBytes = Number(stats.network.rx_bytes);
            const currentTxBytes = Number(stats.network.tx_bytes);
            const now = new Date().getTime();

            if (prevNetworkRef.current.timestamp > 0) {
                const timeDiff = (now - prevNetworkRef.current.timestamp) / 1000;
                if (timeDiff > 0) {
                    const rxRate = Math.max(0, currentRxBytes - prevNetworkRef.current.rx) / timeDiff;
                    const txRate = Math.max(0, currentTxBytes - prevNetworkRef.current.tx) / timeDiff;

                    setCurrentNetworkRx(rxRate);
                    setCurrentNetworkTx(txRate);

                    const totalRate = rxRate + txRate;
                    setNetworkData((prev) => {
                        const newData = [...prev, { timestamp, value: totalRate }];
                        return newData.slice(-maxDataPoints);
                    });
                }
            }

            prevNetworkRef.current = {
                rx: currentRxBytes,
                tx: currentTxBytes,
                timestamp: now,
            };
        }
    }, []);

    const { connectionStatus, ping, sendCommand, sendPowerAction, requestStats, requestLogs } = useWingsWebSocket({
        serverUuid,
        connect: canConnect,
        onConsoleOutput: handleConsoleOutput,
        onStatus: handleStatusUpdate,
        onStats: handleStatsUpdate,
    });

    useEffect(() => {
        if (connectionStatus !== 'connected' || !requestStats) return;

        requestStats();

        requestLogs();

        const interval = setInterval(() => {
            requestStats();
        }, 5000);

        return () => clearInterval(interval);
    }, [connectionStatus, requestStats, requestLogs]);

    useEffect(() => {
        if (cpuData.length === 0) {
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

    const handlePowerAction = useCallback(
        async (action: 'start' | 'stop' | 'restart' | 'kill') => {
            return new Promise<void>((resolve) => {
                if (pendingActionResolveRef.current) {
                    pendingActionResolveRef.current();
                }
                pendingActionResolveRef.current = resolve;
                sendPowerAction(action);

                setTimeout(() => {
                    if (pendingActionResolveRef.current === resolve) {
                        pendingActionResolveRef.current();
                        pendingActionResolveRef.current = null;
                    }
                }, 2000);
            });
        },
        [sendPowerAction],
    );

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

    if (isPopout) {
        return (
            <div className='min-h-screen bg-background p-4'>
                <div className='max-w-6xl mx-auto h-full flex flex-col'>
                    {canConnect ? (
                        <ServerTerminal
                            ref={terminalRef}
                            onSendCommand={sendCommand}
                            canSendCommands={connectionStatus === 'connected' && hasPermission('control.console')}
                            serverStatus={serverStatus}
                            filters={consoleFilters}
                            onFiltersChange={setConsoleFilters}
                            fullHeight
                            showPopoutButton={false}
                        />
                    ) : (
                        <Card className='border-2 border-yellow-500/20 bg-yellow-500/10 self-center mt-24 max-w-lg w-full'>
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
                </div>
            </div>
        );
    }

    return (
        <div className='space-y-6 pb-8'>
            <WidgetRenderer widgets={getWidgets('server-console', 'top-of-page')} />

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
                onStart={() => handlePowerAction('start')}
                onStop={() => handlePowerAction('stop')}
                onRestart={() => handlePowerAction('restart')}
                onKill={() => handlePowerAction('kill')}
            />

            <WidgetRenderer widgets={getWidgets('server-console', 'after-header')} />

            <div className='grid grid-cols-1 xl:grid-cols-12 gap-6 items-start'>
                <div className='xl:col-span-9 flex flex-col gap-6'>
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

                    <WidgetRenderer widgets={getWidgets('server-console', 'after-wings-status')} />

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

                    <WidgetRenderer widgets={getWidgets('server-console', 'before-terminal')} />

                    {canConnect && (
                        <ServerTerminal
                            ref={terminalRef}
                            onSendCommand={sendCommand}
                            canSendCommands={connectionStatus === 'connected' && hasPermission('control.console')}
                            serverStatus={serverStatus}
                            filters={consoleFilters}
                            onFiltersChange={setConsoleFilters}
                        />
                    )}

                    <WidgetRenderer widgets={getWidgets('server-console', 'after-terminal')} />
                </div>

                <div className='xl:col-span-3 space-y-6'>
                    {canConnect && (
                        <ServerInfoCards
                            serverIp={
                                server.subdomain && server.subdomain.domain && server.subdomain.subdomain
                                    ? `${server.subdomain.subdomain}.${server.subdomain.domain}`
                                    : server.allocation?.ip_alias || server.allocation?.ip || ''
                            }
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

                    <WidgetRenderer widgets={getWidgets('server-console', 'under-server-info-cards')} />
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('server-console', 'before-performance')} />

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

            <WidgetRenderer widgets={getWidgets('server-console', 'after-performance')} />

            <WidgetRenderer widgets={getWidgets('server-console', 'bottom-of-page')} />

            {server && (
                <>
                    <EulaDialog
                        isOpen={eulaOpen}
                        onClose={() => setEulaOpen(false)}
                        server={server}
                        onAccepted={() => { }}
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
