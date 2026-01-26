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
import BackgroundWrapper from '@/components/theme/BackgroundWrapper';

import { usePluginRoutes, getPluginPaths } from '@/hooks/usePluginRoutes';

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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);

        const token = getCookie('remember_token');
        if (!token) {
            router.push('/auth/login');
        }
    }, [router]);

    useEffect(() => {
        const handleToggle = () => setSidebarCollapsed((prev) => !prev);
        window.addEventListener('toggle-sidebar', handleToggle);
        return () => window.removeEventListener('toggle-sidebar', handleToggle);
    }, []);

    if (!mounted) {
        return (
            <div className='flex h-screen items-center justify-center bg-background'>
                <div className='animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent' />
            </div>
        );
    }

    return (
        <BackgroundWrapper>
            <div className={cn('min-h-screen flex flex-col', isFullWidthMode && 'h-screen overflow-hidden')}>
                <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

                <div
                    className={cn(
                        'flex-1 flex flex-col min-w-0 transition-all duration-300',
                        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64',
                    )}
                >
                    <Navbar onMenuClick={() => setMobileOpen(true)} />

                    <main
                        className={cn('flex-1', isFullWidthMode ? 'p-0 overflow-hidden' : 'py-6 px-4 sm:px-6 lg:px-8')}
                    >
                        <div className={cn(isFullWidthMode && 'h-full', !isFullWidthMode && 'mx-auto max-w-7xl')}>
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </BackgroundWrapper>
    );
}
