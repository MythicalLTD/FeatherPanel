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

import { useState, useEffect } from 'react';
import axios from 'axios';
import type { PluginSidebarResponse } from '@/types/navigation';

// Global cache to share across all components
let cachedPluginData: PluginSidebarResponse['data']['sidebar'] | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

/**
 * Shared hook for accessing plugin routes data
 * Uses a global cache to ensure the API is only called once across all components
 */
export function usePluginRoutes() {
    const [pluginData, setPluginData] = useState<PluginSidebarResponse['data']['sidebar'] | null>(cachedPluginData);

    useEffect(() => {
        // If we already have cached data, use it
        if (cachedPluginData) {
            setPluginData(cachedPluginData);
            return;
        }

        // If already loading, wait for that promise
        if (isLoading && loadPromise) {
            loadPromise.then(() => setPluginData(cachedPluginData));
            return;
        }

        // Start loading
        isLoading = true;
        loadPromise = (async () => {
            try {
                const { data } = await axios
                    .get<PluginSidebarResponse>('/api/system/plugin-sidebar')
                    .catch(() => ({ data: { success: false, data: null } }));

                if (data.success && data.data?.sidebar) {
                    cachedPluginData = data.data.sidebar;
                    setPluginData(data.data.sidebar);
                }
            } catch (error) {
                console.error('Failed to fetch plugin sidebar', error);
            } finally {
                isLoading = false;
                loadPromise = null;
            }
        })();

        loadPromise.then(() => setPluginData(cachedPluginData));
    }, []);

    return pluginData;
}

/**
 * Get all plugin paths for layout detection
 */
export function getPluginPaths(pluginData: PluginSidebarResponse['data']['sidebar'] | null): string[] {
    if (!pluginData) return [];

    const paths: string[] = [];

    // Extract client plugin paths
    if (pluginData.client) {
        Object.values(pluginData.client).forEach((item) => {
            if (item.redirect) {
                const redirectPath = item.redirect.startsWith('/') ? item.redirect : `/${item.redirect}`;
                paths.push(`/dashboard${redirectPath}`);
            }
        });
    }

    // Extract admin plugin paths
    if (pluginData.admin) {
        Object.values(pluginData.admin).forEach((item) => {
            if (item.redirect) {
                const redirectPath = item.redirect.startsWith('/') ? item.redirect : `/${item.redirect}`;
                paths.push(`/admin${redirectPath}`);
            }
        });
    }

    // Extract server plugin paths
    if (pluginData.server) {
        Object.values(pluginData.server).forEach((item) => {
            if (item.redirect) {
                const redirectPath = item.redirect.startsWith('/') ? item.redirect : `/${item.redirect}`;
                paths.push(redirectPath);
            }
        });
    }

    return paths;
}
