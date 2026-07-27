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

import { useCallback, useEffect, useState } from 'react';

export type FileEditorEngine = 'monaco' | 'codemirror';

const STORAGE_KEY = 'featherpanel-file-editor-engine';
const MOBILE_QUERY = '(max-width: 768px)';

function readStoredEngine(): FileEditorEngine | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'monaco' || stored === 'codemirror') return stored;
    return null;
}

function readIsMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(MOBILE_QUERY).matches;
}

function readDefaultEngine(): FileEditorEngine {
    return readStoredEngine() ?? (readIsMobile() ? 'codemirror' : 'monaco');
}

export function useFileEditorEngine() {
    const [isMobile, setIsMobile] = useState(readIsMobile);
    const [engine, setEngineState] = useState<FileEditorEngine>(readDefaultEngine);
    const [hasUserPreference, setHasUserPreference] = useState(() => readStoredEngine() !== null);

    useEffect(() => {
        const mediaQuery = window.matchMedia(MOBILE_QUERY);
        const update = () => setIsMobile(mediaQuery.matches);

        update();
        mediaQuery.addEventListener('change', update);
        return () => mediaQuery.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        if (hasUserPreference) return;
        setEngineState(isMobile ? 'codemirror' : 'monaco');
    }, [hasUserPreference, isMobile]);

    const setEngine = useCallback((next: FileEditorEngine) => {
        setEngineState(next);
        setHasUserPreference(true);
        localStorage.setItem(STORAGE_KEY, next);
    }, []);

    const toggleEngine = useCallback(() => {
        setEngineState((current) => {
            const next = current === 'monaco' ? 'codemirror' : 'monaco';
            setHasUserPreference(true);
            localStorage.setItem(STORAGE_KEY, next);
            return next;
        });
    }, []);

    return { engine, isMobile, setEngine, toggleEngine };
}
