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

/**
 * Returns the title of the navigation item whose URL is the longest prefix of `pathname`
 * (children included), or null when nothing matches. `ignoreUrls` skips section roots whose
 * title is not a good page label (e.g. `/dashboard`, titled with the panel name).
 */
export function resolveNavigationTitle(
    pathname: string,
    items: NavigationItem[],
    ignoreUrls: readonly string[] = [],
): string | null {
    let best: { len: number; title: string } | null = null;
    const visit = (list: NavigationItem[]) => {
        for (const item of list) {
            const url = item.url?.split('?')[0]?.replace(/\/+$/, '');
            if (url && !ignoreUrls.includes(url) && (pathname === url || pathname.startsWith(url + '/'))) {
                if (!best || url.length > best.len) best = { len: url.length, title: item.title || item.name };
            }
            if (item.children?.length) visit(item.children);
        }
    };
    visit(items);
    return (best as { len: number; title: string } | null)?.title ?? null;
}
