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

import { getCurrentServerUuidShort, getServerRouteId } from '@/lib/server-switch';
import { getCurrentWebSpaceUuidShort, getWebSpaceRouteId } from '@/lib/webspace-switch';
import type { ScopedEntityKind } from '@/lib/global-search';
import type { Server } from '@/types/server';
import type { WebSpace } from '@/types/webspace';
import type { VmInstance } from '@/lib/vms-api';

export type GlobalSearchEntityContext = {
    kind: ScopedEntityKind;
    routeId: string;
    entityKey: string;
    entityName: string;
};

export function getCurrentVdsId(pathname: string): string | null {
    if (!pathname.startsWith('/vds/')) return null;
    const segment = pathname.split('/')[2];
    return segment || null;
}

export function resolveGlobalSearchEntityContext(
    pathname: string,
    servers: Server[],
    webspaces: WebSpace[],
    vms: VmInstance[],
): GlobalSearchEntityContext | null {
    const webspaceRouteId = getCurrentWebSpaceUuidShort(pathname);
    if (webspaceRouteId) {
        const webspace = webspaces.find((item) => getWebSpaceRouteId(item) === webspaceRouteId);
        if (webspace) {
            return {
                kind: 'webspace',
                routeId: webspaceRouteId,
                entityKey: webspace.uuid,
                entityName: webspace.name,
            };
        }
    }

    const serverRouteId = getCurrentServerUuidShort(pathname);
    if (serverRouteId) {
        const server = servers.find((item) => getServerRouteId(item) === serverRouteId);
        if (server) {
            return {
                kind: 'server',
                routeId: serverRouteId,
                entityKey: server.uuid,
                entityName: server.name,
            };
        }
    }

    const vdsId = getCurrentVdsId(pathname);
    if (vdsId) {
        const vm = vms.find((item) => String(item.id) === vdsId);
        if (vm) {
            return {
                kind: 'vds',
                routeId: vdsId,
                entityKey: String(vm.id),
                entityName: vm.hostname || `VM ${vm.vmid}`,
            };
        }
    }

    return null;
}
