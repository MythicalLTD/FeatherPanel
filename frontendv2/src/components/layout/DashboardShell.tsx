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
import GlobalSearchDialog from '@/components/global-search/GlobalSearchDialog';
import PanelDebugConsole from '@/components/global-search/PanelDebugConsole';
import { GlobalSearchProvider } from '@/contexts/GlobalSearchContext';
import { PanelDebugProvider } from '@/contexts/PanelDebugContext';

import { usePluginRoutes, getPluginPaths } from '@/hooks/usePluginRoutes';

import { readSidebarCollapsed, subscribeSidebarCollapsed } from '@/lib/sidebarChrome';
import { useSidebarPreferences } from '@/hooks/useSidebarPreferences';
import { getShellContentInset } from '@/lib/sidebarLayout';

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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
        typeof window === 'undefined' ? false : readSidebarCollapsed(),
    );

    useEffect(() => {
        setSidebarCollapsed(readSidebarCollapsed());
        return subscribeSidebarCollapsed(setSidebarCollapsed);
    }, []);

    const pluginData = usePluginRoutes();
    const pluginPaths = getPluginPaths(pluginData.data);

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
        if (pathname.startsWith('/webspace/')) {
            const uuid = pathname.split('/')[2];
            if (uuid) {
                let cleanPluginPath = pluginPath;
                if (cleanPluginPath.startsWith('/webspace')) {
                    cleanPluginPath = cleanPluginPath.replace('/webspace', '');
                }
                if (!cleanPluginPath.startsWith('/')) {
                    cleanPluginPath = '/' + cleanPluginPath;
                }

                const constructedPath = `/webspace/${uuid}${cleanPluginPath}`;
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
    const isWebSpaceConsoleHome =
        pathSegments.length === 2 && pathSegments[0] === 'webspace' && Boolean(pathSegments[1]);
    const isTicketDetailPage =
        pathSegments.length === 3 &&
        (pathSegments[0] === 'admin' || pathSegments[0] === 'dashboard') &&
        pathSegments[1] === 'tickets' &&
        Boolean(pathSegments[2]);

    const { navbarHoverReveal } = useNavbarHoverReveal();
    const { chromeLayout } = useChromeLayout();
    const { sidebarPosition, dockDisplay, dockSize } = useSidebarPreferences();
    const navbarHoverDockActive = navbarHoverReveal && chromeLayout === 'modern';

    useEffect(() => {
        const token = getCookie('remember_token');
        if (!token) {
            router.push('/auth/login');
        }
    }, [router]);

    return (
        <GlobalSearchProvider>
            <PanelDebugProvider>
                {/* Outside overflow shells so fixed desktop rail is in first paint (no portal pop-in). */}
                {!hideAppChrome && (
                    <Sidebar
                        mobileOpen={mobileOpen}
                        setMobileOpen={setMobileOpen}
                        pluginFullBleed={useFullBleedLayout}
                    />
                )}
                <BackgroundWrapper fillViewport>
                    <GlobalSearchDialog />
                    <PanelDebugConsole />
                    <div
                        className='motion-content flex min-h-0 flex-1 flex-col overflow-hidden'
                        data-fp-dashboard-shell
                    >
                        <div
                            className={cn(
                                'fp-chrome-motion flex min-h-0 min-w-0 flex-1 flex-col',
                                !hideAppChrome &&
                                    getShellContentInset({
                                        chromeLayout,
                                        sidebarPosition,
                                        sidebarCollapsed,
                                        dockDisplay,
                                        dockSize,
                                    }),
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
                                    'fp-shell-main flex min-h-0 flex-1 flex-col',
                                    useFullBleedLayout
                                        ? 'overflow-hidden p-0'
                                        : 'custom-scrollbar overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 py-5 sm:px-6 sm:py-6 lg:px-8',
                                )}
                            >
                                <div
                                    className={cn(
                                        'flex w-full flex-col',
                                        // Full-bleed consoles need a height-locked flex child.
                                        // Scrollable pages must NOT use min-h-0 or overflow:hidden
                                        // siblings (e.g. ticket banner) get crushed and clipped.
                                        useFullBleedLayout ? 'h-full min-h-0 flex-1' : 'min-h-full flex-1',
                                        !useFullBleedLayout &&
                                            (isServerConsoleHome || isWebSpaceConsoleHome
                                                ? 'mx-auto max-w-[min(100rem,calc(100vw-1.5rem))] sm:max-w-[min(100rem,calc(100vw-2rem))]'
                                                : isTicketDetailPage
                                                  ? 'mx-auto max-w-[min(112rem,calc(100vw-1.5rem))] sm:max-w-[min(112rem,calc(100vw-2rem))]'
                                                  : 'mx-auto max-w-7xl'),
                                    )}
                                >
                                    {!useFullBleedLayout && <AdminOpenTicketsBanner className='mb-5 shrink-0' />}
                                    {children}
                                    {!useFullBleedLayout ? (
                                        <footer className='border-border/40 mt-6 shrink-0 border-t pt-4 pb-2'>
                                            <ConfiguredLinks variant='compact' />
                                        </footer>
                                    ) : null}
                                </div>
                            </main>
                        </div>
                    </div>
                </BackgroundWrapper>
            </PanelDebugProvider>
        </GlobalSearchProvider>
    );
}
