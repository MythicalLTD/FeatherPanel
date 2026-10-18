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

import type { ReactNode } from 'react';
import Link from 'next/link';
import { AlertOctagon, AlertTriangle, ArrowRight, Info, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Card used by every dashboard widget: title row with an optional link, then content. */
export function DashboardPanel({
    title,
    icon: Icon,
    count,
    action,
    children,
    flush = false,
    className,
}: {
    title: string;
    icon?: LucideIcon;
    count?: number;
    action?: { label: string; href: string };
    children: ReactNode;
    /** Rows run edge to edge (dividers) instead of sitting in a padded body. */
    flush?: boolean;
    className?: string;
}) {
    return (
        <section className={cn('fp-surface min-w-0 overflow-hidden rounded-xl border', className)}>
            <header className='flex min-w-0 items-center justify-between gap-3 px-4 pt-3.5 pb-2.5'>
                <div className='flex min-w-0 items-center gap-2'>
                    {Icon && <Icon className='text-muted-foreground h-4 w-4 shrink-0' aria-hidden />}
                    <h2 className='truncate text-sm font-semibold'>{title}</h2>
                    {typeof count === 'number' && (
                        <span className='bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums'>
                            {count}
                        </span>
                    )}
                </div>
                {action && (
                    <Link
                        href={action.href}
                        className='text-primary hover:text-primary/80 inline-flex shrink-0 items-center gap-1 text-xs font-medium'
                    >
                        {action.label}
                        <ArrowRight className='h-3 w-3' aria-hidden />
                    </Link>
                )}
            </header>
            <div className={cn(flush ? 'divide-border/50 border-border/50 divide-y border-t' : 'px-4 pb-4')}>
                {children}
            </div>
        </section>
    );
}

export function DashboardStatTile({
    icon: Icon,
    label,
    value,
    hint,
    href,
    tone = 'default',
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    hint?: string;
    href: string;
    tone?: 'default' | 'warning';
}) {
    return (
        <Link
            href={href}
            className='fp-surface fp-surface-interactive flex min-w-0 flex-col rounded-xl border p-3 sm:p-4'
        >
            <span className='flex min-w-0 items-center gap-2'>
                <span className='fp-icon-tile flex h-7 w-7 shrink-0 items-center justify-center rounded-lg'>
                    <Icon className='h-4 w-4' />
                </span>
                <span className='text-muted-foreground truncate text-xs font-medium sm:text-sm'>{label}</span>
            </span>
            <span className='mt-2.5 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl'>{value}</span>
            {hint && (
                <span
                    className={cn(
                        'mt-0.5 truncate text-xs',
                        tone === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
                    )}
                >
                    {hint}
                </span>
            )}
        </Link>
    );
}

export type AttentionTone = 'danger' | 'warning' | 'info';

export interface AttentionItem {
    id: string;
    tone: AttentionTone;
    title: string;
    description?: string | null;
    href: string;
}

const TONES: Record<AttentionTone, { icon: LucideIcon; className: string }> = {
    danger: {
        icon: AlertOctagon,
        className: 'border-rose-500/30 bg-rose-500/8 text-rose-700 dark:text-rose-300',
    },
    warning: {
        icon: AlertTriangle,
        className: 'border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-300',
    },
    info: {
        icon: Info,
        className: 'border-sky-500/30 bg-sky-500/8 text-sky-700 dark:text-sky-300',
    },
};

/** Items that need the user, worst first. Renders nothing when there are none. */
export function DashboardAttention({
    title,
    items,
    max = 4,
    moreLabel,
}: {
    title: string;
    items: AttentionItem[];
    max?: number;
    moreLabel?: (count: number) => string;
}) {
    if (items.length === 0) return null;
    const order: AttentionTone[] = ['danger', 'warning', 'info'];
    const sorted = [...items].sort((a, b) => order.indexOf(a.tone) - order.indexOf(b.tone));
    const shown = sorted.slice(0, max);
    const rest = sorted.length - shown.length;

    return (
        <section aria-label={title} className='space-y-2'>
            <h2 className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>{title}</h2>
            <div className='grid gap-2 sm:grid-cols-2'>
                {shown.map((item) => {
                    const tone = TONES[item.tone];
                    const Icon = tone.icon;
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={cn(
                                'flex min-w-0 items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:brightness-110',
                                tone.className,
                            )}
                        >
                            <Icon className='mt-0.5 h-4 w-4 shrink-0' aria-hidden />
                            <span className='min-w-0 flex-1'>
                                <span className='block truncate text-sm font-medium'>{item.title}</span>
                                {item.description && (
                                    <span className='block truncate text-xs opacity-80'>{item.description}</span>
                                )}
                            </span>
                            <ArrowRight className='mt-0.5 h-4 w-4 shrink-0 opacity-60' aria-hidden />
                        </Link>
                    );
                })}
            </div>
            {rest > 0 && moreLabel && <p className='text-muted-foreground text-xs'>{moreLabel(rest)}</p>}
        </section>
    );
}
