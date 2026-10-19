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

/** Remove only disposable panel caches; session and desktop preferences are user data. */
export async function clearDevelopmentCaches(): Promise<void> {
    if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return;

    try {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
            if (key === 'app_settings' || key.startsWith('translations_')) localStorage.removeItem(key);
        }
    } catch {
        // Storage may be unavailable in private browsing.
    }

    await Promise.allSettled([
        (async () => {
            if (!('caches' in window)) return;
            const keys = await caches.keys();
            await Promise.all(keys.filter((key) => key.startsWith('fp-pwa-')).map((key) => caches.delete(key)));
        })(),
        (async () => {
            if (!('serviceWorker' in navigator)) return;
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(
                registrations
                    .filter((registration) => {
                        const worker = registration.active ?? registration.waiting ?? registration.installing;
                        if (!worker) return false;
                        const url = new URL(worker.scriptURL);
                        return url.origin === window.location.origin && url.pathname === '/sw.js';
                    })
                    .map((registration) => registration.unregister()),
            );
        })(),
    ]);
}
