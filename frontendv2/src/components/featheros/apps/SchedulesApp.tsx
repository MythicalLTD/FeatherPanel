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
import { CalendarClock, Play, Trash2, RefreshCw, Loader2, ExternalLink, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type { Schedule } from '@/types/server';
import { useFeatherOs } from '../FeatherOsContext';
import { OsSwitch } from '../controls';
import type { OsAppProps } from './index';

export default function SchedulesApp({ win }: OsAppProps) {
    const { t } = useTranslation();
    const { can, errorMessage, confirm } = useFeatherOs();
    const uuid = win.serverUuid as string;
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<number | null>(null);
    const canUpdate = can(uuid, 'schedule.update');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/user/servers/${uuid}/schedules`, {
                params: { page: 1, per_page: 100 },
            });
            setSchedules(data?.data?.data ?? []);
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [uuid, errorMessage]);

    useEffect(() => {
        void load();
    }, [load]);

    const act = async (id: number, fn: () => Promise<unknown>, success?: string) => {
        setBusy(id);
        try {
            await fn();
            if (success) toast.success(success);
            await load();
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setBusy(null);
        }
    };

    const cron = (s: Schedule) =>
        `${s.cron_minute} ${s.cron_hour} ${s.cron_day_of_month} ${s.cron_month} ${s.cron_day_of_week}`;
    const openPanel = (path: string) => window.open(`/server/${uuid}/schedules${path}`, '_blank', 'noopener');

    return (
        <div className='flex h-full flex-col'>
            <div className='flex h-10 shrink-0 items-center gap-2 border-b px-3'>
                <span className='text-muted-foreground text-[12px]'>
                    {t('featheros.schedules.count', { count: String(schedules.length) })}
                </span>
                <button
                    type='button'
                    className='hover:bg-muted ml-auto rounded-md p-1'
                    onClick={() => void load()}
                    title={t('featheros.common.refresh')}
                >
                    <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                </button>
                {can(uuid, 'schedule.create') && (
                    <button
                        type='button'
                        onClick={() => openPanel('/new')}
                        className='hover:bg-muted flex h-7 items-center gap-1 rounded-md border px-2.5 text-[12px]'
                    >
                        <Plus className='h-3 w-3' /> {t('featheros.schedules.create_in_panel')}
                    </button>
                )}
            </div>
            <div className='fos-scroll min-h-0 flex-1 overflow-auto p-2'>
                {schedules.map((s) => {
                    const active = !!s.is_active;
                    const isBusy = busy === s.id;
                    return (
                        <div key={s.id} className='hover:bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2'>
                            <CalendarClock
                                className={cn('h-7 w-7 shrink-0', active ? 'text-primary' : 'text-muted-foreground')}
                            />
                            <div className='min-w-0 flex-1'>
                                <div className='flex items-center gap-1.5 text-[13px] font-medium'>
                                    <span className='truncate'>{s.name}</span>
                                    {!!s.is_processing && <Loader2 className='h-3 w-3 animate-spin' />}
                                </div>
                                <div className='text-muted-foreground text-[11px]'>
                                    <span className='font-mono'>{cron(s)}</span>
                                    {' · '}
                                    {s.next_run_at
                                        ? t('featheros.schedules.next_run', {
                                              time: new Date(s.next_run_at).toLocaleString(),
                                          })
                                        : t('featheros.schedules.no_next_run')}
                                    {s.last_run_at &&
                                        ` · ${t('featheros.schedules.last_run', { time: new Date(s.last_run_at).toLocaleString() })}`}
                                </div>
                            </div>
                            {isBusy && <Loader2 className='text-muted-foreground h-4 w-4 animate-spin' />}
                            <OsSwitch
                                size='sm'
                                checked={active}
                                aria-label={t('featheros.schedules.active')}
                                disabled={isBusy || !canUpdate}
                                onChange={() =>
                                    void act(s.id, () =>
                                        axios.post(`/api/user/servers/${uuid}/schedules/${s.id}/toggle`),
                                    )
                                }
                            />
                            <button
                                type='button'
                                className='hover:bg-muted rounded-md p-1 disabled:opacity-30'
                                title={t('featheros.schedules.run_now')}
                                disabled={isBusy || !canUpdate}
                                onClick={() =>
                                    void act(
                                        s.id,
                                        () => axios.post(`/api/user/servers/${uuid}/schedules/${s.id}/run`),
                                        t('featheros.schedules.triggered', { name: s.name }),
                                    )
                                }
                            >
                                <Play className='h-3.5 w-3.5' />
                            </button>
                            <button
                                type='button'
                                className='hover:bg-muted rounded-md p-1'
                                title={t('featheros.desktop.open_in_panel')}
                                onClick={() => openPanel(`/${s.id}/tasks`)}
                            >
                                <ExternalLink className='h-3.5 w-3.5' />
                            </button>
                            <button
                                type='button'
                                className='rounded-md p-1 text-red-600 hover:bg-red-500/10 disabled:opacity-30'
                                title={t('featheros.common.delete')}
                                disabled={isBusy || !can(uuid, 'schedule.delete')}
                                onClick={async () => {
                                    const ok = await confirm({
                                        title: t('featheros.schedules.delete_title', { name: s.name }),
                                        confirmLabel: t('featheros.common.delete'),
                                        danger: true,
                                    });
                                    if (ok)
                                        await act(
                                            s.id,
                                            () => axios.delete(`/api/user/servers/${uuid}/schedules/${s.id}`),
                                            t('featheros.schedules.deleted'),
                                        );
                                }}
                            >
                                <Trash2 className='h-3.5 w-3.5' />
                            </button>
                        </div>
                    );
                })}
                {!loading && schedules.length === 0 && (
                    <div className='text-muted-foreground py-12 text-center text-sm'>
                        {t('featheros.schedules.empty')}
                    </div>
                )}
            </div>
        </div>
    );
}
