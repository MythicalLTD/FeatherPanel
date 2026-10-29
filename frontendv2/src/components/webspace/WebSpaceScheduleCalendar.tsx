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

import { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { upcomingCronRuns, type CronFields } from '@/lib/cron-expand';

interface CalendarSchedule extends CronFields {
    id: number;
    name: string;
    timezone?: string;
    is_active: number | boolean;
}

/** Seven day agenda of upcoming runs for every active schedule. */
export function WebSpaceScheduleCalendar({ schedules }: { schedules: CalendarSchedule[] }) {
    const { t } = useTranslation();

    const days = useMemo(() => {
        const buckets = new Map<string, { date: Date; runs: { name: string; at: Date }[] }>();
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + i);
            buckets.set(d.toDateString(), { date: d, runs: [] });
        }
        for (const s of schedules) {
            if (!(s.is_active === true || Number(s.is_active) === 1)) continue;
            for (const at of upcomingCronRuns(s, s.timezone, 7, 60)) {
                buckets.get(at.toDateString())?.runs.push({ name: s.name, at });
            }
        }
        return Array.from(buckets.values()).map((b) => ({
            ...b,
            runs: b.runs.sort((a, c) => a.at.getTime() - c.at.getTime()),
        }));
    }, [schedules]);

    return (
        <div className='border-border/50 bg-card/40 rounded-2xl border p-4'>
            <div className='mb-3 flex items-center gap-2 text-sm font-semibold'>
                <CalendarDays className='text-primary h-4 w-4' />
                {t('webSpaces.schedules.calendar.title')}
            </div>
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-7'>
                {days.map((day) => (
                    <div key={day.date.toISOString()} className='bg-muted/30 min-h-24 rounded-xl p-2'>
                        <div className='text-muted-foreground mb-1 text-xs font-medium'>
                            {day.date.toLocaleDateString(undefined, {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                            })}
                        </div>
                        <div className='max-h-40 space-y-1 overflow-y-auto'>
                            {day.runs.length === 0 && (
                                <div className='text-muted-foreground/60 text-xs'>
                                    {t('webSpaces.schedules.calendar.none')}
                                </div>
                            )}
                            {day.runs.slice(0, 12).map((run, i) => (
                                <div key={i} className='bg-primary/10 truncate rounded px-1.5 py-0.5 text-xs'>
                                    {run.at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}{' '}
                                    {run.name}
                                </div>
                            ))}
                            {day.runs.length > 12 && (
                                <div className='text-muted-foreground text-xs'>
                                    {t('webSpaces.schedules.calendar.more', { count: String(day.runs.length - 12) })}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
