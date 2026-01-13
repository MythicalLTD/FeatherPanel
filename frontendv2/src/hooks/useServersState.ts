/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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

// State interface
interface ServersState {
    selectedLayout: 'grid' | 'list';
    selectedSort: string;
    showOnlyRunning: boolean;
    viewMode: 'all' | 'folders';
}

// Default state
const DEFAULT_STATE: ServersState = {
    selectedLayout: 'grid',
    selectedSort: 'name',
    showOnlyRunning: false,
    viewMode: 'folders',
};

// LocalStorage key
const STORAGE_KEY = 'servers_preferences';

export function useServersState() {
    // Initialize state from localStorage
    const [state, setState] = useState<ServersState>(() => {
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
            console.error('Failed to load servers state from localStorage:', error);
        }

        return DEFAULT_STATE;
    });

    // Save to localStorage whenever state changes
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save servers state to localStorage:', error);
        }
    }, [state]);

    // Update functions
    const setSelectedLayout = useCallback((layout: 'grid' | 'list') => {
        setState((prev) => ({ ...prev, selectedLayout: layout }));
    }, []);

    const setSelectedSort = useCallback((sort: string) => {
        setState((prev) => ({ ...prev, selectedSort: sort }));
    }, []);

    const setShowOnlyRunning = useCallback((show: boolean) => {
        setState((prev) => ({ ...prev, showOnlyRunning: show }));
    }, []);

    const setViewMode = useCallback((mode: 'all' | 'folders') => {
        setState((prev) => ({ ...prev, viewMode: mode }));
    }, []);

    // Reset to defaults
    const resetState = useCallback(() => {
        setState(DEFAULT_STATE);
    }, []);

    return {
        // State
        selectedLayout: state.selectedLayout,
        selectedSort: state.selectedSort,
        showOnlyRunning: state.showOnlyRunning,
        viewMode: state.viewMode,

        // Setters
        setSelectedLayout,
        setSelectedSort,
        setShowOnlyRunning,
        setViewMode,
        resetState,
    };
}
