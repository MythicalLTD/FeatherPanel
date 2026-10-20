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

import { isValidAccentValue } from '@/lib/accent-colors';
import { DEFAULT_SETTINGS, THEME_SETTING_KEYS, type OsSettings, type OsThemeValues } from './types';

export const THEME_FILE_KIND = 'featheros-theme';
export const MAX_SAVED_THEMES = 16;
const MAX_URL_LENGTH = 4096;

export const BUILTIN_THEMES: { id: string; values: OsThemeValues }[] = [
    {
        id: 'midnight',
        values: {
            theme: 'dark',
            wallpaper: 'graphite',
            accent: 'indigo',
            glassTransparency: 40,
            glassBlur: 160,
            windowRadius: 14,
            wallpaperDim: 25,
            dimInactive: true,
        },
    },
    {
        id: 'aurora',
        values: {
            theme: 'dark',
            wallpaper: 'aurora',
            accent: 'teal',
            glassTransparency: 75,
            glassBlur: 130,
            windowRadius: 16,
            wallpaperDim: 0,
        },
    },
    {
        id: 'paper',
        values: {
            theme: 'light',
            wallpaper: 'sonoma',
            accent: 'blue',
            glassTransparency: 15,
            glassBlur: 60,
            windowRadius: 10,
            wallpaperDim: 0,
            reduceTransparency: false,
        },
    },
    {
        id: 'meadow',
        values: {
            theme: 'light',
            wallpaper: 'meadow',
            accent: 'green',
            glassTransparency: 60,
            glassBlur: 110,
            windowRadius: 18,
        },
    },
];

export function pickThemeValues(settings: OsSettings, accent: string): OsThemeValues {
    const values: Record<string, unknown> = {};
    for (const key of THEME_SETTING_KEYS) values[key] = settings[key];
    values.accent = settings.accent || accent;
    if (typeof values.customWallpaperUrl === 'string' && values.customWallpaperUrl.length > MAX_URL_LENGTH) {
        values.customWallpaperUrl = '';
    }
    return values as OsThemeValues;
}

/** Keeps only known theme keys whose value has the same type as the default. */
export function sanitizeThemeValues(raw: unknown): OsThemeValues | null {
    if (!raw || typeof raw !== 'object') return null;
    const src = raw as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of THEME_SETTING_KEYS) {
        const value = src[key];
        if (value === undefined || typeof value !== typeof DEFAULT_SETTINGS[key]) continue;
        if (typeof value === 'number' && !Number.isFinite(value)) continue;
        out[key] = value;
    }
    if (out.theme !== undefined && !['light', 'dark', 'auto'].includes(out.theme as string)) delete out.theme;
    if (out.dockPosition !== undefined && !['bottom', 'left', 'right'].includes(out.dockPosition as string)) {
        delete out.dockPosition;
    }
    if (typeof out.accent === 'string' && out.accent && !isValidAccentValue(out.accent)) delete out.accent;
    if (typeof out.customWallpaperUrl === 'string') {
        const url = out.customWallpaperUrl;
        if (url.length > MAX_URL_LENGTH || (url && !/^(https?:|data:image\/)/i.test(url))) delete out.customWallpaperUrl;
    }
    return Object.keys(out).length > 0 ? (out as OsThemeValues) : null;
}

export function downloadThemeFile(name: string, values: OsThemeValues) {
    const body = JSON.stringify({ kind: THEME_FILE_KIND, version: 1, name, values }, null, 2);
    const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'theme'}.featheros-theme.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readThemeFile(file: File): Promise<{ name: string; values: OsThemeValues } | null> {
    if (file.size > 64 * 1024) return null;
    try {
        const parsed = JSON.parse(await file.text()) as { kind?: unknown; name?: unknown; values?: unknown };
        if (parsed.kind !== THEME_FILE_KIND) return null;
        const values = sanitizeThemeValues(parsed.values);
        if (!values) return null;
        const name =
            typeof parsed.name === 'string' && parsed.name.trim()
                ? parsed.name.trim().slice(0, 40)
                : file.name.replace(/\.featheros-theme\.json$|\.json$/i, '').slice(0, 40);
        return { name, values };
    } catch {
        return null;
    }
}
