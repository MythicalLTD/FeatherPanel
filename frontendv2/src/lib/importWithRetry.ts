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

function isChunkLoadFailure(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = (error.message || '').toLowerCase();
    const name = (error.name || '').toLowerCase();
    return (
        name.includes('chunkloaderror') ||
        msg.includes('loading chunk') ||
        msg.includes('failed to fetch dynamically imported module') ||
        msg.includes('importing a module script failed') ||
        msg.includes('load failed')
    );
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries dynamic imports when chunks are not ready yet (common in dev on-demand compile).
 */
export function importWithRetry<T>(importFn: () => Promise<T>, retries = 3, delayMs = 750): Promise<T> {
    return importFn().catch(async (error: unknown) => {
        if (!isChunkLoadFailure(error) || retries <= 0) {
            throw error;
        }
        await wait(delayMs);
        return importWithRetry(importFn, retries - 1, Math.min(delayMs * 1.5, 3000));
    });
}
