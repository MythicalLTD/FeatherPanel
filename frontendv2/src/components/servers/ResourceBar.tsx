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

import { cn } from '@/lib/utils';
import { getUsagePercentage, getProgressColor, getProgressWidth } from '@/lib/server-utils';

interface ResourceBarProps {
    label: string;
    used: number;
    limit: number;
    formatter?: (value: number) => string;
}

export function ResourceBar({ label, used, limit, formatter }: ResourceBarProps) {
    const percentage = getUsagePercentage(used, limit);
    const isUnlimited = limit === 0;

    return (
        <div className='flex min-w-0 flex-col gap-1.5'>
            <div className='flex min-w-0 items-center justify-between gap-2 text-[10px] sm:text-xs'>
                <span className='text-muted-foreground shrink truncate font-semibold'>{label}</span>
                <span className='max-w-[min(100%,11rem)] truncate text-right font-medium tabular-nums sm:max-w-none'>
                    {isUnlimited
                        ? `${formatter ? formatter(used) : used} / ∞`
                        : `${formatter ? formatter(used) : used} / ${formatter ? formatter(limit) : limit}`}
                </span>
            </div>
            <div className='bg-muted h-2 overflow-hidden rounded-full'>
                <div
                    className={cn('h-full transition-all duration-500', getProgressColor(percentage, isUnlimited))}
                    style={{ width: getProgressWidth(used, limit) }}
                />
            </div>
        </div>
    );
}
