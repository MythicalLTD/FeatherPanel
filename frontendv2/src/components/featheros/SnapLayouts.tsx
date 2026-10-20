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
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useFeatherOs } from './FeatherOsContext';
import { OS_APPS } from './registry';
import { AppIcon } from './AppIcon';
import {
    FOS_SNAP_ASSIST_EVENT,
    SNAP_LAYOUTS,
    rememberPreSnap,
    workArea,
    zoneRect,
    type SnapAssistDetail,
    type SnapZone,
} from './snap';
import { MENU_BAR_HEIGHT } from './types';

const ZONE_LABELS: string[][] = [
    ['left_half', 'right_half'],
    ['left_two_thirds', 'right_third'],
    ['left_third', 'center_third', 'right_third'],
    ['top_left', 'top_right', 'bottom_left', 'bottom_right'],
];

const POP_WIDTH = 236;

function zoneStyle(z: SnapZone) {
    return {
        left: `calc(${z.x * 100}% + 2px)`,
        top: `calc(${z.y * 100}% + 2px)`,
        width: `calc(${z.w * 100}% - 4px)`,
        height: `calc(${z.h * 100}% - 4px)`,
    };
}

export function SnapLayoutsPopover({
    anchor,
    onPick,
    onPointerEnter,
    onPointerLeave,
}: {
    anchor: DOMRect;
    onPick: (zone: SnapZone) => void;
    onPointerEnter: () => void;
    onPointerLeave: () => void;
}) {
    const { t } = useTranslation();
    const root = typeof document !== 'undefined' ? document.querySelector('.fos-root') : null;
    if (!root) return null;
    const left = Math.max(8, Math.min(anchor.left - 14, window.innerWidth - POP_WIDTH - 8));
    const top = anchor.bottom + 10;

    return createPortal(
        <div
            className='fos-snap-pop'
            role='menu'
            aria-label={t('featheros.snap.title')}
            style={{ left, top, width: POP_WIDTH }}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className='fos-snap-pop-grid'>
                {SNAP_LAYOUTS.map((layout, li) => (
                    <div key={li} className='fos-snap-layout'>
                        {layout.map((zone, zi) => (
                            <button
                                key={zi}
                                type='button'
                                role='menuitem'
                                className='fos-snap-zone'
                                style={zoneStyle(zone)}
                                title={t(`featheros.snap.${ZONE_LABELS[li][zi]}`)}
                                aria-label={t(`featheros.snap.${ZONE_LABELS[li][zi]}`)}
                                onClick={() => onPick(zone)}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>,
        root,
    );
}

/** Snap Assist: after a window is snapped, offer the other windows for the zones still free. */
export function SnapAssist() {
    const { t } = useTranslation();
    const { windows, activeSpace, settings, setWindowGeometry, focusWindow, getServer } = useFeatherOs();
    const [state, setState] = useState<SnapAssistDetail | null>(null);
    const enabledRef = useRef(settings.snapAssist);
    enabledRef.current = settings.snapAssist !== false;

    useEffect(() => {
        const onAssist = (e: Event) => {
            if (!enabledRef.current) return;
            setState((e as CustomEvent<SnapAssistDetail>).detail);
        };
        window.addEventListener(FOS_SNAP_ASSIST_EVENT, onAssist);
        return () => window.removeEventListener(FOS_SNAP_ASSIST_EVENT, onAssist);
    }, []);

    const layout = state ? SNAP_LAYOUTS[state.layout] : null;
    const remaining = layout && state ? layout.map((_, i) => i).filter((i) => !state.filled.includes(i)) : [];
    const candidates =
        state && layout
            ? windows
                  .filter((w) => (w.space ?? 0) === activeSpace && !state.placed.includes(w.id))
                  .sort((a, b) => b.z - a.z)
            : [];
    const active = remaining.length > 0 && candidates.length > 0;

    useEffect(() => {
        if (state && !active) setState(null);
    }, [state, active]);

    useEffect(() => {
        if (!active) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            setState(null);
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [active]);

    if (!active || !state || !layout) return null;

    const area = workArea(settings);
    const target = remaining[0];

    const place = (id: string) => {
        const win = windows.find((w) => w.id === id);
        if (!win) return;
        if (!win.maximized) rememberPreSnap(win.id, { w: win.w, h: win.h });
        setWindowGeometry(win.id, zoneRect(area, layout[target]));
        focusWindow(win.id);
        setState({ ...state, filled: [...state.filled, target], placed: [...state.placed, win.id] });
    };

    return (
        <div
            className='fos-snap-assist'
            style={{ top: MENU_BAR_HEIGHT }}
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) setState(null);
            }}
        >
            {remaining.map((zi) => {
                const rect = zoneRect(area, layout[zi]);
                const isTarget = zi === target;
                return (
                    <div
                        key={zi}
                        className={cn('fos-snap-assist-zone', isTarget && 'is-target')}
                        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
                        onPointerDown={(e) => {
                            if (e.target === e.currentTarget) setState(null);
                        }}
                    >
                        {isTarget && (
                            <div className='fos-snap-assist-panel'>
                                <div className='fos-snap-assist-head'>
                                    <span>{t('featheros.snap.assist_title')}</span>
                                    <button
                                        type='button'
                                        aria-label={t('featheros.common.close')}
                                        onClick={() => setState(null)}
                                    >
                                        <X className='h-3.5 w-3.5' />
                                    </button>
                                </div>
                                <div className='fos-snap-assist-list fos-scroll'>
                                    {candidates.map((w) => {
                                        const def = OS_APPS[w.app];
                                        const server = getServer(w.serverUuid);
                                        const custom = typeof w.props?.title === 'string' ? (w.props.title as string) : '';
                                        return (
                                            <button
                                                key={w.id}
                                                type='button'
                                                className='fos-snap-assist-card'
                                                onClick={() => place(w.id)}
                                            >
                                                <AppIcon app={w.app} size={34} />
                                                <span className='min-w-0 flex-1 text-left'>
                                                    <span className='block truncate font-medium'>
                                                        {custom || t(def.nameKey)}
                                                    </span>
                                                    {server?.name && (
                                                        <span className='block truncate text-[0.72rem] opacity-60'>
                                                            {server.name}
                                                        </span>
                                                    )}
                                                </span>
                                                {w.minimized && (
                                                    <span className='fos-snap-assist-tag'>
                                                        {t('featheros.switcher.minimized')}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
