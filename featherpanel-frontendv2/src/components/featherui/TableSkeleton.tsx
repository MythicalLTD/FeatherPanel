/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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
                    {/* Icon Skeleton */}
                    <div className='h-16 w-16 rounded-2xl bg-secondary/50 animate-pulse shrink-0' />

                    {/* Content Skeleton */}
                    <div className='flex-1 space-y-3 min-w-0'>
                        <div className='flex flex-wrap items-center gap-3'>
                            {/* Title */}
                            <div className='h-6 w-48 bg-secondary/50 rounded-lg animate-pulse' />
                            {/* Badge */}
                            <div className='h-5 w-20 bg-secondary/30 rounded-md animate-pulse' />
                        </div>

                        {/* Subtitle */}
                        <div className='h-4 w-32 bg-secondary/30 rounded-lg animate-pulse' />

                        {/* Description Lines */}
                        <div className='flex gap-4 pt-1'>
                            <div className='h-3 w-24 bg-secondary/20 rounded-md animate-pulse' />
                            <div className='h-3 w-32 bg-secondary/20 rounded-md animate-pulse' />
                            <div className='h-3 w-20 bg-secondary/20 rounded-md animate-pulse' />
                        </div>
                    </div>

                    {/* Actions Skeleton */}
                    <div className='flex items-center gap-2 md:self-center'>
                        <div className='h-9 w-9 bg-secondary/40 rounded-lg animate-pulse' />
                        <div className='h-9 w-9 bg-secondary/40 rounded-lg animate-pulse' />
                    </div>
                </div>
            ))}
        </div>
    );
}
