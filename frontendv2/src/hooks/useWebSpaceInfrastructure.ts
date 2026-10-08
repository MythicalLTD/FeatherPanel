/*
This file is part of FeatherPanel.
 */

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
import type {
    EnrichedInfrastructureReadiness,
    InfrastructureNodeInfo,
    InfrastructureSummary,
} from '@/lib/webspace-infrastructure';

export interface InfrastructureCheck {
    id: string;
    status: 'ok' | 'warn' | 'fail';
    message: string;
    detail?: string | null;
    action?: { label: string; href: string };
    category?: string;
}

export interface InfrastructureReadiness {
    ready: boolean;
    status: 'ready' | 'warning' | 'blocked';
    checks: InfrastructureCheck[];
    summary?: InfrastructureSummary;
    node?: InfrastructureNodeInfo;
    counts?: {
        web_nodes: number;
        webplates: number;
        database_hosts: number;
        mail_hosts: number;
    };
}

interface UseWebSpaceInfrastructureOptions {
    webNodeId?: number | string | null;
    ssl?: boolean;
    databaseLimit?: number;
    mailboxLimit?: number;
    hasDomains?: boolean;
    enabled?: boolean;
    scope?: 'admin' | 'user';
    uuidShort?: string;
}

export function useWebSpaceInfrastructure({
    webNodeId,
    ssl = false,
    databaseLimit = 0,
    mailboxLimit = 0,
    hasDomains = false,
    enabled = true,
    scope = 'admin',
    uuidShort,
}: UseWebSpaceInfrastructureOptions) {
    const [data, setData] = useState<EnrichedInfrastructureReadiness | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!enabled) {
            setData(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            if (scope === 'user' && uuidShort) {
                const { data: res } = await axios.get(
                    `/api/user/webspaces/${encodeURIComponent(uuidShort)}/infrastructure-readiness`,
                );
                setData((res.data?.data ?? res.data) as EnrichedInfrastructureReadiness);
                return;
            }

            const nodeId = webNodeId != null && String(webNodeId) !== '' ? Number(webNodeId) : 0;
            const { data: res } = await axios.get('/api/admin/webspaces/infrastructure-readiness', {
                params: {
                    web_node_id: nodeId > 0 ? nodeId : undefined,
                    ssl: ssl ? 1 : 0,
                    database_limit: databaseLimit,
                    mailbox_limit: mailboxLimit,
                    has_domains: hasDomains ? 1 : 0,
                },
            });
            setData((res.data?.data ?? res.data) as EnrichedInfrastructureReadiness);
        } catch (e) {
            console.error(e);
            setError('fetch_failed');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [enabled, scope, uuidShort, webNodeId, ssl, databaseLimit, mailboxLimit, hasDomains]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { data, loading, error, refresh };
}
