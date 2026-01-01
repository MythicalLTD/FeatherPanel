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
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                {systems.map((system) => (
                    <div
                        key={system.name}
                        className='flex items-center justify-between p-4 rounded-2xl bg-muted/10 border border-border/50 group hover:bg-muted/20 transition-all'
                    >
                        <div className='flex items-center gap-3 min-w-0'>
                            <div
                                className={cn(
                                    'h-10 w-10 rounded-xl bg-background flex items-center justify-center border border-border/50 group-hover:border-primary/30 transition-all shadow-sm shrink-0',
                                    system.loading && 'animate-pulse',
                                )}
                            >
                                <system.icon className={cn('h-5 w-5', system.color)} />
                            </div>
                            <div className='min-w-0 flex-1'>
                                <p className='text-sm font-bold tracking-tight'>{system.name}</p>
                                <p
                                    className='text-[10px] text-muted-foreground font-bold uppercase opacity-70 tracking-tighter truncate'
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
                            <CheckCircle2 className='h-5 w-5 text-green-500 shrink-0' />
                        ) : (
                            <AlertTriangle className='h-5 w-5 text-red-500 shrink-0' />
                        )}
                    </div>
                ))}
            </div>
        </PageCard>
    );
}
