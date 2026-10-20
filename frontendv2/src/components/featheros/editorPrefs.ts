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

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

export type EditorRenderWhitespace = 'none' | 'selection' | 'all';
export type EditorCursorStyle = 'line' | 'block' | 'underline';
export type EditorAutoSaveDelay = 1000 | 2000 | 5000 | 10000;

export interface FeatherOsEditorPrefs {
    autoSave: boolean;
    autoSaveDelayMs: EditorAutoSaveDelay;
    formatOnSave: boolean;
    fontSize: number;
    tabSize: 2 | 4 | 8;
    insertSpaces: boolean;
    wordWrap: boolean;
    minimap: boolean;
    lineNumbers: boolean;
    renderWhitespace: EditorRenderWhitespace;
    cursorStyle: EditorCursorStyle;
    bracketPairColorization: boolean;
    stickyScroll: boolean;
    fontLigatures: boolean;
    rulers: boolean;
    smoothCaret: boolean;
}

export const DEFAULT_EDITOR_PREFS: FeatherOsEditorPrefs = {
    autoSave: true,
    autoSaveDelayMs: 2000,
    formatOnSave: false,
    fontSize: 13,
    tabSize: 4,
    insertSpaces: true,
    wordWrap: false,
    minimap: true,
    lineNumbers: true,
    renderWhitespace: 'selection',
    cursorStyle: 'line',
    bracketPairColorization: true,
    stickyScroll: true,
    fontLigatures: true,
    rulers: false,
    smoothCaret: true,
};

const STORAGE_KEY = 'featherpanel_fos_editor_prefs';
const listeners = new Set<() => void>();

function notifyListeners() {
    listeners.forEach((listener) => listener());
}

function clampFontSize(n: number): number {
    return Math.min(22, Math.max(11, Math.round(n)));
}

function normalizePrefs(raw: Partial<FeatherOsEditorPrefs> | null | undefined): FeatherOsEditorPrefs {
    const base = { ...DEFAULT_EDITOR_PREFS, ...(raw ?? {}) };
    const delay = [1000, 2000, 5000, 10000].includes(base.autoSaveDelayMs)
        ? (base.autoSaveDelayMs as EditorAutoSaveDelay)
        : DEFAULT_EDITOR_PREFS.autoSaveDelayMs;
    const tabSize = ([2, 4, 8] as const).includes(base.tabSize as 2 | 4 | 8)
        ? (base.tabSize as 2 | 4 | 8)
        : DEFAULT_EDITOR_PREFS.tabSize;
    const renderWhitespace: EditorRenderWhitespace =
        base.renderWhitespace === 'none' || base.renderWhitespace === 'all' || base.renderWhitespace === 'selection'
            ? base.renderWhitespace
            : DEFAULT_EDITOR_PREFS.renderWhitespace;
    const cursorStyle: EditorCursorStyle =
        base.cursorStyle === 'block' || base.cursorStyle === 'underline' || base.cursorStyle === 'line'
            ? base.cursorStyle
            : DEFAULT_EDITOR_PREFS.cursorStyle;

    return {
        autoSave: Boolean(base.autoSave),
        autoSaveDelayMs: delay,
        formatOnSave: Boolean(base.formatOnSave),
        fontSize: clampFontSize(Number(base.fontSize) || DEFAULT_EDITOR_PREFS.fontSize),
        tabSize,
        insertSpaces: Boolean(base.insertSpaces),
        wordWrap: Boolean(base.wordWrap),
        minimap: Boolean(base.minimap),
        lineNumbers: base.lineNumbers !== false,
        renderWhitespace,
        cursorStyle,
        bracketPairColorization: base.bracketPairColorization !== false,
        stickyScroll: base.stickyScroll !== false,
        fontLigatures: base.fontLigatures !== false,
        rulers: Boolean(base.rulers),
        smoothCaret: base.smoothCaret !== false,
    };
}

function readPrefs(): FeatherOsEditorPrefs {
    if (typeof window === 'undefined') return DEFAULT_EDITOR_PREFS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_EDITOR_PREFS;
        return normalizePrefs(JSON.parse(raw) as Partial<FeatherOsEditorPrefs>);
    } catch {
        return DEFAULT_EDITOR_PREFS;
    }
}

function writePrefs(next: FeatherOsEditorPrefs) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // ignore
    }
    notifyListeners();
}

export function useFeatherOsEditorPrefs() {
    const [prefs, setPrefsState] = useState<FeatherOsEditorPrefs>(() =>
        typeof window === 'undefined' ? DEFAULT_EDITOR_PREFS : readPrefs(),
    );

    useLayoutEffect(() => {
        const sync = () => setPrefsState(readPrefs());
        listeners.add(sync);
        sync();
        return () => {
            listeners.delete(sync);
        };
    }, []);

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) notifyListeners();
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const setPrefs = useCallback((patch: Partial<FeatherOsEditorPrefs>) => {
        const next = normalizePrefs({ ...readPrefs(), ...patch });
        writePrefs(next);
    }, []);

    const resetPrefs = useCallback(() => {
        writePrefs(DEFAULT_EDITOR_PREFS);
    }, []);

    return { prefs, setPrefs, resetPrefs };
}
