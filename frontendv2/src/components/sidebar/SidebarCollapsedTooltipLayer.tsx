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

import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export const SIDEBAR_TOOLTIP_ATTR = 'data-sidebar-tooltip';

export function sidebarTooltipProps(label: string | undefined) {
    if (!label) return {};
    return { [SIDEBAR_TOOLTIP_ATTR]: label } as { 'data-sidebar-tooltip': string };
}

type SidebarCollapsedTooltipLayerProps = {
    containerRef: RefObject<HTMLElement | null>;
    enabled: boolean;
    side: 'left' | 'right';
};

export function SidebarCollapsedTooltipLayer({ containerRef, enabled, side }: SidebarCollapsedTooltipLayerProps) {
    const [tip, setTip] = useState<{ label: string; x: number; y: number } | null>(null);
    const [mounted, setMounted] = useState(false);

    useLayoutEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!enabled) {
            setTip(null);
            return;
        }

        const root = containerRef.current;
        if (!root) return;

        const findTarget = (node: EventTarget | null) =>
            (node as HTMLElement | null)?.closest?.(`[${SIDEBAR_TOOLTIP_ATTR}]`) as HTMLElement | null;

        const showFor = (el: HTMLElement) => {
            const label = el.getAttribute(SIDEBAR_TOOLTIP_ATTR);
            if (!label) return;
            const rect = el.getBoundingClientRect();
            const x = side === 'right' ? rect.left - 8 : rect.right + 8;
            setTip({ label, x, y: rect.top + rect.height / 2 });
        };

        const onPointerOver = (event: PointerEvent) => {
            const target = findTarget(event.target);
            if (target && root.contains(target)) showFor(target);
        };

        const onPointerOut = (event: PointerEvent) => {
            const leaving = findTarget(event.target);
            const entering = findTarget(event.relatedTarget);
            if (leaving && leaving !== entering) setTip(null);
        };

        const onFocusIn = (event: FocusEvent) => {
            const target = findTarget(event.target);
            if (target && root.contains(target)) showFor(target);
        };

        const onFocusOut = (event: FocusEvent) => {
            const leaving = findTarget(event.target);
            const entering = findTarget(event.relatedTarget);
            if (leaving && leaving !== entering) setTip(null);
        };

        const onScroll = () => setTip(null);

        root.addEventListener('pointerover', onPointerOver);
        root.addEventListener('pointerout', onPointerOut);
        root.addEventListener('focusin', onFocusIn);
        root.addEventListener('focusout', onFocusOut);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onScroll);

        return () => {
            root.removeEventListener('pointerover', onPointerOver);
            root.removeEventListener('pointerout', onPointerOut);
            root.removeEventListener('focusin', onFocusIn);
            root.removeEventListener('focusout', onFocusOut);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onScroll);
        };
    }, [containerRef, enabled, side]);

    if (!mounted || !enabled || !tip) return null;

    return createPortal(
        <div
            className='pointer-events-none fixed z-[200]'
            style={{
                left: tip.x,
                top: tip.y,
                transform: side === 'right' ? 'translate(-100%, -50%)' : 'translateY(-50%)',
            }}
            role='tooltip'
        >
            <div
                className={cn(
                    'border-primary/30 bg-card text-card-foreground relative rounded-lg border px-3 py-2 text-sm font-semibold shadow-xl shadow-black/40',
                    'ring-primary/20 ring-1',
                    'max-w-[min(18rem,90vw)] truncate whitespace-nowrap',
                )}
            >
                <span
                    className={cn(
                        'border-primary/30 bg-card absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border',
                        side === 'right' ? '-right-1.5 border-t-0 border-l-0' : '-left-1.5 border-r-0 border-b-0',
                    )}
                    aria-hidden
                />
                {tip.label}
            </div>
        </div>,
        document.body,
    );
}
