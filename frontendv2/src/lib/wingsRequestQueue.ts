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

const MAX_CONCURRENT_WINGS_REQUESTS = 2;

let activeWingsRequests = 0;
const wingsWaitQueue: Array<() => void> = [];

export function acquireWingsSlot(): Promise<void> {
    if (activeWingsRequests < MAX_CONCURRENT_WINGS_REQUESTS) {
        activeWingsRequests++;
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        wingsWaitQueue.push(() => {
            activeWingsRequests++;
            resolve();
        });
    });
}

export function releaseWingsSlot(): void {
    activeWingsRequests = Math.max(0, activeWingsRequests - 1);
    const next = wingsWaitQueue.shift();
    if (next) {
        next();
    }
}

export function isWingsAdminNodeRequest(url?: string): boolean {
    if (!url) {
        return false;
    }

    return url.includes('/wings/admin/node/');
}

export async function withWingsRequestQueue<T>(fn: () => Promise<T>): Promise<T> {
    await acquireWingsSlot();
    try {
        return await fn();
    } finally {
        releaseWingsSlot();
    }
}
