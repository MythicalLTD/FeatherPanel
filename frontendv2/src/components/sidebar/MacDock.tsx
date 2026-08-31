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

import {
    createContext,
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
    type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import type { DockSize, SidebarGlow } from '@/hooks/useSidebarPreferences';
import { cn } from '@/lib/utils';

export const DOCK_SIZE_CONFIG = {
    sm: { tile: 36, icon: 18, gap: 4, padY: 6, caption: 14 },
    md: { tile: 42, icon: 20, gap: 5, padY: 8, caption: 14 },
    lg: { tile: 48, icon: 22, gap: 6, padY: 9, caption: 15 },
} as const;

type DockMetrics = { tile: number; icon: number; gap: number; padY: number; caption: number };

type MacDockContextValue = {
    metrics: DockMetrics;
    expanded: boolean;
    showItemLabels: boolean;
    sidebarGlow: SidebarGlow;
};

const MacDockContext = createContext<MacDockContextValue | null>(null);

function useMacDockContext() {
    const ctx = useContext(MacDockContext);
    if (!ctx) throw new Error('MacDockItem must be used within MacDockProvider');
    return ctx;
}

function useHorizontalWheelScroll<T extends HTMLElement>() {
    const ref = useRef<T>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const onWheel = (event: WheelEvent) => {
            if (el.scrollWidth <= el.clientWidth) return;
            event.preventDefault();
            el.scrollLeft += event.deltaY + event.deltaX;
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    return ref;
}

/** Tighter tiles only when the dock is collapsed or very crowded. */
export function resolveDockSize(requested: DockSize, itemCount: number, compact: boolean): DockSize {
    if (compact) {
        if (itemCount >= 14) return 'sm';
        if (requested === 'lg') return 'md';
        return requested;
    }
    if (itemCount >= 24 && requested === 'lg') return 'md';
    return requested;
}

export type MacDockProviderProps = {
    dockSize: DockSize;
    itemCount?: number;
    compact?: boolean;
    showItemLabels?: boolean;
    sidebarGlow?: SidebarGlow;
    className?: string;
    children: ReactNode;
};

export function MacDockProvider({
    dockSize,
    itemCount = 0,
    compact = false,
    showItemLabels = false,
    sidebarGlow = 'none',
    className,
    children,
}: MacDockProviderProps) {
    const expanded = !compact;
    const effectiveSize = resolveDockSize(dockSize, itemCount, compact);
    const metrics = DOCK_SIZE_CONFIG[effectiveSize];
    const shellRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const shell = shellRef.current;
        if (!shell) return;

        const onWheel = (event: WheelEvent) => {
            const track = shell.querySelector<HTMLElement>('.fp-mac-dock-track-scroll');
            if (!track || track.scrollWidth <= track.clientWidth) return;
            event.preventDefault();
            track.scrollLeft += event.deltaY + event.deltaX;
        };

        shell.addEventListener('wheel', onWheel, { passive: false });
        return () => shell.removeEventListener('wheel', onWheel);
    }, []);

    return (
        <MacDockContext.Provider value={{ metrics, expanded, showItemLabels, sidebarGlow }}>
            <div
                ref={shellRef}
                className={cn('fp-mac-dock-provider flex min-w-0 items-end overflow-visible', className)}
                style={{
                    minHeight: metrics.tile + metrics.padY * 2 + (showItemLabels ? metrics.caption + 2 : 0),
                    gap: metrics.gap,
                }}
            >
                {children}
            </div>
        </MacDockContext.Provider>
    );
}

export type MacDockTrackProps = {
    className?: string;
    children: ReactNode;
};

export function MacDockTrack({ className, children }: MacDockTrackProps) {
    const { metrics, showItemLabels } = useMacDockContext();
    const scrollRef = useHorizontalWheelScroll<HTMLDivElement>();
    const captionSpace = showItemLabels ? metrics.caption + 2 : 0;

    return (
        <div className={cn('fp-mac-dock-track relative min-w-0 flex-1 overflow-visible', className)}>
            <div
                ref={scrollRef}
                className='fp-mac-dock-track-scroll hide-scrollbar flex h-full items-end overflow-x-auto overflow-y-visible'
                style={{ gap: metrics.gap, paddingBlock: metrics.padY }}
            >
                <div
                    className='flex items-end overflow-visible'
                    style={{ gap: metrics.gap, paddingBottom: captionSpace ? 0 : undefined }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

export type MacDockCategoryProps = {
    label: string;
};

export function MacDockCategory({ label }: MacDockCategoryProps) {
    const { expanded } = useMacDockContext();

    return (
        <div
            className='fp-mac-dock-category flex shrink-0 items-center gap-1.5 self-center px-1'
            role='separator'
            aria-label={label}
        >
            <div className='from-primary/10 via-primary/40 h-7 w-px shrink-0 bg-gradient-to-b from-transparent to-transparent' />
            <span
                className={cn(
                    'border-primary/25 rounded-md border px-1.5 py-0.5 leading-none font-semibold tracking-wide whitespace-nowrap uppercase',
                    expanded
                        ? 'bg-primary/10 text-primary text-[10px]'
                        : 'bg-muted/50 text-muted-foreground text-[9px]',
                )}
            >
                {label}
            </span>
            <div className='from-primary/10 via-primary/40 h-7 w-px shrink-0 bg-gradient-to-b from-transparent to-transparent' />
        </div>
    );
}

function DockTooltip({
    label,
    anchorRef,
    visible,
}: {
    label: string;
    anchorRef: RefObject<HTMLElement | null>;
    visible: boolean;
}) {
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
    const [mounted, setMounted] = useState(false);

    useLayoutEffect(() => {
        setMounted(true);
    }, []);

    useLayoutEffect(() => {
        if (!visible || !anchorRef.current) {
            setPos(null);
            return;
        }
        const update = () => {
            const rect = anchorRef.current?.getBoundingClientRect();
            if (!rect) return;
            setPos({ x: rect.left + rect.width / 2, y: rect.top });
        };
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [visible, anchorRef, label]);

    if (!mounted || !visible || !pos) return null;

    return createPortal(
        <div
            className='pointer-events-none fixed z-[200]'
            style={{ left: pos.x, top: pos.y - 8, transform: 'translate(-50%, -100%)' }}
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
                    className='border-primary/30 bg-card absolute top-full left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-t-0 border-l-0'
                    aria-hidden
                />
                {label}
            </div>
        </div>,
        document.body,
    );
}

export type MacDockItemProps = {
    label: string;
    active?: boolean;
    className?: string;
    children: ReactNode;
};

export function MacDockItem({ label, active, className, children }: MacDockItemProps) {
    const { metrics, showItemLabels, sidebarGlow } = useMacDockContext();
    const ref = useRef<HTMLDivElement>(null);
    const [hovered, setHovered] = useState(false);
    const showTooltip = hovered && !showItemLabels;

    const glowClass =
        sidebarGlow === 'accent' && active
            ? 'fp-dock-item-glow-accent'
            : sidebarGlow === 'subtle' && active
              ? 'fp-dock-item-glow-subtle'
              : '';

    return (
        <div
            ref={ref}
            className={cn(
                'fp-mac-dock-item relative shrink-0 overflow-visible transition-transform duration-150 ease-out',
                hovered && 'z-20 scale-[1.28]',
                className,
            )}
            style={{ width: metrics.tile, transformOrigin: 'center bottom' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
        >
            <DockTooltip label={label} anchorRef={ref} visible={showTooltip} />
            <div className='flex flex-col items-center gap-0.5 overflow-visible'>
                <div
                    className={cn(
                        'flex items-center justify-center overflow-hidden rounded-xl border transition-[background-color,border-color,color,box-shadow] duration-150',
                        active
                            ? 'border-primary/40 bg-primary/12 text-primary'
                            : 'border-border/45 bg-muted/30 text-muted-foreground hover:border-primary/25 hover:bg-primary/8 hover:text-foreground',
                        glowClass,
                    )}
                    style={{ width: metrics.tile, height: metrics.tile }}
                >
                    <div className='flex h-full w-full items-center justify-center [&_svg]:max-h-[88%] [&_svg]:max-w-[88%] [&_svg]:text-current'>
                        {children}
                    </div>
                    {active && (
                        <span
                            className='bg-primary absolute bottom-1 left-1/2 h-0.5 w-3.5 -translate-x-1/2 rounded-full'
                            aria-hidden
                        />
                    )}
                </div>
                {showItemLabels && (
                    <span
                        className={cn(
                            'max-w-full truncate text-center text-[10px] leading-tight font-medium',
                            active ? 'text-primary' : 'text-muted-foreground',
                        )}
                        style={{ maxWidth: metrics.tile + 12 }}
                        title={label}
                    >
                        {label}
                    </span>
                )}
            </div>
        </div>
    );
}

export function getDockMetrics(dockSize: DockSize, itemCount = 0, compact = false, withLabels = false) {
    const cfg = DOCK_SIZE_CONFIG[resolveDockSize(dockSize, itemCount, compact)];
    const labelExtra = withLabels ? cfg.caption + 4 : 0;
    const shellHeight = cfg.tile + cfg.padY * 2 + labelExtra + 12;
    return { panelMinHeight: shellHeight, shellPadding: shellHeight + 28 };
}

export const DOCK_PANEL_HEIGHT_CLASS: Record<DockSize, string> = {
    sm: 'h-[52px]',
    md: 'h-[60px]',
    lg: 'h-[68px]',
};

export const DOCK_PANEL_COLLAPSED_CLASS = 'h-[50px]';

export const DOCK_PANEL_EXPANDED_CLASS: Record<DockSize, string> = {
    sm: 'h-[72px]',
    md: 'h-[80px]',
    lg: 'h-[88px]',
};

export const DOCK_PANEL_LABELS_CLASS = 'h-[88px]';

export const DOCK_SHELL_INSET_CLASS: Record<DockSize, string> = {
    sm: 'lg:pb-[64px]',
    md: 'lg:pb-[72px]',
    lg: 'lg:pb-[80px]',
};

export const DOCK_SHELL_INSET_COLLAPSED_CLASS = 'lg:pb-[62px]';

export const DOCK_SHELL_INSET_EXPANDED_CLASS: Record<DockSize, string> = {
    sm: 'lg:pb-[84px]',
    md: 'lg:pb-[92px]',
    lg: 'lg:pb-[100px]',
};

export const DOCK_SHELL_INSET_LABELS_CLASS: Record<DockSize, string> = {
    sm: 'lg:pb-[84px]',
    md: 'lg:pb-[92px]',
    lg: 'lg:pb-[100px]',
};

export function getDockIconSize(dockSize: DockSize, itemCount: number, compact = false): number {
    return DOCK_SIZE_CONFIG[resolveDockSize(dockSize, itemCount, compact)].icon;
}
