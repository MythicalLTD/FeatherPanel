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

import { useEffect } from 'react';

const STALE_RELOAD_KEY = 'featherpanel_chunk_reload';

function isStaleChunkError(reason: unknown): boolean {
    if (reason instanceof Error) {
        const msg = (reason.message || '').toLowerCase();
        return (
            msg.includes('loading chunk') ||
            msg.includes('chunkloaderror') ||
            msg.includes('failed to fetch dynamically imported module') ||
            msg.includes('importing a module script failed') ||
            msg.includes('loading css chunk') ||
            msg.includes('error loading dynamically imported module') ||
            msg.includes('load failed')
        );
    }
    if (typeof reason === 'string') {
        return isStaleChunkError(new Error(reason));
    }
    return false;
}

function hardRefresh(): void {
    const url = new URL(window.location.href);
    url.searchParams.set('_', String(Date.now()));
    window.location.href = url.toString();
}

/**
 * Listens for unhandled promise rejections (e.g. dynamic import chunk load failures
 * after a deploy). When a stale chunk error is detected, triggers a single hard
 * refresh so the user gets the new build. Prevents infinite reloads by only
 * auto-refreshing once per "reload session".
 */
export default function ChunkLoadErrorHandler() {
    useEffect(() => {
        const handler = (event: PromiseRejectionEvent) => {
            if (!isStaleChunkError(event.reason)) return;
            if (typeof sessionStorage === 'undefined') return;
            if (sessionStorage.getItem(STALE_RELOAD_KEY)) return;

            sessionStorage.setItem(STALE_RELOAD_KEY, '1');
            event.preventDefault?.();
            hardRefresh();
        };

        window.addEventListener('unhandledrejection', handler);
        return () => window.removeEventListener('unhandledrejection', handler);
    }, []);

    useEffect(() => {
        if (typeof sessionStorage === 'undefined') return;
        const t = setTimeout(() => sessionStorage.removeItem(STALE_RELOAD_KEY), 10000);
        return () => clearTimeout(t);
    }, []);

    return null;
}
