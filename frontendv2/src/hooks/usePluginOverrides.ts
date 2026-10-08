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
import type { PluginOverridesResponse } from '@/types/plugin-overrides';

const EMPTY: PluginOverridesResponse = { hide: [], replace: [], actions: [] };

let globalOverrides: PluginOverridesResponse | null = null;
let globalLoading = false;
const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

export async function fetchPluginOverrides(force = false): Promise<PluginOverridesResponse> {
    if (!force && globalOverrides) {
        return globalOverrides;
    }
    if (globalLoading) {
        return globalOverrides ?? EMPTY;
    }
    globalLoading = true;
    notify();
    try {
        const res = await axios.get<{ success: boolean; data: PluginOverridesResponse }>(
            '/api/system/plugin-overrides',
        );
        globalOverrides = res.data?.data ?? EMPTY;
        return globalOverrides;
    } catch (e) {
        console.error('Failed to load plugin overrides', e);
        globalOverrides = globalOverrides ?? EMPTY;
        return globalOverrides;
    } finally {
        globalLoading = false;
        notify();
    }
}

export function usePluginOverrides() {
    const [overrides, setOverrides] = useState<PluginOverridesResponse>(globalOverrides ?? EMPTY);
    const [loading, setLoading] = useState(globalLoading);

    const sync = useCallback(() => {
        setOverrides(globalOverrides ?? EMPTY);
        setLoading(globalLoading);
    }, []);

    useEffect(() => {
        listeners.add(sync);
        void fetchPluginOverrides();
        return () => {
            listeners.delete(sync);
        };
    }, [sync]);

    return { overrides, loading, refresh: () => fetchPluginOverrides(true) };
}
