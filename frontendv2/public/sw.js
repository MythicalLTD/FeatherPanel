/* FeatherPanel PWA service worker — keep minimal; required for installability. */
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

const CACHE = 'fp-pwa-v1';
const PRECACHE = ['/offline.html'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // Never cache API / auth traffic.
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
        return;
    }

    event.respondWith(
        fetch(req)
            .then((res) => {
                if (res.ok && (req.mode === 'navigate' || url.pathname.startsWith('/_next/static/'))) {
                    const copy = res.clone();
                    caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => undefined);
                }
                return res;
            })
            .catch(async () => {
                const cached = await caches.match(req);
                if (cached) return cached;
                if (req.mode === 'navigate') {
                    const offline = await caches.match('/offline.html');
                    if (offline) return offline;
                }
                return Response.error();
            }),
    );
});
