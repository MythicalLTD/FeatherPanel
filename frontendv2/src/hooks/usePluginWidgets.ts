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
import axios from 'axios';
import { PluginWidget, WidgetsByPage } from '@/types/plugin-widgets';

interface UsePluginWidgetsResult {
    widgets: WidgetsByPage;
    loading: boolean;
    error: string | null;
    fetchWidgets: (page?: string, forceRefresh?: boolean) => Promise<void>;
    getWidgets: (page: string, location: string) => PluginWidget[];
}

// Global state to share across hook instances (similar to Vue's composable pattern)
let globalWidgets: WidgetsByPage = {};
let globalLoading = false; // Start false, only true when actually fetching
let globalError: string | null = null;
const listeners: Set<() => void> = new Set();

const notifyListeners = () => {
    listeners.forEach((listener) => listener());
};

export function usePluginWidgets(initialPage?: string): UsePluginWidgetsResult {
    // Local state syncing with global state
    const [widgets, setWidgets] = useState<WidgetsByPage>(globalWidgets);
    const [loading, setLoading] = useState<boolean>(globalLoading);
    const [error, setError] = useState<string | null>(globalError);

    const updateState = useCallback(() => {
        setWidgets(globalWidgets);
        setLoading(globalLoading);
        setError(globalError);
    }, []);

    useEffect(() => {
        listeners.add(updateState);
        return () => {
            listeners.delete(updateState);
        };
    }, [updateState]);

    const fetchWidgets = useCallback(async (page?: string, forceRefresh: boolean = false) => {
        // Caching logic: If we have widgets for the requested page (or any widgets if no page specified),
        // and we are not forcing a refresh, skip the fetch.
        if (!forceRefresh && !globalLoading) {
            if (page && globalWidgets[page]) {
                return;
            }
            if (!page && Object.keys(globalWidgets).length > 0) {
                return;
            }
        }

        if (globalLoading) return; // Prevent concurrent fetches

        globalLoading = true;
        globalError = null;
        notifyListeners(); // Notify loading start

        try {
            const params = page ? { page } : {};
            // NOTE: Adjust endpoint if needed. Vue used /api/system/plugin-widgets
            const response = await axios.get<{
                success: boolean;
                data: { widgets: WidgetsByPage };
            }>('/api/system/plugin-widgets', { params });

            if (response.data.success) {
                // Merge logic: If we are fetching specific page, merge it. If generic, maybe replace?
                // The API likely returns structure relative to query.
                // Currently assuming safe to merge spread.
                globalWidgets = { ...globalWidgets, ...response.data.data.widgets };
            } else {
                globalError = 'Failed to load widgets';
            }
        } catch (err) {
            console.error('Error fetching widgets:', err);
            globalError = 'Failed to load widgets';
        } finally {
            globalLoading = false;
            notifyListeners(); // Notify completion
        }
    }, []);

    // Initial fetch if requested and not already populated
    useEffect(() => {
        if (initialPage && Object.keys(globalWidgets).length === 0 && !globalLoading && !globalError) {
            fetchWidgets(initialPage);
        }
    }, [initialPage, fetchWidgets]);

    const getWidgets = useCallback(
        (page: string, location: string): PluginWidget[] => {
            return widgets[page]?.[location]?.filter((widget) => widget.enabled) || [];
        },
        [widgets],
    );

    return {
        widgets,
        loading,
        error,
        fetchWidgets,
        getWidgets,
    };
}
