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

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface OverflowTextProps {
    children: string | number | null | undefined;
    className?: string;
}

export function OverflowText({ children, className }: OverflowTextProps) {
    const viewportRef = useRef<HTMLSpanElement>(null);
    const contentRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const viewport = viewportRef.current;
        const content = contentRef.current;
        if (!viewport || !content) return;

        const mobile = window.matchMedia('(max-width: 767px)');
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let frame = 0;
        let visible = false;
        let interrupted = false;

        const stop = () => cancelAnimationFrame(frame);
        const interrupt = () => {
            interrupted = true;
            stop();
        };

        const update = () => {
            stop();
            const distance = viewport.scrollWidth - viewport.clientWidth;
            viewport.dataset.overflow = String(mobile.matches && !reducedMotion.matches && distance > 1);
            if (!mobile.matches || reducedMotion.matches || distance <= 1) {
                viewport.scrollLeft = 0;
                return;
            }
            if (interrupted) return;
            viewport.scrollLeft = 0;
            if (!visible || document.hidden) {
                return;
            }

            const direction = getComputedStyle(viewport).direction === 'rtl' ? -1 : 1;
            const travelTime = (distance / 24) * 1000;
            const pause = 2000;
            let started: number | undefined;

            // One pass reveals both ends, then rests. Touch or focus hands scrolling to the user.
            const tick = (now: number) => {
                started ??= now;
                const elapsed = now - started;
                const returning = elapsed - pause * 2 - travelTime;
                const position =
                    returning > 0
                        ? distance * (1 - Math.min(returning / travelTime, 1))
                        : distance * Math.max(0, Math.min((elapsed - pause) / travelTime, 1));
                viewport.scrollLeft = direction * position;
                if (elapsed < pause * 2 + travelTime * 2) frame = requestAnimationFrame(tick);
            };
            frame = requestAnimationFrame(tick);
        };

        const resizeObserver = new ResizeObserver(update);
        resizeObserver.observe(viewport);
        resizeObserver.observe(content);
        const intersectionObserver = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            update();
        });
        intersectionObserver.observe(viewport);

        const focusTarget = viewport.closest('a, button') ?? viewport;
        viewport.addEventListener('pointerdown', interrupt, { passive: true });
        viewport.addEventListener('wheel', interrupt, { passive: true });
        focusTarget.addEventListener('focusin', interrupt);
        mobile.addEventListener('change', update);
        reducedMotion.addEventListener('change', update);
        document.addEventListener('visibilitychange', update);
        update();

        return () => {
            stop();
            resizeObserver.disconnect();
            intersectionObserver.disconnect();
            viewport.removeEventListener('pointerdown', interrupt);
            viewport.removeEventListener('wheel', interrupt);
            focusTarget.removeEventListener('focusin', interrupt);
            mobile.removeEventListener('change', update);
            reducedMotion.removeEventListener('change', update);
            document.removeEventListener('visibilitychange', update);
        };
    }, [children]);

    return (
        <span ref={viewportRef} className={cn('fp-overflow-text', className)} title={String(children ?? '')}>
            <span ref={contentRef} className='fp-overflow-text-content'>
                {children}
            </span>
        </span>
    );
}
