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

import { useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from '@/contexts/SessionContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';
import type { NavigationItem, PluginSidebarItem } from '@/types/navigation';
import { getAdminNavigationItems, getServerNavigationItems, getMainNavigationItems } from '@/config/navigation';
import { usePluginRoutes } from '@/hooks/usePluginRoutes';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';

export function useNavigation() {
    const pathname = usePathname();
    const { hasPermission } = useSession();
    const { settings } = useSettings();
    const { t } = useTranslation();
    const { isDeveloperModeEnabled } = useDeveloperMode();

    // Use shared plugin routes hook
    const pluginRoutes = usePluginRoutes();

    // Helper to convert plugin items to navigation items
    const convertPluginItems = useCallback(
        (
            pluginItems: Record<string, PluginSidebarItem>,
            category: 'main' | 'admin' | 'server',
            serverUuid?: string,
        ): NavigationItem[] => {
            return Object.entries(pluginItems).map(([url, item]) => {
                // Build full URL based on category
                let prefix = '';
                if (category === 'admin') prefix = '/admin';
                if (category === 'main') prefix = '/dashboard';

                let processedUrl = url;

                // Handle server specific prefix and url cleaning
                if (category === 'server') {
                    if (serverUuid) {
                        prefix = `/server/${serverUuid}`;
                    }
                    // Remove leading /server to avoid duplication when appending to prefix
                    if (processedUrl.startsWith('/server')) {
                        processedUrl = processedUrl.replace('/server', '');
                    }
                }

                const cleanUrl = processedUrl.startsWith('/') ? processedUrl : `/${processedUrl}`;
                const fullUrl = `${prefix}${cleanUrl}`;

                // Allow plugins to override redirect
                let redirectUrl = item.redirect;
                if (category === 'server' && redirectUrl && redirectUrl.startsWith('/server')) {
                    redirectUrl = redirectUrl.replace('/server', '');
                }

                const cleanRedirect = redirectUrl
                    ? redirectUrl.startsWith('/')
                        ? redirectUrl
                        : `/${redirectUrl}`
                    : null;

                const fullRedirect = cleanRedirect ? `${prefix}${cleanRedirect}` : fullUrl;

                // Legacy-style group normalization
                const builtInGroups: Record<string, string[]> = {
                    server: ['management', 'files', 'networking', 'automation', 'configuration'],
                    admin: [
                        'overview',
                        'feathercloud',
                        'users',
                        'tickets',
                        'networking',
                        'infrastructure',
                        'content',
                        'system',
                    ],
                    main: ['overview', 'support'],
                };

                let normalizedGroup = item.group || 'plugins';
                if (item.group) {
                    const lowerGroup = item.group.toLowerCase();
                    const matchingBuiltIn = builtInGroups[category]?.find((bg) => bg.toLowerCase() === lowerGroup);
                    if (matchingBuiltIn) {
                        normalizedGroup = matchingBuiltIn;
                    }
                }

                return {
                    id: `plugin-${item.plugin}-${url}`,
                    name: item.name,
                    title: item.name,
                    url: fullUrl,
                    icon: item.icon,
                    isActive: pathname === fullUrl || pathname.startsWith(fullUrl + '/'),
                    category,
                    isPlugin: true,
                    pluginJs: item.js,
                    pluginRedirect: fullRedirect,
                    pluginName: item.pluginName,
                    showBadge: item.showBadge,
                    description: item.description,
                    permission: item.permission,
                    group: normalizedGroup,
                };
            });
        },
        [pathname],
    );

    const isServer = pathname.startsWith('/server/');
    const serverUuid = isServer ? pathname.split('/')[2] : null;

    // Call hook at top level - valid usage
    const { hasPermission: hasServerPermission } = useServerPermissions(serverUuid || '');

    const navigationItems = useMemo(() => {
        const isAdmin = pathname.startsWith('/admin');
        // const isServer = pathname.startsWith("/server/"); // Already defined above but we might need to redefine or capture from closure
        // actually we can just reuse the outer variables or let the logic flow.

        const checkActive = (url: string, exact = false) => {
            if (exact) return pathname === url;
            return pathname === url || pathname.startsWith(url + '/');
        };

        if (isAdmin) {
            let items = getAdminNavigationItems(t, settings, isDeveloperModeEnabled ?? false);

            // Post-process for complex isActive states
            items = items.map((item) => {
                let active = checkActive(item.url);

                // Manual overrides for complex cases
                if (item.id === 'admin-tickets') {
                    active =
                        pathname.startsWith('/admin/tickets') &&
                        !pathname.startsWith('/admin/tickets/categories') &&
                        !pathname.startsWith('/admin/tickets/priorities') &&
                        !pathname.startsWith('/admin/tickets/statuses');
                }
                return { ...item, isActive: active };
            });

            // Add Plugin Admin Items
            if (pluginRoutes?.admin) {
                const pluginItems = convertPluginItems(pluginRoutes.admin, 'admin');
                items.push(...pluginItems);
            }

            return items.filter((item) => !item.permission || hasPermission(item.permission));
        }

        if (isServer && serverUuid) {
            let items = getServerNavigationItems(t, serverUuid, settings);

            items = items.map((item) => ({
                ...item,
                isActive: checkActive(item.url),
            }));

            // Add Server Plugin Items
            if (pluginRoutes?.server) {
                const serverPlugins = convertPluginItems(pluginRoutes.server, 'server', serverUuid);
                items.push(...serverPlugins);
            }

            return items.filter((item) => !item.permission || hasServerPermission(item.permission));
        }

        // MAIN NAVIGATION
        let items = getMainNavigationItems(t, settings, hasPermission);

        items = items.map((item) => ({
            ...item,
            isActive: checkActive(item.url, item.url === '/dashboard'),
        }));

        // Add Plugin Items
        if (pluginRoutes?.client) {
            const pluginItems = convertPluginItems(pluginRoutes.client, 'main');
            items.push(...pluginItems);
        }

        return items.filter((item) => !item.permission || hasPermission(item.permission));
    }, [
        pathname,
        hasPermission,
        pluginRoutes,
        convertPluginItems,
        settings,
        t,
        hasServerPermission,
        isServer,
        serverUuid,
        isDeveloperModeEnabled,
    ]);

    return { navigationItems };
}
