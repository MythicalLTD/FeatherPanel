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

import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';
import type { DaemonStatus } from './types';

export const DAEMON_STATUS_STYLES: Record<DaemonStatus, { pill: string; dot: string; text: string }> = {
    healthy: {
        pill: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        dot: 'bg-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
    },
    degraded: {
        pill: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
    },
    unhealthy: {
        pill: 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400',
        dot: 'bg-red-500',
        text: 'text-red-600 dark:text-red-400',
    },
    unreachable: {
        pill: 'border-zinc-500/25 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300',
        dot: 'bg-zinc-500',
        text: 'text-zinc-600 dark:text-zinc-300',
    },
    unsupported: {
        pill: 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400',
        dot: 'bg-sky-500',
        text: 'text-sky-600 dark:text-sky-400',
    },
};

interface DaemonHealthBadgeProps {
    status: DaemonStatus | null | undefined;
    failingChecks?: string[];
    size?: 'sm' | 'md';
    className?: string;
}

/** Pill showing a node daemon's readiness: healthy, degraded, unhealthy, unreachable or unsupported. */
export function DaemonHealthBadge({ status, failingChecks, size = 'sm', className }: DaemonHealthBadgeProps) {
    const { t } = useTranslation();
    if (!status) {
        return (
            <span
                className={cn(
                    'border-border bg-muted/40 text-muted-foreground inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
                    className,
                )}
            >
                <span className='bg-muted-foreground/40 h-1.5 w-1.5 rounded-full' aria-hidden />
                {t('admin.daemonHealth.status.checking')}
            </span>
        );
    }
    const style = DAEMON_STATUS_STYLES[status] ?? DAEMON_STATUS_STYLES.unreachable;
    const title =
        failingChecks && failingChecks.length > 0
            ? t('admin.daemonHealth.failing_checks', { checks: failingChecks.join(', ') })
            : t(`admin.daemonHealth.status_hint.${status}`);

    return (
        <span
            title={title}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap',
                size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
                style.pill,
                className,
            )}
        >
            <span className={cn('rounded-full', size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2', style.dot)} aria-hidden />
            {t(`admin.daemonHealth.status.${status}`)}
        </span>
    );
}
