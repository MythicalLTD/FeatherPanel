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
import axios from 'axios';
import { Gauge, Loader2, RefreshCw, Star } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { cn } from '@/lib/utils';

export interface CapacityNode {
    id: number;
    name: string;
    online: boolean;
    error: string | null;
    instances: number;
    suspended: number;
    allocated: { memory_mb: number; vcpus: number; disk_gb: number };
    physical: {
        memory_mb: number;
        memory_used_mb: number;
        cpus: number;
        disk_gb: number;
        disk_used_gb: number;
    } | null;
    pve_nodes: { node: string; online: boolean; cpu: number; maxcpu: number; mem: number; maxmem: number }[];
    memory_percent: number | null;
    free_memory_mb: number | null;
    full: boolean;
}

export interface CapacityResponse {
    nodes: CapacityNode[];
    strategy: string;
    overcommit_percent: number;
    recommended_node_id: number | null;
    migration_enabled: boolean;
}

const gb = (mb: number) => `${(mb / 1024).toFixed(mb >= 10240 ? 0 : 1)} GB`;

function Bar({ value }: { value: number }) {
    return (
        <div className='bg-muted h-1.5 overflow-hidden rounded-full'>
            <div
                className={cn(
                    'h-full rounded-full',
                    value >= 100 ? 'bg-red-500' : value >= 80 ? 'bg-amber-500' : 'bg-primary',
                )}
                style={{ width: `${Math.min(100, Math.max(2, value))}%` }}
            />
        </div>
    );
}

/** Allocated vs. physical resources per VDS node and the node recommended for new VDS. */
export function VdsCapacityOverview() {
    const { t } = useTranslation();
    const [data, setData] = useState<CapacityResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: res } = await axios.get('/api/admin/vm-capacity');
            if (res?.success) setData(res.data as CapacityResponse);
        } catch {
            // Capacity is informational; the node list below still works.
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    if (!data || data.nodes.length === 0) return null;

    return (
        <div className='fp-surface space-y-4 rounded-xl border p-4'>
            <div className='flex items-start justify-between gap-2'>
                <div>
                    <p className='flex items-center gap-2 font-semibold'>
                        <Gauge className='text-primary h-4 w-4' />
                        {t('admin.vdsCapacity.title')}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                        {t('admin.vdsCapacity.description', {
                            strategy: t(`admin.vdsCapacity.strategies.${data.strategy}`),
                            overcommit: String(data.overcommit_percent),
                        })}
                    </p>
                </div>
                <Button variant='outline' size='sm' onClick={() => void load()} disabled={loading}>
                    {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <RefreshCw className='h-4 w-4' />}
                </Button>
            </div>
            <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                {data.nodes.map((n) => {
                    const recommended = n.id === data.recommended_node_id;
                    return (
                        <div
                            key={n.id}
                            className={cn(
                                'space-y-2 rounded-xl border p-3 text-sm',
                                recommended ? 'border-primary/50 bg-primary/5' : 'border-border/50',
                            )}
                        >
                            <div className='flex items-center justify-between gap-2'>
                                <span className='truncate font-medium'>{n.name}</span>
                                {recommended ? (
                                    <span className='text-primary flex items-center gap-1 text-xs font-medium'>
                                        <Star className='h-3 w-3' />
                                        {t('admin.vdsCapacity.recommended')}
                                    </span>
                                ) : !n.online ? (
                                    <span className='text-xs text-red-500'>{t('admin.vdsCapacity.offline')}</span>
                                ) : n.full ? (
                                    <span className='text-xs text-amber-500'>{t('admin.vdsCapacity.full')}</span>
                                ) : null}
                            </div>
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.vdsCapacity.instances', {
                                    count: String(n.instances),
                                    suspended: String(n.suspended),
                                })}
                            </p>
                            {n.physical ? (
                                <>
                                    <div className='space-y-1'>
                                        <div className='flex justify-between text-xs'>
                                            <span>{t('admin.vdsCapacity.memory_allocated')}</span>
                                            <span className='text-muted-foreground'>
                                                {gb(n.allocated.memory_mb)} / {gb(n.physical.memory_mb)}
                                                {n.memory_percent !== null ? ` (${n.memory_percent}%)` : ''}
                                            </span>
                                        </div>
                                        <Bar value={n.memory_percent ?? 0} />
                                    </div>
                                    <div className='text-muted-foreground flex justify-between text-xs'>
                                        <span>
                                            {t('admin.vdsCapacity.vcpus', {
                                                vcpus: String(n.allocated.vcpus),
                                                cpus: String(n.physical.cpus),
                                            })}
                                        </span>
                                        <span>
                                            {t('admin.vdsCapacity.disk', {
                                                used: String(n.physical.disk_used_gb),
                                                total: String(n.physical.disk_gb),
                                            })}
                                        </span>
                                    </div>
                                    <p className='text-muted-foreground truncate text-xs'>
                                        {n.pve_nodes.map((p) => `${p.node}${p.online ? '' : ' ✕'}`).join(' · ')}
                                    </p>
                                </>
                            ) : (
                                <p className='text-xs text-red-500'>{n.error || t('admin.vdsCapacity.unreachable')}</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
