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
import { useFeatherOs } from './FeatherOsContext';
import type { OsHotCornerAction } from './types';

const CORNER_PX = 6;
const DWELL_MS = 200;

type CornerId = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

function cornerAt(x: number, y: number, w: number, h: number): CornerId | null {
    const nearL = x <= CORNER_PX;
    const nearR = x >= w - CORNER_PX;
    const nearT = y <= CORNER_PX;
    const nearB = y >= h - CORNER_PX;
    if (nearT && nearL) return 'topLeft';
    if (nearT && nearR) return 'topRight';
    if (nearB && nearL) return 'bottomLeft';
    if (nearB && nearR) return 'bottomRight';
    return null;
}

export function HotCorners() {
    const {
        settings,
        setMissionControlOpen,
        setLaunchpadOpen,
        setNotificationsOpen,
        setSpotlightOpen,
        windows,
        minimizeWindow,
    } = useFeatherOs();

    const hotCorners = settings.hotCorners;
    const dwellTimer = useRef<number | null>(null);
    const armedCorner = useRef<CornerId | null>(null);
    const lastFired = useRef<{ corner: CornerId; at: number } | null>(null);
    const windowsRef = useRef(windows);
    windowsRef.current = windows;
    const cornersRef = useRef(hotCorners);
    cornersRef.current = hotCorners;

    useEffect(() => {
        const clearDwell = () => {
            if (dwellTimer.current != null) {
                window.clearTimeout(dwellTimer.current);
                dwellTimer.current = null;
            }
            armedCorner.current = null;
        };

        const runAction = (action: OsHotCornerAction) => {
            if (action === 'none') return;
            if (action === 'mission') {
                setSpotlightOpen(false);
                setLaunchpadOpen(false);
                setMissionControlOpen(true);
                return;
            }
            if (action === 'launchpad') {
                setSpotlightOpen(false);
                setMissionControlOpen(false);
                setLaunchpadOpen(true);
                return;
            }
            if (action === 'notifications') {
                setNotificationsOpen(true);
                return;
            }
            if (action === 'desktop') {
                setSpotlightOpen(false);
                setLaunchpadOpen(false);
                setMissionControlOpen(false);
                setNotificationsOpen(false);
                windowsRef.current.filter((w) => !w.minimized).forEach((w) => minimizeWindow(w.id));
            }
        };

        const onMove = (e: PointerEvent) => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const corner = cornerAt(e.clientX, e.clientY, w, h);
            if (!corner) {
                clearDwell();
                return;
            }
            const action = cornersRef.current[corner];
            if (!action || action === 'none') {
                clearDwell();
                return;
            }
            if (armedCorner.current === corner) return;
            clearDwell();
            armedCorner.current = corner;
            dwellTimer.current = window.setTimeout(() => {
                const recent = lastFired.current;
                if (recent && recent.corner === corner && Date.now() - recent.at < 800) {
                    clearDwell();
                    return;
                }
                lastFired.current = { corner, at: Date.now() };
                runAction(cornersRef.current[corner]);
                clearDwell();
            }, DWELL_MS);
        };

        window.addEventListener('pointermove', onMove, { passive: true });
        return () => {
            window.removeEventListener('pointermove', onMove);
            clearDwell();
        };
    }, [setMissionControlOpen, setLaunchpadOpen, setNotificationsOpen, setSpotlightOpen, minimizeWindow]);

    return null;
}
