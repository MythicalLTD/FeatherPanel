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

import type { NavigationItem } from '@/types/navigation';

export type Breadcrumb = { label: string; href?: string; kind: 'root' | 'section' | 'item' | 'segment' };

type T = (key: string) => string;

/**
 * Static path words used below a sidebar item in admin routes. Anything not listed here is a
 * route parameter (id, uuid, slug) and is shown as "Details".
 */
export const BREADCRUMB_SEGMENTS = [
    'create',
    'new',
    'edit',
    'activity',
    'allocations',
    'articles',
    'categories',
    'console',
    'content',
    'databases',
    'destinations',
    'finish',
    'install',
    'issues',
    'languages',
    'logs',
    'management',
    'marketplace',
    'nodes',
    'plugins',
    'policies',
    'priorities',
    'products',
    'runs',
    'servers',
    'spells',
    'status',
    'statuses',
    'suggestions',
    'system',
    'tickets',
    'translations',
    'users',
    'vds',
    'infrastructure',
    'knowledgebase',
    'dev',
    'feathercloud',
    'hosting-packages',
] as const;

const SEGMENT_SET = new Set<string>(BREADCRUMB_SEGMENTS);

function flatten(items: NavigationItem[]): NavigationItem[] {
    return items.flatMap((item) => [item, ...(item.children ? flatten(item.children) : [])]);
}

function pathOf(url: string): string {
    return url.split(/[?#]/)[0].replace(/\/+$/, '');
}

function groupLabel(group: string | undefined, t: T): string | null {
    if (!group) return null;
    const key = `navigation.groups.${group}`;
    const label = t(key);
    return label === key ? group.charAt(0).toUpperCase() + group.slice(1) : label;
}

/** Admin › Section › Item › trailing segments. Empty for paths outside /admin/. */
export function buildAdminBreadcrumbs(pathname: string, items: NavigationItem[], t: T): Breadcrumb[] {
    const path = pathOf(pathname);
    if (!path.startsWith('/admin/')) return [];

    const crumbs: Breadcrumb[] = [{ label: t('breadcrumbs.admin'), href: '/admin', kind: 'root' }];

    // Deepest sidebar entry whose URL is this path or a parent of it ("/admin" itself never counts).
    let match: NavigationItem | null = null;
    let matchPath = '';
    for (const item of flatten(items)) {
        if (!item.url || item.openInNewTab || /^https?:/i.test(item.url)) continue;
        const p = pathOf(item.url);
        if (p === '/admin' || !p.startsWith('/admin/')) continue;
        if ((path === p || path.startsWith(p + '/')) && p.length > matchPath.length) {
            match = item;
            matchPath = p;
        }
    }

    let rest: string[];
    if (match) {
        const section = groupLabel(match.group, t);
        if (section) crumbs.push({ label: section, kind: 'section' });
        crumbs.push({ label: match.title || match.name, href: matchPath, kind: 'item' });
        rest = path.slice(matchPath.length).split('/').filter(Boolean);
    } else {
        rest = path.slice('/admin'.length).split('/').filter(Boolean);
    }

    // Trailing segments are labels only: "/admin/nodes/7" is not a page even though
    // "/admin/nodes/7/edit" is, so linking them would lead to 404s.
    for (const raw of rest) {
        const word = decodeURIComponent(raw).toLowerCase();
        const label = SEGMENT_SET.has(word) ? t(`breadcrumbs.segments.${word}`) : t('breadcrumbs.details');
        // Two ids in a row (e.g. /servers/12/runs/5 -> both "Details") read better as one crumb.
        const prev = crumbs[crumbs.length - 1];
        if (prev.kind === 'segment' && prev.label === label) continue;
        crumbs.push({ label, kind: 'segment' });
    }

    return crumbs;
}
