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
import {
    getAdminNavigationItems,
    getServerNavigationItems,
    getMainNavigationItems,
    getVdsNavigationItems,
    getWebSpaceNavigationItems,
} from '@/config/navigation';
import { usePluginRoutes } from '@/hooks/usePluginRoutes';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { useVdsPermissions } from '@/hooks/useVdsPermissions';
import { useWebSpacePermissions } from '@/hooks/useWebSpacePermissions';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';
import { useMainNavResourceCounts } from '@/hooks/useMainNavResourceCounts';
import { applySidebarCustomization, parseSidebarNavigationConfig, type SidebarScope } from '@/lib/sidebarCustomization';
import { WebSpaceSubuserPermissions } from '@/lib/webspace-permissions';

const normalizeSpellId = (spellId: number | string | null | undefined): number | null => {
    if (spellId === null || spellId === undefined) return null;
    const parsed = Number(spellId);
    return Number.isFinite(parsed) ? parsed : null;
};

const isSpellAllowedForPlugin = (
    spellId: number | string | null | undefined,
    allowedOnlyOnSpells?: number[] | null,
): boolean => {
    if (!allowedOnlyOnSpells || allowedOnlyOnSpells.length === 0) return true;
    const normalizedSpellId = normalizeSpellId(spellId);
    if (normalizedSpellId === null) return false;
    return allowedOnlyOnSpells.some((allowedId) => Number(allowedId) === normalizedSpellId);
};

export function useNavigation() {
    const pathname = usePathname();
    const { hasPermission, user, isLoading, isSessionChecked } = useSession();
    const { settings } = useSettings();
    const { t } = useTranslation();
    const { isDeveloperModeEnabled } = useDeveloperMode();

    // Use shared plugin routes hook
    const pluginRoutes = usePluginRoutes();

    const isServer = pathname.startsWith('/server/');
    const serverUuid = isServer ? pathname.split('/')[2] : null;

    const isVds = pathname.startsWith('/vds/');
    const vdsId = isVds ? pathname.split('/')[2] : null;

    const isWebspace = pathname.startsWith('/webspace/');
    const webspaceUuid = isWebspace ? pathname.split('/')[2] : null;

    // Call hook at top level - valid usage
    const { hasPermission: hasServerPermission, server } = useServerPermissions(serverUuid || '');
    const { hasPermission: hasVdsPermission } = useVdsPermissions();
    const { hasPermission: hasWebSpacePermission } = useWebSpacePermissions(webspaceUuid || '');

    const mainNavResourceCountsEnabled =
        isSessionChecked &&
        !isLoading &&
        !!user &&
        !pathname.startsWith('/admin') &&
        !pathname.startsWith('/server/') &&
        !pathname.startsWith('/vds/') &&
        !pathname.startsWith('/webspace/');

    const mainNavResourceCounts = useMainNavResourceCounts(mainNavResourceCountsEnabled, user?.uuid);

    // Get server's spell_id for filtering plugin sidebar items
    const serverSpellId = server?.spell_id || null;

    // Helper to convert plugin items to navigation items
    const convertPluginItems = useCallback(
        (
            pluginItems: Record<string, PluginSidebarItem>,
            category: 'main' | 'admin' | 'server' | 'vds' | 'webspace',
            serverUuid?: string,
            vdsId?: string,
            spellId?: number | null,
            webspaceUuid?: string,
        ): NavigationItem[] => {
            // Use outer serverSpellId for filtering to ensure we capture the latest value
            const currentSpellId = category === 'server' ? serverSpellId : spellId;
            return Object.entries(pluginItems)
                .filter(([, item]) => {
                    // Filter based on spell restrictions for server sidebar items
                    if (category === 'server') {
                        return isSpellAllowedForPlugin(currentSpellId, item.allowedOnlyOnSpells);
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

                    // Handle vds specific prefix and url cleaning
                    if (category === 'vds') {
                        if (vdsId) {
                            prefix = `/vds/${vdsId}`;
                        }
                        if (processedUrl.startsWith('/vds')) {
                            processedUrl = processedUrl.replace('/vds', '');
                        }
                    }

                    if (category === 'webspace') {
                        if (webspaceUuid) {
                            prefix = `/webspace/${webspaceUuid}`;
                        }
                        if (processedUrl.startsWith('/webspace')) {
                            processedUrl = processedUrl.replace('/webspace', '');
                        }
                    }

                    const cleanUrl = processedUrl.startsWith('/') ? processedUrl : `/${processedUrl}`;
                    const fullUrl = `${prefix}${cleanUrl}`;

                    // Allow plugins to override redirect
                    let redirectUrl = item.redirect;
                    if (category === 'server' && redirectUrl && redirectUrl.startsWith('/server')) {
                        redirectUrl = redirectUrl.replace('/server', '');
                    }
                    if (category === 'vds' && redirectUrl && redirectUrl.startsWith('/vds')) {
                        redirectUrl = redirectUrl.replace('/vds', '');
                    }
                    if (category === 'webspace' && redirectUrl && redirectUrl.startsWith('/webspace')) {
                        redirectUrl = redirectUrl.replace('/webspace', '');
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
                        vds: ['management', 'files', 'networking', 'automation', 'configuration'],
                        webspace: ['management', 'files', 'networking', 'automation', 'configuration'],
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

                    const sidebarPriority = Number.isFinite(item.priority) ? item.priority : undefined;

                    return {
                        id: `plugin-${item.plugin}-${url}`,
                        name: item.name,
                        title: item.name,
                        url: fullUrl,
                        icon: item.icon,
                        lucideIcon: item.lucideIcon,
                        panelIcon: item.panelIcon,
                        isActive: pathname === fullUrl || pathname.startsWith(fullUrl + '/'),
                        category: 'server',
                        isPlugin: true,
                        pluginJs: item.js,
                        pluginRedirect: fullRedirect,
                        pluginName: item.pluginName,
                        showBadge: item.showBadge,
                        description: item.description,
                        permission: item.permission,
                        group: normalizedGroup,
                        priority: sidebarPriority,
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

            const filtered = items.filter((item) => !item.permission || hasPermission(item.permission));
            return applySidebarCustomization(
                filtered,
                parseSidebarNavigationConfig(settings?.sidebar_navigation_config),
                'admin',
                'admin',
            );
        }

        if (isServer && serverUuid) {
            let items = getServerNavigationItems(
                t,
                serverUuid,
                settings,
                server?.node?.capabilities ?? null,
                server?.node?.daemon_type,
            );

            items = items.map((item) => ({
                ...item,
                isActive: checkActive(item.url),
            }));

            // Add Server Plugin Items
            if (pluginRoutes?.server) {
                const serverPlugins = convertPluginItems(
                    pluginRoutes.server,
                    'server',
                    serverUuid,
                    undefined,
                    serverSpellId,
                );
                items.push(...serverPlugins);
            }

            const filtered = items.filter((item) => !item.permission || hasServerPermission(item.permission));
            return applySidebarCustomization(
                filtered,
                parseSidebarNavigationConfig(settings?.sidebar_navigation_config),
                'server',
                'server',
            );
        }

        if (isVds && vdsId) {
            let items = getVdsNavigationItems(t, vdsId);
            items = items.map((item) => ({
                ...item,
                isActive: checkActive(item.url, item.url === `/vds/${vdsId}`),
            }));

            if (pluginRoutes?.vds) {
                const vdsPlugins = convertPluginItems(pluginRoutes.vds, 'vds', undefined, vdsId);
                items.push(...vdsPlugins);
            }

            return items.filter((item) => !item.permission || hasVdsPermission(item.permission));
        }

        if (isWebspace && webspaceUuid) {
            let items = getWebSpaceNavigationItems(t, webspaceUuid);
            items = items.map((item) => ({
                ...item,
                isActive: checkActive(item.url, item.url === `/webspace/${webspaceUuid}`),
            }));

            if (pluginRoutes?.webspace) {
                const webspacePlugins = convertPluginItems(
                    pluginRoutes.webspace,
                    'webspace',
                    undefined,
                    undefined,
                    undefined,
                    webspaceUuid,
                );
                items.push(...webspacePlugins);
            }

            return items.filter((item) => {
                if (!item.permission) return true;
                const perm =
                    WebSpaceSubuserPermissions[item.permission as keyof typeof WebSpaceSubuserPermissions] ||
                    item.permission;
                return hasWebSpacePermission(perm);
            });
        }

        // MAIN NAVIGATION
        let items = getMainNavigationItems(t, settings, hasPermission, mainNavResourceCounts);

        items = items.map((item) => ({
            ...item,
            isActive: checkActive(item.url, item.url === '/dashboard'),
        }));

        // Add Plugin Items
        if (pluginRoutes?.client) {
            const pluginItems = convertPluginItems(pluginRoutes.client, 'main');
            items.push(...pluginItems);
        }

        const filtered = items.filter((item) => !item.permission || hasPermission(item.permission));
        return applySidebarCustomization(
            filtered,
            parseSidebarNavigationConfig(settings?.sidebar_navigation_config),
            'main' satisfies SidebarScope,
            'main',
        );
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
        server?.node?.capabilities,
        server?.node?.daemon_type,
        isDeveloperModeEnabled,
        isVds,
        vdsId,
        hasVdsPermission,
        isWebspace,
        webspaceUuid,
        hasWebSpacePermission,
        mainNavResourceCounts,
    ]);

    return { navigationItems };
}
