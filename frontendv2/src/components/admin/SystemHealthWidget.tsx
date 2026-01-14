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

import React, { useEffect, useState } from 'react';
import { Activity, Zap, Database, Clock, CheckCircle2, AlertTriangle, Server, HardDrive } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { cn, formatFileSize } from '@/lib/utils';
import axios from 'axios';

interface GlobalStats {
    total_nodes: number;
    healthy_nodes: number;
    unhealthy_nodes: number;
    total_memory: number;
    used_memory: number;
    avg_cpu_percent: number;
}

interface SelfTestResponse {
    status: string;
    checks: {
        redis: { status: boolean; message: string };
        mysql: { status: boolean; message: string };
        permissions: Record<string, boolean>;
    };
}

import { useTranslation } from '@/contexts/TranslationContext';

export function SystemHealthWidget() {
    const { t } = useTranslation();
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [selftest, setSelftest] = useState<SelfTestResponse | null>(null);
    const [latency, setLatency] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Global Stats
                const statsReq = axios.get('/api/admin/nodes/status/global');

                // Fetch SelfTest & Measure Latency
                const start = performance.now();
                const selftestReq = axios.get('/api/selftest');

                const [statsRes, selftestRes] = await Promise.all([statsReq, selftestReq]);
                const end = performance.now();

                setLatency(Math.round(end - start));

                if (statsRes.data.success) {
                    setStats(statsRes.data.data.global);
                }

                if (selftestRes.data.success) {
                    setSelftest(selftestRes.data.data);
                }
            } catch (err) {
                console.error('Failed to fetch system health', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const systems = [
        {
            name: t('admin.system_health.nodes'),
            status: stats ? (stats.unhealthy_nodes === 0 ? 'Healthy' : 'Degraded') : 'Unknown',
            icon: Zap,
            color: stats?.unhealthy_nodes === 0 ? 'text-green-500' : 'text-amber-500',
            detail: stats
                ? t('admin.system_health.status.online', {
                      healthy: String(stats.healthy_nodes),
                      total: String(stats.total_nodes),
                  })
                : t('admin.system_health.status.loading'),
            loading: loading,
        },
        {
            name: t('admin.system_health.memory'),
            status: 'Usage',
            icon: HardDrive,
            color: 'text-blue-500',
            detail: stats
                ? `${formatFileSize(stats.used_memory)} / ${formatFileSize(stats.total_memory)}`
                : t('admin.system_health.status.unavailable'),
            loading: loading,
        },
        {
            name: t('admin.system_health.cpu_load'),
            status: 'Average',
            icon: Activity,
            color: 'text-purple-500',
            detail: stats
                ? `${stats.avg_cpu_percent}% ${t('admin.system_health.avg')}`
                : t('admin.system_health.status.unavailable'),
            loading: loading,
        },
        {
            name: t('admin.system_health.startup'),
            status: 'Latency',
            icon: Clock,
            color: 'text-pink-500',
            detail: `${latency}ms`,
            loading: loading,
        },
        {
            name: t('admin.system_health.database'),
            status: selftest?.checks.mysql.status ? 'Healthy' : 'Error',
            icon: Database,
            color: selftest?.checks.mysql.status ? 'text-emerald-500' : 'text-red-500',
            detail:
                selftest?.checks.mysql.message === 'Successful'
                    ? t('admin.system_health.status.successful')
                    : selftest?.checks.mysql.message === 'Failed'
                      ? t('admin.system_health.status.failed')
                      : selftest?.checks.mysql.message || t('admin.system_health.status.connecting'),
            loading: loading,
        },
        {
            name: t('admin.system_health.cache'),
            status: selftest?.checks.redis.status ? 'Healthy' : 'Error',
            icon: Server,
            color: selftest?.checks.redis.status ? 'text-orange-500' : 'text-red-500',
            detail:
                selftest?.checks.redis.message === 'Successful'
                    ? t('admin.system_health.status.successful')
                    : selftest?.checks.redis.message === 'Failed'
                      ? t('admin.system_health.status.failed')
                      : selftest?.checks.redis.message || t('admin.system_health.status.connecting'),
            loading: loading,
        },
    ];

    return (
        <PageCard
            title={t('admin.system_health.title')}
            description={t('admin.system_health.description')}
            icon={Activity}
        >
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4'>
                {systems.map((system) => (
                    <div
                        key={system.name}
                        className='flex items-center justify-between gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl bg-muted/10 border border-border/50 group hover:bg-muted/20 transition-all'
                    >
                        <div className='flex items-center gap-2 md:gap-3 min-w-0 flex-1'>
                            <div
                                className={cn(
                                    'h-9 w-9 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-background flex items-center justify-center border border-border/50 group-hover:border-primary/30 transition-all shadow-sm shrink-0',
                                    system.loading && 'animate-pulse',
                                )}
                            >
                                <system.icon className={cn('h-4 w-4 md:h-5 md:w-5', system.color)} />
                            </div>
                            <div className='min-w-0 flex-1'>
                                <p className='text-xs md:text-sm font-bold tracking-tight truncate'>{system.name}</p>
                                <p
                                    className='text-[9px] md:text-[10px] text-muted-foreground font-bold uppercase opacity-70 tracking-tighter truncate'
                                    title={system.detail}
                                >
                                    {system.loading ? t('admin.system_health.status.fetching') : system.detail}
                                </p>
                            </div>
                        </div>
                        {system.loading ? (
                            <div className='h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse shrink-0' />
                        ) : system.status === 'Healthy' ||
                          system.status === 'Usage' ||
                          system.status === 'Average' ||
                          system.status === 'Latency' ? (
                            <CheckCircle2 className='h-4 w-4 md:h-5 md:w-5 text-green-500 shrink-0' />
                        ) : (
                            <AlertTriangle className='h-4 w-4 md:h-5 md:w-5 text-red-500 shrink-0' />
                        )}
                    </div>
                ))}
            </div>
        </PageCard>
    );
}
