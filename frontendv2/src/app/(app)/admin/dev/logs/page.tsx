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

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

/**
 * Redirect /admin/dev/logs to /admin/logs (canonical logs page).
 */
export default function DevLogsRedirectPage() {
    const router = useRouter();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-dev-logs-redirect');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        router.replace('/admin/logs');
    }, [router]);
    return (
        <>
            <WidgetRenderer widgets={getWidgets('admin-dev-logs-redirect', 'top-of-page')} />
            <WidgetRenderer widgets={getWidgets('admin-dev-logs-redirect', 'bottom-of-page')} />
        </>
    );
}
