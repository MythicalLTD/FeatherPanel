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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
    Activity,
    Globe,
    HardDrive,
    Key,
    LayoutTemplate,
    Mail,
    Palette,
    PanelLeft,
    Server as ServerIcon,
    ShieldCheck,
    Sparkles,
    Terminal,
    Type,
    User,
    Zap,
} from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';
import { usePluginRoutes } from '@/hooks/usePluginRoutes';
import { useUserServersList } from '@/hooks/useUserServersList';
import { useUserWebSpacesList } from '@/hooks/useUserWebSpacesList';
import {
    getAdminNavigationItems,
    getMainNavigationItems,
    getServerNavigationItems,
    getVdsNavigationItems,
    getWebSpaceNavigationItems,
} from '@/config/navigation';
import { adminSettingsToSearchResults } from '@/lib/admin-settings-search';
import { adminSettingsApi, type OrganizedSettings } from '@/lib/admin-settings-api';
import Permissions from '@/lib/permissions';
import {
    currentContextToSearchResults,
    dedupeGlobalSearchResults,
    filterGlobalSearchResults,
    navItemsToScopedSearchResults,
    navigationToSearchResults,
    parseGlobalSearchQuery,
    shouldExpandEntityNav,
    type GlobalSearchResult,
    type ParsedGlobalSearchQuery,
} from '@/lib/global-search';
import { resolveGlobalSearchEntityContext, type GlobalSearchEntityContext } from '@/lib/global-search-context';
import { getServerRouteId } from '@/lib/server-switch';
import { getWebSpaceRouteId } from '@/lib/webspace-switch';
import { vmsApi, type VmInstance } from '@/lib/vms-api';
import type { PluginSidebarItem } from '@/types/navigation';

const APPEARANCE_SECTIONS = [
    { id: 'theme', icon: Palette, labelKey: 'appearance.sections.theme', descKey: 'appearance.sections.themeDesc' },
    {
        id: 'background',
        icon: Sparkles,
        labelKey: 'appearance.sections.background',
        descKey: 'appearance.sections.backgroundDesc',
    },
    {
        id: 'typography',
        icon: Type,
        labelKey: 'appearance.sections.typography',
        descKey: 'appearance.sections.typographyDesc',
    },
    {
        id: 'layout',
        icon: LayoutTemplate,
        labelKey: 'appearance.sections.layout',
        descKey: 'appearance.sections.layoutDesc',
    },
    {
        id: 'sidebar',
        icon: PanelLeft,
        labelKey: 'appearance.sections.sidebar',
        descKey: 'appearance.sections.sidebarDesc',
    },
    { id: 'motion', icon: Zap, labelKey: 'appearance.sections.motion', descKey: 'appearance.sections.motionDesc' },
    {
        id: 'language',
        icon: Globe,
        labelKey: 'appearance.sections.language',
        descKey: 'appearance.sections.languageDesc',
    },
] as const;

const ACCOUNT_ITEMS = [
    {
        id: 'account-profile',
        tab: 'profile',
        titleKey: 'account.profile',
        subtitleKey: 'account.editProfileDescription',
        icon: User,
        keywords: ['profile', 'avatar', 'username', 'email', 'name'],
    },
    {
        id: 'account-password',
        tab: 'profile',
        titleKey: 'account.newPassword',
        subtitleKey: 'account.passwordHint',
        icon: ShieldCheck,
        keywords: ['password', 'change password', 'credentials', 'security'],
    },
    {
        id: 'account-settings',
        tab: 'settings',
        titleKey: 'account.settings',
        subtitleKey: 'account.securitySettingsDescription',
        icon: ShieldCheck,
        keywords: ['settings', 'security', '2fa', 'two factor', 'passkey', 'timezone', 'discord', 'oidc', 'ldap'],
    },
    {
        id: 'account-2fa',
        tab: 'settings',
        titleKey: 'account.twoFactor.title',
        subtitleKey: 'account.twoFactor.description',
        icon: ShieldCheck,
        keywords: ['2fa', 'two factor', 'authenticator', 'totp', 'mfa'],
    },
    {
        id: 'account-passkeys',
        tab: 'settings',
        titleKey: 'auth.passkey.title',
        subtitleKey: 'auth.passkey.description',
        icon: ShieldCheck,
        keywords: ['passkey', 'webauthn', 'fingerprint', 'security key'],
    },
    {
        id: 'account-timezone',
        tab: 'settings',
        titleKey: 'account.timezone.title',
        subtitleKey: 'account.timezone.description',
        icon: Globe,
        keywords: ['timezone', 'time', 'date', 'locale'],
    },
    {
        id: 'account-logout',
        tab: 'settings',
        titleKey: 'account.logout',
        subtitleKey: 'account.sessionManagementDescription',
        icon: ShieldCheck,
        keywords: ['logout', 'sign out', 'session'],
    },
    {
        id: 'account-ssh',
        tab: 'ssh-keys',
        titleKey: 'account.sshKeys.title',
        subtitleKey: 'account.sshKeys.description',
        icon: Terminal,
        keywords: ['ssh', 'keys', 'public key'],
    },
    {
        id: 'account-api',
        tab: 'api-keys',
        titleKey: 'account.apiKeys.title',
        subtitleKey: 'account.apiKeys.description',
        icon: Key,
        keywords: ['api', 'api key', 'token', 'developer'],
    },
    {
        id: 'account-activity',
        tab: 'activity',
        titleKey: 'account.activity.title',
        subtitleKey: 'account.activity.description',
        icon: Activity,
        keywords: ['activity', 'audit', 'history', 'log'],
    },
    {
        id: 'account-mail',
        tab: 'mail',
        titleKey: 'account.mail.title',
        subtitleKey: 'account.mail.description',
        icon: Mail,
        keywords: ['mail', 'email', 'notifications', 'inbox'],
    },
] as const;

function convertPluginNavItems(
    pluginItems: Record<string, PluginSidebarItem>,
    prefix: string,
    category: GlobalSearchResult['category'],
): GlobalSearchResult[] {
    return Object.entries(pluginItems).map(([url, item]) => {
        const cleanUrl = url.startsWith('/') ? url : `/${url}`;
        const fullUrl = `${prefix}${cleanUrl}`;
        const redirect = item.redirect
            ? `${prefix}${item.redirect.startsWith('/') ? item.redirect : `/${item.redirect}`}`
            : fullUrl;

        return {
            id: `plugin-${category}-${item.plugin}-${url}`,
            title: item.name,
            subtitle: item.pluginName ?? item.group ?? category,
            href: redirect,
            category,
            panelIcon: item.panelIcon,
            lucideIcon: item.lucideIcon,
            permission: item.permission,
            keywords: [item.name, item.description, item.pluginName, item.group].filter(Boolean) as string[],
        };
    });
}

function filterByPermission(items: GlobalSearchResult[], hasPermission: (p: string) => boolean): GlobalSearchResult[] {
    return items.filter((item) => !item.permission || hasPermission(item.permission));
}

export function useGlobalSearchItems(open: boolean, query: string) {
    const pathname = usePathname();
    const { hasPermission, user } = useSession();
    const { settings } = useSettings();
    const { t } = useTranslation();
    const { isDeveloperModeEnabled } = useDeveloperMode();
    const { data: pluginRoutes } = usePluginRoutes();
    const enabled = open && !!user;

    const parsedQuery = useMemo(() => parseGlobalSearchQuery(query), [query]);

    const { servers, loading: serversLoading } = useUserServersList(enabled);
    const { webspaces, loading: webspacesLoading } = useUserWebSpacesList(enabled);
    const [vms, setVms] = useState<VmInstance[]>([]);
    const [vmsLoading, setVmsLoading] = useState(false);
    const [adminSettingsOrganized, setAdminSettingsOrganized] = useState<OrganizedSettings | null>(null);
    const [adminSettingsLoading, setAdminSettingsLoading] = useState(false);

    const entityContext = useMemo(
        () => resolveGlobalSearchEntityContext(pathname, servers, webspaces, vms),
        [pathname, servers, webspaces, vms],
    );

    const showCurrentContext = useMemo(() => {
        if (!entityContext) return false;
        if (!parsedQuery.scopeExplicit || parsedQuery.scope === 'all' || parsedQuery.scope === 'infrastructure') {
            return true;
        }
        if (parsedQuery.scope === 'servers' && entityContext.kind === 'server') return true;
        if (parsedQuery.scope === 'webspaces' && entityContext.kind === 'webspace') return true;
        if (parsedQuery.scope === 'vds' && entityContext.kind === 'vds') return true;
        return false;
    }, [entityContext, parsedQuery]);

    const canViewAdmin = hasPermission(Permissions.ADMIN_DASHBOARD_VIEW);
    const canViewAdminSettings = hasPermission(Permissions.ADMIN_SETTINGS_VIEW);

    const fetchVms = useCallback(async () => {
        setVmsLoading(true);
        try {
            const response = await vmsApi.getVms(1, 100, parsedQuery.text.trim());
            setVms(Array.isArray(response.data?.instances) ? response.data.instances : []);
        } catch {
            setVms([]);
        } finally {
            setVmsLoading(false);
        }
    }, [parsedQuery.text]);

    useEffect(() => {
        if (!enabled) return;
        void fetchVms();
    }, [enabled, fetchVms]);

    useEffect(() => {
        if (!enabled || !canViewAdminSettings) {
            setAdminSettingsOrganized(null);
            return;
        }

        let cancelled = false;
        setAdminSettingsLoading(true);

        void (async () => {
            try {
                const response = await adminSettingsApi.fetchSettings();
                if (!cancelled && response.success) {
                    setAdminSettingsOrganized(response.data.organized_settings);
                }
            } catch {
                if (!cancelled) setAdminSettingsOrganized(null);
            } finally {
                if (!cancelled) setAdminSettingsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [enabled, canViewAdminSettings]);

    const accountItems = useMemo(() => {
        return ACCOUNT_ITEMS.map((item) => ({
            id: item.id,
            title: t(item.titleKey),
            subtitle: t(item.subtitleKey),
            href: `/dashboard/account?tab=${item.tab}`,
            category: 'account' as const,
            icon: item.icon,
            keywords: [...item.keywords, t(item.titleKey), t(item.subtitleKey), 'account'],
        }));
    }, [t]);

    const baseItems = useMemo(() => {
        const items: GlobalSearchResult[] = [...accountItems];

        const mainItems = getMainNavigationItems(t, settings, hasPermission).filter(
            (item) => !item.permission || hasPermission(item.permission),
        );

        items.push(...navigationToSearchResults(mainItems, 'pages', t('globalSearch.categories.pages')));

        if (pluginRoutes?.client) {
            items.push(
                ...filterByPermission(convertPluginNavItems(pluginRoutes.client, '/dashboard', 'pages'), hasPermission),
            );
        }

        for (const section of APPEARANCE_SECTIONS) {
            items.push({
                id: `pref-${section.id}`,
                title: t(section.labelKey),
                subtitle: t(section.descKey),
                href: `/dashboard/preferences?section=${section.id}`,
                category: 'settings',
                icon: section.icon,
                keywords: [t(section.labelKey), t(section.descKey), 'preferences', 'appearance', section.id],
            });
        }

        if (canViewAdmin) {
            const adminItems = getAdminNavigationItems(t, settings, isDeveloperModeEnabled ?? false).filter(
                (item) => !item.permission || hasPermission(item.permission),
            );
            items.push(...navigationToSearchResults(adminItems, 'admin', t('globalSearch.categories.admin')));

            if (pluginRoutes?.admin) {
                items.push(
                    ...filterByPermission(convertPluginNavItems(pluginRoutes.admin, '/admin', 'admin'), hasPermission),
                );
            }
        }

        if (adminSettingsOrganized && canViewAdminSettings) {
            items.push(...adminSettingsToSearchResults(adminSettingsOrganized, t));
        }

        return items;
    }, [
        t,
        settings,
        hasPermission,
        canViewAdmin,
        canViewAdminSettings,
        isDeveloperModeEnabled,
        pluginRoutes,
        adminSettingsOrganized,
        accountItems,
    ]);

    const entityItems = useMemo(() => {
        const items: GlobalSearchResult[] = [];

        for (const server of servers) {
            const routeId = getServerRouteId(server);
            const consoleNav = getServerNavigationItems(
                t,
                routeId,
                settings,
                server.node?.capabilities ?? null,
                server.node?.daemon_type ?? null,
            )[0];
            items.push({
                id: `server-${server.uuid}`,
                title: server.name,
                subtitle: server.spell?.name ?? routeId,
                href: `/server/${routeId}`,
                category: 'servers',
                icon: consoleNav?.icon && typeof consoleNav.icon === 'function' ? consoleNav.icon : ServerIcon,
                lucideIcon: consoleNav?.lucideIcon,
                panelIcon: consoleNav?.panelIcon,
                keywords: [
                    server.name,
                    server.description,
                    routeId,
                    server.spell?.name,
                    'server',
                    'game server',
                ].filter(Boolean) as string[],
            });
        }

        for (const webspace of webspaces) {
            const routeId = getWebSpaceRouteId(webspace);
            const consoleNav = getWebSpaceNavigationItems(t, routeId)[0];
            items.push({
                id: `webspace-${webspace.uuid}`,
                title: webspace.name,
                subtitle: routeId,
                href: `/webspace/${routeId}`,
                category: 'webspaces',
                icon: consoleNav?.icon && typeof consoleNav.icon === 'function' ? consoleNav.icon : Globe,
                lucideIcon: consoleNav?.lucideIcon,
                panelIcon: consoleNav?.panelIcon,
                keywords: [webspace.name, webspace.description, routeId, 'webspace', 'website', 'hosting'].filter(
                    Boolean,
                ) as string[],
            });
        }

        for (const vm of vms) {
            const vdsNav = getVdsNavigationItems(t, String(vm.id))[0];
            items.push({
                id: `vm-${vm.id}`,
                title: vm.hostname || `VM ${vm.vmid}`,
                subtitle: vm.node_name ?? vm.pve_node,
                href: `/vds/${vm.id}`,
                category: 'vms',
                icon: vdsNav?.icon && typeof vdsNav.icon === 'function' ? vdsNav.icon : HardDrive,
                lucideIcon: vdsNav?.lucideIcon,
                panelIcon: vdsNav?.panelIcon,
                keywords: [
                    vm.hostname,
                    vm.description,
                    String(vm.vmid),
                    vm.node_name,
                    vm.pve_node,
                    'vds',
                    'vm',
                    'virtual',
                ].filter(Boolean) as string[],
            });
        }

        return items;
    }, [servers, webspaces, vms, t, settings]);

    const currentContextItems = useMemo(() => {
        if (!showCurrentContext || !entityContext) return [];

        let navItems;
        if (entityContext.kind === 'webspace') {
            navItems = getWebSpaceNavigationItems(t, entityContext.routeId);
        } else if (entityContext.kind === 'server') {
            const server = servers.find((item) => item.uuid === entityContext.entityKey);
            if (!server) return [];
            navItems = getServerNavigationItems(
                t,
                entityContext.routeId,
                settings,
                server.node?.capabilities ?? null,
                server.node?.daemon_type ?? null,
            );
        } else {
            navItems = getVdsNavigationItems(t, entityContext.routeId);
        }

        return filterByPermission(
            currentContextToSearchResults(navItems, {
                entityKey: entityContext.entityKey,
                entityName: entityContext.entityName,
                entityKind: entityContext.kind,
                query: parsedQuery.text,
            }),
            hasPermission,
        );
    }, [showCurrentContext, entityContext, servers, t, settings, hasPermission, parsedQuery.text]);

    const scopedItems = useMemo(() => {
        const q = parsedQuery.text.trim();
        if (!q) return [];

        const items: GlobalSearchResult[] = [];
        const serverLabel = t('globalSearch.entityKinds.server');
        const webspaceLabel = t('globalSearch.entityKinds.webspace');
        const vdsLabel = t('globalSearch.entityKinds.vds');

        for (const server of servers) {
            if (entityContext?.kind === 'server' && entityContext.entityKey === server.uuid) continue;
            const routeId = getServerRouteId(server);
            const navItems = getServerNavigationItems(
                t,
                routeId,
                settings,
                server.node?.capabilities ?? null,
                server.node?.daemon_type ?? null,
            ).filter((item) => !item.permission || hasPermission(item.permission));
            const expand = shouldExpandEntityNav(
                server.name,
                [server.description, routeId, server.spell?.name].filter(Boolean) as string[],
                navItems,
                q,
            );
            if (expand === 'none') continue;

            items.push(
                ...navItemsToScopedSearchResults(navItems, {
                    category: 'serverPages',
                    entityKey: server.uuid,
                    entityName: server.name,
                    entityKind: 'server',
                    kindLabel: serverLabel,
                    query: q,
                    expand,
                }),
            );
        }

        for (const webspace of webspaces) {
            if (entityContext?.kind === 'webspace' && entityContext.entityKey === webspace.uuid) continue;
            const routeId = getWebSpaceRouteId(webspace);
            const navItems = getWebSpaceNavigationItems(t, routeId).filter(
                (item) => !item.permission || hasPermission(item.permission),
            );
            const expand = shouldExpandEntityNav(
                webspace.name,
                [webspace.description, routeId].filter(Boolean) as string[],
                navItems,
                q,
            );
            if (expand === 'none') continue;

            items.push(
                ...navItemsToScopedSearchResults(navItems, {
                    category: 'webspacePages',
                    entityKey: webspace.uuid,
                    entityName: webspace.name,
                    entityKind: 'webspace',
                    kindLabel: webspaceLabel,
                    query: q,
                    expand,
                }),
            );
        }

        for (const vm of vms) {
            if (entityContext?.kind === 'vds' && entityContext.entityKey === String(vm.id)) continue;
            const vmName = vm.hostname || `VM ${vm.vmid}`;
            const navItems = getVdsNavigationItems(t, String(vm.id)).filter(
                (item) => !item.permission || hasPermission(item.permission),
            );
            const expand = shouldExpandEntityNav(
                vmName,
                [vm.description, String(vm.vmid), vm.node_name, vm.pve_node].filter(Boolean) as string[],
                navItems,
                q,
            );
            if (expand === 'none') continue;

            items.push(
                ...navItemsToScopedSearchResults(navItems, {
                    category: 'vdsPages',
                    entityKey: String(vm.id),
                    entityName: vmName,
                    entityKind: 'vds',
                    kindLabel: vdsLabel,
                    query: q,
                    expand,
                }),
            );
        }

        return filterByPermission(items, hasPermission);
    }, [parsedQuery.text, servers, webspaces, vms, t, settings, hasPermission, entityContext]);

    const allItems = useMemo(
        () => dedupeGlobalSearchResults([...currentContextItems, ...baseItems, ...entityItems, ...scopedItems]),
        [currentContextItems, baseItems, entityItems, scopedItems],
    );

    const results = useMemo(() => {
        if (parsedQuery.mode === 'debug') return [];

        const filtered = filterGlobalSearchResults(allItems, query, { parsed: parsedQuery });
        const q = parsedQuery.text.trim();

        if (!q && entityContext && showCurrentContext) {
            const contextResults = filtered.filter(
                (result) => result.category === 'currentContext' || result.isCurrentContext,
            );
            if (contextResults.length > 0) return contextResults;
        }

        return filtered;
    }, [allItems, query, parsedQuery, entityContext, showCurrentContext]);

    return {
        results,
        parsedQuery,
        entityContext,
        loading: serversLoading || webspacesLoading || vmsLoading || adminSettingsLoading,
    };
}

export type { ParsedGlobalSearchQuery, GlobalSearchEntityContext };
