/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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
            // Prevent multiple simultaneous fetches (unless forced)
            if (!force && isSessionChecked && user) {
                return true;
            }

            try {
                const res = await axios.get('/api/user/session');

                // Validate response structure: must have success: true, data, and user_info
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
                    // Session fetch failed - invalid response structure or success: false
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
                // Check if it's an invalid token error
                const axiosError = error as AxiosError<{ error_code?: string; error_message?: string }>;
                const errorCode = axiosError?.response?.data?.error_code;
                if (errorCode === 'INVALID_ACCOUNT_TOKEN' || axiosError?.response?.status === 401) {
                    // Invalid token - force logout
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
            // Try to call backend logout endpoint
            try {
                await axios.delete('/api/user/auth/logout');
            } catch (error) {
                // Ignore errors during logout call - we'll still clear local session
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

    // Auto-fetch session on mount
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
