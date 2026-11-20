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
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

/** Live usage of one server as returned by /api/admin/servers/resources. */
export interface AdminServerResources {
    node_online: boolean;
    found: boolean;
    state?: string;
    is_suspended?: boolean;
    cpu_absolute?: number;
    memory_bytes?: number;
    memory_limit_bytes?: number;
    disk_bytes?: number;
    network_rx_bytes?: number;
    network_tx_bytes?: number;
    uptime?: number;
}

const DEFAULT_INTERVAL_MS = 10000;

/**
 * Polls live usage for the given admin server IDs. One request per poll covers the whole page;
 * the backend asks each node's daemon once for all of its servers. Paused while the tab is hidden.
 */
export function useAdminServerResources(serverIds: number[], intervalMs: number = DEFAULT_INTERVAL_MS) {
    const [resources, setResources] = useState<Record<number, AdminServerResources>>({});
    const [loaded, setLoaded] = useState(false);
    const key = useMemo(() => [...new Set(serverIds)].sort((a, b) => a - b).join(','), [serverIds]);

    useEffect(() => {
        if (key === '') {
            setResources({});
            setLoaded(true);
            return;
        }

        // Per effect, so a request still running for the previous page never blocks this one.
        let cancelled = false;
        let inFlight = false;
        setLoaded(false);

        const load = async () => {
            if (inFlight || (typeof document !== 'undefined' && document.hidden)) return;
            inFlight = true;
            try {
                const { data } = await axios.get('/api/admin/servers/resources', { params: { ids: key } });
                if (cancelled) return;
                const map: Record<number, AdminServerResources> = {};
                const raw = (data?.data?.resources ?? {}) as Record<string, AdminServerResources>;
                for (const [id, usage] of Object.entries(raw)) map[Number(id)] = usage;
                setResources(map);
            } catch {
                // Usage is a live extra; the list still renders without it. Drop the old readings
                // so stale numbers are not shown as live.
                if (!cancelled) setResources({});
            } finally {
                inFlight = false;
                if (!cancelled) setLoaded(true);
            }
        };

        void load();
        const timer = setInterval(() => void load(), intervalMs);
        const onVisible = () => {
            if (!document.hidden) void load();
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            cancelled = true;
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [key, intervalMs]);

    return { resources, loaded };
}
