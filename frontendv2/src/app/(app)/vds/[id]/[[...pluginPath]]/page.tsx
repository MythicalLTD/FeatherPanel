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

import { use } from 'react';
import PluginPage from '@/components/dashboard/PluginPage';
import VdsConsolePage from '../VdsConsolePage';

export default function VdsPluginPage({ params }: { params: Promise<{ id: string; pluginPath?: string[] }> }) {
    const { id, pluginPath } = use(params);

    if (!pluginPath || pluginPath.length === 0) {
        return <VdsConsolePage />;
    }

    return <PluginPage context='vds' vdsId={id} />;
}
