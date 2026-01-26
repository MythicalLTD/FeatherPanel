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
                    className='group relative overflow-hidden rounded-3xl bg-card/30 backdrop-blur-sm border border-border/50 p-6 flex flex-col md:flex-row md:items-center gap-6'
                >
                    <div className='h-16 w-16 rounded-2xl bg-secondary/50 animate-pulse shrink-0' />

                    <div className='flex-1 space-y-3 min-w-0'>
                        <div className='flex flex-wrap items-center gap-3'>
                            <div className='h-6 w-48 bg-secondary/50 rounded-lg animate-pulse' />

                            <div className='h-5 w-20 bg-secondary/30 rounded-md animate-pulse' />
                        </div>

                        <div className='h-4 w-32 bg-secondary/30 rounded-lg animate-pulse' />

                        <div className='flex gap-4 pt-1'>
                            <div className='h-3 w-24 bg-secondary/20 rounded-md animate-pulse' />
                            <div className='h-3 w-32 bg-secondary/20 rounded-md animate-pulse' />
                            <div className='h-3 w-20 bg-secondary/20 rounded-md animate-pulse' />
                        </div>
                    </div>

                    <div className='flex items-center gap-2 md:self-center'>
                        <div className='h-9 w-9 bg-secondary/40 rounded-lg animate-pulse' />
                        <div className='h-9 w-9 bg-secondary/40 rounded-lg animate-pulse' />
                    </div>
                </div>
            ))}
        </div>
    );
}
