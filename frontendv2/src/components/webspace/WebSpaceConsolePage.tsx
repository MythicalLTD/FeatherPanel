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

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { AlertTriangle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useWebSpacePermissions } from '@/hooks/useWebSpacePermissions';
import { WebSpaceSubuserPermissions } from '@/lib/webspace-permissions';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { WebSpaceHeader } from '@/components/webspace/WebSpaceHeader';
import {
    WebSpaceInfoCards,
    parseWebSpaceUtilization,
    type WebSpaceUtilization,
} from '@/components/webspace/WebSpaceInfoCards';
import { WebSpaceAccessLinks } from '@/components/webspace/WebSpaceAccessLinks';
import { WebSpaceTerminalPanel } from '@/components/webspace/WebSpaceTerminalPanel';
import { Card, CardContent } from '@/components/ui/card';
import type { QuilldStats } from '@/hooks/useQuilldWebSocket';
import type { WebSpaceAccessUrls } from '@/lib/webspace-urls';
import { displayWebSpaceStatus } from '@/lib/webspace-utils';

interface WebSpaceDetails {
    uuid: string;
    uuidShort?: string;
    name: string;
    description?: string | null;
    domains?: string[];
    ssl?: boolean;
    dns_status?: string | null;
    status?: string;
    state?: string;
    backend_port?: number;
    web_node_name?: string | null;
    webplate_name?: string | null;
    document_root?: string;
    disk_used_bytes?: number;
    disk_limit_bytes?: number;
    web_node_fqdn?: string | null;
    access?: WebSpaceAccessUrls;
}

export default function WebSpaceConsolePage() {
    const params = useParams();
    const uuidShort = String(params.uuidShort || '');
    const { t } = useTranslation();
    const { hasPermission, webspace: ctxSpace, loading: permissionsLoading } = useWebSpacePermissions(uuidShort);
    const { fetchWidgets, getWidgets } = usePluginWidgets('webspace-console');

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [space, setSpace] = useState<WebSpaceDetails | null>(null);
    const [liveState, setLiveState] = useState<string | undefined>();
    const [util, setUtil] = useState<WebSpaceUtilization | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>(
        'disconnected',
    );
    const [transfer, setTransfer] = useState<{
        phase?: string;
        message?: string | null;
        panel_status?: string;
    } | null>(null);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const load = useCallback(async () => {
        try {
            const [showRes, , , utilRes, xferRes] = await Promise.all([
                axios.get(`/api/user/webspaces/${uuidShort}`),
                axios.get(`/api/user/webspaces/${uuidShort}/status`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/ssl`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/utilization`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/transfer/status`).catch(() => null),
            ]);
            if (showRes.data?.data?.webspace) {
                const ws = showRes.data.data.webspace as WebSpaceDetails;
                setSpace(ws);
                setLiveState(ws.state);
            }
            if (utilRes?.data?.data) setUtil(parseWebSpaceUtilization(utilRes.data.data));
            const xfer = xferRes?.data?.data;
            if (xfer) {
                setTransfer({
                    phase: xfer.daemon?.phase,
                    message: xfer.daemon?.message,
                    panel_status: xfer.panel_status,
                });
            }
        } catch (error) {
            console.error(error);
            toast.error(t('webSpaces.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [t, uuidShort]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (!space?.status || !['installing', 'reinstalling'].includes(space.status)) return;
        const id = window.setInterval(() => void load(), 3000);
        return () => window.clearInterval(id);
    }, [space?.status, load]);

    useEffect(() => {
        const id = window.setInterval(() => {
            void axios
                .get(`/api/user/webspaces/${uuidShort}/transfer/status`)
                .then(({ data }) => {
                    const d = data?.data;
                    if (!d) {
                        setTransfer(null);
                        return;
                    }
                    setTransfer({
                        phase: d.daemon?.phase,
                        message: d.daemon?.message,
                        panel_status: d.panel_status,
                    });
                })
                .catch(() => setTransfer(null));
        }, 10000);
        return () => window.clearInterval(id);
    }, [uuidShort]);

    const handleStatsUpdate = useCallback((stats: QuilldStats) => {
        setUtil({
            cpu_percent: stats.cpu_absolute ?? null,
            memory_used_bytes: stats.memory_bytes ?? null,
            memory_limit_bytes: stats.memory_limit_bytes ?? null,
            disk_used_bytes: stats.disk_bytes ?? null,
            disk_limit_bytes: stats.disk_limit_bytes ?? null,
            network_rx_bytes: stats.network?.rx_bytes ?? stats.network_rx_bytes ?? null,
            network_tx_bytes: stats.network?.tx_bytes ?? stats.network_tx_bytes ?? null,
            bandwidth_used_bytes: stats.bandwidth_used_bytes ?? null,
            bandwidth_limit_bytes: stats.bandwidth_limit_bytes ?? null,
            bandwidth_over_quota: stats.bandwidth_over_quota ?? null,
            state: stats.state ?? null,
        });
        if (stats.state && ['running', 'stopped', 'starting', 'stopping', 'offline'].includes(stats.state)) {
            setLiveState(stats.state);
        }
    }, []);

    const power = async (action: 'start' | 'stop' | 'restart') => {
        const perm =
            action === 'start'
                ? WebSpaceSubuserPermissions['control.start']
                : action === 'stop'
                  ? WebSpaceSubuserPermissions['control.stop']
                  : WebSpaceSubuserPermissions['control.restart'];
        if (!hasPermission(perm)) {
            toast.error(t('webSpaces.overview.permissionDenied'));
            return;
        }
        setBusy(action);
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/power`, { action });
            if (data?.data?.webspace) {
                const ws = data.data.webspace as WebSpaceDetails;
                setSpace(ws);
                setLiveState(ws.state);
            }
            toast.success(t('webSpaces.overview.powerOk', { action }));
        } catch (error) {
            let msg = t('webSpaces.overview.powerFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setBusy(null);
        }
    };

    const getConnectionStatusInfo = () => {
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
    };

    if (permissionsLoading || loading) {
        return (
            <div className='flex min-h-[50vh] items-center justify-center'>
                <div className='flex flex-col items-center gap-4'>
                    <Loader2 className='text-primary h-8 w-8 animate-spin' />
                    <p className='text-muted-foreground'>{t('webSpaces.loading')}</p>
                </div>
            </div>
        );
    }

    if (!space) {
        return (
            <div className='flex min-h-[50vh] items-center justify-center'>
                <div className='text-center'>
                    <AlertTriangle className='text-destructive mx-auto mb-4 h-12 w-12' />
                    <h2 className='mb-2 text-2xl font-bold'>{t('webSpaces.console.not_found.title')}</h2>
                    <p className='text-muted-foreground'>{t('webSpaces.console.not_found.message')}</p>
                </div>
            </div>
        );
    }

    const domains = Array.isArray(space.domains) ? space.domains : [];
    const canConsole = hasPermission(WebSpaceSubuserPermissions['websocket.connect']);
    const canSendConsole = hasPermission(WebSpaceSubuserPermissions['control.console']);
    const displayStatus = displayWebSpaceStatus({
        status: space.status,
        state: liveState ?? space.state,
        suspended: ctxSpace?.suspended,
    });
    const mergedUtil: WebSpaceUtilization = {
        ...util,
        disk_used_bytes: util?.disk_used_bytes ?? space.disk_used_bytes ?? ctxSpace?.disk_used_bytes,
        disk_limit_bytes: util?.disk_limit_bytes ?? space.disk_limit_bytes ?? ctxSpace?.disk_limit_bytes,
    };
    const connectionInfo = getConnectionStatusInfo();

    return (
        <div className='space-y-4 pb-8'>
            <WidgetRenderer widgets={getWidgets('webspace-console', 'top-of-page')} />

            <WebSpaceHeader
                name={space.name}
                state={liveState ?? space.state}
                status={space.status}
                uuidShort={space.uuidShort || uuidShort}
                uuid={space.uuid}
                nodeName={space.web_node_name}
                plateName={space.webplate_name}
                dnsStatus={space.dns_status}
                canStart={hasPermission(WebSpaceSubuserPermissions['control.start'])}
                canStop={hasPermission(WebSpaceSubuserPermissions['control.stop'])}
                canRestart={hasPermission(WebSpaceSubuserPermissions['control.restart'])}
                busy={busy}
                connectionLive={connectionStatus === 'connected'}
                onStart={() => power('start')}
                onStop={() => power('stop')}
                onRestart={() => power('restart')}
            />

            <WidgetRenderer widgets={getWidgets('webspace-console', 'after-header')} />

            {(transfer?.phase === 'running' || space.status === 'transferring') && (
                <div className='border-border/50 bg-card/50 rounded-xl border px-4 py-3 text-sm backdrop-blur-xl'>
                    <p className='font-medium'>{t('webSpaces.overview.transferInProgress')}</p>
                    <p className='text-muted-foreground mt-1'>
                        {transfer?.message || t('webSpaces.overview.transferInProgressHelp')}
                    </p>
                </div>
            )}

            {transfer?.phase === 'failed' && (
                <div className='border-destructive/40 bg-destructive/5 rounded-xl border px-4 py-3 text-sm'>
                    <p className='font-medium'>{t('webSpaces.overview.transferFailed')}</p>
                    <p className='text-muted-foreground mt-1'>
                        {transfer.message || t('webSpaces.overview.transferFailedHelp')}
                    </p>
                </div>
            )}

            <div className='grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12 xl:gap-5 2xl:gap-6'>
                <div className='flex h-[min(36rem,calc(100dvh-14rem))] min-h-[22rem] min-w-0 flex-col gap-4 xl:col-span-9'>
                    {canConsole && connectionStatus !== 'connected' && (
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
                                    <div className='flex-1'>
                                        <p className={`font-semibold ${connectionInfo.color}`}>
                                            {connectionInfo.message}
                                        </p>
                                        <p className='text-muted-foreground text-sm'>
                                            {t('webSpaces.console.connection.info')}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!canConsole && (
                        <Card className='border-2 border-yellow-500/20 bg-yellow-500/10'>
                            <CardContent className='p-4'>
                                <div className='flex items-center gap-4'>
                                    <div className='flex h-12 w-12 items-center justify-center rounded-lg border-yellow-500/20 bg-yellow-500/10'>
                                        <AlertTriangle className='h-6 w-6 text-yellow-500' />
                                    </div>
                                    <div className='flex-1'>
                                        <p className='font-semibold text-yellow-500'>
                                            {t('webSpaces.console.wsRequired')}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {canConsole ? (
                        <div className='flex h-full min-h-0 flex-col'>
                            <WebSpaceTerminalPanel
                                jwtEndpoint={`/api/user/webspaces/${uuidShort}/jwt`}
                                enabled={!!uuidShort}
                                runtimeState={liveState ?? space.state ?? 'stopped'}
                                installMode='auto'
                                canSendCommands={canSendConsole}
                                onStats={handleStatsUpdate}
                                onConnectionChange={(status) => {
                                    if (status === 'connected') setConnectionStatus('connected');
                                    else if (status === 'connecting') setConnectionStatus('connecting');
                                    else if (status === 'error') setConnectionStatus('error');
                                    else setConnectionStatus('disconnected');
                                }}
                                onInstallCompleted={() => void load()}
                                onStatus={(status) => {
                                    if (
                                        [
                                            'running',
                                            'stopped',
                                            'starting',
                                            'stopping',
                                            'offline',
                                            'installing',
                                            'reinstalling',
                                            'installed',
                                        ].includes(status)
                                    ) {
                                        if (
                                            ['running', 'stopped', 'starting', 'stopping', 'offline'].includes(status)
                                        ) {
                                            setLiveState(status);
                                        }
                                        if (['installing', 'reinstalling', 'installed'].includes(status)) {
                                            setSpace((prev) => (prev ? { ...prev, status } : prev));
                                        }
                                        if (status === 'installed') void load();
                                    }
                                }}
                                showPopoutButton={false}
                            />
                        </div>
                    ) : null}

                    <WidgetRenderer widgets={getWidgets('webspace-console', 'after-terminal')} />
                </div>

                <div className='min-w-0 space-y-4 xl:col-span-3'>
                    <WebSpaceInfoCards
                        status={space.status}
                        state={displayStatus}
                        webplateName={space.webplate_name}
                        nodeName={space.web_node_name}
                        domains={domains}
                        ssl={space.ssl}
                        util={mergedUtil}
                        className='xl:grid-cols-1'
                    />
                    <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'>
                        <h3 className='text-muted-foreground mb-3 text-sm font-medium'>
                            {t('webSpaces.access.title')}
                        </h3>
                        <WebSpaceAccessLinks
                            domains={domains}
                            ssl={space.ssl}
                            backendPort={space.backend_port}
                            nodeFqdn={space.web_node_fqdn}
                            access={space.access}
                            compact
                        />
                    </div>
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('webspace-console', 'bottom-of-page')} />
        </div>
    );
}
