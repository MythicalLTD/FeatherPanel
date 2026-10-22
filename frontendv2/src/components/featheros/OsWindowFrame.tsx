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
import { createPortal } from 'react-dom';
import { Minus, Maximize2, X, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useFeatherOs } from './FeatherOsContext';
import { OS_APPS } from './registry';
import { MENU_BAR_HEIGHT, type OsWindow } from './types';
import { findDockTargetRect, playGenieMinimize } from './genie';
import {
    edgeZoneAt,
    rememberPreSnap,
    requestSnapAssist,
    takePreSnap,
    workArea,
    zoneRect,
    type Rect,
    type SnapZone,
} from './snap';
import { SnapLayoutsPopover } from './SnapLayouts';

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
    const finderChrome = win.app === 'finder' || win.app === 'server';
    const settingsChrome = win.app === 'settings';
    const serversChrome = win.app === 'servers';
    const terminalChrome = win.app === 'terminal';
    const unifiedChrome = finderChrome || settingsChrome || serversChrome || terminalChrome;
    const [drag, setDrag] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const [animateGeometry, setAnimateGeometry] = useState(false);
    const [closing, setClosing] = useState(false);
    // Fade and shrink like macOS before the window is removed.
    const requestClose = () => {
        if (settings.reduceMotion) {
            closeWindow(win.id);
            return;
        }
        setClosing(true);
        window.setTimeout(() => closeWindow(win.id), 170);
    };
    const [snapPreview, setSnapPreview] = useState<Rect | null>(null);
    const [snapMenu, setSnapMenu] = useState<DOMRect | null>(null);
    const snapMenuTimer = useRef<number | null>(null);
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
    // Dock shell adds ~18px padding around icons; keep a slim gap so maximized
    // windows don't leave a huge empty band above the dock.
    const dockInset = settings.dockAutoHide ? 0 : settings.dockSize + 18;
    const bottomInset = settings.dockPosition === 'bottom' ? dockInset : 0;
    const leftInset = settings.dockPosition === 'left' ? dockInset : 0;
    const rightInset = settings.dockPosition === 'right' ? dockInset : 0;
    const rawGeo = win.maximized
        ? { x: leftInset, y: 0, w: vpW - leftInset - rightInset, h: Math.max(240, vpH - bottomInset) }
        : (drag ?? { x: win.x, y: win.y, w: win.w, h: win.h });
    const maxW = Math.max(320, vpW - leftInset - rightInset - 16);
    const maxH = Math.max(240, vpH - bottomInset - 16);
    const boundedW = Math.min(rawGeo.w, maxW);
    const boundedH = Math.min(rawGeo.h, maxH);
    const minX = leftInset + 8;
    const maxX = Math.max(minX, vpW - rightInset - boundedW - 8);
    const minY = 0;
    const maxY = Math.max(minY, vpH - bottomInset - boundedH - 8);
    const geo = win.maximized
        ? rawGeo
        : {
              x: Math.max(minX, Math.min(rawGeo.x, maxX)),
              y: Math.max(minY, Math.min(rawGeo.y, maxY)),
              w: boundedW,
              h: boundedH,
          };

    const startMove = useCallback(
        (e: React.PointerEvent) => {
            if (e.button !== 0) return;
            const target = e.target as HTMLElement;
            if (target.closest('button, input, select, textarea, a, [data-no-drag]')) return;
            e.preventDefault();
            e.stopPropagation();
            window.getSelection()?.removeAllRanges();
            focusWindow(win.id);
            let startX = e.clientX;
            let startY = e.clientY;
            let origin = win.maximized
                ? { x: e.clientX - win.w / 2, y: 0, w: win.w, h: win.h }
                : { x: win.x, y: win.y, w: win.w, h: win.h };
            let moved = false;
            let last = origin;
            let zone: SnapZone | 'max' | null = null;
            let zoneKey = '';
            const area = workArea(settings, vpW, vpH);

            const prevUserSelect = document.body.style.userSelect;
            document.body.style.userSelect = 'none';

            const onMove = (ev: PointerEvent) => {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
                if (!moved) {
                    const pre = takePreSnap(win.id);
                    if (pre && !win.maximized) {
                        const grab = (startX - win.x) / Math.max(1, win.w);
                        origin = { x: startX - pre.w * grab, y: win.y, w: pre.w, h: pre.h };
                    }
                    if (win.maximized) setWindowGeometry(win.id, origin);
                }
                moved = true;
                const nextX = origin.x + dx;
                const nextY = origin.y + dy;
                const clampedX = Math.max(minX, Math.min(maxX, nextX));
                const clampedY = Math.max(minY, Math.min(maxY, nextY));

                if (nextX !== clampedX) {
                    startX += nextX - clampedX;
                }
                if (nextY !== clampedY) {
                    startY += nextY - clampedY;
                }

                last = {
                    ...origin,
                    x: clampedX,
                    y: clampedY,
                };
                setDrag(last);
                zone = edgeZoneAt(ev.clientX, ev.clientY);
                const key = zone ? JSON.stringify(zone) : '';
                if (key !== zoneKey) {
                    zoneKey = key;
                    setSnapPreview(
                        zone === 'max'
                            ? {
                                  x: leftInset,
                                  y: 0,
                                  w: vpW - leftInset - rightInset,
                                  h: Math.max(240, vpH - bottomInset),
                              }
                            : zone
                              ? zoneRect(area, zone)
                              : null,
                    );
                }
            };
            const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                document.body.style.userSelect = prevUserSelect;
                setDrag(null);
                setSnapPreview(null);
                if (!moved) return;
                if (zone === 'max') {
                    setAnimateGeometry(true);
                    setWindowGeometry(win.id, { x: Math.round(last.x), y: 0, w: last.w, h: last.h });
                    toggleMaximize(win.id);
                    window.setTimeout(() => setAnimateGeometry(false), 300);
                    return;
                }
                if (zone) {
                    rememberPreSnap(win.id, { w: last.w, h: last.h });
                    setAnimateGeometry(true);
                    setWindowGeometry(win.id, zoneRect(area, zone));
                    window.setTimeout(() => setAnimateGeometry(false), 300);
                    requestSnapAssist(zone, win.id);
                    return;
                }
                setWindowGeometry(win.id, { x: Math.round(last.x), y: Math.round(last.y), w: last.w, h: last.h });
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        },
        [
            win,
            settings,
            focusWindow,
            setWindowGeometry,
            toggleMaximize,
            vpH,
            vpW,
            leftInset,
            rightInset,
            bottomInset,
            minX,
            maxX,
            minY,
            maxY,
        ],
    );

    const clearSnapMenuTimer = () => {
        if (snapMenuTimer.current !== null) window.clearTimeout(snapMenuTimer.current);
        snapMenuTimer.current = null;
    };
    useEffect(() => clearSnapMenuTimer, []);

    const onZoomHover = (el: HTMLElement | null) => {
        clearSnapMenuTimer();
        snapMenuTimer.current = el
            ? window.setTimeout(() => setSnapMenu(el.getBoundingClientRect()), 420)
            : window.setTimeout(() => setSnapMenu(null), 220);
    };

    const snapTo = (zone: SnapZone) => {
        clearSnapMenuTimer();
        setSnapMenu(null);
        rememberPreSnap(win.id, { w: win.w, h: win.h });
        setAnimateGeometry(true);
        setWindowGeometry(win.id, zoneRect(workArea(settings, vpW, vpH), zone));
        window.setTimeout(() => setAnimateGeometry(false), 300);
        requestSnapAssist(zone, win.id);
    };

    const startResize = useCallback(
        (edge: Edge) => (e: React.PointerEvent) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            e.preventDefault();
            window.getSelection()?.removeAllRanges();
            const prevUserSelect = document.body.style.userSelect;
            document.body.style.userSelect = 'none';

            focusWindow(win.id);
            const startX = e.clientX;
            const startY = e.clientY;
            const origin = win.maximized
                ? { x: leftInset, y: 0, w: vpW - leftInset - rightInset, h: vpH - bottomInset }
                : { x: win.x, y: win.y, w: win.w, h: win.h };
            let last = origin;
            const onMove = (ev: PointerEvent) => {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                let { x, y, w, h } = origin;
                if (edge.includes('e')) {
                    const maxEastW = Math.max(def.minSize.w, vpW - rightInset - 8 - origin.x);
                    w = Math.max(def.minSize.w, Math.min(maxEastW, origin.w + dx));
                }
                if (edge.includes('s')) {
                    const maxSouthH = Math.max(def.minSize.h, vpH - bottomInset - 8 - origin.y);
                    h = Math.max(def.minSize.h, Math.min(maxSouthH, origin.h + dy));
                }
                if (edge.includes('w')) {
                    const maxWestW = Math.max(def.minSize.w, origin.x + origin.w - (leftInset + 8));
                    w = Math.max(def.minSize.w, Math.min(maxWestW, origin.w - dx));
                    x = origin.x + (origin.w - w);
                }
                if (edge.includes('n')) {
                    const maxNorthH = Math.max(def.minSize.h, origin.y + origin.h - 0);
                    h = Math.max(def.minSize.h, Math.min(maxNorthH, origin.h - dy));
                    y = Math.max(0, origin.y + (origin.h - h));
                }
                last = { x, y, w, h };
                setDrag(last);
            };
            const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                document.body.style.userSelect = prevUserSelect;
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
        [win, def.minSize, focusWindow, setWindowGeometry, vpW, vpH, leftInset, rightInset, bottomInset],
    );

    const zoom = () => {
        clearSnapMenuTimer();
        setSnapMenu(null);
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
                data-maximized={win.maximized ? 'true' : 'false'}
                data-anim={animateGeometry ? 'geometry' : undefined}
                data-closing={closing ? '1' : undefined}
                onPointerDownCapture={() => !focused && focusWindow(win.id)}
                className={cn(
                    'fos-window absolute flex flex-col overflow-visible',
                    win.maximized ? 'rounded-none' : 'rounded-[var(--fos-radius,12px)]',
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
                        win.maximized ? 'rounded-none' : 'rounded-[var(--fos-radius,12px)]',
                        finderChrome && 'fos-window-surface--finder',
                        settingsChrome && 'fos-window-surface--settings',
                        win.app === 'terminal' && 'fos-window-surface--terminal',
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
                                finderChrome && 'fos-finder-traffic w-[13rem]',
                                settingsChrome && 'fos-settings-traffic w-[13.5rem]',
                                serversChrome && 'fos-servers-traffic w-[4.75rem]',
                                terminalChrome && 'fos-term-traffic w-[4.5rem]',
                            )}
                        >
                            <TrafficLights
                                focused={focused}
                                t={t}
                                onClose={requestClose}
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
                                onZoomHover={onZoomHover}
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
                                onClose={requestClose}
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
                                onZoomHover={onZoomHover}
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
            {snapPreview &&
                frameRef.current?.parentElement &&
                createPortal(
                    <div
                        className='fos-snap-preview'
                        style={{
                            left: snapPreview.x,
                            top: snapPreview.y,
                            width: snapPreview.w,
                            height: snapPreview.h,
                            zIndex: Math.max(1, win.z - 1),
                        }}
                    />,
                    frameRef.current.parentElement,
                )}
            {snapMenu && (
                <SnapLayoutsPopover
                    anchor={snapMenu}
                    onPick={snapTo}
                    onPointerEnter={clearSnapMenuTimer}
                    onPointerLeave={() => onZoomHover(null)}
                />
            )}
        </WindowContext.Provider>
    );
}

function TrafficLights({
    focused,
    t,
    onClose,
    onMinimize,
    onZoom,
    onZoomHover,
}: {
    focused: boolean;
    t: (key: string) => string;
    onClose: () => void;
    onMinimize: () => void;
    onZoom: () => void;
    onZoomHover?: (el: HTMLElement | null) => void;
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
                onHover={onZoomHover}
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
    onHover,
    children,
}: {
    color: string;
    hoverColor: string;
    active: boolean;
    label: string;
    onClick: () => void;
    onHover?: (el: HTMLElement | null) => void;
    children: ReactNode;
}) {
    return (
        <button
            type='button'
            aria-label={label}
            title={onHover ? undefined : label}
            onPointerEnter={onHover ? (e) => e.pointerType === 'mouse' && onHover(e.currentTarget) : undefined}
            onPointerLeave={onHover ? () => onHover(null) : undefined}
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
