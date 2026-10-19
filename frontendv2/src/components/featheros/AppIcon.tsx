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

import { cn } from '@/lib/utils';
import { OS_APPS } from './registry';
import type { OsAppId } from './types';

export function AppIcon({ app, size = 48, className }: { app: OsAppId; size?: number; className?: string }) {
    const def = OS_APPS[app];
    const Icon = def.icon;
    return (
        <div
            className={cn(
                'fos-app-icon relative flex shrink-0 items-center justify-center overflow-hidden text-white',
                def.gradient,
                className,
            )}
            style={{ width: size, height: size, borderRadius: size * 0.24 }}
        >
            <Icon className='relative' strokeWidth={1.9} style={{ width: size * 0.46, height: size * 0.46 }} />
        </div>
    );
}
