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
import ApiKeysTab from '@/components/account/ApiKeysTab';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

export default function CloudManagementPage() {
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-api-keys');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    return (
        <>
            <WidgetRenderer widgets={getWidgets('admin-api-keys', 'top-of-page')} />
            <ApiKeysTab slug='admin-api-keys' />
            <WidgetRenderer widgets={getWidgets('admin-api-keys', 'bottom-of-page')} />
        </>
    );
}
