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
    Clock,
    Activity,
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

/** Animated circular gauge */
function CircleGauge({
    percent,
    size = 80,
    strokeWidth = 7,
    colorClass,
    label,
    sub,
}: {
    percent: number;
    size?: number;
    strokeWidth?: number;
    colorClass: string;
    label: string;
    sub?: string;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

    return (
        <div className='flex flex-col items-center gap-1'>
            <div className='relative' style={{ width: size, height: size }}>
                <svg width={size} height={size} className='-rotate-90'>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill='none'
                        stroke='currentColor'
                        strokeWidth={strokeWidth}
                        className='text-muted/30'
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill='none'
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap='round'
                        className={cn('transition-all duration-700', colorClass)}
                        style={{ stroke: 'currentColor' }}
                    />
                </svg>
                <div className='absolute inset-0 flex items-center justify-center'>
                    <span className='text-xs font-bold tabular-nums'>{Math.round(percent)}%</span>
                </div>
            </div>
            <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wide'>{label}</span>
            {sub && <span className='text-[10px] text-muted-foreground'>{sub}</span>}
        </div>
    );
}

/** Horizontal bar with label */
function StatBar({
    icon: Icon,
    label,
    used,
    max,
    pct,
    colorClass,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    used: string;
    max: string;
    pct: number;
    colorClass: string;
}) {
    return (
        <div className='space-y-1.5'>
            <div className='flex items-center justify-between text-xs'>
                <span className='flex items-center gap-1.5 font-medium text-muted-foreground'>
                    <Icon className='h-3.5 w-3.5' />
                    {label}
                </span>
                <span className='font-mono tabular-nums'>
                    {used} <span className='text-muted-foreground'>/ {max}</span>
                </span>
            </div>
            <div className='h-2 w-full rounded-full bg-muted/40 overflow-hidden'>
                <div
                    className={cn('h-full rounded-full transition-all duration-700', colorClass)}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                />
            </div>
        </div>
    );
}

function NodeCard({ node }: { node: ProxmoxNode }) {
    const isOnline = node.status === 'online';

    const cpuPct = node.cpu !== undefined ? node.cpu * 100 : 0;
    const memUsed = node.mem ?? 0;
    const memMax = node.maxmem ?? 0;
    const memPct = memMax > 0 ? (memUsed / memMax) * 100 : 0;
    const diskUsed = node.disk ?? 0;
    const diskMax = node.maxdisk ?? 0;
    const diskPct = diskMax > 0 ? (diskUsed / diskMax) * 100 : 0;

    const cpuColor = cpuPct > 80 ? 'text-red-500' : cpuPct > 60 ? 'text-amber-500' : 'text-green-500';
    const memColor = memPct > 80 ? 'text-red-500' : memPct > 60 ? 'text-amber-500' : 'text-blue-500';
    const diskColor = diskPct > 80 ? 'text-red-500' : diskPct > 60 ? 'text-amber-500' : 'text-purple-500';

    return (
        <div
            className={cn(
                'rounded-2xl border p-5 space-y-5 transition-all',
                isOnline ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5 opacity-70',
            )}
        >
            {/* Header */}
            <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                    <div
                        className={cn(
                            'h-9 w-9 rounded-xl flex items-center justify-center',
                            isOnline ? 'bg-green-500/10' : 'bg-red-500/10',
                        )}
                    >
                        <Server className={cn('h-4.5 w-4.5', isOnline ? 'text-green-500' : 'text-red-500')} />
                    </div>
                    <div>
                        <p className='font-bold font-mono'>{node.node}</p>
                        <p className='text-[10px] uppercase font-semibold text-muted-foreground tracking-widest'>
                            {node.type}
                        </p>
                    </div>
                </div>
                <div className='flex items-center gap-2'>
                    {node.level && (
                        <span className='text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20'>
                            {node.level}
                        </span>
                    )}
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                            isOnline
                                ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                                : 'bg-red-500/10 text-red-500 border border-red-500/20',
                        )}
                    >
                        {isOnline ? <CheckCircle2 className='h-3.5 w-3.5' /> : <XCircle className='h-3.5 w-3.5' />}
                        {node.status.toUpperCase()}
                    </span>
                </div>
            </div>

            {isOnline && (
                <>
                    {/* Circle gauges */}
                    <div className='flex items-center justify-around py-2'>
                        <CircleGauge
                            percent={cpuPct}
                            colorClass={cpuColor}
                            label='CPU'
                            sub={node.maxcpu ? `${node.maxcpu} vCPU` : undefined}
                        />
                        <CircleGauge
                            percent={memPct}
                            colorClass={memColor}
                            label='RAM'
                            sub={memMax > 0 ? formatBytes(memMax) : undefined}
                        />
                        {diskMax > 0 && (
                            <CircleGauge
                                percent={diskPct}
                                colorClass={diskColor}
                                label='Disk'
                                sub={formatBytes(diskMax)}
                            />
                        )}
                    </div>

                    {/* Detailed stat bars */}
                    <div className='space-y-3 pt-1 border-t border-border/40'>
                        <StatBar
                            icon={Cpu}
                            label='CPU Usage'
                            used={`${cpuPct.toFixed(1)}%`}
                            max={`${node.maxcpu ?? '?'} cores`}
                            pct={cpuPct}
                            colorClass={cpuPct > 80 ? 'bg-red-500' : cpuPct > 60 ? 'bg-amber-500' : 'bg-green-500'}
                        />
                        {memMax > 0 && (
                            <StatBar
                                icon={MemoryStick}
                                label='Memory'
                                used={formatBytes(memUsed)}
                                max={formatBytes(memMax)}
                                pct={memPct}
                                colorClass={memPct > 80 ? 'bg-red-500' : memPct > 60 ? 'bg-amber-500' : 'bg-blue-500'}
                            />
                        )}
                        {diskMax > 0 && (
                            <StatBar
                                icon={HardDrive}
                                label='Local Storage'
                                used={formatBytes(diskUsed)}
                                max={formatBytes(diskMax)}
                                pct={diskPct}
                                colorClass={
                                    diskPct > 80 ? 'bg-red-500' : diskPct > 60 ? 'bg-amber-500' : 'bg-purple-500'
                                }
                            />
                        )}
                    </div>

                    {/* Uptime */}
                    {node.uptime !== undefined && node.uptime > 0 && (
                        <div className='flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40'>
                            <Clock className='h-3.5 w-3.5' />
                            <span>
                                Uptime:{' '}
                                <strong className='text-foreground font-mono'>{formatUptime(node.uptime)}</strong>
                            </span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
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
            {/* PVE Version Card */}
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
                    <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
                        {[
                            { icon: Tag, label: t('admin.vdsNodes.info.pve_version'), value: info.version.version },
                            { icon: Info, label: t('admin.vdsNodes.info.pve_release'), value: info.version.release },
                            {
                                icon: GitCommit,
                                label: t('admin.vdsNodes.info.pve_repoid'),
                                value: info.version.repoid.slice(0, 12) + (info.version.repoid.length > 12 ? '…' : ''),
                            },
                            {
                                icon: Monitor,
                                label: t('admin.vdsNodes.info.pve_console'),
                                value: info.version.console ?? t('admin.vdsNodes.info.pve_console_default'),
                            },
                        ].map(({ icon: Icon, label, value }) => (
                            <div
                                key={label}
                                className='flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-muted/20'
                            >
                                <Icon className='h-5 w-5 text-primary mt-0.5 shrink-0' />
                                <div>
                                    <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                                        {label}
                                    </p>
                                    <p className='font-mono font-semibold text-sm mt-0.5' title={value}>
                                        {value}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}

                {lastFetched && (
                    <p className='text-[10px] text-muted-foreground mt-3 italic'>
                        {t('admin.vdsNodes.info.last_fetched', { time: lastFetched.toLocaleTimeString() })}
                    </p>
                )}
            </PageCard>

            {/* Cluster Node Stats */}
            <PageCard
                title={t('admin.vdsNodes.info.nodes_title')}
                icon={Activity}
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
                    <p className='text-sm text-muted-foreground italic py-4'>{t('admin.vdsNodes.info.no_nodes')}</p>
                ) : info ? (
                    <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
                        {info.nodes.map((node) => (
                            <NodeCard key={node.node} node={node} />
                        ))}
                    </div>
                ) : null}
            </PageCard>
        </div>
    );
}
