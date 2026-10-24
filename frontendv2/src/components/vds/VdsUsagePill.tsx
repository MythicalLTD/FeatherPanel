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

/**
 * Compact "used / max" quota pill with a slim progress bar, shared by VDS pages
 * (snapshots, firewall rules, schedules) so quotas read the same everywhere.
 */
export function VdsUsagePill({ used, max, className }: { used: number; max: number; className?: string }) {
    const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
    const tone = max > 0 && used >= max ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-primary';
    return (
        <span
            className={cn(
                'bg-primary/5 text-primary border-primary/20 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap tabular-nums',
                className,
            )}
            title={`${used} / ${max}`}
        >
            {used} / {max}
            {max > 0 && (
                <span className='bg-primary/15 relative h-1.5 w-12 overflow-hidden rounded-full' aria-hidden>
                    <span
                        className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-500', tone)}
                        style={{ width: `${pct}%` }}
                    />
                </span>
            )}
        </span>
    );
}
