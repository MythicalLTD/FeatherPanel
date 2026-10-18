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

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface SparklineProps {
    /** One value per time bucket; null leaves a gap (nothing sampled). */
    values: ReadonlyArray<number | null>;
    /** Top of the scale. Defaults to the highest value, so the line uses the full height. */
    max?: number;
    /** Accessible summary; the chart is decorative without it. */
    label?: string;
    /** Draw a soft area under the line. */
    area?: boolean;
    className?: string;
}

/** Tiny line chart in currentColor. Gaps in the data stay gaps instead of dropping to zero. */
export function Sparkline({ values, max, label, area = true, className }: SparklineProps) {
    const { line, fill } = useMemo(() => {
        const width = Math.max(1, values.length - 1);
        const top = max && max > 0 ? max : Math.max(0, ...values.map((v) => v ?? 0));
        const scale = top > 0 ? top : 1;
        const y = (v: number) => 98 - Math.min(1, Math.max(0, v / scale)) * 94;
        const lineParts: string[] = [];
        const fillParts: string[] = [];
        let run: [number, number][] = [];
        const flush = () => {
            if (run.length === 0) return;
            // A lone sample still gets a short visible stroke.
            const points =
                run.length === 1 ? [run[0], [Math.min(width, run[0][0] + 0.6), run[0][1]] as [number, number]] : run;
            lineParts.push(points.map(([x, py], i) => `${i === 0 ? 'M' : 'L'}${x} ${py}`).join(''));
            const first = points[0];
            const last = points[points.length - 1];
            fillParts.push(`M${first[0]} 100` + points.map(([x, py]) => `L${x} ${py}`).join('') + `L${last[0]} 100Z`);
            run = [];
        };
        values.forEach((value, i) => {
            if (value === null) flush();
            else run.push([values.length === 1 ? 0 : i, y(value)]);
        });
        flush();
        return { line: lineParts.join(''), fill: fillParts.join('') };
    }, [values, max]);

    const width = Math.max(1, values.length - 1);

    return (
        <svg
            viewBox={`0 0 ${width} 100`}
            preserveAspectRatio='none'
            className={cn('block h-8 w-full overflow-visible', className)}
            role={label ? 'img' : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
        >
            {area && fill && <path d={fill} fill='currentColor' fillOpacity={0.14} stroke='none' />}
            {line && (
                <path
                    d={line}
                    fill='none'
                    stroke='currentColor'
                    strokeWidth={1.5}
                    strokeLinejoin='round'
                    strokeLinecap='round'
                    vectorEffect='non-scaling-stroke'
                />
            )}
        </svg>
    );
}
