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

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import type { WebSpace } from '@/types/webspace';

type CacheEntry = {
    webspaces: WebSpace[];
    fetchedAt: number;
};

let webspacesCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60_000;

export function useUserWebSpacesList(enabled: boolean) {
    const [webspaces, setWebspaces] = useState<WebSpace[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchWebSpaces = useCallback(async (force = false) => {
        const now = Date.now();
        if (!force && webspacesCache && now - webspacesCache.fetchedAt < CACHE_TTL_MS) {
            setWebspaces(webspacesCache.webspaces);
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.get('/api/user/webspaces');
            const list = Array.isArray(data.data?.webspaces) ? (data.data.webspaces as WebSpace[]) : [];
            webspacesCache = { webspaces: list, fetchedAt: Date.now() };
            setWebspaces(list);
            setError(null);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        void fetchWebSpaces();
    }, [enabled, fetchWebSpaces]);

    return { webspaces, loading, error, refresh: () => fetchWebSpaces(true) };
}
