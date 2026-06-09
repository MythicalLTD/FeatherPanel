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

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { cn } from '@/lib/utils';
import { useNavbarHoverReveal } from '@/hooks/useNavbarHoverReveal';
import { useChromeLayout } from '@/hooks/useChromeLayout';
import { NavbarHoverDock } from '@/components/layout/NavbarHoverDock';
import BackgroundWrapper from '@/components/theme/BackgroundWrapper';
import { ConfiguredLinks } from '@/components/branding/ConfiguredLinks';
import { AdminOpenTicketsBanner } from '@/components/dashboard/AdminOpenTicketsBanner';

import { usePluginRoutes, getPluginPaths } from '@/hooks/usePluginRoutes';

const SIDEBAR_COLLAPSED_KEY = 'featherpanel_sidebar_collapsed';

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        try {
            return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
        } catch {
            return false;
        }
    });

    const pluginData = usePluginRoutes();
    const pluginPaths = getPluginPaths(pluginData);

    const isActualPluginPage = pluginPaths.some((pluginPath) => {
        if (pathname.startsWith('/server/')) {
            const uuid = pathname.split('/')[2];
            if (uuid) {
                let cleanPluginPath = pluginPath;
                if (cleanPluginPath.startsWith('/server')) {
                    cleanPluginPath = cleanPluginPath.replace('/server', '');
                }
                if (!cleanPluginPath.startsWith('/')) {
                    cleanPluginPath = '/' + cleanPluginPath;
                }

                const constructedPath = `/server/${uuid}${cleanPluginPath}`;
                return pathname.startsWith(constructedPath);
            }
        }
        return pathname.startsWith(pluginPath);
    });

    const isFullWidthMode = isActualPluginPage;
    const isImmersiveRoute = pathname.includes('/files/ide');
    const hideAppChrome = isImmersiveRoute;
    const useFullBleedLayout = isFullWidthMode || isImmersiveRoute;

    const pathSegments = (pathname || '').split('/').filter(Boolean);
    const isServerConsoleHome = pathSegments.length === 2 && pathSegments[0] === 'server' && Boolean(pathSegments[1]);
    const isTicketDetailPage =
        pathSegments.length === 3 &&
        (pathSegments[0] === 'admin' || pathSegments[0] === 'dashboard') &&
        pathSegments[1] === 'tickets' &&
        Boolean(pathSegments[2]);

    const { navbarHoverReveal } = useNavbarHoverReveal();
    const { chromeLayout } = useChromeLayout();
    const navbarHoverDockActive = navbarHoverReveal && chromeLayout === 'modern';

    useEffect(() => {
        setMounted(true);

        const token = getCookie('remember_token');
        if (!token) {
            router.push('/auth/login');
        }
    }, [router]);

    useEffect(() => {
        const syncFromStorage = () => {
            try {
                setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true');
            } catch {
                setSidebarCollapsed(false);
            }
        };

        const handleToggle = (event: Event) => {
            const detail = (event as CustomEvent<boolean>).detail;
            if (typeof detail === 'boolean') {
                setSidebarCollapsed(detail);
                return;
            }
            syncFromStorage();
        };

        const handleStorage = (e: StorageEvent) => {
            if (e.key === SIDEBAR_COLLAPSED_KEY) {
                syncFromStorage();
            }
        };

        syncFromStorage();
        window.addEventListener('toggle-sidebar', handleToggle as EventListener);
        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener('toggle-sidebar', handleToggle as EventListener);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    if (!mounted) {
        return (
            <div className='bg-background flex h-screen items-center justify-center'>
                <div className='border-primary h-12 w-12 animate-spin rounded-full border-2 border-t-transparent' />
            </div>
        );
    }

    return (
        <BackgroundWrapper>
            <div
                className={cn(
                    'motion-content flex min-h-screen flex-col',
                    useFullBleedLayout && 'h-screen overflow-hidden',
                )}
            >
                {!hideAppChrome && <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />}

                <div
                    className={cn(
                        'flex min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-out',
                        !hideAppChrome &&
                            (chromeLayout === 'classic'
                                ? sidebarCollapsed
                                    ? 'lg:pl-16'
                                    : 'lg:pl-64'
                                : sidebarCollapsed
                                  ? 'lg:pl-14'
                                  : 'lg:pl-56'),
                    )}
                >
                    {!hideAppChrome &&
                        (navbarHoverDockActive ? (
                            <NavbarHoverDock>
                                <Navbar onMenuClick={() => setMobileOpen(true)} />
                            </NavbarHoverDock>
                        ) : (
                            <Navbar onMenuClick={() => setMobileOpen(true)} />
                        ))}

                    <main
                        className={cn(
                            'flex min-h-0 flex-1 flex-col',
                            useFullBleedLayout ? 'overflow-hidden p-0' : 'px-3 py-5 sm:px-6 sm:py-6 lg:px-8',
                        )}
                    >
                        <div
                            className={cn(
                                'flex min-h-0 flex-1 flex-col',
                                useFullBleedLayout && 'h-full',
                                !useFullBleedLayout &&
                                    (isServerConsoleHome
                                        ? 'mx-auto w-full max-w-[min(100rem,calc(100vw-1.5rem))] sm:max-w-[min(100rem,calc(100vw-2rem))]'
                                        : isTicketDetailPage
                                          ? 'mx-auto w-full max-w-[min(112rem,calc(100vw-1.5rem))] sm:max-w-[min(112rem,calc(100vw-2rem))]'
                                          : 'mx-auto w-full max-w-7xl'),
                            )}
                        >
                            {!useFullBleedLayout && <AdminOpenTicketsBanner className='mb-5' />}
                            {children}
                            {!useFullBleedLayout ? (
                                <footer className='border-border/40 mt-6 border-t pt-4 pb-2'>
                                    <ConfiguredLinks variant='compact' />
                                </footer>
                            ) : null}
                        </div>
                    </main>
                </div>
            </div>
        </BackgroundWrapper>
    );
}
