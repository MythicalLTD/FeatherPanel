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

import PublicSiteShell from '@/components/layout/PublicSiteShell';
import { redirect } from 'next/navigation';
import { findPluginPublicPage } from '@/lib/plugin-public-pages';

export default async function PublicPluginCatchAllLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ publicPluginPath: string[] }>;
}) {
    const { publicPluginPath } = await params;
    const pathname = '/' + (publicPluginPath?.join('/') ?? '');
    const page = await findPluginPublicPage(pathname);

    // Unknown path → plain NotFound without public shell.
    if (!page) {
        return children;
    }

    if (!page.enabled) {
        redirect(page.fallbackPath || '/auth/login');
    }

    return <PublicSiteShell fillViewport>{children}</PublicSiteShell>;
}
