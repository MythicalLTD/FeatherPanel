/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
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
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import {
    Info,
    RefreshCw,
    Server,
    CheckCircle2,
    XCircle,
    Cpu,
    HardDrive,
    MemoryStick,
    Loader2,
    Tag,
    GitCommit,
    Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProxmoxVersion {
    release: string;
    repoid: string;
    version: string;
    console?: 'applet' | 'vv' | 'html5' | 'xtermjs';
}

interface ProxmoxNode {
    node: string;
    status: 'online' | 'offline' | string;
    type: string;
    id: string;
    maxcpu?: number;
    maxmem?: number;
    maxdisk?: number;
    mem?: number;
    disk?: number;
    cpu?: number;
    uptime?: number;
    level?: string;
}

interface InfoData {
    version: ProxmoxVersion | null;
    version_ok: boolean;
    version_error: string | null;
    nodes: ProxmoxNode[];
    nodes_ok: boolean;
    nodes_error: string | null;
}

interface InfoTabProps {
    nodeId: string | number;
    nodeName: string;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    return parts.length > 0 ? parts.join(' ') : '<1m';
}

export function InfoTab({ nodeId, nodeName }: InfoTabProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [info, setInfo] = useState<InfoData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    const fetchInfo = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get(`/api/admin/vm-nodes/${nodeId}/info`);
            setInfo(data.data as InfoData);
            setLastFetched(new Date());
        } catch (err) {
            setError(axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err));
        } finally {
            setLoading(false);
        }
    }, [nodeId]);

    useEffect(() => {
        fetchInfo();
    }, [fetchInfo]);

    return (
        <div className='space-y-8'>
            {/* Version card */}
            <PageCard
                title={t('admin.vdsNodes.info.version_title')}
                icon={Info}
                description={t('admin.vdsNodes.info.version_description', { name: nodeName })}
                action={
                    <Button variant='outline' size='sm' onClick={fetchInfo} loading={loading}>
                        <RefreshCw className='h-4 w-4 mr-2' />
                        {t('common.refresh')}
                    </Button>
                }
            >
                {loading && !info ? (
                    <div className='flex items-center justify-center py-10'>
                        <Loader2 className='h-6 w-6 animate-spin text-primary' />
                    </div>
                ) : error ? (
                    <div className='flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-4'>
                        <XCircle className='h-5 w-5 text-red-500 shrink-0' />
                        <p className='text-sm text-red-600 font-medium'>{error}</p>
                    </div>
                ) : info && !info.version_ok ? (
                    <div className='flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-4'>
                        <XCircle className='h-5 w-5 text-red-500 shrink-0' />
                        <p className='text-sm text-red-600 font-medium'>
                            {info.version_error ?? t('admin.vdsNodes.info.version_fetch_failed')}
                        </p>
                    </div>
                ) : info?.version ? (
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
                        <div className='flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-muted/20'>
                            <Tag className='h-5 w-5 text-primary mt-0.5 shrink-0' />
                            <div>
                                <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                                    {t('admin.vdsNodes.info.pve_version')}
                                </p>
                                <p className='font-mono font-semibold text-sm mt-0.5'>{info.version.version}</p>
                            </div>
                        </div>
                        <div className='flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-muted/20'>
                            <Info className='h-5 w-5 text-primary mt-0.5 shrink-0' />
                            <div>
                                <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                                    {t('admin.vdsNodes.info.pve_release')}
                                </p>
                                <p className='font-mono font-semibold text-sm mt-0.5'>{info.version.release}</p>
                            </div>
                        </div>
                        <div className='flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-muted/20'>
                            <GitCommit className='h-5 w-5 text-primary mt-0.5 shrink-0' />
                            <div>
                                <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                                    {t('admin.vdsNodes.info.pve_repoid')}
                                </p>
                                <p className='font-mono font-semibold text-sm mt-0.5 truncate max-w-[120px]' title={info.version.repoid}>
                                    {info.version.repoid}
                                </p>
                            </div>
                        </div>
                        <div className='flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-muted/20'>
                            <Monitor className='h-5 w-5 text-primary mt-0.5 shrink-0' />
                            <div>
                                <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                                    {t('admin.vdsNodes.info.pve_console')}
                                </p>
                                <p className='font-mono font-semibold text-sm mt-0.5'>
                                    {info.version.console ?? t('admin.vdsNodes.info.pve_console_default')}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {lastFetched && (
                    <p className='text-[10px] text-muted-foreground mt-3 italic'>
                        {t('admin.vdsNodes.info.last_fetched', {
                            time: lastFetched.toLocaleTimeString(),
                        })}
                    </p>
                )}
            </PageCard>

            {/* Cluster nodes card */}
            <PageCard
                title={t('admin.vdsNodes.info.nodes_title')}
                icon={Server}
                description={t('admin.vdsNodes.info.nodes_description')}
            >
                {loading && !info ? (
                    <div className='flex items-center justify-center py-10'>
                        <Loader2 className='h-6 w-6 animate-spin text-primary' />
                    </div>
                ) : info && !info.nodes_ok ? (
                    <div className='flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-4'>
                        <XCircle className='h-5 w-5 text-red-500 shrink-0' />
                        <p className='text-sm text-red-600 font-medium'>
                            {info.nodes_error ?? t('admin.vdsNodes.info.nodes_fetch_failed')}
                        </p>
                    </div>
                ) : info && info.nodes.length === 0 ? (
                    <p className='text-sm text-muted-foreground italic py-4'>
                        {t('admin.vdsNodes.info.no_nodes')}
                    </p>
                ) : info ? (
                    <div className='rounded-xl border border-border/50 overflow-hidden'>
                        <table className='w-full text-sm'>
                            <thead className='bg-muted/30 border-b border-border/50'>
                                <tr>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.vdsNodes.info.col_node')}
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.vdsNodes.info.col_status')}
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.vdsNodes.info.col_cpu')}
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.vdsNodes.info.col_memory')}
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.vdsNodes.info.col_disk')}
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.vdsNodes.info.col_uptime')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-border/50'>
                                {info.nodes.map((node) => {
                                    const isOnline = node.status === 'online';
                                    const cpuPct = node.cpu !== undefined ? Math.round(node.cpu * 100) : null;
                                    const memUsed = node.mem ?? 0;
                                    const memMax = node.maxmem ?? 0;
                                    const memPct = memMax > 0 ? Math.round((memUsed / memMax) * 100) : null;
                                    const diskUsed = node.disk ?? 0;
                                    const diskMax = node.maxdisk ?? 0;

                                    return (
                                        <tr key={node.node} className='hover:bg-muted/20 transition-colors'>
                                            <td className='px-4 py-3'>
                                                <div className='flex items-center gap-2'>
                                                    <Server className='h-4 w-4 text-muted-foreground shrink-0' />
                                                    <span className='font-mono font-semibold'>{node.node}</span>
                                                    {node.level && (
                                                        <span className='text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20'>
                                                            {node.level}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className='px-4 py-3'>
                                                <div className='flex items-center gap-1.5'>
                                                    {isOnline ? (
                                                        <CheckCircle2 className='h-4 w-4 text-green-500' />
                                                    ) : (
                                                        <XCircle className='h-4 w-4 text-red-500' />
                                                    )}
                                                    <span
                                                        className={cn(
                                                            'text-xs font-semibold uppercase',
                                                            isOnline ? 'text-green-500' : 'text-red-500',
                                                        )}
                                                    >
                                                        {node.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className='px-4 py-3'>
                                                {cpuPct !== null ? (
                                                    <div className='space-y-1'>
                                                        <div className='flex items-center gap-2'>
                                                            <Cpu className='h-3.5 w-3.5 text-muted-foreground' />
                                                            <span className='font-mono text-xs'>{cpuPct}%</span>
                                                            {node.maxcpu && (
                                                                <span className='text-[10px] text-muted-foreground'>
                                                                    / {node.maxcpu} vCPU
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className='h-1.5 w-24 bg-muted rounded-full overflow-hidden'>
                                                            <div
                                                                className={cn(
                                                                    'h-full rounded-full',
                                                                    cpuPct > 80
                                                                        ? 'bg-red-500'
                                                                        : cpuPct > 60
                                                                          ? 'bg-amber-500'
                                                                          : 'bg-green-500',
                                                                )}
                                                                style={{ width: `${cpuPct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className='text-muted-foreground text-xs'>—</span>
                                                )}
                                            </td>
                                            <td className='px-4 py-3'>
                                                {memPct !== null ? (
                                                    <div className='space-y-1'>
                                                        <div className='flex items-center gap-2'>
                                                            <MemoryStick className='h-3.5 w-3.5 text-muted-foreground' />
                                                            <span className='font-mono text-xs'>
                                                                {formatBytes(memUsed)}
                                                            </span>
                                                            <span className='text-[10px] text-muted-foreground'>
                                                                / {formatBytes(memMax)}
                                                            </span>
                                                        </div>
                                                        <div className='h-1.5 w-24 bg-muted rounded-full overflow-hidden'>
                                                            <div
                                                                className={cn(
                                                                    'h-full rounded-full',
                                                                    memPct > 80
                                                                        ? 'bg-red-500'
                                                                        : memPct > 60
                                                                          ? 'bg-amber-500'
                                                                          : 'bg-blue-500',
                                                                )}
                                                                style={{ width: `${memPct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className='text-muted-foreground text-xs'>—</span>
                                                )}
                                            </td>
                                            <td className='px-4 py-3'>
                                                {diskMax > 0 ? (
                                                    <div className='flex items-center gap-2'>
                                                        <HardDrive className='h-3.5 w-3.5 text-muted-foreground' />
                                                        <span className='font-mono text-xs'>
                                                            {formatBytes(diskUsed)} / {formatBytes(diskMax)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className='text-muted-foreground text-xs'>—</span>
                                                )}
                                            </td>
                                            <td className='px-4 py-3'>
                                                {node.uptime !== undefined && node.uptime > 0 ? (
                                                    <span className='font-mono text-xs text-muted-foreground'>
                                                        {formatUptime(node.uptime)}
                                                    </span>
                                                ) : (
                                                    <span className='text-muted-foreground text-xs'>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </PageCard>
        </div>
    );
}
