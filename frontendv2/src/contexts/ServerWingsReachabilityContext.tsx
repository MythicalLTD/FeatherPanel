/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    10|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useServer } from '@/contexts/ServerContext';
import { useWingsWebSocket } from '@/hooks/useWingsWebSocket';

type WingsReachabilityStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'idle';

interface ServerWingsReachabilityContextValue {
    connectionStatus: WingsReachabilityStatus;
    canConnect: boolean;
    isNodeUnreachable: boolean;
}

const ServerWingsReachabilityContext = createContext<ServerWingsReachabilityContextValue>({
    connectionStatus: 'idle',
    canConnect: false,
    isNodeUnreachable: false,
});

export function useServerWingsReachability() {
    return useContext(ServerWingsReachabilityContext);
}

export function ServerWingsReachabilityProvider({ children }: { children: ReactNode }) {
    const { server, loading, hasPermission } = useServer();
    const isSuspended = server?.suspended === 1 || server?.status === 'suspended';
    const canConnect = Boolean(server && !loading && !isSuspended && hasPermission('websocket.connect'));

    const { connectionStatus } = useWingsWebSocket({
        serverUuid: server?.uuidShort || '',
        connect: canConnect,
    });

    const value = useMemo<ServerWingsReachabilityContextValue>(() => {
        const status: WingsReachabilityStatus = canConnect ? connectionStatus : 'idle';
        return {
            connectionStatus: status,
            canConnect,
            isNodeUnreachable: canConnect && (connectionStatus === 'disconnected' || connectionStatus === 'error'),
        };
    }, [canConnect, connectionStatus]);

    return <ServerWingsReachabilityContext.Provider value={value}>{children}</ServerWingsReachabilityContext.Provider>;
}
