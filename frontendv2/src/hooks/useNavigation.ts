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

    const isServer = pathname.startsWith('/server/');
    const serverUuid = isServer ? pathname.split('/')[2] : null;

    // Call hook at top level - valid usage
    const { hasPermission: hasServerPermission, server } = useServerPermissions(serverUuid || '');

    // Get server's spell_id for filtering plugin sidebar items
    const serverSpellId = server?.spell_id || null;

    // Helper to convert plugin items to navigation items
    const convertPluginItems = useCallback(
        (
            pluginItems: Record<string, PluginSidebarItem>,
            category: 'main' | 'admin' | 'server',
            serverUuid?: string,
            spellId?: number | null,
        ): NavigationItem[] => {
            // Use outer serverSpellId for filtering to ensure we capture the latest value
            const currentSpellId = category === 'server' ? serverSpellId : spellId;
            return Object.entries(pluginItems)
                .filter(([, item]) => {
                    // Filter based on spell restrictions for server sidebar items
                    if (category === 'server') {
                        // If plugin has spell restrictions defined
                        if (
                            item.allowedOnlyOnSpells &&
                            Array.isArray(item.allowedOnlyOnSpells) &&
                            item.allowedOnlyOnSpells.length > 0
                        ) {
                            // Only show if we have a server spell_id and it's in the allowed list
                            if (currentSpellId !== null && currentSpellId !== undefined) {
                                return item.allowedOnlyOnSpells.includes(currentSpellId);
                            }
                            // If plugin has restrictions but no server spell_id, don't show
                            return false;
                        }
                        // If no restrictions, show on all servers
                        return true;
                    }
                    // For non-server categories, show all
                    return true;
                })
                .map(([url, item]) => {
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
                        lucideIcon: item.lucideIcon,
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
        [pathname, serverSpellId],
    );

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
                const serverPlugins = convertPluginItems(pluginRoutes.server, 'server', serverUuid, serverSpellId);
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
        serverSpellId,
        isDeveloperModeEnabled,
    ]);

    return { navigationItems };
}
