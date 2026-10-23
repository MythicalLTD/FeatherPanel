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

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { getApiErrorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

type CalendarEntry = { policy_id: number; name: string; at: string; status?: string; kind: 'planned' | 'run' };

function monthKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Backend times are UTC literals ("Y-m-d H:i:s"). */
function parseUtc(value: string) {
    return new Date(value.replace(' ', 'T') + 'Z');
}

function dayKey(d: Date) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const STATUS_STYLES: Record<string, string> = {
    completed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    failed: 'bg-red-500/15 text-red-700 dark:text-red-300',
    partial: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    running: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
};

export function BackupScheduleCalendar({ onOpen }: { onOpen: (policyId: number) => void }) {
    const { t, locale } = useTranslation();
    const [cursor, setCursor] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const [entries, setEntries] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/backup-schedules/calendar', {
                params: { month: monthKey(cursor) },
            });
            const planned = (data?.data?.planned ?? []).map((p: CalendarEntry) => ({ ...p, kind: 'planned' }));
            const runs = (data?.data?.runs ?? []).map((r: CalendarEntry) => ({ ...r, kind: 'run' }));
            setEntries([...runs, ...planned]);
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'adminBackupSchedules.calendar.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [cursor, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const byDay = useMemo(() => {
        const map = new Map<string, (CalendarEntry & { date: Date })[]>();
        for (const e of entries) {
            const date = parseUtc(e.at);
            const key = dayKey(date);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push({ ...e, date });
        }
        for (const list of map.values()) list.sort((a, b) => a.date.getTime() - b.date.getTime());
        return map;
    }, [entries]);

    const cells = useMemo(() => {
        const first = new Date(cursor);
        const offset = (first.getDay() + 6) % 7; // weeks start on Monday
        const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
        const out: (Date | null)[] = Array(offset).fill(null);
        for (let d = 1; d <= daysInMonth; d++) out.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
        while (out.length % 7) out.push(null);
        return out;
    }, [cursor]);

    const weekdays = useMemo(() => {
        const monday = new Date(2024, 0, 1);
        return Array.from({ length: 7 }, (_, i) =>
            new Date(monday.getFullYear(), 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' }),
        );
    }, [locale]);

    const todayKey = dayKey(new Date());
    const selectedEntries = selected ? (byDay.get(selected) ?? []) : [];
    const time = (d: Date) => d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    return (
        <section className='fp-surface space-y-4 rounded-2xl border p-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <h2 className='text-foreground flex items-center gap-2 text-base font-semibold'>
                    <CalendarDays className='text-primary h-4 w-4' />
                    {t('adminBackupSchedules.calendar.title')}
                </h2>
                <div className='flex items-center gap-1'>
                    <Button
                        variant='ghost'
                        size='icon'
                        aria-label={t('adminBackupSchedules.calendar.previous')}
                        onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                    >
                        <ChevronLeft className='h-4 w-4' />
                    </Button>
                    <span className='text-foreground min-w-32 text-center text-sm font-medium'>
                        {cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                    </span>
                    <Button
                        variant='ghost'
                        size='icon'
                        aria-label={t('adminBackupSchedules.calendar.next')}
                        onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                    >
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            </div>

            <div className={cn('grid grid-cols-7 gap-1 text-xs', loading && 'opacity-60')}>
                {weekdays.map((w) => (
                    <div key={w} className='text-muted-foreground py-1 text-center font-medium'>
                        {w}
                    </div>
                ))}
                {cells.map((date, i) => {
                    if (!date) return <div key={`e${i}`} />;
                    const key = dayKey(date);
                    const list = byDay.get(key) ?? [];
                    const failed = list.some((e) => e.kind === 'run' && e.status === 'failed');
                    return (
                        <button
                            key={key}
                            type='button'
                            onClick={() => setSelected(selected === key ? null : key)}
                            className={cn(
                                'border-border/50 hover:border-primary/50 flex min-h-12 flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors sm:min-h-20',
                                key === todayKey && 'border-primary/60',
                                selected === key && 'bg-primary/10 border-primary',
                            )}
                        >
                            <span className='text-foreground font-medium'>{date.getDate()}</span>
                            {list.length > 0 && (
                                <span
                                    className={cn(
                                        'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                                        failed ? STATUS_STYLES.failed : 'bg-primary/15 text-primary',
                                    )}
                                >
                                    {list.length}
                                </span>
                            )}
                            <span className='hidden w-full space-y-0.5 sm:block'>
                                {list.slice(0, 2).map((e, idx) => (
                                    <span key={idx} className='text-muted-foreground block truncate text-[10px]'>
                                        {time(e.date)} {e.name}
                                    </span>
                                ))}
                            </span>
                        </button>
                    );
                })}
            </div>

            {selected && (
                <div className='border-border/50 space-y-2 border-t pt-3'>
                    {selectedEntries.length === 0 ? (
                        <p className='text-muted-foreground text-sm'>{t('adminBackupSchedules.calendar.empty')}</p>
                    ) : (
                        selectedEntries.map((e, idx) => (
                            <button
                                key={idx}
                                type='button'
                                onClick={() => onOpen(e.policy_id)}
                                className='hover:bg-muted/60 flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm'
                            >
                                <span className='min-w-0 truncate'>
                                    <span className='text-muted-foreground mr-2 tabular-nums'>{time(e.date)}</span>
                                    {e.name}
                                </span>
                                <span
                                    className={cn(
                                        'shrink-0 rounded px-2 py-0.5 text-xs font-medium',
                                        e.kind === 'planned'
                                            ? 'bg-muted text-muted-foreground'
                                            : (STATUS_STYLES[e.status ?? ''] ?? 'bg-muted text-muted-foreground'),
                                    )}
                                >
                                    {e.kind === 'planned'
                                        ? t('adminBackupSchedules.calendar.planned')
                                        : (e.status ?? '')}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </section>
    );
}
