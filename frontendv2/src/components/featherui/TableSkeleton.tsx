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

interface TableSkeletonProps {
    count?: number;
    className?: string;
}

export function TableSkeleton({ count = 5, className }: TableSkeletonProps) {
    return (
        <div className={cn('grid grid-cols-1 gap-6', className)}>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className='group bg-card/30 border-border/50 relative flex flex-col gap-6 overflow-hidden rounded-3xl border p-6 backdrop-blur-sm md:flex-row md:items-center'
                >
                    <div className='bg-secondary/50 h-16 w-16 shrink-0 animate-pulse rounded-2xl' />

                    <div className='min-w-0 flex-1 space-y-3'>
                        <div className='flex flex-wrap items-center gap-3'>
                            <div className='bg-secondary/50 h-6 w-48 animate-pulse rounded-lg' />

                            <div className='bg-secondary/30 h-5 w-20 animate-pulse rounded-md' />
                        </div>

                        <div className='bg-secondary/30 h-4 w-32 animate-pulse rounded-lg' />

                        <div className='flex gap-4 pt-1'>
                            <div className='bg-secondary/20 h-3 w-24 animate-pulse rounded-md' />
                            <div className='bg-secondary/20 h-3 w-32 animate-pulse rounded-md' />
                            <div className='bg-secondary/20 h-3 w-20 animate-pulse rounded-md' />
                        </div>
                    </div>

                    <div className='flex items-center gap-2 md:self-center'>
                        <div className='bg-secondary/40 h-9 w-9 animate-pulse rounded-lg' />
                        <div className='bg-secondary/40 h-9 w-9 animate-pulse rounded-lg' />
                    </div>
                </div>
            ))}
        </div>
    );
}
