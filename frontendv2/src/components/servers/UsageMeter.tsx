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

/** Label, value and a thin bar (the dashboard server meters); green, amber at 70%, rose at 90%. A null percent means no limit (neutral bar). */
export function UsageMeter({
    label,
    value,
    percent,
    inline = false,
}: {
    label: string;
    value: string;
    percent: number | null;
    /** One line: label, bar, value. For dense lists such as admin tables. */
    inline?: boolean;
}) {
    const tone =
        percent === null
            ? 'bg-primary/60'
            : percent >= 90
              ? 'bg-rose-500'
              : percent >= 70
                ? 'bg-amber-500'
                : 'bg-emerald-500';
    const bar = (
        <div
            className={cn(
                'h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none',
                tone,
            )}
            style={{ width: `${percent === null ? 0 : Math.min(100, Math.max(percent, 0))}%` }}
        />
    );
    if (inline) {
        return (
            <div className='flex min-w-0 items-center gap-2 text-[11px] leading-none' title={`${label}: ${value}`}>
                <span className='text-muted-foreground w-8 shrink-0 font-medium'>{label}</span>
                <div className='bg-muted h-1 min-w-10 flex-1 overflow-hidden rounded-full'>{bar}</div>
                <span className='w-32 shrink-0 truncate text-right font-medium tabular-nums'>{value}</span>
            </div>
        );
    }
    return (
        <div className='min-w-0'>
            <div className='flex flex-col gap-0.5 text-[11px] leading-none sm:flex-row sm:items-baseline sm:justify-between sm:gap-1'>
                <span className='text-muted-foreground font-medium'>{label}</span>
                <span className='truncate font-medium tabular-nums'>{value}</span>
            </div>
            <div className='bg-muted mt-1.5 h-1 overflow-hidden rounded-full'>{bar}</div>
        </div>
    );
}
