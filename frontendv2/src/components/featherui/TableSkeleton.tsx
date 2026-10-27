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
    // Same shape as DataTable: table rows on desktop, compact cards on phones and tablets.
    const pulse = 'bg-muted animate-pulse motion-reduce:animate-none';
    const rows = Array.from({ length: count });
    return (
        <div className={cn('animate-in fade-in duration-300 motion-reduce:animate-none', className)} aria-hidden>
            <div className='fp-surface-solid hidden overflow-hidden rounded-xl border lg:block'>
                <div className='flex items-center gap-6 border-b border-[var(--fp-surface-border)] px-4 py-3'>
                    <div className={cn(pulse, 'h-3 w-24 rounded')} />
                    <div className={cn(pulse, 'h-3 w-16 rounded')} />
                    <div className={cn(pulse, 'h-3 w-20 rounded')} />
                    <div className={cn(pulse, 'ml-auto h-3 w-12 rounded')} />
                </div>
                <div className='divide-y divide-[var(--fp-surface-border)]'>
                    {rows.map((_, i) => (
                        <div key={i} className='flex items-center gap-6 px-4 py-3'>
                            <div className='flex min-w-0 flex-1 items-center gap-3'>
                                <div className={cn(pulse, 'h-9 w-9 shrink-0 rounded-lg')} />
                                <div className='min-w-0 flex-1 space-y-2'>
                                    <div className={cn(pulse, 'h-3.5 w-48 max-w-full rounded')} />
                                    <div className='bg-muted/70 h-3 w-32 max-w-full animate-pulse rounded motion-reduce:animate-none' />
                                </div>
                            </div>
                            <div className={cn(pulse, 'h-3.5 w-24 rounded')} />
                            <div className={cn(pulse, 'h-5 w-16 rounded-full')} />
                            <div className={cn(pulse, 'h-8 w-8 rounded-lg')} />
                        </div>
                    ))}
                </div>
            </div>
            <div className='space-y-2 lg:hidden'>
                {rows.map((_, i) => (
                    <div key={i} className='fp-surface-solid rounded-xl border p-3.5'>
                        <div className='flex items-center gap-3'>
                            <div className={cn(pulse, 'h-9 w-9 shrink-0 rounded-lg')} />
                            <div className='min-w-0 flex-1 space-y-2'>
                                <div className={cn(pulse, 'h-3.5 w-2/5 rounded')} />
                                <div className='bg-muted/70 h-3 w-3/5 animate-pulse rounded motion-reduce:animate-none' />
                            </div>
                        </div>
                        <div className='mt-3 flex items-center justify-between border-t border-[var(--fp-surface-border)] pt-2.5'>
                            <div className={cn(pulse, 'h-5 w-16 rounded-full')} />
                            <div className={cn(pulse, 'h-8 w-8 rounded-lg')} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
