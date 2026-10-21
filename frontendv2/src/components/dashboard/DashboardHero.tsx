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

import { useEffect, useState, type ReactNode } from 'react';
import { LayoutGrid, Search } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useGlobalSearch } from '@/contexts/GlobalSearchContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { cn } from '@/lib/utils';

const NAME_MARK = '\u0000';

/** Current time, refreshed on the minute (and every second while seconds are shown). */
export function useNow(intervalMs = 1000): Date | null {
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        setNow(new Date());
        const timer = window.setInterval(() => setNow(new Date()), intervalMs);
        return () => window.clearInterval(timer);
    }, [intervalMs]);
    return now;
}

/** Hour of day in the user's time zone. */
export function hourIn(date: Date, timeZone: string): number {
    try {
        const hour = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(date);
        return Number.parseInt(hour, 10) % 24;
    } catch {
        return date.getHours();
    }
}

export function formatClock(date: Date, locale: string, timeZone: string, seconds = false): string {
    try {
        return new Intl.DateTimeFormat(locale, {
            hour: 'numeric',
            minute: '2-digit',
            ...(seconds ? { second: '2-digit' } : {}),
            timeZone,
        }).format(date);
    } catch {
        return date.toLocaleTimeString();
    }
}

export function formatLongDate(date: Date, locale: string, timeZone: string): string {
    try {
        return new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric', timeZone }).format(
            date,
        );
    } catch {
        return date.toDateString();
    }
}

interface DashboardHeroProps {
    panelName: string;
    /** Display name of the user, or null while the session loads. */
    name: string | null;
    subtitle: ReactNode;
    subtitleTone?: 'neutral' | 'good' | 'warning';
    onArrange?: () => void;
}

/** Greeting card: panel name, a hello with the user's name in the accent colour, a live clock and search. */
export function DashboardHero({ panelName, name, subtitle, subtitleTone = 'neutral', onArrange }: DashboardHeroProps) {
    const { t } = useTranslation();
    const { setOpen } = useGlobalSearch();
    const { timeZone, locale } = useDateFormatOptions();
    const now = useNow(10_000);

    const hour = now ? hourIn(now, timeZone) : 12;
    const greetingKey =
        hour < 5
            ? 'dashboard.home.greeting_evening'
            : hour < 12
              ? 'dashboard.home.greeting_morning'
              : hour < 18
                ? 'dashboard.home.greeting_afternoon'
                : 'dashboard.home.greeting_evening';
    const [before, after] = name ? t(greetingKey, { name: NAME_MARK }).split(NAME_MARK) : ['', ''];

    return (
        <section
            data-tour='dashboard-hero'
            className='fp-surface relative min-w-0 overflow-hidden rounded-2xl border p-5 sm:p-6'
        >
            <div className='flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
                <div className='min-w-0'>
                    <p className='text-muted-foreground truncate text-xs font-medium'>{panelName}</p>
                    <h1 className='mt-1 text-2xl font-semibold tracking-tight wrap-break-word sm:text-3xl'>
                        {name === null ? (
                            <span
                                className='bg-muted/50 inline-block h-8 w-64 animate-pulse rounded-md align-middle'
                                aria-busy='true'
                            />
                        ) : name ? (
                            <>
                                {before}
                                <span className='text-primary'>{name}</span>
                                {after}
                            </>
                        ) : (
                            t('dashboard.home.greeting_fallback')
                        )}
                    </h1>
                    {subtitle && (
                        <p
                            className={cn(
                                'mt-1.5 text-sm',
                                subtitleTone === 'warning'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : subtitleTone === 'good'
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-muted-foreground',
                            )}
                        >
                            {subtitle}
                        </p>
                    )}
                    <div className='mt-4 flex flex-wrap items-center gap-2'>
                        <button
                            type='button'
                            onClick={() => setOpen(true)}
                            className='border-border/70 bg-background hover:border-primary/40 hover:bg-muted/40 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors'
                        >
                            <Search className='h-4 w-4' aria-hidden />
                            {t('dashboard.hero.jump')}
                            <kbd className='border-border/70 bg-muted/60 text-muted-foreground hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline'>
                                {t('dashboard.hero.jump_shortcut')}
                            </kbd>
                        </button>
                        {onArrange && (
                            <button
                                type='button'
                                data-tour='dashboard-arrange'
                                onClick={onArrange}
                                className='text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors'
                            >
                                <LayoutGrid className='h-4 w-4' aria-hidden />
                                {t('dashboard.arrange.open')}
                            </button>
                        )}
                    </div>
                </div>
                <div className='shrink-0 sm:text-right' aria-live='off'>
                    <p className='text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl'>
                        {now ? formatClock(now, locale, timeZone) : '\u00a0'}
                    </p>
                    <p className='text-muted-foreground mt-1 text-sm'>
                        {now ? formatLongDate(now, locale, timeZone) : '\u00a0'}
                    </p>
                </div>
            </div>
        </section>
    );
}
