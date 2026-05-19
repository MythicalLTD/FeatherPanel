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

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { usePathname, useRouter } from 'next/navigation';
import {
    RefreshCw,
    Server as ServerIcon,
    Check,
    AlertTriangle,
    Cpu,
    MemoryStick,
    HardDrive,
    Search,
    ChevronDown,
    LayoutGrid,
    Users,
    Activity,
} from 'lucide-react';
import { toast } from 'sonner';

import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { PoweredByFeatherPanel } from '@/components/branding/PoweredByFeatherPanel';
import { useTranslation } from '@/contexts/TranslationContext';
import { formatMemory, formatDisk } from '@/lib/server-utils';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

interface NodeEntry {
    id: number;
    name: string;
    fqdn?: string;
    status: 'healthy' | 'unhealthy';
    server_count?: number;
    total_players?: number;
    cpu_count?: number | null;
    utilization?: {
        memory_total?: number;
        memory_used?: number;
        disk_total?: number;
        disk_used?: number;
        cpu_percent?: number;
    };
}

interface StatusData {
    enabled: boolean;
    allow_iframe?: boolean;
    show_raw_values?: boolean;
    show_player_count?: boolean;
    data?: {
        global?: {
            total_nodes?: number;
            healthy_nodes?: number;
            unhealthy_nodes?: number;
            total_memory?: number;
            used_memory?: number;
            total_disk?: number;
            used_disk?: number;
            avg_cpu_percent?: number;
        };
        total_servers?: number;
        nodes?: NodeEntry[];
    };
}

function ProgressBar({ value, color }: { value: number; color: string }) {
    return (
        <div className='bg-muted/60 h-1.5 w-full overflow-hidden rounded-full'>
            <div
                className={cn('h-full rounded-full transition-all duration-700 ease-out', color)}
                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
        </div>
    );
}

function NodeExpandedDetail({
    node,
    showRawValues,
    showPlayerCount,
    isAdmin,
    onAdminClick,
}: {
    node: NodeEntry;
    showRawValues?: boolean;
    showPlayerCount?: boolean;
    isAdmin: boolean;
    onAdminClick: () => void;
}) {
    const { t } = useTranslation();

    const cpuPct = Math.round(node.utilization?.cpu_percent || 0);
    const ramPct = node.utilization?.memory_total
        ? Math.round(((node.utilization.memory_used || 0) / node.utilization.memory_total) * 100)
        : 0;
    const diskPct = node.utilization?.disk_total
        ? Math.round(((node.utilization.disk_used || 0) / node.utilization.disk_total) * 100)
        : 0;

    return (
        <div className='border-border/40 bg-muted/20 border-t px-6 py-5'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                {/* CPU */}
                <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase'>
                            <Cpu className='h-3.5 w-3.5' />
                            {t('dashboard.status.cpuUsage')}
                        </span>
                        <span className='text-sm font-bold'>{cpuPct}%</span>
                    </div>
                    <ProgressBar value={cpuPct} color='bg-primary' />
                    {showRawValues && node.cpu_count != null && (
                        <p className='text-muted-foreground text-xs'>
                            {node.cpu_count}{' '}
                            {node.cpu_count === 1 ? t('dashboard.status.core') : t('dashboard.status.cores')}
                        </p>
                    )}
                </div>

                {/* RAM */}
                <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase'>
                            <MemoryStick className='h-3.5 w-3.5' />
                            {t('dashboard.status.memory')}
                        </span>
                        <span className='text-sm font-bold'>{ramPct}%</span>
                    </div>
                    <ProgressBar value={ramPct} color='bg-blue-500' />
                    {showRawValues && node.utilization?.memory_total && (
                        <p className='text-muted-foreground text-xs'>
                            {formatMemory(node.utilization.memory_used || 0)} /{' '}
                            {formatMemory(node.utilization.memory_total)}
                        </p>
                    )}
                </div>

                {/* Disk */}
                <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase'>
                            <HardDrive className='h-3.5 w-3.5' />
                            {t('dashboard.status.disk')}
                        </span>
                        <span className='text-sm font-bold'>{diskPct}%</span>
                    </div>
                    <ProgressBar value={diskPct} color='bg-green-500' />
                    {showRawValues && node.utilization?.disk_total && (
                        <p className='text-muted-foreground text-xs'>
                            {formatDisk(node.utilization.disk_used || 0)} / {formatDisk(node.utilization.disk_total)}
                        </p>
                    )}
                </div>
            </div>

            {/* Footer row */}
            <div className='mt-4 flex flex-wrap items-center justify-between gap-3'>
                <div className='flex flex-wrap items-center gap-4'>
                    {node.fqdn && (
                        <span className='text-muted-foreground font-mono text-xs opacity-60'>{node.fqdn}</span>
                    )}
                    {showPlayerCount && node.total_players !== undefined && (
                        <span className='text-muted-foreground flex items-center gap-1 text-xs'>
                            <Users className='h-3.5 w-3.5' />
                            <span className='text-foreground font-semibold'>{node.total_players}</span>{' '}
                            {t('dashboard.status.playersOnline')}
                        </span>
                    )}
                </div>
                {isAdmin && (
                    <Button size='sm' variant='outline' onClick={onAdminClick} className='h-7 gap-1.5 text-xs'>
                        <Activity className='h-3.5 w-3.5' />
                        {t('dashboard.status.viewInAdmin')}
                    </Button>
                )}
            </div>
        </div>
    );
}

export default function StatusPage() {
    const { t } = useTranslation();
    const pathname = usePathname();
    const router = useRouter();
    const isPublicStatusPage = pathname.startsWith('/status');
    const isAdminContext = !isPublicStatusPage;
    const statusApiPath = pathname.startsWith('/status') ? '/api/status' : '/api/user/status';

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusData, setStatusData] = useState<StatusData | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedNodeId, setExpandedNodeId] = useState<number | null>(null);

    const { getWidgets, fetchWidgets } = usePluginWidgets('dashboard-status');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const fetchNodes = useCallback(
        async (isAuto = false) => {
            if (!isAuto) setLoading(true);
            else setRefreshing(true);
            setError(null);
            try {
                const { data } = await axios.get(statusApiPath);
                if (data && data.success) {
                    setStatusData(data.data);
                } else {
                    setError(data?.message || t('dashboard.status.failedToFetchStatus'));
                }
            } catch (err: unknown) {
                let errorMessage = t('dashboard.status.failedToFetchStatus');
                if (axios.isAxiosError(err)) {
                    errorMessage = err.response?.data?.message || errorMessage;
                }
                setError(errorMessage);
                if (errorMessage !== 'Status page is disabled') {
                    toast.error(errorMessage);
                }
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [statusApiPath, t],
    );

    const manualRefresh = async () => {
        await fetchNodes();
        toast.success(t('dashboard.status.statusRefreshed'));
    };

    useEffect(() => {
        fetchNodes();
        const interval = setInterval(() => fetchNodes(true), 30000);
        return () => clearInterval(interval);
    }, [fetchNodes]);

    const filteredNodes =
        statusData?.data?.nodes?.filter(
            (node) =>
                node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                node.fqdn?.toLowerCase().includes(searchQuery.toLowerCase()),
        ) ?? [];

    const toggleNode = (id: number) => setExpandedNodeId((prev) => (prev === id ? null : id));

    //  Loading
    if (loading && !statusData) {
        return (
            <div className='flex h-[50vh] items-center justify-center'>
                <div className='text-muted-foreground flex items-center gap-3'>
                    <div className='border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent' />
                    <span>{t('dashboard.status.loading')}</span>
                </div>
            </div>
        );
    }

    //  Disabled
    if (statusData && !statusData.enabled) {
        return (
            <div className='mx-auto max-w-4xl p-4 md:p-8'>
                <Alert>
                    <AlertTriangle className='h-4 w-4' />
                    <AlertTitle>{t('dashboard.status.statusPageDisabled')}</AlertTitle>
                    <AlertDescription>{t('dashboard.status.statusPageDisabledDescription')}</AlertDescription>
                </Alert>
            </div>
        );
    }

    //  Error
    if (error && !statusData) {
        return (
            <div className='mx-auto max-w-4xl space-y-4 p-4 md:p-8'>
                <Alert variant='destructive'>
                    <AlertTriangle className='h-4 w-4' />
                    <AlertTitle>{t('dashboard.status.failedToLoadStatus')}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button onClick={() => fetchNodes()}>{t('dashboard.status.tryAgain')}</Button>
            </div>
        );
    }

    const global = statusData?.data?.global;

    return (
        <div
            className={cn(
                'space-y-6',
                isPublicStatusPage && 'mx-auto w-full max-w-7xl px-4 pt-8 pb-12 md:px-8 md:pt-10',
            )}
        >
            <WidgetRenderer widgets={getWidgets('dashboard-status', 'top-of-page')} />

            {/*  Header  */}
            <div
                className={cn(
                    'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
                    isPublicStatusPage &&
                        'border-border/60 from-card via-card/90 to-primary/5 rounded-2xl border bg-linear-to-b p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.65)] md:p-7',
                )}
            >
                <div>
                    <div className='mb-2 flex flex-wrap items-center gap-2'>
                        {isPublicStatusPage && (
                            <Badge className='bg-primary/15 text-primary border-primary/20 border text-[10px] font-bold tracking-wide uppercase'>
                                {t('public_portal.badges.public')}
                            </Badge>
                        )}
                        <Badge className='border border-green-500/20 bg-green-500/15 text-[10px] font-bold tracking-wide text-green-500 uppercase'>
                            {t('public_portal.badges.live')}
                        </Badge>
                    </div>
                    <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>{t('dashboard.status.title')}</h1>
                    <p className='text-muted-foreground mt-1 text-sm'>{t('dashboard.status.description')}</p>
                </div>
                <Button
                    onClick={manualRefresh}
                    disabled={refreshing}
                    className='bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto'
                >
                    <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
                    {refreshing ? t('dashboard.status.refreshing') : t('dashboard.status.refresh')}
                </Button>
            </div>

            <WidgetRenderer widgets={getWidgets('dashboard-status', 'after-header')} />

            {/*  Global stat cards  */}
            {global && (
                <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                    {/* Total nodes */}
                    <div className='bg-card/50 border-border/50 flex items-center justify-between rounded-xl border p-4 backdrop-blur-xl'>
                        <div className='space-y-0.5'>
                            <p className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
                                {t('dashboard.status.totalNodes')}
                            </p>
                            <p className='text-2xl font-bold md:text-3xl'>{global.total_nodes}</p>
                        </div>
                        <div className='bg-primary/5 border-primary/10 rounded-xl border p-2.5'>
                            <LayoutGrid className='text-primary h-5 w-5 opacity-60' />
                        </div>
                    </div>

                    {/* Healthy nodes */}
                    <div className='bg-card/50 border-border/50 flex items-center justify-between rounded-xl border p-4 backdrop-blur-xl'>
                        <div className='space-y-0.5'>
                            <p className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
                                {t('dashboard.status.healthyNodes')}
                            </p>
                            <p className='text-2xl font-bold text-green-500 md:text-3xl'>{global.healthy_nodes}</p>
                        </div>
                        <div className='rounded-xl border border-green-500/10 bg-green-500/5 p-2.5'>
                            <Check className='h-5 w-5 text-green-500 opacity-60' />
                        </div>
                    </div>

                    {/* Total servers */}
                    <div className='bg-card/50 border-border/50 flex items-center justify-between rounded-xl border p-4 backdrop-blur-xl'>
                        <div className='space-y-0.5'>
                            <p className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
                                {t('dashboard.status.totalServers')}
                            </p>
                            <p className='text-primary text-2xl font-bold md:text-3xl'>
                                {statusData?.data?.total_servers}
                            </p>
                        </div>
                        <div className='bg-primary/5 border-primary/10 rounded-xl border p-2.5'>
                            <ServerIcon className='text-primary h-5 w-5 opacity-60' />
                        </div>
                    </div>

                    {/* Avg CPU */}
                    <div className='bg-card/50 border-border/50 flex items-center justify-between rounded-xl border p-4 backdrop-blur-xl'>
                        <div className='space-y-0.5'>
                            <p className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
                                {t('dashboard.status.avgCpuUsage')}
                            </p>
                            <p className='text-2xl font-bold md:text-3xl'>{Math.round(global.avg_cpu_percent || 0)}%</p>
                        </div>
                        <div className='rounded-xl border border-blue-500/10 bg-blue-500/5 p-2.5'>
                            <Cpu className='h-5 w-5 text-blue-500 opacity-60' />
                        </div>
                    </div>
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('dashboard-status', 'after-global-stats')} />

            {/*  Individual nodes  */}
            {filteredNodes.length > 0 || statusData?.data?.nodes !== undefined ? (
                <div className='space-y-3'>
                    <div className='flex items-center justify-between pt-2'>
                        <h2 className='text-lg font-bold tracking-tight md:text-xl'>
                            {t('dashboard.status.individualNodes')}
                        </h2>
                    </div>

                    {/* Search */}
                    <div className='relative'>
                        <Input
                            placeholder={t('dashboard.status.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className='bg-background/50 border-border/50 focus:border-primary/50 h-10 w-full pr-10'
                        />
                        <Search className='text-muted-foreground absolute top-3 right-3 h-4 w-4 opacity-40' />
                    </div>

                    <WidgetRenderer widgets={getWidgets('dashboard-status', 'before-node-list')} />

                    {/* Node list */}
                    <div className='bg-card/50 border-border/50 overflow-hidden rounded-xl border backdrop-blur-xl'>
                        {filteredNodes.length > 0 ? (
                            <div className='divide-border/40 divide-y'>
                                {filteredNodes.map((node) => {
                                    const isExpanded = expandedNodeId === node.id;
                                    const cpuPct = Math.round(node.utilization?.cpu_percent || 0);
                                    const ramPct = node.utilization?.memory_total
                                        ? Math.round(
                                              ((node.utilization.memory_used || 0) / node.utilization.memory_total) *
                                                  100,
                                          )
                                        : 0;
                                    const diskPct = node.utilization?.disk_total
                                        ? Math.round(
                                              ((node.utilization.disk_used || 0) / node.utilization.disk_total) * 100,
                                          )
                                        : 0;

                                    return (
                                        <div key={node.id}>
                                            {/*  Row  */}
                                            <button
                                                type='button'
                                                onClick={() => toggleNode(node.id)}
                                                className={cn(
                                                    'group w-full cursor-pointer border-l-2 border-l-transparent text-left transition-all duration-150',
                                                    'hover:border-l-primary bg-white/2',
                                                    isExpanded && 'border-l-primary bg-white/2',
                                                )}
                                            >
                                                <div className='flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4 md:p-5'>
                                                    {/* Left: icon + name */}
                                                    <div className='flex min-w-0 flex-1 items-center gap-3'>
                                                        <div
                                                            className={cn(
                                                                'border-border/30 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                                                                node.status === 'healthy'
                                                                    ? 'bg-green-500/8 text-green-500'
                                                                    : 'bg-red-500/8 text-red-500',
                                                            )}
                                                        >
                                                            <ServerIcon className='h-5 w-5' />
                                                        </div>
                                                        <div className='min-w-0 flex-1'>
                                                            <div className='flex flex-wrap items-center gap-2'>
                                                                <span className='text-foreground group-hover:text-primary truncate font-bold transition-colors'>
                                                                    {node.name}
                                                                </span>
                                                                <Badge
                                                                    className={cn(
                                                                        'shrink-0 rounded border-0 px-1.5 py-0 text-[10px] font-black tracking-tighter uppercase',
                                                                        node.status === 'healthy'
                                                                            ? 'bg-green-500/10 text-green-500'
                                                                            : 'bg-red-500/10 text-red-500',
                                                                    )}
                                                                >
                                                                    {node.status === 'healthy'
                                                                        ? t('dashboard.status.online')
                                                                        : t('dashboard.status.offline')}
                                                                </Badge>
                                                            </div>
                                                            <div className='text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs'>
                                                                <span className='max-w-50 truncate font-mono opacity-60'>
                                                                    {node.fqdn || t('public_portal.not_available')}
                                                                </span>
                                                                <span className='bg-muted-foreground/30 h-1 w-1 shrink-0 rounded-full' />
                                                                <span className='shrink-0'>
                                                                    {t('public_portal.servers_count', {
                                                                        count: String(node.server_count ?? 0),
                                                                    })}
                                                                </span>
                                                                {statusData?.show_player_count &&
                                                                    node.total_players !== undefined && (
                                                                        <>
                                                                            <span className='bg-muted-foreground/30 h-1 w-1 shrink-0 rounded-full' />
                                                                            <span className='flex shrink-0 items-center gap-1'>
                                                                                <Users className='h-3 w-3' />
                                                                                {node.total_players}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right: mini metrics + chevron */}
                                                    {node.status === 'healthy' && node.utilization ? (
                                                        <div className='flex items-center gap-4 md:gap-6'>
                                                            {/* CPU pill */}
                                                            <div className='flex min-w-14 flex-col items-end gap-1'>
                                                                <span className='text-muted-foreground text-[9px] font-black tracking-widest uppercase opacity-60'>
                                                                    {t('dashboard.status.cpuShort')}
                                                                </span>
                                                                <div className='flex items-center gap-1.5'>
                                                                    <div className='bg-muted/50 hidden h-1 w-16 overflow-hidden rounded-full sm:block'>
                                                                        <div
                                                                            className='bg-primary h-full rounded-full'
                                                                            style={{ width: `${cpuPct}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className='text-xs font-bold'>{cpuPct}%</span>
                                                                </div>
                                                            </div>
                                                            {/* RAM pill */}
                                                            <div className='flex min-w-14 flex-col items-end gap-1'>
                                                                <span className='text-muted-foreground text-[9px] font-black tracking-widest uppercase opacity-60'>
                                                                    {t('dashboard.status.ramShort')}
                                                                </span>
                                                                <div className='flex items-center gap-1.5'>
                                                                    <div className='bg-muted/50 hidden h-1 w-16 overflow-hidden rounded-full sm:block'>
                                                                        <div
                                                                            className='h-full rounded-full bg-blue-500'
                                                                            style={{ width: `${ramPct}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className='text-xs font-bold'>{ramPct}%</span>
                                                                </div>
                                                            </div>
                                                            {/* Disk pill */}
                                                            <div className='flex min-w-14 flex-col items-end gap-1'>
                                                                <span className='text-muted-foreground text-[9px] font-black tracking-widest uppercase opacity-60'>
                                                                    {t('dashboard.status.diskShort')}
                                                                </span>
                                                                <div className='flex items-center gap-1.5'>
                                                                    <div className='bg-muted/50 hidden h-1 w-16 overflow-hidden rounded-full sm:block'>
                                                                        <div
                                                                            className='h-full rounded-full bg-green-500'
                                                                            style={{ width: `${diskPct}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className='text-xs font-bold'>
                                                                        {diskPct}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {/* Chevron */}
                                                            <ChevronDown
                                                                className={cn(
                                                                    'text-muted-foreground/40 group-hover:text-primary h-4 w-4 shrink-0 transition-all duration-200',
                                                                    isExpanded && 'text-primary rotate-180',
                                                                )}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className='flex items-center gap-2 text-xs font-black tracking-widest text-red-500 uppercase'>
                                                            <AlertTriangle className='h-4 w-4' />
                                                            {t('dashboard.status.offline')}
                                                        </div>
                                                    )}
                                                </div>
                                            </button>

                                            {/*  Expanded detail panel  */}
                                            {isExpanded && node.status === 'healthy' && node.utilization && (
                                                <NodeExpandedDetail
                                                    node={node}
                                                    showRawValues={statusData?.show_raw_values}
                                                    showPlayerCount={statusData?.show_player_count}
                                                    isAdmin={isAdminContext}
                                                    onAdminClick={() => router.push(`/admin/nodes/${node.id}/edit`)}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className='py-20 text-center'>
                                <div className='bg-primary/5 text-primary border-primary/10 mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full border'>
                                    <ServerIcon className='h-8 w-8 opacity-60' />
                                </div>
                                <h3 className='mb-1 text-lg font-bold'>{t('dashboard.status.noNodesFound')}</h3>
                                <p className='text-muted-foreground mx-auto max-w-xs text-sm opacity-70'>
                                    {t('dashboard.status.failedToLoadStatus')}
                                </p>
                            </div>
                        )}
                    </div>

                    <WidgetRenderer widgets={getWidgets('dashboard-status', 'after-node-list')} />
                </div>
            ) : null}

            {/*  Global memory / disk bars  */}
            {global && (
                <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                    <div className='bg-card/50 border-border/50 rounded-xl border p-5 backdrop-blur-xl'>
                        <div className='mb-3 flex items-center justify-between'>
                            <span className='text-muted-foreground flex items-center gap-2 text-[10px] font-black tracking-widest uppercase'>
                                <MemoryStick className='h-4 w-4 text-blue-500 opacity-60' />
                                {t('dashboard.status.globalMemoryUsage')}
                            </span>
                            <span className='text-muted-foreground text-xs font-bold'>
                                {formatMemory(global.used_memory || 0)} / {formatMemory(global.total_memory || 0)}
                            </span>
                        </div>
                        <div className='bg-muted/50 h-2 w-full overflow-hidden rounded-full border border-white/5'>
                            <div
                                className='h-full bg-blue-500 transition-all duration-1000 ease-out'
                                style={{
                                    width: `${global.total_memory ? ((global.used_memory || 0) / global.total_memory) * 100 : 0}%`,
                                }}
                            />
                        </div>
                    </div>
                    <div className='bg-card/50 border-border/50 rounded-xl border p-5 backdrop-blur-xl'>
                        <div className='mb-3 flex items-center justify-between'>
                            <span className='text-muted-foreground flex items-center gap-2 text-[10px] font-black tracking-widest uppercase'>
                                <HardDrive className='h-4 w-4 text-green-500 opacity-60' />
                                {t('dashboard.status.globalDiskUsage')}
                            </span>
                            <span className='text-muted-foreground text-xs font-bold'>
                                {formatDisk(global.used_disk || 0)} / {formatDisk(global.total_disk || 0)}
                            </span>
                        </div>
                        <div className='bg-muted/50 h-2 w-full overflow-hidden rounded-full border border-white/5'>
                            <div
                                className='h-full bg-green-500 transition-all duration-1000 ease-out'
                                style={{
                                    width: `${global.total_disk ? ((global.used_disk || 0) / global.total_disk) * 100 : 0}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('dashboard-status', 'bottom-of-page')} />

            <div className='flex justify-center pt-2'>
                <PoweredByFeatherPanel variant={isPublicStatusPage ? 'footer' : 'inline'} />
            </div>
        </div>
    );
}
