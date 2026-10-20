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

import { MENU_BAR_HEIGHT, type OsSettings } from './types';

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** A zone expressed as fractions of the usable desktop area. */
export type SnapZone = Rect;

const GAP = 8;

export const SNAP_LAYOUTS: SnapZone[][] = [
    [
        { x: 0, y: 0, w: 0.5, h: 1 },
        { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
    [
        { x: 0, y: 0, w: 2 / 3, h: 1 },
        { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
    [
        { x: 0, y: 0, w: 1 / 3, h: 1 },
        { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
        { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
    [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
];

export const ZONE_LEFT: SnapZone = { x: 0, y: 0, w: 0.5, h: 1 };
export const ZONE_RIGHT: SnapZone = { x: 0.5, y: 0, w: 0.5, h: 1 };
export const ZONE_BOTTOM: SnapZone = { x: 0, y: 0.5, w: 1, h: 0.5 };

/** Usable desktop area in window-layer coordinates (y = 0 is just under the menu bar). */
export function workArea(
    settings: Pick<OsSettings, 'dockAutoHide' | 'dockSize' | 'dockPosition'>,
    vpW = window.innerWidth,
    vpH = window.innerHeight - MENU_BAR_HEIGHT,
): Rect {
    const dockInset = settings.dockAutoHide ? 0 : settings.dockSize + 18;
    const left = settings.dockPosition === 'left' ? dockInset : 0;
    const right = settings.dockPosition === 'right' ? dockInset : 0;
    const bottom = settings.dockPosition === 'bottom' ? dockInset : 0;
    return {
        x: left + GAP,
        y: GAP,
        w: Math.max(320, vpW - left - right - GAP * 2),
        h: Math.max(240, vpH - bottom - GAP * 2),
    };
}

export function zoneRect(area: Rect, zone: SnapZone): Rect {
    const x0 = area.x + zone.x * area.w;
    const y0 = area.y + zone.y * area.h;
    const x1 = area.x + (zone.x + zone.w) * area.w;
    const y1 = area.y + (zone.y + zone.h) * area.h;
    const padL = zone.x > 0 ? GAP / 2 : 0;
    const padT = zone.y > 0 ? GAP / 2 : 0;
    const padR = zone.x + zone.w < 0.999 ? GAP / 2 : 0;
    const padB = zone.y + zone.h < 0.999 ? GAP / 2 : 0;
    return {
        x: Math.round(x0 + padL),
        y: Math.round(y0 + padT),
        w: Math.round(x1 - x0 - padL - padR),
        h: Math.round(y1 - y0 - padT - padB),
    };
}

const sameZone = (a: SnapZone, b: SnapZone) =>
    Math.abs(a.x - b.x) < 0.01 &&
    Math.abs(a.y - b.y) < 0.01 &&
    Math.abs(a.w - b.w) < 0.01 &&
    Math.abs(a.h - b.h) < 0.01;

export function locateZone(zone: SnapZone): { layout: number; index: number } | null {
    for (let layout = 0; layout < SNAP_LAYOUTS.length; layout++) {
        const index = SNAP_LAYOUTS[layout].findIndex((z) => sameZone(z, zone));
        if (index >= 0) return { layout, index };
    }
    return null;
}

export const FOS_SNAP_ASSIST_EVENT = 'featheros:snap-assist';

export interface SnapAssistDetail {
    layout: number;
    filled: number[];
    placed: string[];
}

export function requestSnapAssist(zone: SnapZone, windowId: string) {
    const loc = locateZone(zone);
    if (!loc) return;
    window.dispatchEvent(
        new CustomEvent<SnapAssistDetail>(FOS_SNAP_ASSIST_EVENT, {
            detail: { layout: loc.layout, filled: [loc.index], placed: [windowId] },
        }),
    );
}

/** Size a window had before it was snapped, so dragging it out restores it. */
const preSnapSizes = new Map<string, { w: number; h: number }>();

export function rememberPreSnap(id: string, size: { w: number; h: number }) {
    if (!preSnapSizes.has(id)) preSnapSizes.set(id, size);
}

export function takePreSnap(id: string) {
    const size = preSnapSizes.get(id);
    preSnapSizes.delete(id);
    return size;
}

const EDGE = 14;
const CORNER = 90;

/** Zone under the pointer while dragging a window (viewport coordinates), or 'max' for the top edge. */
export function edgeZoneAt(clientX: number, clientY: number): SnapZone | 'max' | null {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const atLeft = clientX <= EDGE;
    const atRight = clientX >= w - EDGE;
    const nearTop = clientY <= MENU_BAR_HEIGHT + CORNER;
    const nearBottom = clientY >= h - CORNER;
    if (atLeft || atRight) {
        const x = atLeft ? 0 : 0.5;
        if (nearTop) return { x, y: 0, w: 0.5, h: 0.5 };
        if (nearBottom) return { x, y: 0.5, w: 0.5, h: 0.5 };
        return { x, y: 0, w: 0.5, h: 1 };
    }
    if (clientY <= MENU_BAR_HEIGHT + 2) return 'max';
    return null;
}
