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
        <div className='flex flex-col gap-1.5'>
            <div className='flex items-center justify-between text-xs'>
                <span className='font-semibold text-muted-foreground'>{label}</span>
                <span className='font-medium'>
                    {isUnlimited
                        ? `${formatter ? formatter(used) : used} / ∞`
                        : `${formatter ? formatter(used) : used} / ${formatter ? formatter(limit) : limit}`}
                </span>
            </div>
            <div className='h-2 bg-muted rounded-full overflow-hidden'>
                <div
                    className={cn('h-full transition-all duration-500', getProgressColor(percentage, isUnlimited))}
                    style={{ width: getProgressWidth(used, limit) }}
                />
            </div>
        </div>
    );
}
