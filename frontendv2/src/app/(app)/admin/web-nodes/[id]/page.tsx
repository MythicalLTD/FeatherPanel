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

import { redirect } from 'next/navigation';

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function WebNodeRedirectPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const query = await searchParams;
    const tab = typeof query.tab === 'string' ? query.tab : undefined;
    const target = tab ? `/admin/web-nodes/${id}/edit?tab=${encodeURIComponent(tab)}` : `/admin/web-nodes/${id}/edit`;
    redirect(target);
}
