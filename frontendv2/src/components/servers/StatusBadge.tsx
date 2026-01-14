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

import { cn } from '@/lib/utils';
import { getStatusDotColor } from '@/lib/server-utils';

interface StatusBadgeProps {
    status: string;
    t?: (key: string) => string;
}

export function StatusBadge({ status, t }: StatusBadgeProps) {
    const colors = {
        running: 'bg-green-500/10 text-green-600 border-green-500/20',
        stopped: 'bg-red-500/10 text-red-600 border-red-500/20',
        starting: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        stopping: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    };

    const displayStatus = t ? t(`servers.status.${status}`) : status;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full border',
                colors[status as keyof typeof colors] || colors.stopped,
            )}
        >
            <span className={cn('h-2 w-2 rounded-full', getStatusDotColor(status))} />
            {displayStatus}
        </span>
    );
}
