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

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { Server } from '@/types/server';
import { useSession } from '@/contexts/SessionContext';
import PermissionsClass from '@/lib/permissions';

interface ServerContextType {
    server: Server | null;
    loading: boolean;
    error: Error | null;
    refreshServer: () => Promise<void>;
    hasPermission: (permission: string) => boolean;
}

export const ServerContext = createContext<ServerContextType | undefined>(undefined);

interface ServerProviderProps {
    children: ReactNode;
    uuidShort: string;
    initialServer?: Server | null;
}

export function ServerProvider({ children, uuidShort, initialServer }: ServerProviderProps) {
    const [server, setServer] = useState<Server | null>(initialServer || null);
    const [loading, setLoading] = useState(!initialServer);
    const [error, setError] = useState<Error | null>(null);
    const { user: sessionUser, hasPermission: hasGlobalPermission } = useSession();

    const fetchServer = useCallback(async () => {
        if (!uuidShort) return;

        // If we already have data and this is just a re-validation, don't set loading to true effectively
        // But if we have no data, we must show loading
        if (!server) {
            setLoading(true);
        }

        try {
            const { data } = await axios.get<{ success: boolean; data: Server }>(`/api/user/servers/${uuidShort}`);

            if (data.success) {
                setServer(data.data);
                setError(null);
            }
        } catch (err) {
            console.error('Failed to fetch server:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [uuidShort, server]);

    // Initial fetch if no initial data provided or if uuidShort changes
    useEffect(() => {
        if (!initialServer) {
            fetchServer();
        } else {
            // If initialServer provided (e.g. from SSR), ensure we set it
            // This handles if uuidShort changes and we get new initialServer from parent
            setServer(initialServer);
            setLoading(false);
        }
    }, [uuidShort, initialServer, fetchServer]);

    const hasPermission = useCallback(
        (permission: string): boolean => {
            // 1. Global Admin gets everything
            if (hasGlobalPermission(PermissionsClass.ADMIN_ROOT)) return true;

            if (!server || !sessionUser) return false;

            // 2. Server Owner gets everything
            if (String(server.owner_id) === String(sessionUser.id)) return true;

            // 3. Subuser Permissions (including wildcard check)
            if (server.is_subuser && server.subuser_permissions) {
                return server.subuser_permissions.includes('*') || server.subuser_permissions.includes(permission);
            }

            return false;
        },
        [server, sessionUser, hasGlobalPermission],
    );

    return (
        <ServerContext.Provider
            value={{
                server,
                loading,
                error,
                refreshServer: fetchServer,
                hasPermission,
            }}
        >
            {children}
        </ServerContext.Provider>
    );
}

export function useServer() {
    const context = useContext(ServerContext);
    if (context === undefined) {
        throw new Error('useServer must be used within a ServerProvider');
    }
    return context;
}
