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

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import PermissionsClass from '@/lib/permissions';

export interface UserInfo {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    role_id?: number;
    role?: {
        name: string;
        display_name: string;
        color: string;
    };
    avatar: string;
    uuid: string;
    two_fa_enabled: string;
    last_seen: string;
    first_seen: string;
    ticket_signature?: string;
    discord_oauth2_linked?: string;
    discord_oauth2_name?: string;
}

export type PermissionsList = string[];

interface SessionContextType {
    user: UserInfo | null;
    permissions: PermissionsList;
    isLoading: boolean;
    isSessionChecked: boolean;
    fetchSession: (force?: boolean) => Promise<boolean>;
    refreshSession: () => Promise<boolean>;
    clearSession: () => void;
    logout: () => Promise<void>;
    hasPermission: (permission: string) => boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [permissions, setPermissions] = useState<PermissionsList>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSessionChecked, setIsSessionChecked] = useState(false);
    const router = useRouter();

    const fetchSession = useCallback(
        async (force = false): Promise<boolean> => {
            if (!force && isSessionChecked && user) {
                return true;
            }

            try {
                const res = await axios.get('/api/user/session');

                if (
                    res.data &&
                    res.data.success === true &&
                    res.data.error === false &&
                    res.data.data &&
                    res.data.data.user_info &&
                    typeof res.data.data.user_info === 'object'
                ) {
                    setUser(res.data.data.user_info as UserInfo);
                    setPermissions((res.data.data.permissions as PermissionsList) || []);
                    setIsSessionChecked(true);
                    setIsLoading(false);
                    return true;
                } else {
                    console.error('Invalid session response:', res.data);
                    clearSession();
                    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
                        router.push('/auth/login');
                    }
                    setIsSessionChecked(true);
                    setIsLoading(false);
                    return false;
                }
            } catch (error) {
                const axiosError = error as AxiosError<{ error_code?: string; error_message?: string }>;
                const errorCode = axiosError?.response?.data?.error_code;
                if (errorCode === 'INVALID_ACCOUNT_TOKEN' || axiosError?.response?.status === 401) {
                    clearSession();
                    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
                        router.push('/auth/login');
                    }
                }
                setIsSessionChecked(true);
                setIsLoading(false);
                return false;
            }
        },
        [isSessionChecked, user, router],
    );

    const refreshSession = async (): Promise<boolean> => {
        setIsSessionChecked(false);
        return await fetchSession(true);
    };

    const clearSession = () => {
        setUser(null);
        setIsSessionChecked(false);
        setPermissions([]);
    };

    const logout = async () => {
        try {
            try {
                await axios.delete('/api/user/auth/logout');
            } catch (error) {
                console.error('Error calling logout endpoint:', error);
            }
            clearSession();
        } catch (error) {
            console.error('Error during logout:', error);
        } finally {
            router.push('/auth/logout');
        }
    };

    const hasPermission = (permission: string): boolean => {
        if (!permissions) return false;
        if (permissions.includes(PermissionsClass.ADMIN_ROOT)) return true;
        return permissions.includes(permission);
    };

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    return (
        <SessionContext.Provider
            value={{
                user,
                permissions,
                isLoading,
                isSessionChecked,
                fetchSession,
                refreshSession,
                clearSession,
                logout,
                hasPermission,
            }}
        >
            {children}
        </SessionContext.Provider>
    );
}

export function useSession() {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within SessionProvider');
    }
    return context;
}
