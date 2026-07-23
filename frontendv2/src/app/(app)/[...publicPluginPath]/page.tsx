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

import NotFound from '@/components/common/NotFound';
import PublicPluginPage from '@/components/dashboard/PublicPluginPage';
import { findPluginPublicPage } from '@/lib/plugin-public-pages';
import { redirect } from 'next/navigation';

export default async function PublicPluginCatchAllPage({
    params,
}: {
    params: Promise<{ publicPluginPath: string[] }>;
}) {
    const { publicPluginPath } = await params;
    const pathname = '/' + (publicPluginPath?.join('/') ?? '');
    const page = await findPluginPublicPage(pathname);

    if (!page) {
        return <NotFound />;
    }

    if (!page.enabled) {
        redirect(page.fallbackPath || '/auth/login');
    }

    return <PublicPluginPage page={page} />;
}
