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

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { realtime, REALTIME_RECONNECTED, type RealtimeEvent, type RealtimeStatus } from '@/lib/realtime';

const serverStatus = (): RealtimeStatus => 'idle';

/** Connection state of the shared live-update stream. */
export function useRealtimeStatus(): RealtimeStatus {
    return useSyncExternalStore(realtime.onStatus, realtime.getStatus, serverStatus);
}

/**
 * Subscribe to live-update topics. Falsy topics are ignored, so callers can pass
 * `server && realtimeTopics.server(server.uuidShort)` without conditional hooks.
 */
export function useRealtime(
    topics: ReadonlyArray<string | null | undefined | false>,
    onEvent: (event: RealtimeEvent) => void,
    enabled = true,
): RealtimeStatus {
    const handler = useRef(onEvent);
    useEffect(() => {
        handler.current = onEvent;
    });

    const key = topics.filter((t): t is string => typeof t === 'string' && t !== '').join('\n');

    useEffect(() => {
        if (!enabled || !key) return;
        const listener = (event: RealtimeEvent) => handler.current(event);
        const unsubscribers = key.split('\n').map((topic) => realtime.subscribe(topic, listener));
        return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    }, [key, enabled]);

    return useRealtimeStatus();
}

interface LiveRefreshOptions {
    topics: ReadonlyArray<string | null | undefined | false>;
    /** Reload the data; called on matching events and while polling. */
    refresh: () => void;
    /** Only react to these event types (a reconnect always refreshes). */
    types?: string[];
    /** Polling interval used while the live stream is not open. */
    pollMs?: number;
    /** Whether polling is needed right now (e.g. only while something is in progress). */
    poll?: boolean;
    enabled?: boolean;
}

/**
 * Refresh on live events, and poll only while the live stream is unavailable.
 * Events arriving in a burst trigger a single refresh.
 */
export function useLiveRefresh({
    topics,
    refresh,
    types,
    pollMs,
    poll = true,
    enabled = true,
}: LiveRefreshOptions): RealtimeStatus {
    const refreshRef = useRef(refresh);
    useEffect(() => {
        refreshRef.current = refresh;
    });
    const typesKey = types?.join(',') ?? '';
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current);
        },
        [],
    );

    const status = useRealtime(
        topics,
        (event) => {
            if (event.type !== REALTIME_RECONNECTED && typesKey && !typesKey.split(',').includes(event.type)) return;
            if (timer.current) return;
            timer.current = setTimeout(() => {
                timer.current = null;
                refreshRef.current();
            }, 250);
        },
        enabled,
    );

    const live = status === 'open';
    useEffect(() => {
        if (!enabled || live || !poll || !pollMs) return;
        const id = setInterval(() => {
            if (document.visibilityState !== 'hidden') refreshRef.current();
        }, pollMs);
        return () => clearInterval(id);
    }, [enabled, live, poll, pollMs]);

    return status;
}
