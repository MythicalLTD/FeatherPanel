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

import axios, {
    type AxiosAdapter,
    type AxiosError,
    type AxiosInstance,
    type AxiosResponse,
    type InternalAxiosRequestConfig,
} from 'axios';

/**
 * Two safety nets for panel API traffic:
 *
 * 1. Identical GETs that are already in flight share one request. Several providers and widgets
 *    load the same list on mount (servers, tickets, preferences), and React may mount a tree
 *    twice in development, which used to burst past the per-second rate limits.
 * 2. A GET answered with 429 waits for `Retry-After` (or a short backoff) and tries again a couple
 *    of times before the error reaches the caller.
 */

type ResilientConfig = InternalAxiosRequestConfig & { _fpRetry429?: number; _fpNoDedupe?: boolean };

const MAX_429_RETRIES = 2;
const MAX_RETRY_WAIT_MS = 10_000;

const inFlight = new Map<string, Promise<AxiosResponse>>();

function isPanelApiGet(config: InternalAxiosRequestConfig): boolean {
    if ((config.method ?? 'get').toLowerCase() !== 'get') return false;
    if (typeof window === 'undefined') return false;
    try {
        const url = new URL(axios.getUri(config), window.location.origin);
        return url.origin === window.location.origin && url.pathname.startsWith('/api/');
    } catch {
        return false;
    }
}

function dedupeKey(config: InternalAxiosRequestConfig): string {
    return `${axios.getUri(config)}|${config.responseType ?? 'json'}`;
}

function wrapAdapter(base: AxiosAdapter): AxiosAdapter {
    return (config) => {
        const cfg = config as ResilientConfig;
        // A caller-owned AbortSignal must not cancel other callers' shared request.
        if (cfg._fpNoDedupe || config.signal || !isPanelApiGet(config)) return base(config);

        const key = dedupeKey(config);
        const existing = inFlight.get(key);
        if (existing) {
            return existing.then((res) => ({ ...res, config }));
        }
        const pending = base(config).finally(() => inFlight.delete(key));
        inFlight.set(key, pending);
        return pending;
    };
}

function retryAfterMs(error: AxiosError, attempt: number): number {
    const header = error.response?.headers?.['retry-after'];
    const body = error.response?.data as { data?: { retry_after?: unknown } } | undefined;
    const raw = header ?? body?.data?.retry_after;
    let ms = NaN;
    if (raw !== undefined && raw !== null && raw !== '') {
        const seconds = Number(raw);
        ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(String(raw)) - Date.now();
    }
    if (!Number.isFinite(ms) || ms <= 0) ms = 500 * 2 ** attempt;
    // Small jitter so retried bursts do not line up again.
    return Math.min(ms, MAX_RETRY_WAIT_MS) + Math.floor(Math.random() * 250);
}

export function attachRequestResilience(client: AxiosInstance): void {
    const base = axios.getAdapter(client.defaults.adapter ?? axios.defaults.adapter);
    client.defaults.adapter = wrapAdapter(base);

    client.interceptors.response.use(undefined, async (error: AxiosError) => {
        const config = error.config as ResilientConfig | undefined;
        if (!config || error.response?.status !== 429 || !isPanelApiGet(config)) {
            return Promise.reject(error);
        }
        const attempt = config._fpRetry429 ?? 0;
        if (attempt >= MAX_429_RETRIES || (typeof document !== 'undefined' && document.hidden)) {
            return Promise.reject(error);
        }
        await new Promise((resolve) => setTimeout(resolve, retryAfterMs(error, attempt)));
        if (config.signal && (config.signal as AbortSignal).aborted) return Promise.reject(error);
        config._fpRetry429 = attempt + 1;
        return client.request(config);
    });
}
