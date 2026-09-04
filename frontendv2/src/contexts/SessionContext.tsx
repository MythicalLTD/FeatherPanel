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

import { createContext, useContext, useEffect, useLayoutEffect, useState, ReactNode, useCallback, useRef } from 'react';
import type { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PermissionsClass from '@/lib/permissions';
import { getCachedPluginPublicPages } from '@/hooks/usePluginPublicPages';
import { isCloudflareChallengeAxios, isCloudflareChallengeResponseData } from '@/lib/cloudflare-challenge';

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
        custom_badge?: string | null;
        badge_icon?: string | null;
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
    oidc_provider?: string | null;
    oidc_subject?: string | null;
    oidc_email?: string | null;
    ldap_provider_uuid?: string | null;
    ldap_dn?: string | null;
}

export type PermissionsList = string[];

export interface AdminTicketStats {
    open_count: number;
    has_open_tickets: boolean;
}

interface SessionContextType {
    user: UserInfo | null;
    permissions: PermissionsList;
    adminTicketStats: AdminTicketStats | null;
    isLoading: boolean;
    isSessionChecked: boolean;
    fetchSession: (force?: boolean) => Promise<boolean>;
    refreshSession: () => Promise<boolean>;
    clearSession: () => void;
    logout: () => Promise<void>;
    hasPermission: (permission: string) => boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const SESSION_CACHE_KEY = 'fp:session:snapshot:v1';

type SessionSnapshot = {
    user: UserInfo;
    permissions: PermissionsList;
};

function readCachedSession(): SessionSnapshot | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        const snap = parsed as SessionSnapshot;
        if (!snap.user || typeof snap.user.username !== 'string' || typeof snap.user.uuid !== 'string') return null;
        if (!Array.isArray(snap.permissions)) return null;
        return snap;
    } catch {
        return null;
    }
}

function writeCachedSession(user: UserInfo | null, permissions: PermissionsList = []) {
    if (typeof window === 'undefined') return;
    try {
        if (!user) {
            sessionStorage.removeItem(SESSION_CACHE_KEY);
            return;
        }
        sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ user, permissions } satisfies SessionSnapshot));
    } catch {
        // ignore quota / private mode
    }
}

function normalizePathname(pathname: string): string {
    if (pathname.length > 1 && pathname.endsWith('/')) {
        return pathname.slice(0, -1);
    }
    return pathname;
}

function isCorePublicNoAuthRoute(pathname: string): boolean {
    return (
        pathname === '/status' ||
        pathname.startsWith('/status/') ||
        pathname === '/knowledgebase' ||
        pathname.startsWith('/knowledgebase/') ||
        pathname === '/knowladgebase' ||
        pathname.startsWith('/knowladgebase/')
    );
}

export function SessionProvider({ children }: { children: ReactNode }) {
    // Start empty on server + first client hydrate so markup matches; hydrate cache before paint.
    const [user, setUser] = useState<UserInfo | null>(null);
    const [permissions, setPermissions] = useState<PermissionsList>([]);
    const [adminTicketStats, setAdminTicketStats] = useState<AdminTicketStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSessionChecked, setIsSessionChecked] = useState(false);
    const [pluginPublicPaths, setPluginPublicPaths] = useState<string[]>([]);
    const [pluginPathsLoaded, setPluginPathsLoaded] = useState(false);
    const router = useRouter();
    // Ignore out-of-order session responses (e.g. guest probe finishing after login refresh).
    const fetchGenerationRef = useRef(0);

    useLayoutEffect(() => {
        const cached = readCachedSession();
        if (!cached) return;
        setUser(cached.user);
        setPermissions(cached.permissions);
        setIsSessionChecked(true);
        setIsLoading(false);
    }, []);

    const isPublicNoAuthRoute = useCallback(
        (pathname: string): boolean => {
            if (isCorePublicNoAuthRoute(pathname)) {
                return true;
            }

            const normalized = normalizePathname(pathname);
            return pluginPublicPaths.some((path) => normalized === path || normalized.startsWith(path + '/'));
        },
        [pluginPublicPaths],
    );

    const fetchSession = useCallback(
        async (force = false): Promise<boolean> => {
            if (typeof window !== 'undefined' && isPublicNoAuthRoute(window.location.pathname)) {
                setIsSessionChecked(true);
                setIsLoading(false);
                return false;
            }

            if (!force && isSessionChecked && user) {
                return true;
            }

            const generation = ++fetchGenerationRef.current;

            try {
                const res = await api.get('/user/session');

                if (generation !== fetchGenerationRef.current) {
                    return false;
                }

                // Cloudflare Under Attack / Precursor can return HTML instead of JSON.
                // Do not wipe the session or treat the user as a guest.
                if (isCloudflareChallengeAxios(res) || isCloudflareChallengeResponseData(res.data)) {
                    console.warn('Session fetch blocked by Cloudflare challenge; preserving local session state');
                    setIsSessionChecked(true);
                    setIsLoading(false);
                    return false;
                }

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
                    writeCachedSession(
                        res.data.data.user_info as UserInfo,
                        (res.data.data.permissions as PermissionsList) || [],
                    );
                    setAdminTicketStats((res.data.data.admin_ticket_stats as AdminTicketStats | undefined) ?? null);
                    setIsSessionChecked(true);
                    setIsLoading(false);
                    return true;
                } else {
                    console.error('Invalid session response:', res.data);
                    clearSession();
                    if (
                        typeof window !== 'undefined' &&
                        !window.location.pathname.startsWith('/auth') &&
                        !isPublicNoAuthRoute(window.location.pathname)
                    ) {
                        const redirect = `${window.location.pathname}${window.location.search}`;
                        router.push(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
                    }
                    setIsSessionChecked(true);
                    setIsLoading(false);
                    return false;
                }
            } catch (error) {
                if (generation !== fetchGenerationRef.current) {
                    return false;
                }

                if (isCloudflareChallengeAxios(error)) {
                    console.warn('Session fetch blocked by Cloudflare challenge; retrying once after clearance');
                    try {
                        await new Promise((resolve) => setTimeout(resolve, 1500));
                        const retry = await api.get('/user/session');
                        if (generation !== fetchGenerationRef.current) {
                            return false;
                        }
                        if (
                            !isCloudflareChallengeAxios(retry) &&
                            !isCloudflareChallengeResponseData(retry.data) &&
                            retry.data?.success === true &&
                            retry.data?.data?.user_info &&
                            typeof retry.data.data.user_info === 'object'
                        ) {
                            setUser(retry.data.data.user_info as UserInfo);
                            setPermissions((retry.data.data.permissions as PermissionsList) || []);
                            writeCachedSession(
                                retry.data.data.user_info as UserInfo,
                                (retry.data.data.permissions as PermissionsList) || [],
                            );
                            setAdminTicketStats(
                                (retry.data.data.admin_ticket_stats as AdminTicketStats | undefined) ?? null,
                            );
                            setIsSessionChecked(true);
                            setIsLoading(false);
                            return true;
                        }
                    } catch {
                        // Fall through keep existing session if any.
                    }
                    if (generation !== fetchGenerationRef.current) {
                        return false;
                    }
                    setIsSessionChecked(true);
                    setIsLoading(false);
                    return false;
                }

                const axiosError = error as AxiosError<{ error_code?: string; error_message?: string }>;
                const errorCode = axiosError?.response?.data?.error_code;
                const onAuthPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/auth');
                if (
                    errorCode === 'INVALID_ACCOUNT_TOKEN' ||
                    errorCode === 'USER_BANNED' ||
                    axiosError?.response?.status === 401
                ) {
                    // On auth pages a failed probe is expected for guests. Clearing here can
                    // race with a just-completed login refresh and wipe the hydrated user.
                    if (!onAuthPage) {
                        clearSession();
                        if (!isPublicNoAuthRoute(window.location.pathname)) {
                            const redirect = `${window.location.pathname}${window.location.search}`;
                            router.push(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
                        }
                    }
                }
                setIsSessionChecked(true);
                setIsLoading(false);
                return false;
            }
        },
        [isSessionChecked, user, router, isPublicNoAuthRoute],
    );

    const refreshSession = async (): Promise<boolean> => {
        setIsSessionChecked(false);
        return await fetchSession(true);
    };

    const clearSession = () => {
        setUser(null);
        writeCachedSession(null);
        setIsSessionChecked(false);
        setPermissions([]);
        setAdminTicketStats(null);
    };

    const logout = async () => {
        try {
            try {
                await api.delete('/user/auth/logout');
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
        let cancelled = false;

        (async () => {
            const pages = await getCachedPluginPublicPages();
            if (!cancelled) {
                setPluginPublicPaths(pages.filter((page) => page.enabled).map((page) => normalizePathname(page.path)));
                setPluginPathsLoaded(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && isCorePublicNoAuthRoute(window.location.pathname)) {
            setIsSessionChecked(true);
            setIsLoading(false);
            return;
        }

        // Wait for plugin public-page registry before deciding auth redirects.
        if (!pluginPathsLoaded) {
            return;
        }

        if (typeof window !== 'undefined' && isPublicNoAuthRoute(window.location.pathname)) {
            setIsSessionChecked(true);
            setIsLoading(false);
            return;
        }

        fetchSession(true);
    }, [fetchSession, isPublicNoAuthRoute, pluginPathsLoaded]);

    return (
        <SessionContext.Provider
            value={{
                user,
                permissions,
                adminTicketStats,
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
