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

import { useState, useEffect, useCallback } from 'react';

interface WebSpacesState {
    selectedLayout: 'grid' | 'list';
    selectedSort: 'name' | 'status' | 'node';
    showOnlyRunning: boolean;
}

const DEFAULT_STATE: WebSpacesState = {
    selectedLayout: 'grid',
    selectedSort: 'name',
    showOnlyRunning: false,
};

const STORAGE_KEY = 'webspaces_preferences';

export function useWebSpacesState() {
    const [state, setState] = useState<WebSpacesState>(() => {
        if (typeof window === 'undefined') {
            return DEFAULT_STATE;
        }

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return { ...DEFAULT_STATE, ...parsed };
            }
        } catch (error) {
            console.error('Failed to load webspaces state from localStorage:', error);
        }

        return DEFAULT_STATE;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save webspaces state to localStorage:', error);
        }
    }, [state]);

    const setSelectedLayout = useCallback((layout: 'grid' | 'list') => {
        setState((prev) => ({ ...prev, selectedLayout: layout }));
    }, []);

    const setSelectedSort = useCallback((sort: 'name' | 'status' | 'node') => {
        setState((prev) => ({ ...prev, selectedSort: sort }));
    }, []);

    const setShowOnlyRunning = useCallback((show: boolean) => {
        setState((prev) => ({ ...prev, showOnlyRunning: show }));
    }, []);

    return {
        selectedLayout: state.selectedLayout,
        selectedSort: state.selectedSort,
        showOnlyRunning: state.showOnlyRunning,
        setSelectedLayout,
        setSelectedSort,
        setShowOnlyRunning,
    };
}
