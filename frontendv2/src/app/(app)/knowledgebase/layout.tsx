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

import PublicSiteShell from '@/components/layout/PublicSiteShell';
import { redirect } from 'next/navigation';
import { getPublicPageAccess } from '@/lib/public-page-access';

export default async function PublicKnowledgebaseLayout({ children }: { children: React.ReactNode }) {
    const access = await getPublicPageAccess('knowledgebase');
    if (!access.enabled) {
        redirect(access.fallbackPath);
    }

    return <PublicSiteShell>{children}</PublicSiteShell>;
}
