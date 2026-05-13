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

import { useEffect, useState } from 'react';
import type { MainNavResourceCounts } from '@/config/navigation';
import { serversApi } from '@/lib/servers-api';
import { vmsApi } from '@/lib/vms-api';

const MAIN_NAV_COUNTS_LOADING: MainNavResourceCounts = {
    gameServersTotal: null,
    vmInstancesTotal: null,
};

/**
 * Lightweight totals for main sidebar (dashboard scope). When `enabled` is false, returns undefined
 * so navigation keeps default visibility. Fail-open on API errors so users are not stranded.
 */
export function useMainNavResourceCounts(
    enabled: boolean,
    userUuid: string | undefined,
): MainNavResourceCounts | undefined {
    const [counts, setCounts] = useState<MainNavResourceCounts | undefined>(undefined);

    useEffect(() => {
        if (!enabled || !userUuid) {
            setCounts(undefined);
            return;
        }

        let cancelled = false;
        setCounts(MAIN_NAV_COUNTS_LOADING);

        (async () => {
            const [sRes, vRes] = await Promise.allSettled([serversApi.getServers(false, 1, 1), vmsApi.getVms(1, 1)]);

            if (cancelled) {
                return;
            }

            const gameServersTotal = sRes.status === 'fulfilled' ? sRes.value.pagination.total_records : 1;

            let vmInstancesTotal = 1;
            if (vRes.status === 'fulfilled' && vRes.value.success && vRes.value.data?.pagination) {
                vmInstancesTotal = vRes.value.data.pagination.total_records;
            }

            setCounts({ gameServersTotal, vmInstancesTotal });
        })();

        return () => {
            cancelled = true;
        };
    }, [enabled, userUuid]);

    if (!enabled) {
        return undefined;
    }

    return counts ?? MAIN_NAV_COUNTS_LOADING;
}
