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

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, X, Pin, PinOff, AppWindow } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { moveToFeatherOsTrash } from '@/lib/featheros-trash';
import { cn } from '@/lib/utils';
import { useFeatherOs } from './FeatherOsContext';
import { OS_APPS } from './registry';
import { AppIcon, OsIcon } from './AppIcon';
import { LAUNCHER_ART } from './appIconArt';
import { findDockTargetRect, playGenieRestore } from './genie';
import { dockAppOrder } from './useOsHotkeys';
import { OS_FILE_DRAG_MIME, type OsAppId, type OsContextMenuItem, type OsFileDragPayload } from './types';
import { isTextLike, joinPath } from './utils';

function readPayload(e: React.DragEvent): OsFileDragPayload | null {
    try {
        const raw = e.dataTransfer.getData(OS_FILE_DRAG_MIME);
        return raw ? (JSON.parse(raw) as OsFileDragPayload) : null;
    } catch {
        return null;
    }
}

interface DockEntry {
    key: string;
    kind: 'launcher' | 'app' | 'window' | 'trash';
    app?: OsAppId;
    windowId?: string;
    pinned?: boolean;
}

export function Dock() {
    const { t } = useTranslation();
    const os = useFeatherOs();
    const {
        dock,
        setDock,
        windows,
        focusedId,
        openApp,
        focusWindow,
        minimizeWindow,
        closeAppWindows,
        settings,
        openContextMenu,
        getServer,
        confirm,
        can,
        emitFilesChanged,
        errorMessage,
        openFileInEditor,
        openTerminalFor,
        setSpotlightOpen,
        setLaunchpadOpen,
    } = os;
    const [mousePos, setMousePos] = useState<number | null>(null);
    const [bouncing, setBouncing] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState<string | null>(null);
    const [overflowing, setOverflowing] = useState(false);
    const shellRef = useRef<HTMLDivElement>(null);
    const [revealed, setRevealed] = useState(!settings.dockAutoHide);
    const itemRefs = useRef(new Map<string, HTMLDivElement>());
    const base = settings.dockSize;
    const pos = settings.dockPosition || 'bottom';
    const vertical = pos === 'left' || pos === 'right';

    useEffect(() => {
        const node = shellRef.current;
        if (!node) return;
        const measure = () => setOverflowing(node.scrollWidth > node.clientWidth + 1);
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        measure();
        return () => observer.disconnect();
    }, [dock, windows, base, vertical]);

    useEffect(() => {
        if (!settings.dockAutoHide) {
            setRevealed(true);
            return;
        }
        setRevealed(false);
        const onMove = (e: MouseEvent) => {
            if (pos === 'bottom' && e.clientY >= window.innerHeight - 6) setRevealed(true);
            if (pos === 'left' && e.clientX <= 6) setRevealed(true);
            if (pos === 'right' && e.clientX >= window.innerWidth - 6) setRevealed(true);
        };
        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
    }, [settings.dockAutoHide, pos]);

    const runningApps = Array.from(new Set(windows.map((w) => w.app)));
    const appOrder = dockAppOrder(dock, windows);
    const pinnedEntries: DockEntry[] = dock.map((app) => ({
        key: `app:${app}`,
        kind: 'app' as const,
        app,
        pinned: true,
    }));
    const unpinnedEntries: DockEntry[] = runningApps
        .filter((app) => !dock.includes(app))
        .map((app) => ({ key: `app:${app}`, kind: 'app' as const, app, pinned: false }));
    const minimized = windows.filter((w) => w.minimized);
    const minimizedEntries: DockEntry[] = minimized.map((w) => ({
        key: `win:${w.id}`,
        kind: 'window' as const,
        app: w.app,
        windowId: w.id,
    }));

    const sizeFor = useCallback(
        (key: string) => {
            if (!settings.dockMagnification || settings.reduceMotion || overflowing || mousePos === null) return base;
            const el = itemRefs.current.get(key);
            if (!el) return base;
            const rect = el.getBoundingClientRect();
            const center = vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
            const dist = Math.abs(mousePos - center);
            const range = base * 3.2;
            const factor = Math.max(0, 1 - dist / range);
            return base * (1 + 0.32 * factor * factor);
        },
        [settings.dockMagnification, settings.reduceMotion, overflowing, mousePos, base, vertical],
    );

    const activate = (entry: DockEntry) => {
        const restore = async (windowId: string, app: string) => {
            focusWindow(windowId);
            // Wait a frame so the window is visible again, then reverse-genie from the dock icon.
            await new Promise((r) => requestAnimationFrame(() => r(undefined)));
            const node = document.querySelector(`[data-fos-window-id="${CSS.escape(windowId)}"]`) as HTMLElement | null;
            if (node && !settings.reduceMotion) {
                const from = findDockTargetRect(app, windowId);
                await playGenieRestore(node, from);
            }
        };
        if (entry.kind === 'window' && entry.windowId && entry.app) {
            void restore(entry.windowId, entry.app);
            return;
        }
        if (entry.kind === 'launcher') {
            setSpotlightOpen(false);
            setLaunchpadOpen(true);
            return;
        }
        if (entry.kind === 'trash') {
            openApp('trash');
            return;
        }
        if (!entry.app) return;
        const appWindows = windows.filter((w) => w.app === entry.app).sort((a, b) => b.z - a.z);
        if (appWindows.length === 0) {
            setBouncing(entry.key);
            window.setTimeout(() => setBouncing(null), 700);
            openApp(entry.app);
            return;
        }
        const visible = appWindows.filter((w) => !w.minimized);
        const top = visible[0] ?? appWindows[0];
        // Already focused → cycle other windows, or minimize the only one.
        if (top && !top.minimized && top.id === focusedId) {
            if (visible.length > 1) {
                const idx = visible.findIndex((w) => w.id === focusedId);
                const next = visible[(idx + 1) % visible.length];
                focusWindow(next.id);
                return;
            }
            minimizeWindow(top.id);
            return;
        }
        if (top.minimized) void restore(top.id, entry.app);
        else focusWindow(top.id);
    };

    const menuFor = (entry: DockEntry, e: React.MouseEvent) => {
        e.preventDefault();
        if (entry.kind !== 'app' || !entry.app) return;
        const app = entry.app;
        const appWindows = windows.filter((w) => w.app === app);
        const items: OsContextMenuItem[] = [
            ...appWindows.map((w) => ({
                id: w.id,
                label: [t(OS_APPS[app].nameKey), getServer(w.serverUuid)?.name].filter(Boolean).join(' — '),
                icon: AppWindow,
                checked: w.id === focusedId,
                onSelect: () => focusWindow(w.id),
            })),
            ...(appWindows.length ? [{ id: 's0', separator: true }] : []),
            {
                id: 'new',
                label: t('featheros.menu.new_window'),
                icon: Plus,
                disabled: !!OS_APPS[app].singleton && appWindows.length > 0,
                onSelect: () => openApp(app, { newWindow: true }),
            },
            entry.pinned
                ? {
                      id: 'unpin',
                      label: t('featheros.dock.remove'),
                      icon: PinOff,
                      disabled: app === 'finder',
                      onSelect: () => setDock(dock.filter((a) => a !== app)),
                  }
                : {
                      id: 'pin',
                      label: t('featheros.dock.keep'),
                      icon: Pin,
                      onSelect: () => setDock([...dock, app]),
                  },
            ...(appWindows.length
                ? [
                      { id: 's1', separator: true },
                      {
                          id: 'quit',
                          label: t('featheros.menu.quit', { app: t(OS_APPS[app].nameKey) }),
                          icon: X,
                          onSelect: () => closeAppWindows(app),
                      },
                  ]
                : []),
        ];
        openContextMenu({ x: e.clientX, y: e.clientY - 10 }, items);
    };

    const handleDrop = async (entry: DockEntry, e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(null);
        const payload = readPayload(e);
        if (!payload) return;
        if (entry.kind === 'trash') {
            if (!can(payload.serverUuid, 'file.delete')) {
                toast.error(t('featheros.errors.no_permission'));
                return;
            }
            const ok = await confirm({
                title: t('featheros.files.delete_title', { count: String(payload.files.length) }),
                message: payload.files.map((f) => f.name).join(', '),
                confirmLabel: t('featheros.files.delete'),
                danger: true,
            });
            if (!ok) return;
            try {
                await moveToFeatherOsTrash(payload.serverUuid, payload.root, payload.files);
                toast.success(t('featheros.files.deleted', { count: String(payload.files.length) }));
            } catch (error) {
                toast.error(errorMessage(error));
            }
            emitFilesChanged(payload.serverUuid, payload.root);
            return;
        }
        if (entry.app === 'editor') {
            payload.files
                .filter((f) => f.isFile && isTextLike(f.name))
                .forEach((f) => openFileInEditor(payload.serverUuid, joinPath(payload.root, f.name)));
            return;
        }
        if (entry.app === 'terminal') {
            openTerminalFor(payload.serverUuid);
            return;
        }
        if (entry.app === 'finder') {
            const folder = payload.files.length === 1 && !payload.files[0].isFile;
            openApp('finder', {
                serverUuid: payload.serverUuid,
                newWindow: true,
                props: { path: folder ? joinPath(payload.root, payload.files[0].name) : payload.root },
            });
        }
    };

    const acceptsDrop = (entry: DockEntry) =>
        entry.kind === 'trash' || (entry.kind === 'app' && ['editor', 'terminal', 'finder'].includes(entry.app ?? ''));

    const renderEntry = (entry: DockEntry) => {
        const size = sizeFor(entry.key);
        const scale = base > 0 ? size / base : 1;
        const appWins = entry.kind === 'app' && entry.app ? windows.filter((w) => w.app === entry.app) : [];
        const running = entry.kind === 'app' && appWins.length > 0;
        const focused = entry.kind === 'app' && appWins.some((w) => w.id === focusedId);
        const openCount = appWins.length;
        const slot = entry.kind === 'app' && entry.app ? appOrder.indexOf(entry.app) : -1;
        const label =
            entry.kind === 'launcher'
                ? t('featheros.launchpad.title', { defaultValue: 'Launchpad' })
                : entry.kind === 'trash'
                  ? t('featheros.dock.trash')
                  : entry.kind === 'window'
                    ? [
                          t(OS_APPS[entry.app!].nameKey),
                          getServer(windows.find((w) => w.id === entry.windowId)?.serverUuid)?.name,
                      ]
                          .filter(Boolean)
                          .join(' — ')
                    : t(OS_APPS[entry.app!].nameKey);
        return (
            <div
                key={entry.key}
                ref={(el) => {
                    if (el) itemRefs.current.set(entry.key, el);
                    else itemRefs.current.delete(entry.key);
                }}
                className={cn(
                    'group relative flex shrink-0 flex-col items-center justify-end',
                    entry.kind === 'launcher' && 'fos-dock-launcher',
                )}
                style={{ width: base, height: base }}
                onDragOver={(e) => {
                    if (!acceptsDrop(entry) || !e.dataTransfer.types.includes(OS_FILE_DRAG_MIME)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = entry.kind === 'trash' ? 'move' : 'link';
                    setDragOver(entry.key);
                }}
                onDragLeave={() => setDragOver((k) => (k === entry.key ? null : k))}
                onDrop={(e) => void handleDrop(entry, e)}
            >
                <span
                    className={cn(
                        'fos-glass-menu pointer-events-none absolute rounded-[7px] px-2 py-0.5 text-[11px] font-medium whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100',
                        vertical ? 'top-1/2 left-full ml-2.5 -translate-y-1/2' : '-top-9 left-1/2 -translate-x-1/2',
                    )}
                >
                    {label}
                </span>
                <button
                    type='button'
                    aria-label={label}
                    data-fos-dock-app={entry.app ?? undefined}
                    data-fos-dock-window={entry.windowId ?? undefined}
                    data-fos-dock-trash={entry.kind === 'trash' ? '1' : undefined}
                    onClick={() => activate(entry)}
                    onContextMenu={(e) => menuFor(entry, e)}
                    aria-pressed={focused || undefined}
                    className={cn(
                        'fos-dock-item relative z-10 flex items-end justify-center rounded-[16px] outline-none',
                        entry.kind === 'launcher' && 'fos-dock-launcher-button',
                        bouncing === entry.key && 'fos-dock-bounce',
                        dragOver === entry.key && 'scale-110 brightness-110',
                    )}
                    style={{
                        width: base,
                        height: base,
                    }}
                >
                    <div
                        className='fos-dock-scale flex h-full w-full items-end justify-center'
                        style={{ transform: `scale(${scale})`, transformOrigin: vertical ? 'center' : 'bottom center' }}
                    >
                        {entry.kind === 'launcher' ? (
                            <OsIcon art={LAUNCHER_ART} size={base} />
                        ) : entry.kind === 'trash' ? (
                            <AppIcon
                                app='trash'
                                size={base}
                                className={cn('fos-dock-trash-icon', dragOver === 'trash' && 'is-drop-target')}
                            />
                        ) : (
                            <div className={cn('relative', entry.kind === 'window' && 'opacity-90')}>
                                <AppIcon app={entry.app!} size={base} />
                                {slot >= 0 && slot < 9 && (
                                    <span className='fos-dock-keyhint' aria-hidden>
                                        {slot + 1}
                                    </span>
                                )}
                                {entry.kind === 'app' && openCount > 1 && (
                                    <span className='fos-dock-count' aria-hidden>
                                        {openCount > 9 ? '9+' : openCount}
                                    </span>
                                )}
                                {entry.kind === 'window' && (
                                    <span className='absolute -right-1 -bottom-1 rounded-full bg-black/70 px-1 text-[9px] text-white'>
                                        {(
                                            getServer(windows.find((w) => w.id === entry.windowId)?.serverUuid)?.name ??
                                            ''
                                        ).slice(0, 6)}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </button>
                <span
                    className={cn(
                        'fos-dock-indicator mt-1 transition-all',
                        running || entry.kind === 'window' ? 'is-running' : 'opacity-0',
                        focused && 'is-focused',
                        openCount > 1 && 'is-multi',
                    )}
                    aria-hidden
                />
            </div>
        );
    };

    const sections: DockEntry[][] = [
        [{ key: 'launcher', kind: 'launcher' as const }],
        pinnedEntries,
        unpinnedEntries,
        minimizedEntries,
        [{ key: 'trash', kind: 'trash' as const }],
    ].filter((section) => section.length > 0);

    return (
        <div
            className={cn(
                'pointer-events-none absolute z-[8000] flex max-w-[calc(100vw-12px)] transition-transform duration-300',
                pos === 'bottom' && 'inset-x-0 bottom-0 justify-center pb-2.5',
                pos === 'left' && 'inset-y-0 left-0 items-center pl-2.5',
                pos === 'right' && 'inset-y-0 right-0 items-center pr-2.5',
                !revealed && pos === 'bottom' && 'translate-y-[calc(100%+8px)]',
                !revealed && pos === 'left' && 'translate-x-[calc(-100%-8px)]',
                !revealed && pos === 'right' && 'translate-x-[calc(100%+8px)]',
            )}
            onMouseLeave={() => settings.dockAutoHide && setRevealed(false)}
            onFocusCapture={() => setRevealed(true)}
        >
            <div
                ref={shellRef}
                data-vertical={vertical || undefined}
                className={cn(
                    'fos-dock-shell pointer-events-auto',
                    vertical
                        ? 'flex max-h-[calc(100vh-24px)] flex-col items-center overflow-y-auto px-2.5 py-3'
                        : 'flex max-w-full items-end px-3.5 pt-3 pb-2.5',
                    !vertical && (overflowing ? 'overflow-x-auto' : 'overflow-visible'),
                )}
                onMouseMove={(e) => setMousePos(vertical ? e.clientY : e.clientX)}
                onMouseLeave={() => setMousePos(null)}
            >
                {sections.map((section, i) => (
                    <div key={`sec-${i}`} className='contents'>
                        {i > 0 && <div className='fos-dock-divider' aria-hidden />}
                        {section.map(renderEntry)}
                    </div>
                ))}
            </div>
        </div>
    );
}
