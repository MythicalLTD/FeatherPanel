/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import type { DaemonHealthSummary, DaemonKind } from './types';

const POLL_MS = 30000;

/**
 * Health badges for a page of nodes, read from the daemons' /health/ready via the panel
 * (cached server side). Polls while the page is visible.
 */
export function useDaemonHealthSummaries(kind: DaemonKind, ids: number[]) {
    const [summaries, setSummaries] = useState<Record<number, DaemonHealthSummary>>({});
    const [loading, setLoading] = useState(false);
    const key = ids.join(',');
    const keyRef = useRef(key);
    keyRef.current = key;

    const load = useCallback(async () => {
        if (key === '') {
            setSummaries({});
            return;
        }
        setLoading(true);
        try {
            const base = kind === 'wings' ? '/api/admin/nodes' : '/api/admin/web-nodes';
            const { data } = await axios.get(`${base}/daemon-health`, { params: { ids: key } });
            if (keyRef.current !== key) return;
            const nodes = (data?.data?.nodes ?? {}) as Record<string, DaemonHealthSummary>;
            const next: Record<number, DaemonHealthSummary> = {};
            for (const [id, summary] of Object.entries(nodes)) {
                next[Number(id)] = summary;
            }
            setSummaries(next);
        } catch {
            // Badges are optional; the list keeps working without them.
        } finally {
            setLoading(false);
        }
    }, [kind, key]);

    useEffect(() => {
        void load();
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') void load();
        }, POLL_MS);
        return () => window.clearInterval(timer);
    }, [load]);

    return { summaries, loading, reload: load };
}
