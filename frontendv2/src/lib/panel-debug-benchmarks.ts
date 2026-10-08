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

export type BenchmarkStatus = 'idle' | 'running' | 'ok' | 'error';

export type BenchmarkResult = {
    id: string;
    name: string;
    durationMs: number | null;
    detail: string;
    status: BenchmarkStatus;
};

function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

async function yieldToMain() {
    await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 0);
    });
}

export async function runPanelBenchmarkSuite(snapshot: Record<string, unknown>): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // JSON throughput
    {
        const started = performance.now();
        const payload = JSON.stringify(snapshot);
        const parsed = JSON.parse(payload);
        const roundtrip = JSON.stringify(parsed);
        results.push({
            id: 'json',
            name: 'JSON round-trip',
            durationMs: Math.round(performance.now() - started),
            detail: `${(payload.length / 1024).toFixed(1)} KB serialized · ${roundtrip.length} bytes out`,
            status: 'ok',
        });
        await yieldToMain();
    }

    // Array sort
    {
        const started = performance.now();
        const arr = Array.from({ length: 120_000 }, () => Math.random());
        arr.sort((a, b) => a - b);
        results.push({
            id: 'sort',
            name: 'Array sort (120k)',
            durationMs: Math.round(performance.now() - started),
            detail: `Sorted ${arr.length.toLocaleString()} floats`,
            status: 'ok',
        });
        await yieldToMain();
    }

    // DOM operations
    {
        const started = performance.now();
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);
        for (let i = 0; i < 800; i += 1) {
            const el = document.createElement('div');
            el.textContent = `node-${i}`;
            container.appendChild(el);
        }
        void container.offsetHeight;
        container.remove();
        results.push({
            id: 'dom',
            name: 'DOM insert + layout',
            durationMs: Math.round(performance.now() - started),
            detail: '800 elements appended and forced reflow',
            status: 'ok',
        });
        await yieldToMain();
    }

    // localStorage write/read
    {
        const key = 'featherpanel:debug:bench';
        const started = performance.now();
        const blob = 'x'.repeat(64 * 1024);
        try {
            localStorage.setItem(key, blob);
            const read = localStorage.getItem(key);
            localStorage.removeItem(key);
            results.push({
                id: 'storage',
                name: 'localStorage 64 KB',
                durationMs: Math.round(performance.now() - started),
                detail: read ? `Read ${read.length.toLocaleString()} chars` : 'Read failed',
                status: read ? 'ok' : 'error',
            });
        } catch (error) {
            results.push({
                id: 'storage',
                name: 'localStorage 64 KB',
                durationMs: Math.round(performance.now() - started),
                detail: error instanceof Error ? error.message : 'Storage quota error',
                status: 'error',
            });
        }
        await yieldToMain();
    }

    // rAF frame timing (10 frames)
    {
        const frames: number[] = [];
        let last = performance.now();
        await new Promise<void>((resolve) => {
            let count = 0;
            const tick = (now: number) => {
                frames.push(now - last);
                last = now;
                count += 1;
                if (count >= 10) {
                    resolve();
                    return;
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
        const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
        results.push({
            id: 'raf',
            name: 'Animation frames (10)',
            durationMs: Math.round(avg * 10),
            detail: `Avg ${avg.toFixed(2)} ms/frame · ~${Math.round(1000 / avg)} fps`,
            status: 'ok',
        });
        await yieldToMain();
    }

    // Network: public settings (3 samples)
    {
        const samples: number[] = [];
        let lastError: string | null = null;
        for (let i = 0; i < 3; i += 1) {
            const started = performance.now();
            try {
                await axios.get('/api/system/settings', { timeout: 15000 });
                samples.push(performance.now() - started);
            } catch (error) {
                lastError = error instanceof Error ? error.message : 'Request failed';
            }
        }
        results.push({
            id: 'api-settings',
            name: 'GET /api/system/settings',
            durationMs: samples.length ? Math.round(median(samples)) : null,
            detail: samples.length
                ? `Median ${Math.round(median(samples))} ms · ${samples.map((v) => Math.round(v)).join(', ')} ms`
                : (lastError ?? 'Failed'),
            status: samples.length ? 'ok' : 'error',
        });
        await yieldToMain();
    }

    // Network: session
    {
        const started = performance.now();
        try {
            await axios.get('/api/user/session', { timeout: 15000 });
            results.push({
                id: 'api-session',
                name: 'GET /api/user/session',
                durationMs: Math.round(performance.now() - started),
                detail: 'Session endpoint reachable',
                status: 'ok',
            });
        } catch (error) {
            results.push({
                id: 'api-session',
                name: 'GET /api/user/session',
                durationMs: Math.round(performance.now() - started),
                detail: error instanceof Error ? error.message : 'Request failed',
                status: 'error',
            });
        }
    }

    return results;
}

export type NetworkProbe = {
    id: string;
    label: string;
    url: string;
    method: 'GET' | 'POST';
    durationMs: number | null;
    status: number | null;
    ok: boolean;
    detail: string;
};

export async function runNetworkProbes(): Promise<NetworkProbe[]> {
    const probes: Array<
        Omit<NetworkProbe, 'durationMs' | 'status' | 'ok' | 'detail'> & { fn: () => Promise<{ status: number }> }
    > = [
        {
            id: 'settings',
            label: 'Public settings',
            url: '/api/system/settings',
            method: 'GET',
            fn: () => axios.get('/api/system/settings', { timeout: 15000 }).then((r) => ({ status: r.status })),
        },
        {
            id: 'session',
            label: 'User session',
            url: '/api/user/session',
            method: 'GET',
            fn: () => axios.get('/api/user/session', { timeout: 15000 }).then((r) => ({ status: r.status })),
        },
        {
            id: 'translations',
            label: 'Translations',
            url: '/api/system/translations/languages',
            method: 'GET',
            fn: () =>
                axios.get('/api/system/translations/languages', { timeout: 15000 }).then((r) => ({ status: r.status })),
        },
        {
            id: 'plugin-sidebar',
            label: 'Plugin sidebar',
            url: '/api/system/plugin-sidebar',
            method: 'GET',
            fn: () => axios.get('/api/system/plugin-sidebar', { timeout: 15000 }).then((r) => ({ status: r.status })),
        },
    ];

    const results: NetworkProbe[] = [];
    for (const probe of probes) {
        const started = performance.now();
        try {
            const response = await probe.fn();
            results.push({
                id: probe.id,
                label: probe.label,
                url: probe.url,
                method: probe.method,
                durationMs: Math.round(performance.now() - started),
                status: response.status,
                ok: true,
                detail: `HTTP ${response.status}`,
            });
        } catch (error) {
            const status = axios.isAxiosError(error) ? (error.response?.status ?? null) : null;
            results.push({
                id: probe.id,
                label: probe.label,
                url: probe.url,
                method: probe.method,
                durationMs: Math.round(performance.now() - started),
                status,
                ok: false,
                detail: axios.isAxiosError(error)
                    ? `${error.message}${status ? ` (${status})` : ''}`
                    : error instanceof Error
                      ? error.message
                      : 'Failed',
            });
        }
    }
    return results;
}
