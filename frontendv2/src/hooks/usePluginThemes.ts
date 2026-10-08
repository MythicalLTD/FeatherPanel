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
import axios from 'axios';
import type { PluginThemePack } from '@/types/plugin-themes';

let globalThemes: PluginThemePack[] | null = null;
let globalLoading = false;
let globalError: string | null = null;
const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

export async function fetchPluginThemes(force = false): Promise<PluginThemePack[]> {
    if (!force && globalThemes) {
        return globalThemes;
    }
    if (globalLoading) {
        return globalThemes ?? [];
    }
    globalLoading = true;
    globalError = null;
    notify();
    try {
        const res = await axios.get<{ success: boolean; data: { themes: PluginThemePack[] } }>(
            '/api/system/plugin-themes',
        );
        globalThemes = res.data?.data?.themes ?? [];
        return globalThemes;
    } catch (e) {
        console.error('Failed to load plugin themes', e);
        globalError = 'Failed to load plugin themes';
        globalThemes = globalThemes ?? [];
        return globalThemes;
    } finally {
        globalLoading = false;
        notify();
    }
}

export function usePluginThemes() {
    const [themes, setThemes] = useState<PluginThemePack[]>(globalThemes ?? []);
    const [loading, setLoading] = useState(globalLoading);
    const [error, setError] = useState<string | null>(globalError);

    const sync = useCallback(() => {
        setThemes(globalThemes ?? []);
        setLoading(globalLoading);
        setError(globalError);
    }, []);

    useEffect(() => {
        listeners.add(sync);
        void fetchPluginThemes();
        return () => {
            listeners.delete(sync);
        };
    }, [sync]);

    return {
        themes,
        loading,
        error,
        refresh: () => fetchPluginThemes(true),
        getThemeById: (id: string) => themes.find((t) => t.id === id) ?? null,
    };
}
