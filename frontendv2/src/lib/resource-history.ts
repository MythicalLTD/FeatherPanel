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

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

/** [unix_seconds, cpu_percent, memory_bytes, disk_bytes] */
export type ResourcePoint = [number, number, number, number];
/** [unix_seconds, cpu_sum, memory_sum, disk_sum, servers_reporting] */
export type ResourceTotalPoint = [number, number, number, number, number];

export interface ResourceWindow {
    interval_seconds: number;
    from: number;
    to: number;
}

export interface DashboardResourceHistory extends ResourceWindow {
    servers: Record<string, ResourcePoint[]>;
    totals: ResourceTotalPoint[];
}

export interface ServerResourceHistory extends ResourceWindow {
    points: ResourcePoint[];
}

export type ResourceMetric = 'cpu' | 'memory' | 'disk';

/** Per bucket values for the sparklines, null where nothing was sampled. */
export interface ServerTrendSeries {
    cpu: (number | null)[];
    memory: (number | null)[];
}

const METRIC_INDEX: Record<ResourceMetric, 1 | 2 | 3> = { cpu: 1, memory: 2, disk: 3 };

/** Samples are taken every five minutes; refreshing more often only repeats the same data. */
export const RESOURCE_HISTORY_REFRESH_MS = 5 * 60 * 1000;

/** One value per bucket across the window, null where nothing was sampled (server offline). */
export function toSeries(
    points: ReadonlyArray<ResourcePoint | ResourceTotalPoint>,
    window: ResourceWindow,
    metric: ResourceMetric,
): (number | null)[] {
    const step = window.interval_seconds > 0 ? window.interval_seconds : 300;
    const length = Math.max(0, Math.floor((window.to - window.from) / step) + 1);
    const values: (number | null)[] = new Array(length).fill(null);
    const index = METRIC_INDEX[metric];
    for (const point of points) {
        const at = Math.round((point[0] - window.from) / step);
        if (at >= 0 && at < length) values[at] = Number(point[index]) || 0;
    }
    return values;
}

export interface SeriesSummary {
    peak: number;
    average: number;
    latest: number | null;
    samples: number;
}

export function summarize(values: ReadonlyArray<number | null>): SeriesSummary | null {
    let peak = 0;
    let sum = 0;
    let samples = 0;
    let latest: number | null = null;
    for (const value of values) {
        if (value === null) continue;
        peak = Math.max(peak, value);
        sum += value;
        samples += 1;
        latest = value;
    }
    if (samples === 0) return null;
    return { peak, average: sum / samples, latest, samples };
}

function useHistory<T>(url: string | null): { data: T | null; loading: boolean } {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(url !== null);

    useEffect(() => {
        if (!url) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        const load = async () => {
            try {
                const { data: body } = await axios.get(url);
                if (!cancelled && body?.success) setData(body.data as T);
            } catch {
                // History is a nice to have: without it the sparklines simply stay hidden.
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void load();
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') void load();
        }, RESOURCE_HISTORY_REFRESH_MS);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [url]);

    return { data, loading };
}

/** Last 24 hours for every server the user can open, plus totals. */
export function useDashboardResourceHistory(enabled: boolean) {
    return useHistory<DashboardResourceHistory>(enabled ? '/api/user/dashboard/resource-history' : null);
}

/** Last 24 hours for one server, for the console header. */
export function useServerResourceHistory(uuidShort: string | null | undefined) {
    const result = useHistory<ServerResourceHistory>(
        uuidShort ? `/api/user/servers/${encodeURIComponent(uuidShort)}/resource-history` : null,
    );
    const series = useMemo<ServerTrendSeries | null>(() => {
        if (!result.data) return null;
        return {
            cpu: toSeries(result.data.points, result.data, 'cpu'),
            memory: toSeries(result.data.points, result.data, 'memory'),
        };
    }, [result.data]);
    return { ...result, series };
}
