/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PluginPublicPage } from '@/types/plugin-public-pages';

let cachedPages: PluginPublicPage[] | null = null;
let loadPromise: Promise<PluginPublicPage[]> | null = null;

async function fetchPluginPublicPagesClient(): Promise<PluginPublicPage[]> {
    if (cachedPages) {
        return cachedPages;
    }

    if (loadPromise) {
        return loadPromise;
    }

    loadPromise = (async () => {
        try {
            const res = await fetch('/api/system/plugin-public-pages', {
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            });

            if (!res.ok) {
                cachedPages = [];
                return cachedPages;
            }

            const data = await res.json();
            cachedPages = Array.isArray(data?.data?.pages) ? (data.data.pages as PluginPublicPage[]) : [];
            return cachedPages;
        } catch {
            cachedPages = [];
            return cachedPages;
        } finally {
            loadPromise = null;
        }
    })();

    return loadPromise;
}

export function invalidatePluginPublicPagesCache(): void {
    cachedPages = null;
    loadPromise = null;
}

export function usePluginPublicPages() {
    const [pages, setPages] = useState<PluginPublicPage[]>(cachedPages ?? []);
    const [loading, setLoading] = useState(cachedPages === null);

    const refresh = useCallback(async () => {
        invalidatePluginPublicPagesCache();
        setLoading(true);
        const next = await fetchPluginPublicPagesClient();
        setPages(next);
        setLoading(false);
        return next;
    }, []);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const next = await fetchPluginPublicPagesClient();
            if (!cancelled) {
                setPages(next);
                setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const isPublicPluginPath = useCallback(
        (pathname: string): boolean => {
            const normalized = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
            return pages.some((page) => page.path === normalized);
        },
        [pages],
    );

    return { pages, loading, refresh, isPublicPluginPath };
}

export async function getCachedPluginPublicPages(): Promise<PluginPublicPage[]> {
    return fetchPluginPublicPagesClient();
}
