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

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

export interface GlobalStats {
    total_nodes: number;
    healthy_nodes: number;
    unhealthy_nodes: number;
    total_memory: number;
    used_memory: number;
    total_disk?: number;
    used_disk?: number;
    avg_cpu_percent: number;
}

export interface SelfTestResponse {
    status: string;
    checks: {
        redis: { status: boolean; message: string };
        mysql: { status: boolean; message: string };
        permissions: Record<string, boolean>;
    };
}

export interface HealthNode {
    id: number;
    uuid: string;
    name: string;
    fqdn: string;
    status: 'healthy' | 'unhealthy' | string;
    server_count?: number;
    error?: string | null;
    utilization?: {
        memory_total?: number;
        memory_used?: number;
        cpu_percent?: number;
    } | null;
}

export function useSystemHealth(pollMs = 30000) {
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [nodes, setNodes] = useState<HealthNode[]>([]);
    const [selftest, setSelftest] = useState<SelfTestResponse | null>(null);
    const [latency, setLatency] = useState(0);
    const [loading, setLoading] = useState(true);
    const requestIdRef = useRef(0);

    const fetchData = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        try {
            const statsReq = axios.get('/api/admin/nodes/status/global');
            const start = performance.now();
            const selftestReq = axios.get('/api/selftest');
            const [statsRes, selftestRes] = await Promise.all([statsReq, selftestReq]);

            // A newer request already resolved while this one was in flight — discard this
            // stale response so it can't overwrite fresher state.
            if (requestId !== requestIdRef.current) return;

            setLatency(Math.round(performance.now() - start));

            if (statsRes.data.success) {
                setStats(statsRes.data.data.global);
                setNodes(statsRes.data.data.nodes || []);
            }
            if (selftestRes.data.success) {
                setSelftest(selftestRes.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch system health', err);
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, pollMs);
        return () => clearInterval(interval);
    }, [fetchData, pollMs]);

    const systemsOk =
        !!stats && stats.unhealthy_nodes === 0 && !!selftest?.checks.mysql.status && !!selftest?.checks.redis.status;

    return { stats, nodes, selftest, latency, loading, systemsOk, refresh: fetchData };
}
