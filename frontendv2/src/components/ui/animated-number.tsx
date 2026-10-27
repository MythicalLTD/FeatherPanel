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

import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
    value: number;
    /** Animation length in milliseconds. */
    duration?: number;
    format?: (value: number) => string;
    className?: string;
}

/**
 * Counts up from the previous value to the new one with an ease-out curve.
 * Shows the final value straight away when the user prefers reduced motion.
 */
export function AnimatedNumber({ value, duration = 700, format, className }: AnimatedNumberProps) {
    const [display, setDisplay] = useState(value);
    const fromRef = useRef(0);

    useEffect(() => {
        const from = fromRef.current;
        fromRef.current = value;
        const reduce =
            typeof window === 'undefined' ||
            !window.matchMedia ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce || from === value || !Number.isFinite(value)) {
            setDisplay(value);
            return;
        }
        let frame = 0;
        const start = performance.now();
        const decimals = Number.isInteger(value) && Number.isInteger(from) ? 0 : 2;
        const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            const next = from + (value - from) * eased;
            setDisplay(p < 1 ? Number(next.toFixed(decimals)) : value);
            if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [value, duration]);

    return <span className={className}>{format ? format(display) : display.toLocaleString()}</span>;
}
