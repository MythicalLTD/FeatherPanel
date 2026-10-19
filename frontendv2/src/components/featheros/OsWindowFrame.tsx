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

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Minus, Maximize2, X, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useFeatherOs } from './FeatherOsContext';
import { OS_APPS } from './registry';
import { MENU_BAR_HEIGHT, type OsWindow } from './types';
import { findDockTargetRect, playGenieMinimize } from './genie';

interface WindowCtx {
    win: OsWindow;
    focused: boolean;
}

const WindowContext = createContext<WindowCtx | null>(null);

export function useOsWindow(): WindowCtx {
    const ctx = useContext(WindowContext);
    if (!ctx) throw new Error('useOsWindow must be used inside a FeatherOS window');
    return ctx;
}

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const EDGE_CLASSES: Record<Edge, string> = {
    n: 'top-[-3px] left-2 right-2 h-[6px] cursor-ns-resize',
    s: 'bottom-[-3px] left-2 right-2 h-[6px] cursor-ns-resize',
    e: 'right-[-3px] top-2 bottom-2 w-[6px] cursor-ew-resize',
    w: 'left-[-3px] top-2 bottom-2 w-[6px] cursor-ew-resize',
    ne: 'right-[-4px] top-[-4px] h-3 w-3 cursor-nesw-resize',
    sw: 'left-[-4px] bottom-[-4px] h-3 w-3 cursor-nesw-resize',
    nw: 'left-[-4px] top-[-4px] h-3 w-3 cursor-nwse-resize',
    se: 'right-[-4px] bottom-[-4px] h-3 w-3 cursor-nwse-resize',
};

export function OsWindowFrame({ win, children }: { win: OsWindow; children: ReactNode }) {
    const { t } = useTranslation();
    const {
        focusedId,
        focusWindow,
        closeWindow,
        minimizeWindow,
        toggleMaximize,
        setWindowGeometry,
        getServer,
        settings,
        setWindowServer,
    } = useFeatherOs();
    const def = OS_APPS[win.app];
    const focused = focusedId === win.id;
    const finderChrome = win.app === 'finder';
    const settingsChrome = win.app === 'settings';
    const unifiedChrome = finderChrome || settingsChrome;
    const [drag, setDrag] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const [animateGeometry, setAnimateGeometry] = useState(false);
    const frameRef = useRef<HTMLDivElement>(null);

    const server = getServer(win.serverUuid);
    const customTitle = typeof win.props?.title === 'string' ? (win.props.title as string) : '';
    const title = [customTitle || t(def.nameKey), server?.name].filter(Boolean).join(' — ');

    const [viewport, setViewport] = useState(() => ({
        w: typeof window !== 'undefined' ? window.innerWidth : 1440,
        h: typeof window !== 'undefined' ? window.innerHeight - MENU_BAR_HEIGHT : 900,
    }));
    useEffect(() => {
        const updateViewport = () =>
            setViewport({
                w: window.innerWidth,
                h: window.innerHeight - MENU_BAR_HEIGHT,
            });
        updateViewport();
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, []);
    const vpW = viewport.w;
    const vpH = viewport.h;
    const dockInset = settings.dockAutoHide ? 0 : settings.dockSize + 30;
    const bottomInset = settings.dockPosition === 'bottom' ? dockInset : 0;
    const leftInset = settings.dockPosition === 'left' ? dockInset : 0;
    const rightInset = settings.dockPosition === 'right' ? dockInset : 0;
    const rawGeo = win.maximized
        ? { x: leftInset, y: 0, w: vpW - leftInset - rightInset, h: vpH - bottomInset }
        : (drag ?? { x: win.x, y: win.y, w: win.w, h: win.h });
    const maxW = Math.max(320, vpW - leftInset - rightInset - 16);
    const maxH = Math.max(240, vpH - bottomInset - 16);
    const boundedW = Math.min(rawGeo.w, maxW);
    const boundedH = Math.min(rawGeo.h, maxH);
    const geo = win.maximized
        ? rawGeo
        : {
              x: Math.max(leftInset + 8, Math.min(rawGeo.x, vpW - rightInset - boundedW - 8)),
              y: Math.max(0, Math.min(rawGeo.y, vpH - bottomInset - boundedH - 8)),
              w: boundedW,
              h: boundedH,
          };

    const startMove = useCallback(
        (e: React.PointerEvent) => {
            if (e.button !== 0) return;
            if ((e.target as HTMLElement).closest('button, input, select, [data-no-drag]')) return;
            focusWindow(win.id);
            const startX = e.clientX;
            const startY = e.clientY;
            const origin = win.maximized
                ? { x: e.clientX - win.w / 2, y: 0, w: win.w, h: win.h }
                : { x: win.x, y: win.y, w: win.w, h: win.h };
            let moved = false;
            let last = origin;
            const onMove = (ev: PointerEvent) => {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
                moved = true;
                last = {
                    ...origin,
                    x: origin.x + dx,
                    y: Math.max(0, Math.min(origin.y + dy, vpH - 32)),
                };
                setDrag(last);
            };
            const onUp = (ev: PointerEvent) => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                setDrag(null);
                if (!moved) return;
                if (ev.clientX <= 12 || ev.clientX >= vpW - 12) {
                    const width = (vpW - leftInset - rightInset - 24) / 2;
                    setWindowGeometry(win.id, {
                        x: ev.clientX <= 12 ? leftInset + 8 : leftInset + width + 16,
                        y: 8,
                        w: width,
                        h: vpH - bottomInset - 16,
                    });
                    return;
                }
                if (ev.clientY <= MENU_BAR_HEIGHT + 2) {
                    setAnimateGeometry(true);
                    setWindowGeometry(win.id, { x: last.x, y: 0 });
                    toggleMaximize(win.id);
                    window.setTimeout(() => setAnimateGeometry(false), 300);
                    return;
                }
                setWindowGeometry(win.id, { x: Math.round(last.x), y: Math.round(last.y), w: last.w, h: last.h });
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        },
        [win, focusWindow, setWindowGeometry, toggleMaximize, vpH, vpW, leftInset, rightInset, bottomInset],
    );

    const startResize = useCallback(
        (edge: Edge) => (e: React.PointerEvent) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            e.preventDefault();
            focusWindow(win.id);
            const startX = e.clientX;
            const startY = e.clientY;
            const origin = win.maximized
                ? { x: 0, y: 0, w: vpW, h: vpH - bottomInset }
                : { x: win.x, y: win.y, w: win.w, h: win.h };
            let last = origin;
            const onMove = (ev: PointerEvent) => {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                let { x, y, w, h } = origin;
                if (edge.includes('e')) w = Math.max(def.minSize.w, origin.w + dx);
                if (edge.includes('s')) h = Math.max(def.minSize.h, origin.h + dy);
                if (edge.includes('w')) {
                    w = Math.max(def.minSize.w, origin.w - dx);
                    x = origin.x + (origin.w - w);
                }
                if (edge.includes('n')) {
                    h = Math.max(def.minSize.h, origin.h - dy);
                    y = Math.max(0, origin.y + (origin.h - h));
                }
                last = { x, y, w, h };
                setDrag(last);
            };
            const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                setDrag(null);
                setWindowGeometry(win.id, {
                    x: Math.round(last.x),
                    y: Math.round(last.y),
                    w: Math.round(last.w),
                    h: Math.round(last.h),
                });
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        },
        [win, def.minSize, focusWindow, setWindowGeometry, vpW, vpH, bottomInset],
    );

    const zoom = () => {
        setAnimateGeometry(true);
        toggleMaximize(win.id);
        window.setTimeout(() => setAnimateGeometry(false), 300);
    };

    return (
        <WindowContext.Provider value={{ win, focused }}>
            <div
                ref={frameRef}
                role='dialog'
                aria-label={title}
                data-fos-window-id={win.id}
                data-fos-app={win.app}
                data-focused={focused}
                data-minimized={win.minimized ? 'true' : 'false'}
                data-anim={animateGeometry ? 'geometry' : undefined}
                onPointerDownCapture={() => !focused && focusWindow(win.id)}
                    className={cn(
                        'fos-window absolute flex flex-col overflow-visible',
                        win.maximized ? 'rounded-none' : 'rounded-[12px]',
                    )}
                style={{
                    left: geo.x,
                    top: geo.y,
                    width: geo.w,
                    height: geo.h,
                    zIndex: win.z,
                }}
            >
                <div
                    className={cn(
                        'fos-window-surface flex h-full w-full flex-col overflow-hidden border',
                        win.maximized ? 'rounded-none' : 'rounded-[12px]',
                        finderChrome && 'fos-window-surface--finder',
                        settingsChrome && 'fos-window-surface--settings',
                    )}
                >
                    {unifiedChrome ? (
                        <div
                            onPointerDown={startMove}
                            onDoubleClick={(e) => {
                                if ((e.target as HTMLElement).closest('button, input, [data-no-drag]')) return;
                                zoom();
                            }}
                            className={cn(
                                'group absolute top-0 left-0 z-20 flex h-[52px] items-center px-[13px] select-none',
                                finderChrome ? 'fos-finder-traffic w-[13rem]' : 'fos-settings-traffic w-[13.5rem]',
                            )}
                        >
                            <TrafficLights
                                focused={focused}
                                t={t}
                                onClose={() => closeWindow(win.id)}
                                onMinimize={() => {
                                    void (async () => {
                                        const node = frameRef.current;
                                        if (node && !settings.reduceMotion) {
                                            const to = findDockTargetRect(win.app, win.id);
                                            await playGenieMinimize(node, to);
                                        }
                                        minimizeWindow(win.id);
                                    })();
                                }}
                                onZoom={zoom}
                            />
                        </div>
                    ) : (
                        <div
                            onPointerDown={startMove}
                            onDoubleClick={(e) => {
                                if ((e.target as HTMLElement).closest('button, input, [data-no-drag]')) return;
                                zoom();
                            }}
                            className='fos-titlebar relative flex shrink-0 items-center gap-2 px-3 select-none'
                        >
                            <TrafficLights
                                focused={focused}
                                t={t}
                                onClose={() => closeWindow(win.id)}
                                onMinimize={() => {
                                    void (async () => {
                                        const node = frameRef.current;
                                        if (node && !settings.reduceMotion) {
                                            const to = findDockTargetRect(win.app, win.id);
                                            await playGenieMinimize(node, to);
                                        }
                                        minimizeWindow(win.id);
                                    })();
                                }}
                                onZoom={zoom}
                            />
                            <div
                                className={cn(
                                    'fos-window-caption pointer-events-none absolute inset-x-24 flex flex-col items-center justify-center',
                                    focused ? 'opacity-90' : 'opacity-50',
                                )}
                            >
                                <span className='max-w-full truncate'>{customTitle || t(def.nameKey)}</span>
                                {(server?.name || customTitle) && (
                                    <small className='max-w-full truncate'>{server?.name || t(def.nameKey)}</small>
                                )}
                            </div>
                            {def.serverScoped && win.serverUuid && (
                                <button
                                    type='button'
                                    data-no-drag
                                    onClick={() => setWindowServer(win.id, null)}
                                    title={t('featheros.window.switch_server')}
                                    aria-label={t('featheros.window.switch_server')}
                                    className='text-muted-foreground hover:bg-background/70 hover:text-foreground ml-auto flex h-7 w-7 items-center justify-center rounded-md'
                                >
                                    <ChevronsUpDown className='h-3 w-3' />
                                </button>
                            )}
                        </div>
                    )}
                    <div
                        className='fos-window-body relative min-h-0 flex-1 overflow-hidden'
                        onPointerDown={(e) => {
                            const el = e.target as HTMLElement;
                            if (!el.closest('[data-fos-window-drag]')) return;
                            if (el.closest('button, input, select, textarea, a, [data-no-drag]')) return;
                            startMove(e);
                        }}
                        onDoubleClick={(e) => {
                            const el = e.target as HTMLElement;
                            if (!el.closest('[data-fos-window-drag]')) return;
                            if (el.closest('button, input, select, textarea, a, [data-no-drag]')) return;
                            zoom();
                        }}
                    >
                        {children}
                    </div>
                </div>
                {!win.maximized &&
                    (Object.keys(EDGE_CLASSES) as Edge[]).map((edge) => (
                        <div
                            key={edge}
                            onPointerDown={startResize(edge)}
                            className={cn('absolute z-10', EDGE_CLASSES[edge])}
                        />
                    ))}
            </div>
        </WindowContext.Provider>
    );
}

function TrafficLights({
    focused,
    t,
    onClose,
    onMinimize,
    onZoom,
}: {
    focused: boolean;
    t: (key: string) => string;
    onClose: () => void;
    onMinimize: () => void;
    onZoom: () => void;
}) {
    return (
        <div className='fos-traffic-lights group flex items-center'>
            <TrafficLight
                color='bg-[#ff5f57]'
                hoverColor='group-hover:bg-[#ff5f57]'
                active={focused}
                label={t('featheros.window.close')}
                onClick={onClose}
            >
                <X className='h-2 w-2' strokeWidth={3} />
            </TrafficLight>
            <TrafficLight
                color='bg-[#febc2e]'
                hoverColor='group-hover:bg-[#febc2e]'
                active={focused}
                label={t('featheros.window.minimize')}
                onClick={onMinimize}
            >
                <Minus className='h-2 w-2' strokeWidth={3} />
            </TrafficLight>
            <TrafficLight
                color='bg-[#28c840]'
                hoverColor='group-hover:bg-[#28c840]'
                active={focused}
                label={t('featheros.window.zoom')}
                onClick={onZoom}
            >
                <Maximize2 className='h-2 w-2' strokeWidth={2.5} />
            </TrafficLight>
        </div>
    );
}

function TrafficLight({
    color,
    hoverColor,
    active,
    label,
    onClick,
    children,
}: {
    color: string;
    hoverColor: string;
    active: boolean;
    label: string;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type='button'
            aria-label={label}
            title={label}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className='fos-traffic-light flex items-center justify-center text-black/55'
        >
            <span
                className={cn(
                    'flex items-center justify-center rounded-full ring-1 ring-black/15 ring-inset',
                    active ? color : cn('fos-traffic-idle', hoverColor),
                )}
            >
                <span className='opacity-0 transition-opacity duration-75 group-focus-within:opacity-100 group-hover:opacity-100'>
                    {children}
                </span>
            </span>
        </button>
    );
}
