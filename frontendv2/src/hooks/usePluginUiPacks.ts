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
import type { PluginUiPack } from '@/types/plugin-ui-packs';

let globalPacks: PluginUiPack[] | null = null;
let globalLoading = false;
const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

export async function fetchPluginUiPacks(force = false): Promise<PluginUiPack[]> {
    if (!force && globalPacks) {
        return globalPacks;
    }
    if (globalLoading) {
        return globalPacks ?? [];
    }
    globalLoading = true;
    notify();
    try {
        const res = await axios.get<{ success: boolean; data: { packs: PluginUiPack[] } }>(
            '/api/system/plugin-ui-packs',
        );
        globalPacks = res.data?.data?.packs ?? [];
        return globalPacks;
    } catch (e) {
        console.error('Failed to load plugin UI packs', e);
        globalPacks = globalPacks ?? [];
        return globalPacks;
    } finally {
        globalLoading = false;
        notify();
    }
}

export function usePluginUiPacks() {
    const [packs, setPacks] = useState<PluginUiPack[]>(globalPacks ?? []);
    const [loading, setLoading] = useState(globalLoading);

    const sync = useCallback(() => {
        setPacks(globalPacks ?? []);
        setLoading(globalLoading);
    }, []);

    useEffect(() => {
        listeners.add(sync);
        void fetchPluginUiPacks();
        return () => {
            listeners.delete(sync);
        };
    }, [sync]);

    return {
        packs,
        loading,
        refresh: () => fetchPluginUiPacks(true),
        getPackById: (id: string) => packs.find((p) => p.id === id) ?? null,
    };
}
