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

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface RunItem {
    id: string;
    order: number;
    node: ReactNode;
}

const WIDE = '(min-width: 64rem)';

/** Height of a two-up grid holding the given heights in order. */
function pairedHeight(heights: number[], gap: number): number {
    let total = 0;
    for (let i = 0; i < heights.length; i += 2) {
        total += Math.max(heights[i], heights[i + 1] ?? 0) + gap;
    }
    return total;
}

/**
 * A run of widgets between two full-width ones: medium widgets in a wide column, small ones
 * beside them. When the side column would be much taller (a short server list, say), its last
 * widgets move under the wide column two by two, whichever split makes the run shortest.
 * On narrow screens everything is one column in list order.
 */
export function DashboardRun({
    main,
    side,
    sideFirst,
    compact,
}: {
    main: RunItem[];
    side: RunItem[];
    sideFirst: boolean;
    compact: boolean;
}) {
    const rootRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLDivElement>(null);
    const [spill, setSpill] = useState(0);
    const gapPx = compact ? 12 : 20;
    const sideKey = side.map((item) => item.id).join(',');

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root || typeof ResizeObserver === 'undefined') return;
        const media = window.matchMedia(WIDE);

        const measure = () => {
            if (!media.matches) {
                setSpill(0);
                return;
            }
            const mainHeight = mainRef.current?.getBoundingClientRect().height ?? 0;
            const heights = sideKey.split(',').map((id) => {
                const el = root.querySelector<HTMLElement>(`[data-run-item="${CSS.escape(id)}"]`);
                return el ? el.getBoundingClientRect().height : 0;
            });
            let best = 0;
            let bestHeight = Infinity;
            for (let k = 0; k <= heights.length; k++) {
                const kept = heights.slice(0, heights.length - k);
                const moved = heights.slice(heights.length - k);
                const sideHeight = kept.reduce((sum, h) => sum + h + (h > 0 ? gapPx : 0), 0);
                const mainTotal = mainHeight + (moved.length ? gapPx + pairedHeight(moved, gapPx) : 0);
                const height = Math.max(sideHeight, mainTotal);
                // Only move widgets for a clear gain, so the layout does not jump around.
                if (height < bestHeight - 40) {
                    best = k;
                    bestHeight = height;
                }
            }
            setSpill((prev) => (prev === best ? prev : best));
        };

        const observer = new ResizeObserver(() => measure());
        observer.observe(root);
        if (mainRef.current) observer.observe(mainRef.current);
        root.querySelectorAll('[data-run-item]').forEach((el) => observer.observe(el));
        media.addEventListener('change', measure);
        measure();
        return () => {
            observer.disconnect();
            media.removeEventListener('change', measure);
        };
        // Re-attach after a spill change: moved widgets are new elements.
    }, [sideKey, gapPx, spill]);

    const gap = compact ? 'gap-3' : 'gap-4 lg:gap-5';
    const kept = side.slice(0, side.length - spill);
    const moved = side.slice(side.length - spill);
    const wrap = (item: RunItem) => (
        <div
            key={item.id}
            data-run-item={item.id}
            style={{ order: item.order } as CSSProperties}
            className='fp-collapse-empty-block min-w-0'
        >
            {item.node}
        </div>
    );

    return (
        <div ref={rootRef} className={cn('fp-dash-run flex flex-col lg:grid lg:grid-cols-3 lg:items-start', gap)}>
            <div
                className={cn(
                    'fp-dash-main contents lg:col-span-2 lg:flex lg:flex-col',
                    gap,
                    sideFirst ? 'lg:order-2' : 'lg:order-1',
                )}
            >
                <div ref={mainRef} className={cn('contents lg:flex lg:flex-col', gap)}>
                    {main.map(wrap)}
                </div>
                {moved.length > 0 && (
                    <div className={cn('contents lg:grid lg:grid-cols-2 lg:items-start', gap)}>{moved.map(wrap)}</div>
                )}
            </div>
            <div
                className={cn(
                    'fp-dash-side contents lg:flex lg:flex-col',
                    compact ? 'gap-3' : 'gap-4',
                    sideFirst ? 'lg:order-1' : 'lg:order-2',
                )}
            >
                {kept.map(wrap)}
            </div>
        </div>
    );
}
