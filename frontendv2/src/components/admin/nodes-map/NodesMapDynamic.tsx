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

import dynamic from 'next/dynamic';
import type { NodesMapNode } from './NodesMap';

export const NodesMapDynamic = dynamic(
    () => import('./NodesMap').then((m) => m.NodesMap),
    {
        ssr: false,
        loading: () => (
            <div className='fp-surface bg-muted/30 h-[280px] animate-pulse rounded-xl border sm:h-[360px]' />
        ),
    },
);

export type { NodesMapNode };
