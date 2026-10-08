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

import { formatWebSpaceBytes } from '@/lib/webspace-settings-utils';

export function WebSpaceUsageBar({
    used,
    limit,
    label,
}: {
    used?: number | null;
    limit?: number | null;
    label: string;
}) {
    const pct = used != null && limit && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
    return (
        <div className='space-y-1'>
            <div className='flex justify-between text-xs'>
                <span className='text-muted-foreground'>{label}</span>
                <span>
                    {formatWebSpaceBytes(used)} / {formatWebSpaceBytes(limit)}
                </span>
            </div>
            <div className='bg-muted h-2 overflow-hidden rounded-full'>
                <div className='bg-primary h-full transition-all' style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
