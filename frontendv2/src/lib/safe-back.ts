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
 * Infer a safe in-panel parent path for Cancel / Go back.
 *
 * Never use browser history for these actions — after visiting an external site
 * (or opening a bookmarked panel URL), history.back() can leave the panel.
 */
export function inferParentPath(pathname: string): string {
    const path = (pathname.split('?')[0] || '/').replace(/\/+$/, '') || '/';
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return '/dashboard';

    const last = segments[segments.length - 1]!;

    if (last === 'new' || last === 'create') {
        segments.pop();
        return segments.length ? `/${segments.join('/')}` : '/dashboard';
    }

    if (last === 'edit') {
        segments.pop();
        if (segments.length >= 1) {
            const maybeId = segments[segments.length - 1]!;
            // Keep known collection/page segments; drop resource ids / identifiers.
            if (!STATIC_PAGE_SEGMENTS.has(maybeId)) {
                segments.pop();
            }
        }
        return segments.length ? `/${segments.join('/')}` : '/dashboard';
    }

    // /schedules/:id/tasks → /schedules
    if (last === 'tasks' && segments.length >= 2) {
        segments.pop();
        segments.pop();
        return segments.length ? `/${segments.join('/')}` : '/dashboard';
    }

    segments.pop();
    return segments.length ? `/${segments.join('/')}` : '/dashboard';
}

type RouterLike = { push: (href: string) => void };

/**
 * Navigate to an in-panel fallback instead of history.back().
 * Uses the current pathname (or an explicit fallback) so Cancel never leaves the app.
 */
export function safeBack(router: RouterLike, fallback?: string): void {
    if (fallback) {
        router.push(fallback);
        return;
    }
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';
    router.push(inferParentPath(pathname));
}

/** Path segments that are real pages/collections, not resource ids. */
const STATIC_PAGE_SEGMENTS = new Set([
    'files',
    'schedules',
    'users',
    'databases',
    'backups',
    'network',
    'startup',
    'settings',
    'activity',
    'console',
    'proxy',
    'firewall',
    'fastdl',
    'import',
    'subdomains',
    'lifecycle-hooks',
    'nodes',
    'servers',
    'plugins',
    'articles',
    'vds-nodes',
    'roles',
    'tickets',
    'spells',
    'locations',
    'allocations',
    'knowledgebase',
    'dev',
    'admin',
    'dashboard',
    'server',
    'vds',
    'account',
    'mail',
    'api-keys',
    'ssh-keys',
    'profile',
]);
