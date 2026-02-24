// Basic service worker for FeatherPanel PWA.
// Currently only enables installability and a minimal cache for the shell.

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

const CACHE_NAME = 'featherpanel-shell-v1';
const SHELL_URLS = ['/'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(SHELL_URLS).catch(() => undefined);
        }),
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key)),
            ),
        ),
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Network-first strategy; fall back to cache for shell URLs.
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request).catch(() =>
            caches.match(event.request).then((resp) => resp || caches.match('/')),
        ),
    );
});

