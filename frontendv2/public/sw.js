/* FeatherPanel PWA service worker: keep minimal; required for installability. */
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

const CACHE = 'fp-pwa-v4';
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
    if (req.method !== 'GET' || !req.url) return;

    let url;
    try {
        url = new URL(req.url);
    } catch {
        return;
    }
    // Only same-origin http(s): file:, data:, blob:, chrome-extension: and cross-origin requests
    // go straight to the network (or fail there) without the worker in between.
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.origin !== self.location.origin) return;

    // Never touch API / auth traffic, dev-server internals or range requests (media seeking).
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;
    if (url.pathname.startsWith('/_next/webpack-hmr') || url.pathname.includes('.hot-update.')) return;
    if (req.headers.has('range')) return;

    // Only page loads (offline fallback) and immutable build assets (cache) are worth handling;
    // everything else passes through untouched instead of failing inside the worker.
    const isNavigation = req.mode === 'navigate';
    const isStaticAsset = url.pathname.startsWith('/_next/static/');
    if (!isNavigation && !isStaticAsset) return;

    event.respondWith(
        (async () => {
            try {
                const res = await fetch(req);
                // Cache immutable build assets only; pages carry per-user data and are not stored.
                if (isStaticAsset && res.ok && res.type === 'basic') {
                    const copy = res.clone();
                    caches
                        .open(CACHE)
                        .then((cache) => cache.put(req, copy))
                        .catch(() => undefined);
                }
                return res;
            } catch {
                if (isStaticAsset) {
                    const cached = await caches.match(req).catch(() => undefined);
                    if (cached) return cached;
                }
                if (isNavigation) {
                    const offline = await caches.match('/offline.html').catch(() => undefined);
                    if (offline) return offline;
                }
                return new Response('', { status: 504, statusText: 'Offline' });
            }
        })(),
    );
});

self.addEventListener('push', (event) => {
    let data = { title: 'FeatherPanel', body: '', url: '/dashboard', tag: 'fp-push' };
    try {
        if (event.data) {
            const parsed = event.data.json();
            if (parsed && typeof parsed === 'object') {
                data = { ...data, ...parsed };
            }
        }
    } catch {
        try {
            const text = event.data ? event.data.text() : '';
            if (text) data.body = text;
        } catch {
            /* ignore */
        }
    }

    const title = typeof data.title === 'string' && data.title ? data.title : 'FeatherPanel';
    const options = {
        body: typeof data.body === 'string' ? data.body : '',
        tag: typeof data.tag === 'string' && data.tag ? data.tag : 'fp-push',
        renotify: true,
        data: { url: typeof data.url === 'string' && data.url ? data.url : '/dashboard' },
        icon: '/assets/logo.png',
        badge: '/assets/logo.png',
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = (event.notification && event.notification.data && event.notification.data.url) || '/dashboard';
    event.waitUntil(
        (async () => {
            const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const client of all) {
                if ('focus' in client) {
                    try {
                        await client.focus();
                        if ('navigate' in client && typeof client.navigate === 'function') {
                            await client.navigate(target);
                        }
                        return;
                    } catch {
                        /* try next */
                    }
                }
            }
            if (clients.openWindow) {
                await clients.openWindow(target);
            }
        })(),
    );
});
