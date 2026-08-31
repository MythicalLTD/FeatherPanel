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
    type AxiosError,
    type AxiosInstance,
    type AxiosResponse,
    type InternalAxiosRequestConfig,
    type Method,
} from 'axios';

export type PanelApiHistorySource = 'captured' | 'replay' | 'manual';

export type PanelApiHistoryEntry = {
    id: string;
    timestamp: number;
    method: string;
    url: string;
    fullUrl: string;
    requestHeaders: Record<string, string>;
    requestBody: unknown;
    responseStatus: number | null;
    responseHeaders: Record<string, string>;
    responseBody: unknown;
    durationMs: number;
    ok: boolean;
    error: string | null;
    source: PanelApiHistorySource;
};

type TrackedAxiosConfig = InternalAxiosRequestConfig & {
    _panelApiStart?: number;
    _panelApiId?: string;
    _panelApiSource?: PanelApiHistorySource;
};

const MAX_ENTRIES = 200;
const MAX_BODY_CHARS = 120_000;

let entries: PanelApiHistoryEntry[] = [];
const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((listener) => listener());
}

export function subscribePanelApiHistory(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getPanelApiHistory(): PanelApiHistoryEntry[] {
    return entries;
}

export function clearPanelApiHistory(): void {
    entries = [];
    notify();
}

function truncateValue(value: unknown): unknown {
    if (typeof value === 'string' && value.length > MAX_BODY_CHARS) {
        return `${value.slice(0, MAX_BODY_CHARS)}\n… [truncated]`;
    }
    return value;
}

export function formatPanelApiBody(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') {
        try {
            return JSON.stringify(JSON.parse(value), null, 2);
        } catch {
            return value;
        }
    }
    try {
        const serialized = JSON.stringify(value, null, 2);
        if (serialized.length > MAX_BODY_CHARS) {
            return `${serialized.slice(0, MAX_BODY_CHARS)}\n… [truncated]`;
        }
        return serialized;
    } catch {
        return String(value);
    }
}

function serializeRequestPayload(config: InternalAxiosRequestConfig): unknown {
    const body = serializeRequestBody(config.data);
    const params = config.params;

    if (params && typeof params === 'object' && Object.keys(params as object).length > 0) {
        if (body === null) {
            return { query: params };
        }
        return { query: params, body };
    }

    return body;
}

function splitUrlQuery(url: string): { path: string; params?: Record<string, string> } {
    const qIndex = url.indexOf('?');
    if (qIndex === -1) {
        return { path: url };
    }

    const path = url.slice(0, qIndex);
    const params: Record<string, string> = {};
    new URLSearchParams(url.slice(qIndex + 1)).forEach((value, key) => {
        params[key] = value;
    });
    return { path, params: Object.keys(params).length > 0 ? params : undefined };
}

function serializeRequestBody(data: unknown): unknown {
    if (data === undefined || data === null) return null;
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    }
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
        const out: Record<string, string> = {};
        data.forEach((value, key) => {
            out[key] = value instanceof File ? `[File: ${value.name}, ${value.size} bytes]` : String(value);
        });
        return out;
    }
    if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams) {
        return Object.fromEntries(data.entries());
    }
    return data;
}

function extractHeaders(headers: Record<string, unknown> | undefined): Record<string, string> {
    if (!headers) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
        if (value === undefined || value === null) continue;
        const lower = key.toLowerCase();
        if (lower === 'cookie') {
            out[key] = '[session cookie attached]';
            continue;
        }
        out[key] = Array.isArray(value) ? value.join(', ') : String(value);
    }
    return out;
}

function resolveRequestPath(config: InternalAxiosRequestConfig): string {
    const url = String(config.url ?? '');
    const base = String(config.baseURL ?? '');

    if (/^https?:\/\//i.test(url)) {
        if (typeof window !== 'undefined' && !url.startsWith(window.location.origin)) {
            return '';
        }
        try {
            const parsed = new URL(url);
            return `${parsed.pathname}${parsed.search}`;
        } catch {
            return '';
        }
    }

    const combined = `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`.replace(/\/+/g, '/');
    return combined.startsWith('/') ? combined : `/${combined}`;
}

function formatRequestPath(config: InternalAxiosRequestConfig): string {
    let path = resolveRequestPath(config);
    if (!path || !config.params || typeof config.params !== 'object') {
        return path;
    }

    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(config.params as Record<string, unknown>)) {
        if (value === undefined || value === null) continue;
        qs.append(key, String(value));
    }
    const query = qs.toString();
    if (query && !path.includes('?')) {
        path = `${path}?${query}`;
    }
    return path;
}

function isPanelApiRequest(config: InternalAxiosRequestConfig): boolean {
    const path = resolveRequestPath(config);
    if (!path) return false;
    return path.startsWith('/api/') || path === '/api';
}

function pushEntry(entry: PanelApiHistoryEntry) {
    entries = [entry, ...entries].slice(0, MAX_ENTRIES);
    notify();
}

function recordFromAxios(
    config: InternalAxiosRequestConfig | undefined,
    response: AxiosResponse | undefined,
    error: AxiosError | undefined,
) {
    if (!config || !isPanelApiRequest(config)) return;

    const tracked = config as TrackedAxiosConfig;
    const started = tracked._panelApiStart ?? performance.now();
    const durationMs = Math.round(performance.now() - started);
    const path = formatRequestPath(config);
    const method = String(config.method ?? 'GET').toUpperCase();
    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;

    const responseBody = truncateValue(response?.data ?? error?.response?.data ?? null);
    const responseStatus = response?.status ?? error?.response?.status ?? null;

    pushEntry({
        id: tracked._panelApiId ?? crypto.randomUUID(),
        timestamp: Date.now(),
        method,
        url: path,
        fullUrl,
        requestHeaders: extractHeaders(config.headers as Record<string, unknown> | undefined),
        requestBody: truncateValue(serializeRequestPayload(config)),
        responseStatus,
        responseHeaders: extractHeaders(
            (response?.headers ?? error?.response?.headers) as Record<string, unknown> | undefined,
        ),
        responseBody,
        durationMs,
        ok: responseStatus !== null && responseStatus >= 200 && responseStatus < 400,
        error:
            responseStatus === null
                ? (error?.message ?? 'Network error')
                : responseStatus >= 400
                  ? typeof responseBody === 'object' &&
                    responseBody !== null &&
                    'message' in responseBody &&
                    typeof (responseBody as { message?: unknown }).message === 'string'
                      ? String((responseBody as { message: string }).message)
                      : `HTTP ${responseStatus}`
                  : null,
        source: tracked._panelApiSource ?? 'captured',
    });
}

export function attachPanelApiHistoryInterceptor(client: AxiosInstance): void {
    client.interceptors.request.use((config) => {
        if (!isPanelApiRequest(config)) return config;
        const tracked = config as TrackedAxiosConfig;
        if (!tracked._panelApiStart) {
            tracked._panelApiStart = performance.now();
        }
        if (!tracked._panelApiId) {
            tracked._panelApiId = crypto.randomUUID();
        }
        if (!tracked._panelApiSource) {
            tracked._panelApiSource = 'captured';
        }
        return config;
    });

    client.interceptors.response.use(
        (response) => {
            recordFromAxios(response.config, response, undefined);
            return response;
        },
        (error: AxiosError) => {
            recordFromAxios(error.config, error.response, error);
            return Promise.reject(error);
        },
    );
}

export type PanelApiReplayParams = {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    source?: PanelApiHistorySource;
};

function parseReplayBody(bodyText: string): unknown {
    const trimmed = bodyText.trim();
    if (!trimmed) return undefined;
    return JSON.parse(trimmed) as unknown;
}

export async function sendPanelApiRequest(params: PanelApiReplayParams): Promise<PanelApiHistoryEntry> {
    const method = params.method.toUpperCase() as Method;
    let url = params.url.trim();
    if (!url.startsWith('/')) {
        url = `/${url}`;
    }

    const { path, params: queryParams } = splitUrlQuery(url);

    let body: unknown;
    if (typeof params.body === 'string') {
        body = parseReplayBody(params.body);
    } else {
        body = params.body;
    }

    const headers = { ...(params.headers ?? {}) };
    const hasBody = body !== undefined && body !== null;
    if (hasBody && !headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
    }

    const id = crypto.randomUUID();
    const config: TrackedAxiosConfig = {
        method,
        url: path,
        params: queryParams,
        headers: headers as TrackedAxiosConfig['headers'],
        data: method === 'GET' || method === 'DELETE' ? undefined : body,
        withCredentials: true,
        _panelApiSource: params.source ?? 'manual',
        _panelApiStart: performance.now(),
        _panelApiId: id,
    };

    try {
        await axios.request(config);
    } catch {
        // Interceptor records failed requests.
    }

    const entry = entries.find((item) => item.id === id);
    if (!entry) {
        throw new Error('Request was not recorded — ensure the URL starts with /api/');
    }
    return entry;
}

export function entryToReplayDraft(entry: PanelApiHistoryEntry): PanelApiReplayParams {
    const headers = { ...entry.requestHeaders };
    delete headers.cookie;
    delete headers.Cookie;

    let url = entry.url;
    let bodyText = '';

    if (
        entry.requestBody &&
        typeof entry.requestBody === 'object' &&
        !Array.isArray(entry.requestBody) &&
        'query' in entry.requestBody
    ) {
        const payload = entry.requestBody as { query?: Record<string, string>; body?: unknown };
        if (payload.query) {
            const qs = new URLSearchParams(payload.query).toString();
            if (qs) {
                url = `${url}${url.includes('?') ? '&' : '?'}${qs}`;
            }
        }
        if (payload.body !== undefined && payload.body !== null) {
            bodyText = formatPanelApiBody(payload.body);
        }
    } else if (entry.requestBody !== null && entry.requestBody !== undefined) {
        bodyText = formatPanelApiBody(entry.requestBody);
    }

    return {
        method: entry.method,
        url,
        headers,
        body: bodyText,
        source: 'replay',
    };
}
