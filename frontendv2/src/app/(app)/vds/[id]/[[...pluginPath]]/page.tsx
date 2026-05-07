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

import { use, useEffect } from 'react';
import PluginPage from '@/components/dashboard/PluginPage';
import VdsConsolePage from '../VdsConsolePage';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

export default function VdsPluginPage({ params }: { params: Promise<{ id: string; pluginPath?: string[] }> }) {
    const { id, pluginPath } = use(params);
    const { fetchWidgets, getWidgets } = usePluginWidgets('vds-plugin-page');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    if (!pluginPath || pluginPath.length === 0) {
        return (
            <>
                <WidgetRenderer widgets={getWidgets('vds-plugin-page', 'top-of-page')} />
                <VdsConsolePage />
                <WidgetRenderer widgets={getWidgets('vds-plugin-page', 'bottom-of-page')} />
            </>
        );
    }

    return (
        <>
            <WidgetRenderer widgets={getWidgets('vds-plugin-page', 'top-of-page')} />
            <PluginPage context='vds' vdsId={id} />
            <WidgetRenderer widgets={getWidgets('vds-plugin-page', 'bottom-of-page')} />
        </>
    );
}
