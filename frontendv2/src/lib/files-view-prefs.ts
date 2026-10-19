/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FileObject } from '@/types/server';

export type FilesViewMode = 'list' | 'grid';
export type FilesSortKey = 'name' | 'size' | 'modified';

export interface FilesViewPrefs {
    view: FilesViewMode;
    sortKey: FilesSortKey;
    sortDir: 'asc' | 'desc';
    showHidden: boolean;
}

/** Synced to the UI preferences in the database (see ui-prefs-sync). */
export const FILES_VIEW_PREFS_KEY = 'featherpanel_files_view_prefs';
/** Per server pinned folders and recent files, also synced. */
export const FILES_QUICK_ACCESS_KEY = 'featherpanel_files_quick_access';

const DEFAULT_PREFS: FilesViewPrefs = { view: 'list', sortKey: 'name', sortDir: 'asc', showHidden: true };

function readJson<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
    } catch {
        return fallback;
    }
}

export function useFilesViewPrefs() {
    const [prefs, setPrefs] = useState<FilesViewPrefs>(DEFAULT_PREFS);
    useEffect(() => {
        setPrefs(readJson(FILES_VIEW_PREFS_KEY, DEFAULT_PREFS));
    }, []);
    const update = useCallback((patch: Partial<FilesViewPrefs>) => {
        setPrefs((prev) => {
            const next = { ...prev, ...patch };
            try {
                window.localStorage.setItem(FILES_VIEW_PREFS_KEY, JSON.stringify(next));
            } catch {
                /* storage full or blocked */
            }
            return next;
        });
    }, []);
    return { prefs, update };
}

/** Folders first, then by the chosen key. */
export function sortAndFilterFiles(files: FileObject[], prefs: FilesViewPrefs): FileObject[] {
    const list = prefs.showHidden ? files : files.filter((f) => !f.name.startsWith('.'));
    const dir = prefs.sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
        if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
        let cmp = 0;
        if (prefs.sortKey === 'size') {
            cmp = (a.isFile ? a.size : (a.directory_size ?? 0)) - (b.isFile ? b.size : (b.directory_size ?? 0));
        } else if (prefs.sortKey === 'modified') {
            cmp = new Date(a.modified_at).getTime() - new Date(b.modified_at).getTime();
        }
        if (cmp === 0) cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        return cmp * dir;
    });
}

interface QuickAccessEntry {
    pins: string[];
    recent: string[];
}

type QuickAccessStore = Record<string, QuickAccessEntry>;

const MAX_RECENT = 8;

export function useFilesQuickAccess(serverUuid: string) {
    const [store, setStore] = useState<QuickAccessStore>({});
    useEffect(() => {
        setStore(readJson<QuickAccessStore>(FILES_QUICK_ACCESS_KEY, {}));
    }, []);
    const entry: QuickAccessEntry = store[serverUuid] ?? { pins: [], recent: [] };

    const write = useCallback(
        (fn: (e: QuickAccessEntry) => QuickAccessEntry) => {
            setStore((prev) => {
                const current = prev[serverUuid] ?? { pins: [], recent: [] };
                const next = { ...prev, [serverUuid]: fn(current) };
                try {
                    window.localStorage.setItem(FILES_QUICK_ACCESS_KEY, JSON.stringify(next));
                } catch {
                    /* storage full or blocked */
                }
                return next;
            });
        },
        [serverUuid],
    );

    const togglePin = useCallback(
        (path: string) =>
            write((e) => ({
                ...e,
                pins: e.pins.includes(path) ? e.pins.filter((p) => p !== path) : [...e.pins, path],
            })),
        [write],
    );
    const addRecent = useCallback(
        (path: string) =>
            write((e) => ({ ...e, recent: [path, ...e.recent.filter((p) => p !== path)].slice(0, MAX_RECENT) })),
        [write],
    );
    const clearRecent = useCallback(() => write((e) => ({ ...e, recent: [] })), [write]);

    return { pins: entry.pins, recent: entry.recent, togglePin, addRecent, clearRecent };
}

export function joinPath(dir: string, name: string): string {
    return dir.endsWith('/') ? `${dir}${name}` : `${dir}/${name}`;
}

export function parentPath(path: string): string {
    const idx = path.lastIndexOf('/');
    return idx <= 0 ? '/' : path.slice(0, idx);
}
