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

/** Shape of GET /api/admin/analytics/overview. Module sections are null while that module is off. */

export type KpiBucket = 'day' | 'week' | 'month';

export interface KpiNode {
    id: number;
    type: 'game' | 'web';
    name: string;
    items: number;
    memory: number;
    memory_allocated: number;
    memory_limit: number | null;
    memory_percent: number | null;
    disk: number;
    disk_allocated: number;
    disk_limit: number | null;
    disk_percent: number | null;
    cpu_allocated: number;
    overcommitted: boolean;
}

export interface KpiVdsNode {
    id: number;
    name: string;
    instances: number;
    memory_allocated: number;
    disk_gb_allocated: number;
}

export interface KpiStatusCount {
    status: string;
    count: number;
}

export interface KpiSeriesRow {
    date: string;
    signups: number;
    activity: number;
    servers?: number;
    webspaces?: number;
    vds?: number;
    tickets_opened?: number;
    tickets_closed?: number;
}

export interface KpiConsumer {
    uuid: string;
    username: string;
    avatar: string | null;
    servers: number;
    webspaces: number;
    vds: number;
    memory: number;
    disk: number;
}

export interface KpiOverview {
    range: { from: string; to: string; days: number; bucket: KpiBucket; previous_from: string; previous_to: string };
    modules: { game: boolean; web: boolean; vds: boolean };
    users: {
        total: number;
        banned: number;
        two_fa: number;
        new: number;
        new_previous: number;
        seen_in_range: number;
        returning: number;
        active_24h: number;
        active_7d: number;
        active_30d: number;
    };
    activity: { total: number; previous: number; unique_users: number; top_events: { name: string; count: number }[] };
    game: {
        total: number;
        suspended: number;
        new: number;
        new_previous: number;
        allocated: { memory: number; disk: number; cpu: number };
        by_status: KpiStatusCount[];
        nodes: KpiNode[];
    } | null;
    web: {
        total: number;
        new: number;
        new_previous: number;
        allocated: { memory: number; disk: number };
        nodes: KpiNode[];
    } | null;
    vds: {
        total: number;
        suspended: number;
        new: number;
        new_previous: number;
        allocated: { memory: number; disk_gb: number; vcpus: number };
        by_status: KpiStatusCount[];
        nodes: KpiVdsNode[];
    } | null;
    tickets: {
        opened: number;
        opened_previous: number;
        closed: number;
        closed_previous: number;
        open_now: number;
        avg_resolution_hours: number | null;
    } | null;
    series: KpiSeriesRow[];
    top_consumers: KpiConsumer[];
}

export type KpiPreset = 'd7' | 'd30' | 'd90' | 'm12' | 'custom';

export const KPI_PRESETS: { id: Exclude<KpiPreset, 'custom'>; days: number }[] = [
    { id: 'd7', days: 7 },
    { id: 'd30', days: 30 },
    { id: 'd90', days: 90 },
    { id: 'm12', days: 365 },
];

/** Local calendar date as Y-m-d. */
export function isoDay(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function presetRange(days: number, today = new Date()): { from: string; to: string } {
    const from = new Date(today);
    from.setDate(from.getDate() - (days - 1));
    return { from: isoDay(from), to: isoDay(today) };
}

/** Percent change against the previous period, or null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
    if (previous <= 0) return current > 0 ? null : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Megabytes to a short human value (MB, GB, TB). */
export function formatMegabytes(mb: number): string {
    if (!Number.isFinite(mb) || mb <= 0) return '0 MB';
    if (mb < 1024) return `${Math.round(mb)} MB`;
    const gb = mb / 1024;
    if (gb < 1024) return `${gb >= 100 ? Math.round(gb) : gb.toFixed(1).replace(/\.0$/, '')} GB`;
    const tb = gb / 1024;
    return `${tb.toFixed(1).replace(/\.0$/, '')} TB`;
}

export function formatCompact(value: number): string {
    return new Intl.NumberFormat(undefined, { notation: value >= 10000 ? 'compact' : 'standard' }).format(value);
}

/** Axis and tooltip label for a series bucket. */
export function formatBucketLabel(date: string, bucket: KpiBucket, long = false): string {
    const d = new Date(`${date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return date;
    if (bucket === 'month') return d.toLocaleDateString(undefined, { month: long ? 'long' : 'short', year: 'numeric' });
    return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        ...(long ? { year: 'numeric' } : {}),
    });
}

export function formatRangeDay(date: string): string {
    const d = new Date(`${date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
