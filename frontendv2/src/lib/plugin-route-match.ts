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

/**
 * Match a pathname against a UI pack route pattern.
 * Supports `:param` segments (e.g. `/server/:uuidShort/console`).
 */
export function matchPluginRoute(pattern: string, pathname: string): boolean {
    const normPath = pathname.replace(/\/+$/, '') || '/';
    const normPattern = pattern.replace(/\/+$/, '') || '/';
    if (normPattern === normPath) {
        return true;
    }

    const patternParts = normPattern.split('/').filter(Boolean);
    const pathParts = normPath.split('/').filter(Boolean);
    if (patternParts.length !== pathParts.length) {
        return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
        const pp = patternParts[i];
        const vp = pathParts[i];
        if (pp.startsWith(':')) {
            continue;
        }
        if (pp !== vp) {
            return false;
        }
    }
    return true;
}
