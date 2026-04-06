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

import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function normalizeFavoriteList(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    for (const x of raw) {
        if (typeof x !== 'string' || !UUID_RE.test(x)) continue;
        if (!out.includes(x)) out.push(x);
    }
    return out;
}

export function useFavoriteServerUuids() {
    const [favoriteUuids, setFavoriteUuids] = useState<string[]>([]);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await axios.get('/api/user/preferences');
                if (
                    data?.success &&
                    data.data?.preferences &&
                    typeof data.data.preferences === 'object' &&
                    data.data.preferences !== null
                ) {
                    const prefs = data.data.preferences as Record<string, unknown>;
                    const next = normalizeFavoriteList(prefs.favorite_server_uuids);
                    if (!cancelled) setFavoriteUuids(next);
                }
            } catch {
                /* ignore — favorites are non-critical */
            } finally {
                if (!cancelled) setReady(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const toggleFavorite = useCallback((serverUuid: string) => {
        if (!UUID_RE.test(serverUuid)) return;
        setFavoriteUuids((prev) => {
            const has = prev.includes(serverUuid);
            const next = has ? prev.filter((u) => u !== serverUuid) : [...prev, serverUuid];
            void axios
                .patch('/api/user/preferences', { favorite_server_uuids: next })
                .catch(() => {
                    setFavoriteUuids(prev);
                });
            return next;
        });
    }, []);

    const isFavorite = useCallback((serverUuid: string) => favoriteUuids.includes(serverUuid), [favoriteUuids]);

    return { favoriteUuids, toggleFavorite, isFavorite, ready };
}
