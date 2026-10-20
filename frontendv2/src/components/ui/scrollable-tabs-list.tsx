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

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TabsList } from '@/components/ui/tabs';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

type ScrollableTabsListProps = React.ComponentPropsWithoutRef<typeof TabsList> & {
    /** Classes for the outer wrapper (layout / width). */
    wrapperClassName?: string;
};

/**
 * Horizontal tab bar that never clips tabs: it scrolls, shows edge fades and arrow buttons while
 * there is more to see, and keeps the active tab in view. When the list is laid out vertically
 * (e.g. `lg:flex-col`) nothing overflows horizontally and the extras stay hidden.
 */
export function ScrollableTabsList({ className, wrapperClassName, children, ...props }: ScrollableTabsListProps) {
    const { t } = useTranslation();
    const listRef = React.useRef<HTMLDivElement | null>(null);
    const [edges, setEdges] = React.useState({ start: false, end: false });

    const update = React.useCallback(() => {
        const el = listRef.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        setEdges({ start: el.scrollLeft > 2, end: max > 2 && el.scrollLeft < max - 2 });
    }, []);

    const revealActive = React.useCallback((smooth: boolean) => {
        const el = listRef.current;
        if (!el || el.scrollWidth <= el.clientWidth) return;
        const active = el.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
        if (!active) return;
        const left = active.offsetLeft - el.offsetLeft;
        const target = left - (el.clientWidth - active.offsetWidth) / 2;
        el.scrollTo({ left: Math.max(0, target), behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    React.useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        update();
        revealActive(false);
        const resize = new ResizeObserver(update);
        resize.observe(el);
        const mutation = new MutationObserver(() => {
            revealActive(true);
            update();
        });
        mutation.observe(el, { subtree: true, attributes: true, attributeFilter: ['data-state'], childList: true });
        el.addEventListener('scroll', update, { passive: true });
        return () => {
            resize.disconnect();
            mutation.disconnect();
            el.removeEventListener('scroll', update);
        };
    }, [update, revealActive]);

    const scrollBy = (direction: 1 | -1) => {
        const el = listRef.current;
        if (!el) return;
        el.scrollBy({ left: direction * Math.max(160, el.clientWidth * 0.6), behavior: 'smooth' });
    };

    const arrow =
        'bg-background/90 border-border/60 text-muted-foreground hover:text-foreground absolute top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-colors';

    return (
        <div className={cn('relative min-w-0', wrapperClassName)}>
            <TabsList
                ref={listRef}
                className={cn(
                    'max-w-full justify-start overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                    className,
                )}
                {...props}
            >
                {children}
            </TabsList>
            <div
                aria-hidden
                className={cn(
                    'from-background pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-[inherit] bg-gradient-to-r to-transparent transition-opacity',
                    edges.start ? 'opacity-100' : 'opacity-0',
                )}
            />
            <div
                aria-hidden
                className={cn(
                    'from-background pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-[inherit] bg-gradient-to-l to-transparent transition-opacity',
                    edges.end ? 'opacity-100' : 'opacity-0',
                )}
            />
            {edges.start && (
                <button
                    type='button'
                    className={cn(arrow, 'left-1')}
                    onClick={() => scrollBy(-1)}
                    aria-label={t('common.scrollLeft')}
                    title={t('common.scrollLeft')}
                >
                    <ChevronLeft className='h-4 w-4' />
                </button>
            )}
            {edges.end && (
                <button
                    type='button'
                    className={cn(arrow, 'right-1')}
                    onClick={() => scrollBy(1)}
                    aria-label={t('common.scrollRight')}
                    title={t('common.scrollRight')}
                >
                    <ChevronRight className='h-4 w-4' />
                </button>
            )}
        </div>
    );
}
