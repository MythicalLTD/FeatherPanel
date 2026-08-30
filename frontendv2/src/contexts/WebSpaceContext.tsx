/*
This file is part of FeatherPanel.
 */

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
import { useSession } from '@/contexts/SessionContext';
import PermissionsClass from '@/lib/permissions';
import { WebSpace } from '@/types/webspace';

interface WebSpaceContextType {
    webspace: WebSpace | null;
    loading: boolean;
    error: Error | null;
    refreshWebSpace: () => Promise<void>;
    hasPermission: (permission: string) => boolean;
}

export const WebSpaceContext = createContext<WebSpaceContextType | undefined>(undefined);

interface WebSpaceProviderProps {
    children: ReactNode;
    uuidShort: string;
    initialWebSpace?: WebSpace | null;
}

export function WebSpaceProvider({ children, uuidShort, initialWebSpace }: WebSpaceProviderProps) {
    const [webspace, setWebspace] = useState<WebSpace | null>(initialWebSpace || null);
    const [loading, setLoading] = useState(!initialWebSpace);
    const [error, setError] = useState<Error | null>(null);
    const { user: sessionUser, hasPermission: hasGlobalPermission } = useSession();

    const fetchWebSpace = useCallback(async () => {
        if (!uuidShort) return;
        setLoading(true);
        try {
            const { data } = await axios.get<{ success: boolean; data: { webspace: WebSpace } }>(
                `/api/user/webspaces/${uuidShort}`,
            );
            if (data.success) {
                setWebspace(data.data.webspace);
                setError(null);
            }
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [uuidShort]);

    useEffect(() => {
        if (!initialWebSpace) {
            void fetchWebSpace();
        } else {
            setWebspace(initialWebSpace);
            setLoading(false);
        }
    }, [uuidShort, initialWebSpace, fetchWebSpace]);

    useEffect(() => {
        if (typeof window === 'undefined' || !uuidShort || !webspace) return;

        try {
            const STORAGE_KEY = 'featherpanel_recent_webspaces_v1';
            type RecentEntry = {
                uuidShort: string;
                lastViewedAt: string;
            };

            const existingRaw = window.localStorage.getItem(STORAGE_KEY);
            let existing: RecentEntry[] = [];

            if (existingRaw) {
                try {
                    existing = JSON.parse(existingRaw) as RecentEntry[];
                    if (!Array.isArray(existing)) existing = [];
                } catch {
                    existing = [];
                }
            }

            const filtered = existing.filter((entry) => entry.uuidShort !== uuidShort);
            const updated: RecentEntry[] = [{ uuidShort, lastViewedAt: new Date().toISOString() }, ...filtered].slice(
                0,
                10,
            );

            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to update recent webspaces list', e);
        }
    }, [uuidShort, webspace]);

    useEffect(() => {
        if (typeof document === 'undefined' || !uuidShort) return;
        document.cookie = `webspaceUuid=${encodeURIComponent(uuidShort)}; path=/; max-age=3600; SameSite=Lax; Secure`;
    }, [uuidShort]);

    const hasPermission = useCallback(
        (permission: string): boolean => {
            if (hasGlobalPermission(PermissionsClass.ADMIN_ROOT)) return true;
            if (!webspace || !sessionUser) return false;
            if (String(webspace.owner_id) === String(sessionUser.id) || webspace.is_owner) return true;
            if (webspace.is_subuser && webspace.subuser_permissions) {
                return webspace.subuser_permissions.includes('*') || webspace.subuser_permissions.includes(permission);
            }
            if (
                hasGlobalPermission(PermissionsClass.ADMIN_WEBSPACES_VIEW) ||
                hasGlobalPermission(PermissionsClass.ADMIN_WEBSPACES_EDIT)
            ) {
                return true;
            }
            return false;
        },
        [webspace, sessionUser, hasGlobalPermission],
    );

    return (
        <WebSpaceContext.Provider
            value={{
                webspace,
                loading,
                error,
                refreshWebSpace: fetchWebSpace,
                hasPermission,
            }}
        >
            {children}
        </WebSpaceContext.Provider>
    );
}

export function useWebSpace() {
    const context = useContext(WebSpaceContext);
    if (context === undefined) {
        throw new Error('useWebSpace must be used within a WebSpaceProvider');
    }
    return context;
}
