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

import { useState, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ModuleRouteGuard } from '@/components/layout/ModuleRouteGuard';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { cn } from '@/lib/utils';
import { useNavbarHoverReveal } from '@/hooks/useNavbarHoverReveal';
import { useChromeLayout } from '@/hooks/useChromeLayout';
import { NavbarHoverDock } from '@/components/layout/NavbarHoverDock';
import BackgroundWrapper from '@/components/theme/BackgroundWrapper';
import { ConfiguredLinks } from '@/components/branding/ConfiguredLinks';
import { MaintenanceGate } from '@/components/layout/MaintenanceGate';
import { AdminOpenTicketsBanner } from '@/components/dashboard/AdminOpenTicketsBanner';
import GlobalSearchDialog from '@/components/global-search/GlobalSearchDialog';
import PanelDebugConsole from '@/components/global-search/PanelDebugConsole';
import { GlobalSearchProvider } from '@/contexts/GlobalSearchContext';
import { PanelDebugProvider } from '@/contexts/PanelDebugContext';
import { PluginSlot } from '@/components/plugins/PluginSlot';
import { PluginPageOverrideGate } from '@/components/plugins/FeatherPanelHost';

import { usePluginRoutes, getPluginPaths } from '@/hooks/usePluginRoutes';

import { readSidebarCollapsed, subscribeSidebarCollapsed } from '@/lib/sidebarChrome';
import { useSidebarPreferences } from '@/hooks/useSidebarPreferences';
import { getShellContentInset } from '@/lib/sidebarLayout';
import { useNavbarSticky } from '@/hooks/useNavbarSticky';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    // Expanded on the first render (matches the server), stored choice applied before paint.
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useLayoutEffect(() => {
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
    // Every page of one server (or WebSpace) uses the console's width, so switching tabs never
    // changes the page width.
    const isServerOrWebSpacePage =
        pathSegments.length >= 2 && (pathSegments[0] === 'server' || pathSegments[0] === 'webspace');
    const isTicketDetailPage =
        pathSegments.length === 3 &&
        (pathSegments[0] === 'admin' || pathSegments[0] === 'dashboard') &&
        pathSegments[1] === 'tickets' &&
        Boolean(pathSegments[2]);

    const { navbarHoverReveal } = useNavbarHoverReveal();
    const { chromeLayout } = useChromeLayout();
    const { sidebarPosition, dockDisplay, dockSize } = useSidebarPreferences();
    const { navbarSticky } = useNavbarSticky();
    const navbarHoverDockActive = navbarHoverReveal && chromeLayout === 'modern';

    return (
        <GlobalSearchProvider>
            <PanelDebugProvider>
                {/* Outside overflow shells so fixed desktop rail is in first paint (no portal pop-in). */}
                {!hideAppChrome && (
                    <PluginSlot id='shell.sidebar' className='contents' replaceHeight='100vh'>
                        <Sidebar
                            mobileOpen={mobileOpen}
                            setMobileOpen={setMobileOpen}
                            pluginFullBleed={useFullBleedLayout}
                        />
                    </PluginSlot>
                )}
                <PluginSlot id='shell.background' className='contents' collapseWhenHidden={false}>
                    <BackgroundWrapper fillViewport>
                        <GlobalSearchDialog />
                        <PanelDebugConsole />
                        <div
                            className={cn(
                                'motion-content flex min-h-0 flex-1 flex-col',
                                navbarSticky
                                    ? 'overflow-clip'
                                    : 'custom-scrollbar overflow-x-hidden overflow-y-auto overscroll-y-contain',
                            )}
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
                                {!hideAppChrome && (
                                    <PluginSlot id='shell.navbar' className='contents'>
                                        {navbarHoverDockActive ? (
                                            <NavbarHoverDock>
                                                <Navbar onMenuClick={() => setMobileOpen(true)} />
                                            </NavbarHoverDock>
                                        ) : (
                                            <Navbar onMenuClick={() => setMobileOpen(true)} />
                                        )}
                                    </PluginSlot>
                                )}

                                <PluginSlot
                                    id='shell.main'
                                    className='contents'
                                    collapseWhenHidden={false}
                                    replaceHeight='100%'
                                >
                                    <main
                                        className={cn(
                                            'fp-shell-main flex min-h-0 flex-1 flex-col',
                                            useFullBleedLayout
                                                ? 'overflow-hidden p-0'
                                                : cn(
                                                      'px-3 py-5 sm:px-6 sm:py-6 lg:px-8',
                                                      navbarSticky
                                                          ? 'custom-scrollbar overflow-x-hidden overflow-y-auto overscroll-y-contain'
                                                          : 'overflow-visible',
                                                  ),
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'flex w-full flex-col',
                                                useFullBleedLayout ? 'h-full min-h-0 flex-1' : 'min-h-full flex-1',
                                                !useFullBleedLayout &&
                                                    (isServerOrWebSpacePage
                                                        ? 'mx-auto max-w-[min(100rem,calc(100vw-1.5rem))] sm:max-w-[min(100rem,calc(100vw-2rem))]'
                                                        : isTicketDetailPage
                                                          ? 'mx-auto max-w-[min(112rem,calc(100vw-1.5rem))] sm:max-w-[min(112rem,calc(100vw-2rem))]'
                                                          : 'mx-auto max-w-7xl'),
                                            )}
                                        >
                                            <PluginSlot id='shell.page-header' className='contents'>
                                                {!useFullBleedLayout && (
                                                    <AdminOpenTicketsBanner className='mb-5 shrink-0' />
                                                )}
                                            </PluginSlot>
                                            <ModuleRouteGuard>
                                                <MaintenanceGate>
                                                    <PluginPageOverrideGate>{children}</PluginPageOverrideGate>
                                                </MaintenanceGate>
                                            </ModuleRouteGuard>
                                            {!useFullBleedLayout ? (
                                                <footer className='border-border/40 mt-6 shrink-0 border-t pt-4 pb-2'>
                                                    <ConfiguredLinks variant='compact' />
                                                </footer>
                                            ) : null}
                                        </div>
                                    </main>
                                </PluginSlot>
                            </div>
                        </div>
                    </BackgroundWrapper>
                </PluginSlot>
            </PanelDebugProvider>
        </GlobalSearchProvider>
    );
}
