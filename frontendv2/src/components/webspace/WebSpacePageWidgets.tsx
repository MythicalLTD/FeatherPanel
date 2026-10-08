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

import { useEffect, type ReactNode } from 'react';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

/**
 * Injects plugin widgets above/below a WebSpace page (mirrors server/VDS page slots).
 */
export function WebSpacePageWidgets({ pageId, children }: { pageId: string; children: ReactNode }) {
    const { fetchWidgets, getWidgets } = usePluginWidgets(pageId);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    return (
        <>
            <WidgetRenderer widgets={getWidgets(pageId, 'top-of-page')} />
            {children}
            <WidgetRenderer widgets={getWidgets(pageId, 'bottom-of-page')} />
        </>
    );
}
