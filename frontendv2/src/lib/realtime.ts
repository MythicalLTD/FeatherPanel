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

/**
 * Live updates through the Mercure hub built into FrankenPHP.
 *
 * The backend publishes small "something changed" events (never the data itself) to
 * private topics. One shared connection per tab carries every topic the mounted
 * components asked for; the token comes from POST /api/user/realtime/token, which
 * only grants topics the user may see, and travels in an Authorization header
 * (fetch + ReadableStream), never in the URL.
 *
 * When the hub is unavailable (classic installs, php-fpm, an old backend, a proxy
 * that blocks streaming) the status stays "unavailable" and callers keep polling,
 * see useLiveRefresh.
 */

import axios from 'axios';

export interface RealtimeEvent {
    type: string;
    topics: string[];
    data: Record<string, unknown>;
}

export type RealtimeStatus = 'idle' | 'connecting' | 'open' | 'unavailable';

type Listener = (event: RealtimeEvent) => void;

interface TokenResponse {
    enabled: boolean;
    hub_url?: string;
    token?: string;
    topics?: string[];
}

/** Emitted locally after a reconnect so consumers can catch up on missed updates. */
export const REALTIME_RECONNECTED = 'realtime.reconnected';

const DISABLED_RETRY_MS = 5 * 60_000;
const MAX_BACKOFF_MS = 30_000;

export const realtimeTopics = {
    notifications: '/notifications',
    adminWebspaces: '/admin/webspaces',
    server: (uuidShort: string) => `/servers/${uuidShort}`,
    /** Per user stream (inbox updates); the token grants only the signed-in user's own topic. */
    user: (uuid: string) => `/users/${uuid}`,
};

class RealtimeClient {
    private listeners = new Map<string, Set<Listener>>();
    private statusListeners = new Set<() => void>();
    private status: RealtimeStatus = 'idle';
    private controller: AbortController | null = null;
    private connectedKey = '';
    private syncTimer: ReturnType<typeof setTimeout> | null = null;
    private retryTimer: ReturnType<typeof setTimeout> | null = null;
    private attempt = 0;
    private unavailableUntil = 0;
    private wasOpen = false;

    getStatus = (): RealtimeStatus => this.status;

    onStatus = (fn: () => void): (() => void) => {
        this.statusListeners.add(fn);
        return () => {
            this.statusListeners.delete(fn);
        };
    };

    subscribe(topic: string, listener: Listener): () => void {
        let set = this.listeners.get(topic);
        if (!set) {
            set = new Set();
            this.listeners.set(topic, set);
        }
        set.add(listener);
        this.scheduleSync();

        return () => {
            const current = this.listeners.get(topic);
            if (!current) return;
            current.delete(listener);
            if (current.size === 0) this.listeners.delete(topic);
            this.scheduleSync();
        };
    }

    private setStatus(status: RealtimeStatus) {
        if (this.status === status) return;
        this.status = status;
        this.statusListeners.forEach((fn) => fn());
    }

    /** Batch subscribe/unsubscribe bursts (page transitions) into one reconnect. */
    private scheduleSync() {
        if (typeof window === 'undefined') return;
        if (this.syncTimer) clearTimeout(this.syncTimer);
        this.syncTimer = setTimeout(() => {
            this.syncTimer = null;
            this.sync();
        }, 50);
    }

    private sync() {
        const topics = [...this.listeners.keys()].sort();
        const key = topics.join('\n');
        if (key === this.connectedKey && this.controller) return;

        this.disconnect();
        this.connectedKey = key;
        if (topics.length === 0) {
            this.setStatus('idle');
            return;
        }
        const wait = this.unavailableUntil - Date.now();
        if (wait > 0) {
            this.setStatus('unavailable');
            this.retryLater(wait);
            return;
        }
        void this.connect(topics);
    }

    private disconnect() {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
        this.controller?.abort();
        this.controller = null;
    }

    private retryLater(ms: number) {
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            this.controller = null;
            this.connectedKey = '';
            this.sync();
        }, ms);
    }

    private async connect(topics: string[]) {
        const controller = new AbortController();
        this.controller = controller;
        this.setStatus('connecting');

        try {
            const { data } = await axios.post<{ data?: TokenResponse }>(
                '/api/user/realtime/token',
                { topics },
                { signal: controller.signal },
            );
            if (controller.signal.aborted) return;
            const info = data?.data;
            if (!info?.enabled || !info.token || !info.hub_url || !info.topics?.length) {
                this.markUnavailable(controller);
                return;
            }

            const url = new URL(info.hub_url, window.location.origin);
            info.topics.forEach((topic) => url.searchParams.append('match', topic));
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${info.token}`, Accept: 'text/event-stream' },
                cache: 'no-store',
                credentials: 'omit',
                signal: controller.signal,
            });
            const type = response.headers.get('content-type') ?? '';
            if (!response.ok || !response.body || !type.includes('text/event-stream')) {
                // 404 / HTML: no hub behind this URL. Anything else: retry with backoff.
                if (
                    response.status === 404 ||
                    response.status === 405 ||
                    (response.ok && !type.includes('text/event-stream'))
                ) {
                    this.markUnavailable(controller);
                    return;
                }
                throw new Error(`Realtime hub answered ${response.status}`);
            }

            this.attempt = 0;
            this.setStatus('open');
            if (this.wasOpen) {
                this.dispatch({ type: REALTIME_RECONNECTED, topics, data: {} });
            }
            this.wasOpen = true;
            await this.read(response.body, controller.signal);
            throw new Error('Realtime stream closed');
        } catch (error) {
            if (controller.signal.aborted || this.controller !== controller) return;
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;
            if (status === 401 || status === 403 || status === 404) {
                // Logged out, nothing we may watch, or an older backend without the endpoint.
                this.markUnavailable(controller);
                return;
            }
            this.setStatus('unavailable');
            const backoff = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.attempt) + Math.random() * 1000;
            this.attempt++;
            this.retryLater(backoff);
        }
    }

    private markUnavailable(controller: AbortController) {
        if (this.controller !== controller) return;
        this.unavailableUntil = Date.now() + DISABLED_RETRY_MS;
        this.setStatus('unavailable');
        this.retryLater(DISABLED_RETRY_MS);
    }

    private async read(body: ReadableStream<Uint8Array>, signal: AbortSignal) {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            while (!signal.aborted) {
                const { value, done } = await reader.read();
                if (done) return;
                buffer += decoder.decode(value, { stream: true });
                let boundary = buffer.search(/\r?\n\r?\n/);
                while (boundary !== -1) {
                    const block = buffer.slice(0, boundary);
                    buffer = buffer.slice(boundary).replace(/^\r?\n\r?\n/, '');
                    this.handleBlock(block);
                    boundary = buffer.search(/\r?\n\r?\n/);
                }
            }
        } finally {
            reader.cancel().catch(() => undefined);
        }
    }

    private handleBlock(block: string) {
        const data = block
            .split(/\r?\n/)
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).replace(/^ /, ''))
            .join('\n');
        if (!data) return;
        try {
            const event = JSON.parse(data) as RealtimeEvent;
            if (event && typeof event.type === 'string' && Array.isArray(event.topics)) {
                this.dispatch({ type: event.type, topics: event.topics, data: event.data ?? {} });
            }
        } catch {
            // Not one of ours.
        }
    }

    private dispatch(event: RealtimeEvent) {
        const seen = new Set<Listener>();
        event.topics.forEach((topic) => {
            this.listeners.get(topic)?.forEach((listener) => {
                if (seen.has(listener)) return;
                seen.add(listener);
                try {
                    listener(event);
                } catch (error) {
                    console.error('Realtime listener failed', error);
                }
            });
        });
    }
}

export const realtime = new RealtimeClient();
