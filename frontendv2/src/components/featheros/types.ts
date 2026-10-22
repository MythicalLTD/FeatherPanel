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

import type React from 'react';

export type OsAppId =
    | 'finder'
    | 'terminal'
    | 'editor'
    | 'servers'
    | 'monitor'
    | 'logs'
    | 'databases'
    | 'notes'
    | 'settings'
    | 'backups'
    | 'schedules'
    | 'network'
    | 'transfers'
    | 'calculator'
    | 'trash'
    | 'connection'
    | 'subusers'
    | 'startup'
    | 'spells'
    | 'archive'
    | 'server';

export type OsTheme = 'auto' | 'light' | 'dark';
export type OsDockPosition = 'bottom' | 'left' | 'right';

export interface OsWindow {
    id: string;
    app: OsAppId;
    serverUuid: string | null;
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
    minimized: boolean;
    maximized: boolean;
    /** Space / desktop index this window belongs to (0-based). */
    space: number;
    props?: Record<string, unknown>;
}

export interface OsDesktopIcon {
    id: string;
    kind: 'server' | 'folder' | 'file' | 'app' | 'widget';
    label?: string;
    x: number;
    y: number;
    serverUuid?: string;
    path?: string;
    app?: OsAppId;
    /** Desktop space (0-based). Defaults to 0. */
    space?: number;
    /** Widget type when kind === 'widget'. */
    widget?: OsWidgetType;
}

export type OsWidgetType =
    'clock' | 'calendar' | 'servers' | 'resources' | 'network' | 'storage' | 'shortcuts' | 'status' | 'uptime';

export interface OsDesktopWidget {
    id: string;
    type: OsWidgetType;
    /** Stack order (0 = top). */
    order: number;
}

export type OsHotCornerAction = 'mission' | 'launchpad' | 'desktop' | 'notifications' | 'none';

export interface OsHotCorners {
    topLeft: OsHotCornerAction;
    topRight: OsHotCornerAction;
    bottomLeft: OsHotCornerAction;
    bottomRight: OsHotCornerAction;
}

export interface OsSettings {
    wallpaper: string;
    customWallpaperUrl: string;
    theme: OsTheme;
    accent: string;
    dockSize: number;
    dockMagnification: boolean;
    dockAutoHide: boolean;
    dockPosition: OsDockPosition;
    showServerIcons: boolean;
    showWidgets: boolean;
    iconSize: number;
    gridSpacing: number;
    clock24h: boolean;
    clockSeconds: boolean;
    menuBarOpaque: boolean;
    animationSpeed: number;
    fontScale: number;
    snapToGrid: boolean;
    reduceMotion: boolean;
    spaceCount: number;
    hotCorners: OsHotCorners;
    /** 0 = nearly solid, 50 = default, 100 = maximum glass. */
    glassTransparency: number;
    /** Backdrop blur strength in percent of the default (0–200). */
    glassBlur: number;
    reduceTransparency: boolean;
    windowRadius: number;
    focusRing: boolean;
    dimInactive: boolean;
    /** Darkens the wallpaper, 0–70 %. */
    wallpaperDim: number;
    /** After snapping a window, offer the other windows for the remaining zones. */
    snapAssist: boolean;
    /** Minutes of inactivity before the lock screen appears (0 = never). */
    lockAfterMinutes: number;
    workspaces: OsWorkspace[];
    savedThemes: OsSavedTheme[];
}

export type OsWorkspaceWindow = Omit<OsWindow, 'id' | 'z'>;

/** A saved arrangement of windows that can be reopened later. */
export interface OsWorkspace {
    id: string;
    name: string;
    savedAt: number;
    activeSpace: number;
    windows: OsWorkspaceWindow[];
}

export const THEME_SETTING_KEYS = [
    'wallpaper',
    'customWallpaperUrl',
    'theme',
    'accent',
    'glassTransparency',
    'glassBlur',
    'reduceTransparency',
    'windowRadius',
    'focusRing',
    'dimInactive',
    'wallpaperDim',
    'menuBarOpaque',
    'dockSize',
    'dockMagnification',
    'dockPosition',
    'fontScale',
] as const satisfies readonly (keyof OsSettings)[];

export type OsThemeValues = Partial<Pick<OsSettings, (typeof THEME_SETTING_KEYS)[number]>>;

export interface OsSavedTheme {
    id: string;
    name: string;
    savedAt: number;
    values: OsThemeValues;
}

export interface OsPersistedState {
    version: 1;
    windows: OsWindow[];
    icons: OsDesktopIcon[];
    dock: OsAppId[];
    settings: OsSettings;
    widgets?: OsDesktopWidget[];
    activeSpace?: number;
}

/** Payload of a file drag between FeatherOS windows (dataTransfer MIME below). */
export interface OsFileDragPayload {
    serverUuid: string;
    root: string;
    files: { name: string; isFile: boolean }[];
}

export const OS_FILE_DRAG_MIME = 'application/x-featheros-files';

export interface OsContextMenuItem {
    id: string;
    label?: string;
    icon?: React.ComponentType<{ className?: string }>;
    shortcut?: string;
    danger?: boolean;
    disabled?: boolean;
    separator?: boolean;
    checked?: boolean;
    onSelect?: () => void;
}

export const DEFAULT_SETTINGS: OsSettings = {
    wallpaper: 'sonoma',
    customWallpaperUrl: '',
    theme: 'light',
    accent: '',
    dockSize: 52,
    dockMagnification: true,
    dockAutoHide: false,
    dockPosition: 'bottom',
    showServerIcons: true,
    showWidgets: true,
    iconSize: 64,
    gridSpacing: 100,
    clock24h: true,
    clockSeconds: false,
    menuBarOpaque: false,
    animationSpeed: 1,
    fontScale: 1,
    snapToGrid: false,
    reduceMotion: false,
    spaceCount: 1,
    hotCorners: {
        topLeft: 'mission',
        topRight: 'notifications',
        bottomLeft: 'desktop',
        bottomRight: 'launchpad',
    },
    glassTransparency: 50,
    glassBlur: 100,
    reduceTransparency: false,
    windowRadius: 12,
    focusRing: false,
    dimInactive: false,
    wallpaperDim: 0,
    snapAssist: true,
    lockAfterMinutes: 0,
    workspaces: [],
    savedThemes: [],
};

export const EFFECT_SETTING_KEYS = [
    'glassTransparency',
    'glassBlur',
    'reduceTransparency',
    'windowRadius',
    'focusRing',
    'dimInactive',
    'wallpaperDim',
    'animationSpeed',
    'fontScale',
] as const satisfies readonly (keyof OsSettings)[];

/** Maps the transparency slider to the multiplier applied to every glass alpha. */
export function glassAlphaScale(settings: Pick<OsSettings, 'glassTransparency' | 'reduceTransparency'>) {
    if (settings.reduceTransparency) return 4;
    const t = Math.max(0, Math.min(100, settings.glassTransparency ?? 50));
    return t <= 50 ? 1 + ((50 - t) / 50) * 1.2 : 1 - ((t - 50) / 50) * 0.65;
}

export const OS_WIDGET_TYPES: OsWidgetType[] = [
    'clock',
    'calendar',
    'servers',
    'resources',
    'network',
    'storage',
    'shortcuts',
    'status',
    'uptime',
];

export const DEFAULT_WIDGETS: OsDesktopWidget[] = [
    { id: 'w-clock', type: 'clock', order: 0 },
    { id: 'w-servers', type: 'servers', order: 1 },
    { id: 'w-resources', type: 'resources', order: 2 },
    { id: 'w-status', type: 'status', order: 3 },
];

export const DEFAULT_DOCK: OsAppId[] = [
    'finder',
    'servers',
    'terminal',
    'editor',
    'monitor',
    'logs',
    'databases',
    'backups',
    'notes',
    'calculator',
    'transfers',
    'settings',
];

export const MENU_BAR_HEIGHT = 28;
