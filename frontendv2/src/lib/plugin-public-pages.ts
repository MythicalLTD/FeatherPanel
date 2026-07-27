/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

import { cache } from 'react';
import { getBaseUrl } from '@/lib/settings-api';
import type { PluginPublicPage } from '@/types/plugin-public-pages';

async function fetchPluginPublicPages(): Promise<PluginPublicPage[]> {
    try {
        const baseUrl = getBaseUrl();
        const res = await fetch(`${baseUrl}/api/system/plugin-public-pages`, {
            next: { revalidate: 30, tags: ['plugin-public-pages'] },
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });

        if (!res.ok) {
            return [];
        }

        const data = await res.json();
        if (!data?.success || !Array.isArray(data?.data?.pages)) {
            return [];
        }

        return data.data.pages as PluginPublicPage[];
    } catch {
        return [];
    }
}

export const getPluginPublicPages = cache(fetchPluginPublicPages);

export async function findPluginPublicPage(pathname: string): Promise<PluginPublicPage | null> {
    const normalized = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    const pages = await getPluginPublicPages();
    return pages.find((page) => page.path === normalized) ?? null;
}
