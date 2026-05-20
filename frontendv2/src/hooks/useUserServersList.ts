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
import type { Server } from '@/types/server';
import { serversApi } from '@/lib/servers-api';

type CacheEntry = {
    servers: Server[];
    fetchedAt: number;
};

let serversCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60_000;

export function useUserServersList(enabled: boolean) {
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchServers = useCallback(async (force = false) => {
        const now = Date.now();
        if (!force && serversCache && now - serversCache.fetchedAt < CACHE_TTL_MS) {
            setServers(serversCache.servers);
            return;
        }

        setLoading(true);
        try {
            const response = await serversApi.getServers(false, 1, 100, '');
            const list = Array.isArray(response.servers) ? response.servers : [];
            serversCache = { servers: list, fetchedAt: Date.now() };
            setServers(list);
            setError(null);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        void fetchServers();
    }, [enabled, fetchServers]);

    return { servers, loading, error, refresh: () => fetchServers(true) };
}
