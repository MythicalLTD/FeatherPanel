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

import { getAnalyticsConsent } from '@/lib/analytics-cookie';
import { reportPanelInteraction, analyticsListChanges } from '@/lib/panel-analytics';
import { useCallback, useEffect, useRef, useState } from 'react';

function mergeFilters<T extends Record<string, unknown>>(defaults: T, stored: Partial<T> | null): T {
    if (!stored || typeof stored !== 'object') {
        return { ...defaults };
    }

    const merged = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
        if (Object.prototype.hasOwnProperty.call(stored, key) && stored[key] !== undefined) {
            merged[key] = stored[key] as T[keyof T];
        }
    }

    return merged;
}

export function loadPersistedListFilters<T extends Record<string, unknown>>(storageKey: string, defaults: T): T {
    if (typeof window === 'undefined') {
        return { ...defaults };
    }

    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            return { ...defaults };
        }

        return mergeFilters(defaults, JSON.parse(raw) as Partial<T>);
    } catch {
        return { ...defaults };
    }
}

export function savePersistedListFilters<T extends Record<string, unknown>>(storageKey: string, filters: T): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch (error) {
        console.error('Failed to save list filters', error);
    }
}

export function usePersistedListFilters<T extends Record<string, unknown>>(storageKey: string, defaults: T) {
    const defaultsRef = useRef(defaults);
    defaultsRef.current = defaults;

    const [filters, setFilters] = useState<T>(() => loadPersistedListFilters(storageKey, defaults));
    const [hydrated, setHydrated] = useState(false);
    const restoredFilters = useRef<T | null>(null);

    useEffect(() => {
        const restored = loadPersistedListFilters(storageKey, defaultsRef.current);
        restoredFilters.current = restored;
        setFilters(restored);
        setHydrated(true);
    }, [storageKey]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }

        savePersistedListFilters(storageKey, filters);
    }, [filters, hydrated, storageKey]);

    // Ignore hydration; debounce actual changes, including callers using setFilters.
    const pendingCategories = useRef(new Set<string>());
    const previous = useRef<{ storageKey: string; filters: T } | null>(null);
    useEffect(() => {
        const before = previous.current;
        previous.current = hydrated ? { storageKey, filters } : null;
        if (
            !hydrated ||
            filters === restoredFilters.current ||
            !before ||
            before.storageKey !== storageKey ||
            getAnalyticsConsent() !== true
        ) {
            pendingCategories.current.clear();
            return;
        }
        const keys = Object.keys(filters).filter((key) => filters[key] !== before.filters[key]);
        const categories = analyticsListChanges(keys);
        for (const category of categories) pendingCategories.current.add(category);
        if (!pendingCategories.current.size) return;
        const timer = window.setTimeout(() => {
            for (const category of pendingCategories.current) reportPanelInteraction('panel.list.change', category);
            pendingCategories.current.clear();
        }, 500);
        return () => window.clearTimeout(timer);
    }, [filters, hydrated, storageKey]);

    const patchFilters = useCallback((partial: Partial<T>) => {
        setFilters((prev) => ({ ...prev, ...partial }));
    }, []);

    const resetFilters = useCallback(() => {
        reportPanelInteraction('panel.list.reset', 'filter');
        setFilters({ ...defaultsRef.current });
    }, []);

    return { filters, setFilters, patchFilters, resetFilters, hydrated };
}

export interface SearchListFilters {
    searchQuery: string;
    page: number;
    pageSize: number;
}

export function createSearchListDefaults(pageSize = 10): SearchListFilters {
    return {
        searchQuery: '',
        page: 1,
        pageSize,
    };
}
