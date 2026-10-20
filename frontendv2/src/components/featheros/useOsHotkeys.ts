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
import { useTranslation } from '@/contexts/TranslationContext';
import { useFeatherOs } from './FeatherOsContext';
import { FOS_SHORTCUTS_EVENT, FOS_SWITCHER_EVENT, toggleImmersiveWithFeedback } from './immersive';
import { isOsLocked, lockOs } from './LockScreen';
import { ZONE_BOTTOM, ZONE_LEFT, ZONE_RIGHT, rememberPreSnap, requestSnapAssist, workArea, zoneRect } from './snap';
import type { OsAppId, OsWindow } from './types';

const MAX_SPACES = 6;
const META_PEEK_MS = 450;

function isTypingTarget(target: EventTarget | null) {
    const el = target as HTMLElement | null;
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return !!el.closest('input, textarea, select, [contenteditable="true"], .monaco-editor, .xterm');
}

function mruWindows(windows: OsWindow[], focusedId: string | null) {
    return windows.slice().sort((a, b) => {
        if (a.id === focusedId) return -1;
        if (b.id === focusedId) return 1;
        return b.z - a.z;
    });
}

/** Same order the Dock renders app icons in: pinned first, then running unpinned apps. */
export function dockAppOrder(dock: OsAppId[], windows: OsWindow[]): OsAppId[] {
    const running = Array.from(new Set(windows.map((w) => w.app))).filter((app) => !dock.includes(app));
    return [...dock, ...running];
}

const isMetaKey = (e: KeyboardEvent) => e.key === 'Meta' || e.code === 'MetaLeft' || e.code === 'MetaRight';
const isAltKey = (e: KeyboardEvent) => e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight';

export function useOsHotkeys() {
    const { t } = useTranslation();
    const os = useFeatherOs();
    const osRef = useRef(os);
    osRef.current = os;
    const tRef = useRef(t);
    tRef.current = t;

    const [switcherOpen, setSwitcherOpen] = useState(false);
    const [switcherIndex, setSwitcherIndex] = useState(0);
    const [switcherList, setSwitcherList] = useState<OsWindow[]>([]);
    const [metaHeld, setMetaHeld] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);

    const switcherOpenRef = useRef(false);
    const switcherHeldRef = useRef(false);
    const switcherIndexRef = useRef(0);
    const switcherListRef = useRef<OsWindow[]>([]);
    const metaDownRef = useRef(false);
    const metaChordRef = useRef(false);
    const metaLongRef = useRef(false);
    const metaTimerRef = useRef<number | null>(null);
    const desktopHiddenRef = useRef<string[] | null>(null);

    useEffect(() => {
        const focusAnywhere = (win: OsWindow) => {
            const { activeSpace, setActiveSpace, focusWindow } = osRef.current;
            const space = win.space ?? 0;
            if (space !== activeSpace) setActiveSpace(space);
            focusWindow(win.id);
        };

        const setSwitcher = (open: boolean) => {
            switcherOpenRef.current = open;
            if (!open) switcherHeldRef.current = false;
            setSwitcherOpen(open);
        };

        const setSwitcherSelection = (list: OsWindow[], index: number) => {
            switcherListRef.current = list;
            switcherIndexRef.current = index;
            setSwitcherList(list);
            setSwitcherIndex(index);
        };

        const closeOverlays = () => {
            const { setSpotlightOpen, setLaunchpadOpen, setMissionControlOpen, setNotificationsOpen } = osRef.current;
            setSpotlightOpen(false);
            setLaunchpadOpen(false);
            setMissionControlOpen(false);
            setNotificationsOpen(false);
            setShortcutsOpen(false);
            setSwitcher(false);
        };

        const commitSwitcher = () => {
            const win = switcherListRef.current[switcherIndexRef.current];
            setSwitcher(false);
            if (win) focusAnywhere(win);
        };

        const openSwitcher = (reverse: boolean, held: boolean) => {
            const list = mruWindows(osRef.current.windows, osRef.current.focusedId);
            if (list.length === 0) return;
            closeOverlays();
            switcherHeldRef.current = held;
            setSwitcherSelection(list, list.length <= 1 ? 0 : reverse ? list.length - 1 : 1);
            setSwitcher(true);
        };

        const stepSwitcher = (reverse: boolean) => {
            const list = switcherListRef.current;
            if (list.length === 0) return;
            const cur = switcherIndexRef.current;
            setSwitcherSelection(list, reverse ? (cur - 1 + list.length) % list.length : (cur + 1) % list.length);
        };

        const actOnSwitcherSelection = (action: 'close' | 'minimize') => {
            const list = switcherListRef.current;
            const win = list[switcherIndexRef.current];
            if (!win) return;
            if (action === 'close') {
                osRef.current.closeWindow(win.id);
                const rest = list.filter((w) => w.id !== win.id);
                if (rest.length === 0) {
                    setSwitcher(false);
                    return;
                }
                setSwitcherSelection(rest, Math.min(switcherIndexRef.current, rest.length - 1));
                return;
            }
            osRef.current.minimizeWindow(win.id);
            setSwitcherSelection(
                list.map((w) => (w.id === win.id ? { ...w, minimized: true } : w)),
                switcherIndexRef.current,
            );
        };

        const showDesktop = () => {
            const { windows, activeSpace, focusWindow, minimizeWindow } = osRef.current;
            if (desktopHiddenRef.current) {
                const ids = new Set(desktopHiddenRef.current);
                desktopHiddenRef.current = null;
                windows.filter((w) => ids.has(w.id)).forEach((w) => focusWindow(w.id));
                return;
            }
            const visible = windows.filter((w) => !w.minimized && (w.space ?? 0) === activeSpace);
            if (visible.length === 0) return;
            desktopHiddenRef.current = visible.sort((a, b) => a.z - b.z).map((w) => w.id);
            closeOverlays();
            visible.forEach((w) => minimizeWindow(w.id));
        };

        const minimizeOthers = () => {
            const { windows, focusedId, activeSpace, minimizeWindow } = osRef.current;
            windows
                .filter((w) => w.id !== focusedId && !w.minimized && (w.space ?? 0) === activeSpace)
                .forEach((w) => minimizeWindow(w.id));
        };

        const tileFocused = (side: 'left' | 'right' | 'up' | 'down') => {
            const { focusedId, windows, settings, setWindowGeometry, toggleMaximize } = osRef.current;
            if (!focusedId) return;
            if (side === 'up') {
                toggleMaximize(focusedId);
                return;
            }
            const win = windows.find((w) => w.id === focusedId);
            if (win) rememberPreSnap(win.id, { w: win.w, h: win.h });
            const zone = side === 'left' ? ZONE_LEFT : side === 'right' ? ZONE_RIGHT : ZONE_BOTTOM;
            setWindowGeometry(focusedId, zoneRect(workArea(settings), zone));
            if (side !== 'down') requestSnapAssist(zone, focusedId);
        };

        const switchSpace = (delta: number) => {
            const { activeSpace, setActiveSpace, settings } = osRef.current;
            const count = Math.max(1, settings.spaceCount || 1);
            const next = activeSpace + delta;
            if (next < 0 || next >= count) return;
            closeOverlays();
            setActiveSpace(next);
        };

        const moveFocusedToSpace = (delta: number) => {
            const { focusedId, activeSpace, setActiveSpace, settings, moveWindowToSpace, focusWindow } = osRef.current;
            if (!focusedId) return;
            const count = Math.max(1, settings.spaceCount || 1);
            const next = activeSpace + delta;
            if (next < 0 || next >= count) return;
            moveWindowToSpace(focusedId, next);
            setActiveSpace(next);
            focusWindow(focusedId);
        };

        const addSpace = () => {
            const { settings, updateSettings, setActiveSpace } = osRef.current;
            const count = Math.max(1, settings.spaceCount || 1);
            if (count >= MAX_SPACES) return;
            updateSettings({ spaceCount: count + 1 });
            setActiveSpace(count);
        };

        const activateDockSlot = (slot: number) => {
            const { dock, windows, focusedId, openApp, focusWindow, minimizeWindow } = osRef.current;
            const app = dockAppOrder(dock, windows)[slot];
            if (!app) return;
            closeOverlays();
            const appWindows = windows.filter((w) => w.app === app).sort((a, b) => b.z - a.z);
            if (appWindows.length === 0) {
                openApp(app);
                return;
            }
            const visible = appWindows.filter((w) => !w.minimized);
            const top = visible[0] ?? appWindows[0];
            if (!top.minimized && top.id === focusedId) {
                if (visible.length > 1) focusWindow(visible[1].id);
                else minimizeWindow(top.id);
                return;
            }
            focusAnywhere(top);
        };

        const clearMetaTimer = () => {
            if (metaTimerRef.current !== null) window.clearTimeout(metaTimerRef.current);
            metaTimerRef.current = null;
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (isOsLocked()) return;
            const { key, code } = e;
            const lower = key.length === 1 ? key.toLowerCase() : key;
            const typing = isTypingTarget(e.target);
            const {
                spotlightOpen,
                setSpotlightOpen,
                launchpadOpen,
                setLaunchpadOpen,
                missionControlOpen,
                setMissionControlOpen,
                notificationsOpen,
                setNotificationsOpen,
                minimizeWindow,
                closeWindow,
                openApp,
                focusedId,
            } = osRef.current;

            if (isMetaKey(e)) {
                if (e.repeat || metaDownRef.current) return;
                metaDownRef.current = true;
                metaChordRef.current = false;
                metaLongRef.current = false;
                clearMetaTimer();
                metaTimerRef.current = window.setTimeout(() => {
                    metaLongRef.current = true;
                    setMetaHeld(true);
                }, META_PEEK_MS);
                return;
            }
            if (e.metaKey) metaChordRef.current = true;

            // While the switcher is up it owns the keyboard.
            if (switcherOpenRef.current) {
                const isTab = key === 'Tab' || code === 'Tab' || (code === 'Backquote' && e.altKey);
                if (isTab || key === 'ArrowRight' || key === 'ArrowLeft') {
                    e.preventDefault();
                    e.stopPropagation();
                    stepSwitcher(key === 'ArrowLeft' || (isTab && e.shiftKey));
                    return;
                }
                if (key === 'Enter' || key === ' ') {
                    e.preventDefault();
                    commitSwitcher();
                    return;
                }
                if (key === 'Escape') {
                    e.preventDefault();
                    setSwitcher(false);
                    return;
                }
                if (lower === 'q' || lower === 'w') {
                    e.preventDefault();
                    actOnSwitcherSelection('close');
                    return;
                }
                if (lower === 'm') {
                    e.preventDefault();
                    actOnSwitcherSelection('minimize');
                    return;
                }
            }

            // Alt+Tab (reaches the page only in immersive mode) or Alt+` which the OS never takes.
            if ((key === 'Tab' || code === 'Tab' || code === 'Backquote') && e.altKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                e.stopPropagation();
                openSwitcher(e.shiftKey, true);
                return;
            }

            // Classic window manager chords — work even while typing in apps.
            if (e.altKey && !e.ctrlKey && !e.metaKey) {
                if (key === 'F4') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (focusedId) closeWindow(focusedId);
                    return;
                }
                if (key === 'F9') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (focusedId) minimizeWindow(focusedId);
                    return;
                }
                if (key === 'F10') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (focusedId) osRef.current.toggleMaximize(focusedId);
                    return;
                }
            }

            // Ctrl+F4 / Ctrl+W — close focused window (skip when typing in editors/terminals).
            if (e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && (key === 'F4' || (lower === 'w' && !typing))) {
                e.preventDefault();
                e.stopPropagation();
                if (focusedId) closeWindow(focusedId);
                return;
            }

            // Immersive mode — Ctrl+Alt+F or Ctrl+Shift+F11. Windows reports Ctrl+Alt as
            // AltGr, so match on the physical key instead of the produced character.
            if (e.ctrlKey && e.altKey && !e.metaKey && code === 'KeyL') {
                e.preventDefault();
                e.stopPropagation();
                closeOverlays();
                lockOs();
                return;
            }

            if (
                (e.ctrlKey && e.altKey && !e.metaKey && code === 'KeyF') ||
                (e.ctrlKey && e.shiftKey && key === 'F11')
            ) {
                e.preventDefault();
                e.stopPropagation();
                toggleImmersiveWithFeedback(tRef.current);
                return;
            }

            if ((e.ctrlKey || e.metaKey) && (code === 'Space' || key === ' ')) {
                e.preventDefault();
                e.stopPropagation();
                closeOverlays();
                setSpotlightOpen(!spotlightOpen);
                return;
            }

            if (e.ctrlKey && !e.metaKey && lower === 'l' && !e.shiftKey && !e.altKey) {
                if (typing) return;
                e.preventDefault();
                closeOverlays();
                setLaunchpadOpen(!launchpadOpen);
                return;
            }

            if (key === 'F3' || (e.ctrlKey && !e.metaKey && !e.altKey && key === 'ArrowUp')) {
                e.preventDefault();
                closeOverlays();
                setMissionControlOpen(!missionControlOpen);
                return;
            }

            if (e.ctrlKey && !e.metaKey && !e.altKey && key === '/' && !typing) {
                e.preventDefault();
                setShortcutsOpen((v) => !v);
                return;
            }

            if (!e.metaKey) return;

            // Ctrl+Win chords: virtual desktops
            if (e.ctrlKey && !e.altKey) {
                if (key === 'ArrowLeft' || key === 'ArrowRight') {
                    e.preventDefault();
                    switchSpace(key === 'ArrowLeft' ? -1 : 1);
                    return;
                }
                if (lower === 'd') {
                    e.preventDefault();
                    addSpace();
                }
                return;
            }

            if (e.altKey) return;

            // Win+Shift chords: carry the focused window to another desktop
            if (e.shiftKey) {
                if (key === 'ArrowLeft' || key === 'ArrowRight') {
                    e.preventDefault();
                    moveFocusedToSpace(key === 'ArrowLeft' ? -1 : 1);
                }
                return;
            }

            if (/^Digit[1-9]$/.test(code)) {
                e.preventDefault();
                activateDockSlot(Number(code.slice(5)) - 1);
                return;
            }

            if (key === 'Tab' || code === 'Tab') {
                e.preventDefault();
                closeOverlays();
                setMissionControlOpen(!missionControlOpen);
                return;
            }

            if (lower === 'd') {
                e.preventDefault();
                e.stopPropagation();
                showDesktop();
                return;
            }

            if (key === '/' || key === '?') {
                e.preventDefault();
                setShortcutsOpen((v) => !v);
                return;
            }

            if (typing) return;

            switch (lower) {
                case 'm':
                    e.preventDefault();
                    if (focusedId) minimizeWindow(focusedId);
                    return;
                case 'w':
                    e.preventDefault();
                    if (focusedId) closeWindow(focusedId);
                    return;
                case 'e':
                    e.preventDefault();
                    closeOverlays();
                    openApp('finder');
                    return;
                case 'r':
                case 's':
                    e.preventDefault();
                    closeOverlays();
                    setSpotlightOpen(true);
                    return;
                case 'n':
                    e.preventDefault();
                    closeOverlays();
                    setNotificationsOpen(!notificationsOpen);
                    return;
                case 'l':
                    e.preventDefault();
                    closeOverlays();
                    lockOs();
                    return;
                case ',':
                    e.preventDefault();
                    closeOverlays();
                    openApp('settings');
                    return;
                case 'Home':
                    e.preventDefault();
                    minimizeOthers();
                    return;
                case 'ArrowLeft':
                case 'ArrowRight':
                case 'ArrowUp':
                case 'ArrowDown':
                    e.preventDefault();
                    tileFocused(
                        key === 'ArrowLeft'
                            ? 'left'
                            : key === 'ArrowRight'
                              ? 'right'
                              : key === 'ArrowUp'
                                ? 'up'
                                : 'down',
                    );
                    return;
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            if (isOsLocked()) return;
            if (switcherOpenRef.current && switcherHeldRef.current && isAltKey(e)) {
                e.preventDefault();
                commitSwitcher();
                return;
            }
            if (!isMetaKey(e)) return;
            const wasPeek = metaLongRef.current;
            const wasChord = metaChordRef.current;
            metaDownRef.current = false;
            metaLongRef.current = false;
            clearMetaTimer();
            setMetaHeld(false);
            if (wasChord || wasPeek || isTypingTarget(e.target)) return;
            e.preventDefault();
            const { launchpadOpen, setLaunchpadOpen } = osRef.current;
            const opening = !launchpadOpen;
            closeOverlays();
            setLaunchpadOpen(opening);
        };

        const onBlur = () => {
            if (switcherOpenRef.current && switcherHeldRef.current) commitSwitcher();
            metaDownRef.current = false;
            metaLongRef.current = false;
            clearMetaTimer();
            setMetaHeld(false);
        };

        const onSwitcherRequest = () => openSwitcher(false, false);
        const onShortcutsRequest = () => setShortcutsOpen(true);

        window.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('keyup', onKeyUp, true);
        window.addEventListener('blur', onBlur);
        window.addEventListener(FOS_SWITCHER_EVENT, onSwitcherRequest);
        window.addEventListener(FOS_SHORTCUTS_EVENT, onShortcutsRequest);
        return () => {
            clearMetaTimer();
            window.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('keyup', onKeyUp, true);
            window.removeEventListener('blur', onBlur);
            window.removeEventListener(FOS_SWITCHER_EVENT, onSwitcherRequest);
            window.removeEventListener(FOS_SHORTCUTS_EVENT, onShortcutsRequest);
        };
    }, []);

    return {
        metaHeld,
        shortcutsOpen,
        setShortcutsOpen,
        switcherOpen,
        switcherIndex,
        switcherWindows: switcherOpen ? switcherList : [],
        hoverSwitcher: (index: number) => {
            switcherIndexRef.current = index;
            setSwitcherIndex(index);
        },
        pickSwitcher: (id: string) => {
            const win = switcherListRef.current.find((w) => w.id === id);
            switcherOpenRef.current = false;
            switcherHeldRef.current = false;
            setSwitcherOpen(false);
            if (!win) return;
            if ((win.space ?? 0) !== os.activeSpace) os.setActiveSpace(win.space ?? 0);
            os.focusWindow(win.id);
        },
    };
}
