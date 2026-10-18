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

import dynamic from 'next/dynamic';

/** Same footprint as the real chart grid so the console does not jump when recharts arrives. */
function ServerPerformanceSkeleton() {
    return (
        <div className='grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5' aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                    key={i}
                    className='border-border/50 bg-card/50 min-w-0 rounded-xl border p-4 backdrop-blur-xl sm:p-5'
                >
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
 * the graphs, keeping it out of the initial server/webspace console bundle.
 */
const ServerPerformance = dynamic(() => import('@/components/server/ServerPerformance'), {
    ssr: false,
    loading: () => <ServerPerformanceSkeleton />,
});

export default ServerPerformance;
