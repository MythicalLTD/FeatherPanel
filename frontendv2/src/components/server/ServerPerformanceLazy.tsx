/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    10|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import React, { Suspense, lazy, useCallback, useState } from 'react';
import type ServerPerformanceComponent from '@/components/server/ServerPerformance';
import { ChunkErrorBoundary } from '@/components/common/ChunkErrorBoundary';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

type ServerPerformanceProps = React.ComponentProps<typeof ServerPerformanceComponent>;

const loadServerPerformance = () => import('@/components/server/ServerPerformance');

/** Same footprint as the real chart grid so the console does not jump when recharts arrives. */
function ServerPerformanceSkeleton({ count }: { count: number }) {
    return (
        <div
            className={cn(
                'grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
                count >= 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-4',
            )}
            aria-hidden
        >
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className='fp-surface min-w-0 rounded-xl border p-4 backdrop-blur-xl sm:p-5'>
                    <div className='mb-3 flex items-center justify-between gap-2'>
                        <div className='bg-muted/50 h-4 w-20 animate-pulse rounded-md' />
                        <div className='bg-muted/40 h-4 w-8 animate-pulse rounded-md' />
                    </div>
                    <div className='space-y-3'>
                        <div className='bg-muted/30 h-3 w-full animate-pulse rounded-md' />
                        <div className='bg-muted/20 h-[140px] w-full animate-pulse rounded-lg' />
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Lazy-loaded performance charts: recharts is only fetched when a console actually shows
 * the graphs, keeping it out of the initial server/webspace console bundle. A failed chunk
 * request shows a retry action instead of an endless skeleton.
 */
export default function ServerPerformance(props: ServerPerformanceProps) {
    const { t } = useTranslation();
    // A fresh lazy() per retry so a rejected import is attempted again.
    const [LazyCharts, setLazyCharts] = useState(() => lazy(loadServerPerformance));
    const chartCount = props.showDiskIo === false ? 4 : 5;

    const renderFailure = useCallback(
        (retry: () => void) => (
            <div className='fp-surface text-muted-foreground flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm'>
                <span>{t('common.error')}</span>
                <button
                    type='button'
                    onClick={() => {
                        setLazyCharts(() => lazy(loadServerPerformance));
                        retry();
                    }}
                    className='border-border hover:bg-muted text-foreground min-h-10 rounded-lg border px-3 py-1.5 font-medium'
                >
                    {t('common.retry')}
                </button>
            </div>
        ),
        [t],
    );

    return (
        <ChunkErrorBoundary fallback={renderFailure}>
            <Suspense fallback={<ServerPerformanceSkeleton count={chartCount} />}>
                <LazyCharts {...props} />
            </Suspense>
        </ChunkErrorBoundary>
    );
}
