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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FolderOpen,
    SquareTerminal,
    Play,
    Square,
    RotateCw,
    ExternalLink,
    Trash2,
    Image as ImageIcon,
    LayoutGrid,
    Plus,
    Search,
    SunMoon,
    Eye,
    Columns2,
    StickyNote,
    Calculator,
    AlignLeft,
    AlignRight,
    ArrowDownAZ,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { moveToFeatherOsTrash } from '@/lib/featheros-trash';
import { useFeatherOs } from './FeatherOsContext';
import { AppIcon, OsIcon } from './AppIcon';
import { FOLDER_ART, SERVER_DRIVE_ART, fileArt } from './appIconArt';
import { DesktopWidgets } from './DesktopWidgets';
import { OS_FILE_DRAG_MIME, type OsAppId, type OsDesktopIcon, type OsFileDragPayload } from './types';
import { joinPath, parentDir, serverState, stateColor, isTextLike, formatDiskPair, serverDiskUsage } from './utils';

interface RenderedIcon extends OsDesktopIcon {
    label: string;
}

interface Marquee {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

function rectsIntersect(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function Desktop() {
    const { t } = useTranslation();
    const os = useFeatherOs();
    const {
        servers,
        live,
        icons,
        upsertIcon,
        removeIcon,
        settings,
        updateSettings,
        openApp,
        openContextMenu,
        openTerminalFor,
        openFileInEditor,
        moveOrCopyFiles,
        can,
        isDark,
        setOsTheme,
        setSpotlightOpen,
        setMissionControlOpen,
        errorMessage,
        activeSpace,
        confirm,
        openQuickLook,
    } = os;
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [dragGroup, setDragGroup] = useState<{
        ids: string[];
        ox: number;
        oy: number;
        positions: Record<string, { x: number; y: number }>;
    } | null>(null);
    const [dropTarget, setDropTarget] = useState<string | null>(null);
    const [marquee, setMarquee] = useState<Marquee | null>(null);
    const areaRef = useRef<HTMLDivElement>(null);
    const iconRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    const grid = Math.max(72, settings.gridSpacing || 100);
    const iconPx = Math.max(40, Math.min(96, settings.iconSize || 64));
    // Rows need room for the icon, a two-line label and the server disk meter, so the
    // vertical step can be taller than the horizontal one (otherwise labels overlap).
    const gridY = Math.max(grid, iconPx + 60);

    const rendered = useMemo<RenderedIcon[]>(() => {
        const width = typeof window !== 'undefined' ? window.innerWidth : 1440;
        const height = typeof window !== 'undefined' ? window.innerHeight - 120 : 800;
        const perCol = Math.max(1, Math.floor((height - 20) / gridY));
        const stored = new Map(icons.map((i) => [i.id, i]));
        const out: RenderedIcon[] = [];
        if (settings.showServerIcons) {
            servers.forEach((s, idx) => {
                const id = `server:${s.uuidShort}`;
                const col = Math.floor(idx / perCol);
                const row = idx % perCol;
                const pos = stored.get(id);
                const space = pos?.space ?? 0;
                if (space !== activeSpace) return;
                out.push({
                    id,
                    kind: 'server',
                    serverUuid: s.uuidShort,
                    label: s.name,
                    space,
                    x: pos?.x ?? width - grid - 16 - col * grid,
                    y: pos?.y ?? 16 + row * gridY,
                });
            });
        }
        icons
            .filter((i) => i.kind !== 'server' && (i.space ?? 0) === activeSpace)
            .forEach((i) => {
                const label =
                    i.label ||
                    (i.kind === 'app' && i.app ? t(`featheros.apps.${i.app}`) : (i.path ?? '').split('/').pop() || '/');
                out.push({ ...i, label });
            });
        return out;
    }, [servers, icons, settings.showServerIcons, t, activeSpace, grid, gridY]);

    const snap = useCallback(
        (x: number, y: number) => {
            if (!settings.snapToGrid) return { x, y };
            return { x: Math.round(x / grid) * grid, y: Math.round(y / gridY) * gridY };
        },
        [settings.snapToGrid, grid, gridY],
    );

    const openIcon = (icon: RenderedIcon) => {
        if (icon.kind === 'server' && icon.serverUuid) openApp('server', { serverUuid: icon.serverUuid });
        else if (icon.kind === 'folder' && icon.serverUuid)
            openApp('finder', { serverUuid: icon.serverUuid, newWindow: true, props: { path: icon.path } });
        else if (icon.kind === 'file' && icon.serverUuid && icon.path) {
            if (isTextLike(icon.path)) openFileInEditor(icon.serverUuid, icon.path);
            else
                openApp('finder', {
                    serverUuid: icon.serverUuid,
                    newWindow: true,
                    props: { path: parentDir(icon.path) },
                });
        } else if (icon.kind === 'app' && icon.app) openApp(icon.app);
    };

    const power = async (uuid: string, action: 'start' | 'stop' | 'restart') => {
        try {
            await axios.post(`/api/user/servers/${uuid}/power/${action}`);
            toast.success(t(`featheros.servers.power_sent_${action}`));
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    const selectedIcons = useMemo(() => rendered.filter((i) => selected.has(i.id)), [rendered, selected]);

    const clampPos = useCallback(
        (x: number, y: number) => {
            const el = areaRef.current;
            const w = el?.clientWidth ?? window.innerWidth;
            const h = el?.clientHeight ?? window.innerHeight - 120;
            const iw = iconPx + 28;
            const ih = iconPx + 40;
            return {
                x: Math.max(8, Math.min(x, Math.max(8, w - iw - 8))),
                y: Math.max(8, Math.min(y, Math.max(8, h - ih - 8))),
            };
        },
        [iconPx],
    );

    const placeIcon = useCallback(
        (icon: RenderedIcon, x: number, y: number) => {
            const next = clampPos(snap(x, y).x, snap(x, y).y);
            if (icon.kind === 'server') {
                upsertIcon({
                    id: icon.id,
                    kind: 'server',
                    serverUuid: icon.serverUuid,
                    x: next.x,
                    y: next.y,
                    space: activeSpace,
                });
            } else {
                upsertIcon({ ...icon, x: next.x, y: next.y, space: activeSpace });
            }
        },
        [activeSpace, clampPos, snap, upsertIcon],
    );

    const cleanUp = (side: 'left' | 'right' | 'auto' = 'auto') => {
        const width = areaRef.current?.clientWidth ?? 1440;
        const height = areaRef.current?.clientHeight ?? 800;
        const perCol = Math.max(1, Math.floor((height - 24) / gridY));
        const shortcuts = rendered.filter((i) => i.kind !== 'server');
        const serverIcons = rendered.filter((i) => i.kind === 'server');
        const layout = (list: RenderedIcon[], fromRight: boolean) => {
            list.forEach((icon, idx) => {
                const col = Math.floor(idx / perCol);
                const row = idx % perCol;
                const x = fromRight ? width - grid - 16 - col * grid : 16 + col * grid;
                const y = 16 + row * gridY;
                placeIcon(icon, x, y);
            });
        };
        if (side === 'left') layout([...shortcuts, ...serverIcons], false);
        else if (side === 'right') layout([...shortcuts, ...serverIcons], true);
        else {
            layout(shortcuts, false);
            layout(serverIcons, true);
        }
    };

    const sortByName = () => {
        const sorted = [...rendered].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
        const width = areaRef.current?.clientWidth ?? 1440;
        const height = areaRef.current?.clientHeight ?? 800;
        const perCol = Math.max(1, Math.floor((height - 24) / gridY));
        sorted.forEach((icon, idx) => {
            const col = Math.floor(idx / perCol);
            const row = idx % perCol;
            const fromRight = icon.kind === 'server';
            const x = fromRight ? width - grid - 16 - col * grid : 16 + col * grid;
            placeIcon(icon, x, 16 + row * gridY);
        });
    };

    const addAppShortcut = (app: OsAppId) => {
        const id = `app:${app}`;
        if (icons.some((i) => i.id === id && (i.space ?? 0) === activeSpace)) {
            toast.message(t('featheros.desktop.shortcut_exists', { defaultValue: 'Already on the desktop' }));
            return;
        }
        const taken = new Set(rendered.map((i) => `${Math.round(i.x / grid)}:${Math.round(i.y / gridY)}`));
        let x = 16;
        let y = 16;
        for (let n = 0; n < 200; n++) {
            const col = Math.floor(n / Math.max(1, Math.floor(((areaRef.current?.clientHeight ?? 800) - 24) / gridY)));
            const row = n % Math.max(1, Math.floor(((areaRef.current?.clientHeight ?? 800) - 24) / gridY));
            x = 16 + col * grid;
            y = 16 + row * gridY;
            if (!taken.has(`${Math.round(x / grid)}:${Math.round(y / gridY)}`)) break;
        }
        const pos = clampPos(snap(x, y).x, snap(x, y).y);
        upsertIcon({ id, kind: 'app', app, x: pos.x, y: pos.y, space: activeSpace, label: t(`featheros.apps.${app}`) });
    };

    const deleteSelected = async () => {
        const removable = selectedIcons.filter((i) => i.kind !== 'server');
        if (removable.length === 0) return;
        const ok = await confirm({
            title: t('featheros.desktop.remove_selected', { count: String(removable.length) }),
            confirmLabel: t('featheros.common.delete'),
            danger: true,
        });
        if (!ok) return;
        for (const i of removable) {
            if ((i.kind === 'file' || i.kind === 'folder') && i.serverUuid && i.path) {
                if (!can(i.serverUuid, 'file.delete')) {
                    toast.error(t('featheros.errors.no_permission'));
                    continue;
                }
                try {
                    const root = parentDir(i.path);
                    const name = i.path.split('/').filter(Boolean).pop() || i.label;
                    await moveToFeatherOsTrash(i.serverUuid, root, [
                        { name, directory: i.kind === 'folder', isFile: i.kind === 'file', size: 0 },
                    ]);
                } catch (e) {
                    toast.error(errorMessage(e));
                    continue;
                }
            }
            removeIcon(i.id);
        }
        setSelected(new Set());
    };

    // Keyboard shortcuts for the desktop surface.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
            if (!areaRef.current) return;
            const mod = e.metaKey || e.ctrlKey;
            if (mod && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                setSelected(new Set(rendered.map((i) => i.id)));
            } else if (e.key === ' ' && selectedIcons.length === 1) {
                e.preventDefault();
                const icon = selectedIcons[0];
                if (icon.serverUuid && icon.path) {
                    openQuickLook({ serverUuid: icon.serverUuid, path: icon.path, isFile: icon.kind === 'file' });
                }
            } else if (e.key === 'Enter' && selectedIcons.length === 1) {
                e.preventDefault();
                openIcon(selectedIcons[0]);
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIcons.length) {
                e.preventDefault();
                void deleteSelected();
            } else if (e.key === 'Escape') {
                setSelected(new Set());
                setMarquee(null);
            } else if (mod && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                setMissionControlOpen(true);
            } else if (
                selectedIcons.length > 0 &&
                (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')
            ) {
                e.preventDefault();
                const step = e.shiftKey ? grid : settings.snapToGrid ? grid : 12;
                const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
                const stepY = step === grid ? gridY : step;
                const dy = e.key === 'ArrowUp' ? -stepY : e.key === 'ArrowDown' ? stepY : 0;
                selectedIcons.forEach((icon) => placeIcon(icon, icon.x + dx, icon.y + dy));
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rendered, selectedIcons]);

    const iconMenu = (icon: RenderedIcon, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selected.has(icon.id)) setSelected(new Set([icon.id]));
        const uuid = icon.serverUuid ?? '';
        if (icon.kind === 'server') {
            openContextMenu({ x: e.clientX, y: e.clientY }, [
                { id: 'open', label: t('featheros.desktop.open'), icon: FolderOpen, onSelect: () => openIcon(icon) },
                {
                    id: 'term',
                    label: t('featheros.desktop.open_terminal'),
                    icon: SquareTerminal,
                    disabled: !can(uuid, 'websocket.connect'),
                    onSelect: () => openTerminalFor(uuid),
                },
                { id: 's1', separator: true },
                {
                    id: 'start',
                    label: t('featheros.servers.start'),
                    icon: Play,
                    disabled: !can(uuid, 'control.start'),
                    onSelect: () => void power(uuid, 'start'),
                },
                {
                    id: 'restart',
                    label: t('featheros.servers.restart'),
                    icon: RotateCw,
                    disabled: !can(uuid, 'control.restart'),
                    onSelect: () => void power(uuid, 'restart'),
                },
                {
                    id: 'stop',
                    label: t('featheros.servers.stop'),
                    icon: Square,
                    disabled: !can(uuid, 'control.stop'),
                    onSelect: () => void power(uuid, 'stop'),
                },
                { id: 's2', separator: true },
                {
                    id: 'panel',
                    label: t('featheros.desktop.open_in_panel'),
                    icon: ExternalLink,
                    onSelect: () => window.open(`/server/${uuid}`, '_blank', 'noopener'),
                },
            ]);
            return;
        }
        openContextMenu({ x: e.clientX, y: e.clientY }, [
            { id: 'open', label: t('featheros.desktop.open'), icon: FolderOpen, onSelect: () => openIcon(icon) },
            { id: 's', separator: true },
            {
                id: 'remove',
                label: t('featheros.desktop.remove_shortcut'),
                icon: Trash2,
                onSelect: () => removeIcon(icon.id),
            },
        ]);
    };

    const desktopMenu = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('[data-fos-icon],[data-fos-widget]')) return;
        e.preventDefault();
        setSelected(new Set());
        openContextMenu({ x: e.clientX, y: e.clientY }, [
            {
                id: 'finder',
                label: t('featheros.menu.new_finder'),
                icon: Plus,
                onSelect: () => openApp('finder', { newWindow: true }),
            },
            {
                id: 'spotlight',
                label: t('featheros.spotlight.title'),
                icon: Search,
                onSelect: () => setSpotlightOpen(true),
            },
            {
                id: 'mission',
                label: t('featheros.mission.title'),
                icon: Columns2,
                onSelect: () => setMissionControlOpen(true),
            },
            { id: 's1', separator: true },
            {
                id: 'wallpaper',
                label: t('featheros.desktop.change_wallpaper'),
                icon: ImageIcon,
                onSelect: () => openApp('settings', { props: { section: 'appearance' } }),
            },
            {
                id: 'theme',
                label: isDark ? t('featheros.desktop.light_mode') : t('featheros.desktop.dark_mode'),
                icon: SunMoon,
                onSelect: () => setOsTheme(isDark ? 'light' : 'dark'),
            },
            {
                id: 'servers',
                label: t('featheros.settings.show_server_icons'),
                icon: Eye,
                checked: settings.showServerIcons,
                onSelect: () => updateSettings({ showServerIcons: !settings.showServerIcons }),
            },
            { id: 's2', separator: true },
            {
                id: 'add-notes',
                label: t('featheros.desktop.add_notes', { defaultValue: 'Add Notes' }),
                icon: StickyNote,
                onSelect: () => addAppShortcut('notes'),
            },
            {
                id: 'add-calc',
                label: t('featheros.desktop.add_calculator', { defaultValue: 'Add Calculator' }),
                icon: Calculator,
                onSelect: () => addAppShortcut('calculator'),
            },
            {
                id: 'add-trash',
                label: t('featheros.desktop.add_trash', { defaultValue: 'Add Trash' }),
                icon: Trash2,
                onSelect: () => addAppShortcut('trash'),
            },
            { id: 's3', separator: true },
            {
                id: 'sort',
                label: t('featheros.desktop.sort_by_name', { defaultValue: 'Sort By Name' }),
                icon: ArrowDownAZ,
                onSelect: sortByName,
            },
            {
                id: 'align-left',
                label: t('featheros.desktop.align_left', { defaultValue: 'Align Left' }),
                icon: AlignLeft,
                onSelect: () => cleanUp('left'),
            },
            {
                id: 'align-right',
                label: t('featheros.desktop.align_right', { defaultValue: 'Align Right' }),
                icon: AlignRight,
                onSelect: () => cleanUp('right'),
            },
            {
                id: 'cleanup',
                label: t('featheros.desktop.clean_up'),
                icon: LayoutGrid,
                onSelect: () => cleanUp('auto'),
            },
        ]);
    };

    const onPointerDownBackground = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest('[data-fos-icon],[data-fos-widget]')) return;
        const rect = areaRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) setSelected(new Set());
        const start: Marquee = { x0: x, y0: y, x1: x, y1: y };
        setMarquee(start);
        const base = e.metaKey || e.ctrlKey || e.shiftKey ? new Set(selected) : new Set<string>();
        const onMove = (ev: PointerEvent) => {
            const m = { x0: start.x0, y0: start.y0, x1: ev.clientX - rect.left, y1: ev.clientY - rect.top };
            setMarquee(m);
            const box = {
                x: Math.min(m.x0, m.x1),
                y: Math.min(m.y0, m.y1),
                w: Math.abs(m.x1 - m.x0),
                h: Math.abs(m.y1 - m.y0),
            };
            const hit = new Set(base);
            rendered.forEach((icon) => {
                if (rectsIntersect(box, { x: icon.x, y: icon.y, w: iconPx + 24, h: iconPx + 36 })) hit.add(icon.id);
            });
            setSelected(hit);
        };
        const onUp = () => {
            setMarquee(null);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const startIconDrag = (icon: RenderedIcon, e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        const target = e.currentTarget;
        let ids = selected.has(icon.id) && selected.size > 1 ? Array.from(selected) : [icon.id];
        if (!selected.has(icon.id)) {
            if (e.metaKey || e.ctrlKey) {
                setSelected((cur) => {
                    const n = new Set(cur);
                    if (n.has(icon.id)) n.delete(icon.id);
                    else n.add(icon.id);
                    return n;
                });
                return;
            }
            if (e.shiftKey) {
                setSelected((cur) => new Set(cur).add(icon.id));
                ids = Array.from(new Set([...selected, icon.id]));
            } else {
                setSelected(new Set([icon.id]));
                ids = [icon.id];
            }
        }
        try {
            target.setPointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }
        const positions: Record<string, { x: number; y: number }> = {};
        rendered.forEach((i) => {
            if (ids.includes(i.id)) positions[i.id] = { x: i.x, y: i.y };
        });
        const group = { ids, ox: e.clientX, oy: e.clientY, positions };
        setDragGroup(group);
        let moved = false;
        const onMove = (ev: PointerEvent) => {
            const dx = ev.clientX - group.ox;
            const dy = ev.clientY - group.oy;
            if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
            moved = true;
            setDragGroup({
                ...group,
                positions: Object.fromEntries(
                    Object.entries(group.positions).map(([id, p]) => {
                        const raw = clampPos(p.x + dx, p.y + dy);
                        return [id, raw];
                    }),
                ),
            });
        };
        const onUp = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            try {
                target.releasePointerCapture(ev.pointerId);
            } catch {
                /* ignore */
            }
            const dx = ev.clientX - group.ox;
            const dy = ev.clientY - group.oy;
            setDragGroup(null);
            if (Math.abs(dx) + Math.abs(dy) < 3) return;
            ids.forEach((id) => {
                const base = group.positions[id];
                const iconData = rendered.find((r) => r.id === id);
                if (!base || !iconData) return;
                const next = clampPos(snap(base.x + dx, base.y + dy).x, snap(base.x + dx, base.y + dy).y);
                placeIcon(iconData, next.x, next.y);
            });
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    };

    const readPayload = (e: React.DragEvent): OsFileDragPayload | null => {
        try {
            const raw = e.dataTransfer.getData(OS_FILE_DRAG_MIME) || e.dataTransfer.getData('application/json');
            if (!raw) return null;
            return JSON.parse(raw) as OsFileDragPayload;
        } catch {
            return null;
        }
    };

    const onDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setDropTarget(null);
        const payload = readPayload(e);
        if (!payload) return;
        const targetEl = (e.target as HTMLElement).closest('[data-fos-icon]') as HTMLElement | null;
        const targetId = targetEl?.dataset.fosIcon;
        const target = targetId ? rendered.find((i) => i.id === targetId) : null;
        if (target?.kind === 'server' && target.serverUuid) {
            await moveOrCopyFiles(
                payload,
                { serverUuid: target.serverUuid, dir: '/' },
                payload.serverUuid === target.serverUuid ? 'move' : 'copy',
            );
            return;
        }
        if (target?.kind === 'folder' && target.serverUuid && target.path) {
            await moveOrCopyFiles(
                payload,
                { serverUuid: target.serverUuid, dir: target.path },
                payload.serverUuid === target.serverUuid ? 'move' : 'copy',
            );
            return;
        }
        // Drop on empty desktop → shortcuts.
        const rect = areaRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        payload.files.slice(0, 20).forEach((f, i) => {
            const pos = snap(x + (i % 4) * grid, y + Math.floor(i / 4) * grid);
            upsertIcon({
                id: `file:${payload.serverUuid}:${joinPath(payload.root, f.name)}`,
                kind: f.isFile ? 'file' : 'folder',
                serverUuid: payload.serverUuid,
                path: joinPath(payload.root, f.name),
                label: f.name,
                x: pos.x,
                y: pos.y,
                space: activeSpace,
            });
        });
        toast.success(t('featheros.desktop.shortcuts_created', { count: String(Math.min(20, payload.files.length)) }));
    };

    const marqueeStyle = marquee
        ? {
              left: Math.min(marquee.x0, marquee.x1),
              top: Math.min(marquee.y0, marquee.y1),
              width: Math.abs(marquee.x1 - marquee.x0),
              height: Math.abs(marquee.y1 - marquee.y0),
          }
        : null;

    return (
        <div
            ref={areaRef}
            className='absolute inset-0 overflow-hidden'
            onContextMenu={desktopMenu}
            onPointerDown={onPointerDownBackground}
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = e.altKey || e.ctrlKey ? 'copy' : 'move';
            }}
            onDrop={(e) => void onDrop(e)}
            onDragLeave={() => setDropTarget(null)}
        >
            {settings.showWidgets && <DesktopWidgets />}
            {rendered.map((icon) => {
                const pos = dragGroup?.positions[icon.id] ?? { x: icon.x, y: icon.y };
                const isSel = selected.has(icon.id);
                const server =
                    icon.kind === 'server' && icon.serverUuid
                        ? servers.find((s) => s.uuidShort === icon.serverUuid)
                        : undefined;
                const state =
                    icon.kind === 'server' && icon.serverUuid
                        ? serverState(server, live[icon.serverUuid]?.status)
                        : null;
                const disk =
                    icon.kind === 'server' && icon.serverUuid
                        ? serverDiskUsage(server, live[icon.serverUuid]?.stats?.diskUsage)
                        : null;
                const diskTone = disk && disk.pct >= 90 ? 'is-crit' : disk && disk.pct >= 75 ? 'is-warn' : '';
                return (
                    <button
                        key={icon.id}
                        type='button'
                        data-fos-icon={icon.id}
                        ref={(el) => {
                            if (el) iconRefs.current.set(icon.id, el);
                            else iconRefs.current.delete(icon.id);
                        }}
                        onDoubleClick={() => openIcon(icon)}
                        onPointerDown={(e) => startIconDrag(icon, e)}
                        onContextMenu={(e) => iconMenu(icon, e)}
                        onDragOver={(e) => {
                            if (icon.kind === 'server' || icon.kind === 'folder') {
                                e.preventDefault();
                                e.stopPropagation();
                                setDropTarget(icon.id);
                            }
                        }}
                        className={cn(
                            'fos-desktop-icon absolute flex flex-col items-center gap-1 rounded-lg p-1 text-center text-white',
                            isSel && 'is-selected bg-white/20 ring-1 ring-white/40',
                            dropTarget === icon.id && 'bg-primary/40 ring-2 ring-white',
                            dragGroup?.ids.includes(icon.id) && 'is-dragging',
                        )}
                        style={{
                            left: pos.x,
                            top: pos.y,
                            width: iconPx + 28,
                            zIndex: dragGroup?.ids.includes(icon.id) ? 40 : isSel ? 5 : 2,
                            willChange: dragGroup?.ids.includes(icon.id) ? 'left,top' : undefined,
                        }}
                    >
                        <span className='relative' style={{ width: iconPx, height: iconPx }}>
                            {icon.kind === 'server' ? (
                                <OsIcon art={SERVER_DRIVE_ART} size={iconPx} />
                            ) : icon.kind === 'app' && icon.app ? (
                                <AppIcon app={icon.app} size={iconPx} />
                            ) : icon.kind === 'folder' ? (
                                <OsIcon art={FOLDER_ART} size={iconPx} bare />
                            ) : (
                                <OsIcon
                                    art={fileArt(
                                        icon.label.includes('.') ? icon.label.split('.').pop() || 'file' : 'file',
                                    )}
                                    size={iconPx}
                                    bare
                                />
                            )}
                            {state && (
                                <span
                                    className={cn(
                                        'absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full ring-2 ring-black/40',
                                        stateColor(state),
                                    )}
                                />
                            )}
                        </span>
                        <span className='line-clamp-2 w-full px-0.5 text-[11px] leading-tight font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]'>
                            {icon.label}
                        </span>
                        {disk && (
                            <span className='fos-disk-meter' title={formatDiskPair(disk.used, disk.limit)}>
                                <span className='fos-disk-meter-bar'>
                                    <span
                                        className={cn('fos-disk-meter-fill', diskTone)}
                                        style={{ width: `${disk.limit ? disk.pct : disk.used ? 8 : 0}%` }}
                                    />
                                </span>
                                <span className='fos-disk-meter-label'>
                                    {disk.limit
                                        ? `${Math.round(disk.pct)}% · ${formatDiskPair(disk.used, disk.limit)}`
                                        : disk.used
                                          ? formatDiskPair(disk.used, 0)
                                          : '-'}
                                </span>
                            </span>
                        )}
                    </button>
                );
            })}
            {marqueeStyle && (
                <div
                    className='fos-marquee pointer-events-none absolute border border-sky-300/80 bg-sky-400/20'
                    style={marqueeStyle}
                />
            )}
        </div>
    );
}
