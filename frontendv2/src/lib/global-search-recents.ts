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

import type { GlobalSearchCategory, GlobalSearchResult } from '@/lib/global-search';

/** What we keep about a picked result. Icons are re-derived from the category. */
export interface RecentSearchEntry {
    id: string;
    title: string;
    subtitle?: string;
    href: string;
    category: GlobalSearchCategory;
    at: number;
}

const MAX_RECENTS = 8;
/** Staff-only categories: dropped from recents when the user can no longer open the admin area. */
export const ADMIN_RECENT_CATEGORIES: GlobalSearchCategory[] = ['admin', 'adminSettings', 'users', 'nodes'];

function storageKey(userUuid: string): string {
    return `fp-search-recents:${userUuid}`;
}

export function loadRecentSearches(userUuid: string | undefined): RecentSearchEntry[] {
    if (!userUuid || typeof window === 'undefined') return [];
    try {
        const raw = JSON.parse(window.localStorage.getItem(storageKey(userUuid)) ?? '[]');
        if (!Array.isArray(raw)) return [];
        return raw
            .filter(
                (entry): entry is RecentSearchEntry =>
                    entry &&
                    typeof entry.id === 'string' &&
                    typeof entry.title === 'string' &&
                    typeof entry.href === 'string' &&
                    entry.href.startsWith('/') &&
                    !entry.href.startsWith('//'),
            )
            .slice(0, MAX_RECENTS);
    } catch {
        return [];
    }
}

export function saveRecentSearch(userUuid: string | undefined, result: GlobalSearchResult): RecentSearchEntry[] {
    if (!userUuid || typeof window === 'undefined' || result.action || !result.href.startsWith('/')) {
        return loadRecentSearches(userUuid);
    }
    const category = result.category === 'recent' || result.category === 'currentContext' ? 'pages' : result.category;
    const entry: RecentSearchEntry = {
        id: result.id.replace(/^recent:/, ''),
        title: result.title,
        subtitle: result.subtitle,
        href: result.href,
        category,
        at: Date.now(),
    };
    const next = [entry, ...loadRecentSearches(userUuid).filter((item) => item.href !== entry.href)].slice(
        0,
        MAX_RECENTS,
    );
    try {
        window.localStorage.setItem(storageKey(userUuid), JSON.stringify(next));
    } catch {
        // Storage full or blocked: recents are a convenience only.
    }
    return next;
}

export function clearRecentSearches(userUuid: string | undefined): void {
    if (!userUuid || typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(storageKey(userUuid));
    } catch {
        // ignore
    }
}
