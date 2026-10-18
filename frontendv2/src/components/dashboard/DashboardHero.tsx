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
import { AlertOctagon, AlertTriangle, CheckCircle, LayoutGrid, Megaphone, Search, Sparkles, X } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useGlobalSearch } from '@/contexts/GlobalSearchContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import type { Notification } from '@/types/notification';
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

const TYPE_ICON: Record<Notification['type'], typeof Megaphone> = {
    info: Megaphone,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertOctagon,
    danger: AlertOctagon,
};

const TYPE_TONE: Record<Notification['type'], string> = {
    info: 'text-sky-500 bg-sky-500/10',
    success: 'text-emerald-500 bg-emerald-500/10',
    warning: 'text-amber-500 bg-amber-500/10',
    error: 'text-rose-500 bg-rose-500/10',
    danger: 'text-rose-500 bg-rose-500/10',
};

/** Markdown reduced to one readable line for the compact list. */
function plainText(markdown: string): string {
    return markdown
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[#>*_`~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Announcements from the host, newest first, in a compact card. */
export function WhatsNewCard({ className, limit = 3 }: { className?: string; limit?: number }) {
    const { t } = useTranslation();
    const { notifications, dismissNotification } = useNotifications();
    const shown = notifications.slice(0, limit);
    const rest = notifications.length - shown.length;

    return (
        <section className={cn('fp-surface flex min-w-0 flex-col rounded-2xl border p-5', className)}>
            <header className='flex items-center gap-3'>
                <span className='fp-icon-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-xl'>
                    <Sparkles className='h-4.5 w-4.5' aria-hidden />
                </span>
                <h2 className='text-base font-semibold'>{t('dashboard.hero.whats_new')}</h2>
                {notifications.length > 0 && (
                    <span className='bg-primary/15 text-primary rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums'>
                        {notifications.length}
                    </span>
                )}
            </header>
            {shown.length === 0 ? (
                <p className='text-muted-foreground mt-3 text-sm'>{t('dashboard.hero.whats_new_empty')}</p>
            ) : (
                <ul className='mt-3 space-y-2.5'>
                    {shown.map((n) => {
                        const Icon = TYPE_ICON[n.type] ?? Megaphone;
                        return (
                            <li key={n.id} className='flex min-w-0 items-start gap-2.5'>
                                <span
                                    className={cn(
                                        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
                                        TYPE_TONE[n.type] ?? TYPE_TONE.info,
                                    )}
                                >
                                    <Icon className='h-3.5 w-3.5' aria-hidden />
                                </span>
                                <div className='min-w-0 flex-1'>
                                    <p className='truncate text-sm font-medium'>{n.title}</p>
                                    <p className='text-muted-foreground line-clamp-2 text-xs'>
                                        {plainText(n.message_markdown)}
                                    </p>
                                </div>
                                {n.is_dismissible && !n.is_sticky && (
                                    <button
                                        type='button'
                                        onClick={() => dismissNotification(n.id)}
                                        className='text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1'
                                        aria-label={t('common.dismiss')}
                                    >
                                        <X className='h-3.5 w-3.5' />
                                    </button>
                                )}
                            </li>
                        );
                    })}
                    {rest > 0 && (
                        <li className='text-muted-foreground text-xs'>
                            {t('dashboard.hero.whats_new_more', { count: String(rest) })}
                        </li>
                    )}
                </ul>
            )}
        </section>
    );
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
        <div className='grid min-w-0 gap-4 lg:grid-cols-3'>
            <section className='border-primary/25 from-primary/25 via-primary/10 to-card/60 relative min-w-0 overflow-hidden rounded-2xl border bg-linear-to-br p-5 sm:p-6 lg:col-span-2'>
                <span
                    className='bg-primary/15 pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full blur-2xl'
                    aria-hidden
                />
                <span
                    className='bg-primary/10 pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full blur-2xl'
                    aria-hidden
                />
                <div className='relative flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
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
                                className='border-border/70 bg-background/50 hover:border-primary/40 hover:bg-background/80 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium backdrop-blur-sm transition-colors'
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
                                    onClick={onArrange}
                                    className='text-muted-foreground hover:text-foreground hover:bg-background/50 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors'
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
            <WhatsNewCard />
        </div>
    );
}
