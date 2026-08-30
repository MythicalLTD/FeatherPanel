/*
This file is part of FeatherPanel.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

export interface HostingMaturityItem {
    id: string;
    status: string;
    detail?: string | null;
    action?: { label: string; href: string };
}

export interface HostingMaturity {
    score: number;
    tier: 'bootstrap' | 'staging' | 'production';
    summary: {
        ready: number;
        setup: number;
        builtin: number;
        roadmap: number;
    };
    builtin: HostingMaturityItem[];
    setup: HostingMaturityItem[];
    roadmap: { id: string }[];
    sample_node_id?: number | null;
}

export function useWebSpaceHostingMaturity(webNodeId?: number | string | null) {
    const [data, setData] = useState<HostingMaturity | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const nodeId = webNodeId != null && String(webNodeId) !== '' ? Number(webNodeId) : 0;
            const { data: res } = await axios.get('/api/admin/webspaces/hosting-maturity', {
                params: nodeId > 0 ? { web_node_id: nodeId } : undefined,
            });
            setData((res.data?.data ?? res.data) as HostingMaturity);
        } catch (e) {
            console.error(e);
            setError('fetch_failed');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [webNodeId]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { data, loading, error, refresh };
}
