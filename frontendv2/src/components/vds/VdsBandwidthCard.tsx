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

import { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowDownToLine, ArrowUpFromLine, Gauge } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Period {
    period: string;
    rx_bytes: number;
    tx_bytes: number;
    counted_bytes: number;
    action_taken: 'none' | 'notify' | 'throttle' | 'suspend';
}

interface BandwidthResponse {
    current: Period;
    limit_bytes: number | null;
    percent: number | null;
    count: 'both' | 'in' | 'out';
    action: 'notify' | 'throttle' | 'suspend';
    resets_at: string;
    history: Period[];
}

export const formatBytes = (n: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let v = n;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/** Monthly traffic usage for a VDS (sampled by the monitor cron). Hidden when accounting is off. */
export function VdsBandwidthCard({ id }: { id: number }) {
    const { t } = useTranslation();
    const [data, setData] = useState<BandwidthResponse | null>(null);

    useEffect(() => {
        let cancelled = false;
        axios
            .get(`/api/user/vm-instances/${id}/bandwidth`)
            .then(({ data: res }) => {
                if (!cancelled && res?.success) setData(res.data as BandwidthResponse);
            })
            .catch(() => {
                // Feature disabled or no access: keep the card hidden.
            });
        return () => {
            cancelled = true;
        };
    }, [id]);

    if (!data) return null;
    const { current, limit_bytes: limit, percent } = data;
    const bar = percent ?? 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle className='flex items-center gap-2 text-base font-semibold tracking-tight'>
                    <Gauge className='text-primary h-4 w-4' />
                    {t('vds.bandwidth.title')}
                </CardTitle>
                <CardDescription className='text-muted-foreground'>
                    {t('vds.bandwidth.description', { period: current.period })}
                </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
                <div className='flex flex-wrap items-end justify-between gap-2'>
                    <p className='text-2xl font-semibold'>
                        {formatBytes(current.counted_bytes)}
                        <span className='text-muted-foreground text-sm font-normal'>
                            {' / '}
                            {limit ? formatBytes(limit) : t('vds.bandwidth.unlimited')}
                        </span>
                    </p>
                    <p className='text-muted-foreground text-xs'>
                        {t(`vds.bandwidth.count_${data.count}`)} ·{' '}
                        {t('vds.bandwidth.resets', { date: data.resets_at.slice(0, 10) })}
                    </p>
                </div>
                {limit ? (
                    <div className='bg-muted h-2 overflow-hidden rounded-full'>
                        <div
                            className={cn(
                                'h-full rounded-full transition-all',
                                bar >= 100 ? 'bg-red-500' : bar >= 80 ? 'bg-amber-500' : 'bg-primary',
                            )}
                            style={{ width: `${Math.max(2, bar)}%` }}
                        />
                    </div>
                ) : null}
                <div className='grid grid-cols-2 gap-3 text-sm'>
                    <div className='border-border/50 flex items-center gap-2 rounded-xl border p-3'>
                        <ArrowDownToLine className='h-4 w-4 text-emerald-500' />
                        <span className='text-muted-foreground'>{t('vds.bandwidth.inbound')}</span>
                        <span className='ml-auto font-medium'>{formatBytes(current.rx_bytes)}</span>
                    </div>
                    <div className='border-border/50 flex items-center gap-2 rounded-xl border p-3'>
                        <ArrowUpFromLine className='h-4 w-4 text-sky-500' />
                        <span className='text-muted-foreground'>{t('vds.bandwidth.outbound')}</span>
                        <span className='ml-auto font-medium'>{formatBytes(current.tx_bytes)}</span>
                    </div>
                </div>
                {limit ? (
                    <p className='text-muted-foreground text-xs'>{t(`vds.bandwidth.action_${data.action}`)}</p>
                ) : null}
                {current.action_taken === 'throttle' && (
                    <p className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-600 dark:text-amber-400'>
                        {t('vds.bandwidth.throttled_now')}
                    </p>
                )}
                {data.history.length > 1 && (
                    <div className='space-y-1'>
                        <p className='text-muted-foreground text-xs font-medium uppercase'>
                            {t('vds.bandwidth.history')}
                        </p>
                        {data.history.slice(1).map((h) => (
                            <div key={h.period} className='flex justify-between text-sm'>
                                <span>{h.period}</span>
                                <span className='text-muted-foreground'>{formatBytes(h.counted_bytes)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
