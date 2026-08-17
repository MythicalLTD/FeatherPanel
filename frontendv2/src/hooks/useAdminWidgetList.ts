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
import axios, { type AxiosResponse } from 'axios';

export type AdminWidgetListState = 'loading' | 'ready' | 'forbidden' | 'error' | 'empty';

interface AdminWidgetApiResponse {
    success: boolean;
    data?: unknown;
}

/**
 * Shared fetch/state logic for small admin dashboard widgets that load a short
 * list from the API (e.g. recent activity, support tickets). Handles the
 * loading/ready/forbidden/error/empty states, 403-to-"forbidden" mapping, and
 * exposes a `retry` callback for the error state's retry button.
 *
 * `fetcher` and `extract` should be memoized (e.g. via useCallback with a
 * stable dependency array) by the caller, matching how the individual widgets
 * previously memoized their own fetch functions.
 */
export function useAdminWidgetList<T>(
    fetcher: () => Promise<AxiosResponse<AdminWidgetApiResponse>>,
    extract: (data: unknown) => T[],
) {
    const [items, setItems] = useState<T[]>([]);
    const [state, setState] = useState<AdminWidgetListState>('loading');
    const requestIdRef = useRef(0);

    const load = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        setState('loading');
        try {
            const response = await fetcher();
            if (requestId !== requestIdRef.current) return;
            if (response.data.success) {
                const list = extract(response.data.data) || [];
                setItems(list);
                setState(list.length ? 'ready' : 'empty');
            } else {
                setState('error');
            }
        } catch (err) {
            if (requestId !== requestIdRef.current) return;
            if (axios.isAxiosError(err) && err.response?.status === 403) {
                setState('forbidden');
            } else {
                setState('error');
            }
        }
    }, [fetcher, extract]);

    useEffect(() => {
        load();
    }, [load]);

    return { items, state, retry: load };
}
