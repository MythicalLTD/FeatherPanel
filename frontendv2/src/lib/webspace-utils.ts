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

import type { WebSpace } from '@/types/webspace';

export function displayWebSpaceStatus(webspace: Pick<WebSpace, 'status' | 'state' | 'suspended'>): string {
    if (webspace.suspended === 1 || webspace.status === 'suspended') return 'suspended';
    const lifecycle = webspace.status;
    if (lifecycle && ['installing', 'reinstalling', 'transferring', 'failed'].includes(lifecycle)) {
        return lifecycle;
    }
    return webspace.state || webspace.status || 'stopped';
}

export function getWebSpaceStatusDotColor(status: string): string {
    switch (status) {
        case 'running':
            return 'bg-green-500';
        case 'starting':
        case 'installing':
        case 'reinstalling':
            return 'bg-blue-500';
        case 'stopping':
        case 'transferring':
            return 'bg-yellow-500';
        case 'stopped':
        case 'offline':
            return 'bg-gray-500';
        case 'suspended':
        case 'failed':
        case 'error':
            return 'bg-red-500';
        default:
            return 'bg-muted-foreground';
    }
}

export function isWebSpaceAccessible(webspace: Pick<WebSpace, 'status' | 'suspended'>): boolean {
    return webspace.suspended !== 1 && webspace.status !== 'suspended';
}
