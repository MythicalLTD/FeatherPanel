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
    Monitor,
    Users as UsersIcon,
    FileText,
    Folder,
    History,
    LifeBuoy,
    Network,
    Plus,
    SunMoon,
    Eraser,
    LogOut,
    ScrollText,
    type LucideIcon,
} from 'lucide-react';
import { filesApi } from '@/lib/files-api';
import {
    ADMIN_RECENT_CATEGORIES,
    clearRecentSearches,
    loadRecentSearches,
    saveRecentSearch,
    type RecentSearchEntry,
} from '@/lib/global-search-recents';
import axios from 'axios';
import { useSession } from '@/contexts/SessionContext';
import { useSettings } from '@/contexts/SettingsContext';
import { usePterodactylImporterVisible, withoutPterodactylImporter } from '@/hooks/usePterodactylImporterVisibility';
import { getModuleStates, isModuleEnabled } from '@/lib/modules';
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
import { filterNavigationByPermission } from '@/hooks/useNavigation';

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

const RECENT_CATEGORY_ICONS: Partial<Record<GlobalSearchResult['category'], LucideIcon>> = {
    servers: ServerIcon,
    serverPages: ServerIcon,
    webspaces: Globe,
    webspacePages: Globe,
    vms: Monitor,
    vdsPages: Monitor,
    users: UsersIcon,
    nodes: Network,
    tickets: LifeBuoy,
    files: FileText,
    account: User,
    commands: Zap,
};

function filterByPermission(items: GlobalSearchResult[], hasPermission: (p: string) => boolean): GlobalSearchResult[] {
    return items.filter((item) => !item.permission || hasPermission(item.permission));
}

export function useGlobalSearchItems(open: boolean, query: string) {
    const pathname = usePathname();
    const { hasPermission, user } = useSession();
    const { settings } = useSettings();
    const importerVisible = usePterodactylImporterVisible();
    const { t } = useTranslation();
    const { isDeveloperModeEnabled } = useDeveloperMode();
    const { data: pluginRoutes } = usePluginRoutes();
    const enabled = open && !!user;

    const parsedQuery = useMemo(() => parseGlobalSearchQuery(query), [query]);

    const modules = getModuleStates(settings);
    const { servers: rawServers, loading: serversLoading } = useUserServersList(enabled && modules.game);
    const { webspaces: rawWebspaces, loading: webspacesLoading } = useUserWebSpacesList(enabled && modules.web);
    // Lists can still hold entries fetched before a module was switched off.
    const servers = useMemo(() => (modules.game ? rawServers : []), [modules.game, rawServers]);
    const webspaces = useMemo(() => (modules.web ? rawWebspaces : []), [modules.web, rawWebspaces]);
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
        if (!modules.vds) {
            setVms([]);
            return;
        }
        void fetchVms();
    }, [enabled, modules.vds, fetchVms]);

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

        const mainItems = filterNavigationByPermission(
            getMainNavigationItems(t, settings, hasPermission),
            hasPermission,
        );

        items.push(...navigationToSearchResults(mainItems, 'pages', t('globalSearch.categories.pages')));

        if (isModuleEnabled(settings, 'game')) {
            const osTitle = `${settings?.app_name || 'Panel'} OS`;
            items.push({
                id: 'featheros',
                title: t('featheros.nav_open', { name: osTitle }),
                subtitle: t('featheros.nav_open_hint'),
                href: '/os',
                category: 'pages',
                icon: Monitor,
                keywords: [osTitle, 'featheros', 'desktop', 'workspace', 'os', 'windows', 'apps'],
            });
        }

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
            const adminItems = filterNavigationByPermission(
                withoutPterodactylImporter(
                    getAdminNavigationItems(t, settings, isDeveloperModeEnabled ?? false),
                    importerVisible,
                ),
                hasPermission,
            );
            const adminLabel = t('globalSearch.categories.admin');
            items.push(
                ...navigationToSearchResults(adminItems, 'admin', (item) => {
                    if (!item.group) return adminLabel;
                    const key = `navigation.groups.${item.group}`;
                    const section = t(key);
                    return section === key ? adminLabel : `${adminLabel} · ${section}`;
                }),
            );

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
        importerVisible,
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
                module: 'game',
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
                module: 'web',
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
                module: 'vds',
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

    const [pluginItems, setPluginItems] = useState<GlobalSearchResult[]>([]);
    const [userItems, setUserItems] = useState<GlobalSearchResult[]>([]);
    const canViewUsers = hasPermission(Permissions.ADMIN_USERS_VIEW);

    // Users are searched on the server (there can be thousands), only for staff who can list them.
    useEffect(() => {
        const q = parsedQuery.text.trim();
        const scopeAllowsUsers = !parsedQuery.scopeExplicit || ['all', 'admin'].includes(parsedQuery.scope);
        if (!open || !canViewUsers || q.length < 2 || !scopeAllowsUsers || parsedQuery.mode === 'debug') {
            setUserItems([]);
            return;
        }
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const { data } = await axios.get('/api/admin/users', {
                    params: { page: 1, limit: 6, search: q },
                    signal: controller.signal,
                });
                const users: Array<{ uuid: string; username: string; email?: string }> = data?.data?.users ?? [];
                setUserItems(
                    users.map((user) => ({
                        id: `user-${user.uuid}`,
                        title: user.username,
                        subtitle: user.email,
                        href: `/admin/users/${user.uuid}/edit`,
                        category: 'users' as const,
                        icon: UsersIcon,
                        keywords: [user.username, user.email ?? '', user.uuid, q],
                    })),
                );
            } catch {
                if (!controller.signal.aborted) setUserItems([]);
            }
        }, 250);
        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [open, canViewUsers, parsedQuery.text, parsedQuery.scope, parsedQuery.scopeExplicit, parsedQuery.mode]);

    useEffect(() => {
        if (!open) {
            setPluginItems([]);
            return;
        }
        let cancelled = false;
        const q = parsedQuery.text.trim();
        void (async () => {
            try {
                const { pluginActionHooks } = await import('@/lib/plugin-sdk/action-hooks');
                const { pluginSearchRegistry } = await import('@/lib/plugin-sdk/registries');
                const { FP_ACTIONS } = await import('@/lib/plugin-sdk/ids');
                const ctx = await pluginActionHooks.run(FP_ACTIONS.SEARCH_QUERY, { query: q });
                if (ctx.cancelled || cancelled) return;
                const finalQuery = typeof ctx.query === 'string' ? ctx.query : q;
                const pluginResults = await pluginSearchRegistry.query(finalQuery);
                if (cancelled) return;
                setPluginItems(
                    pluginResults.map((r) => ({
                        id: `plugin:${r.id}`,
                        title: r.title,
                        subtitle: r.description,
                        href: r.href || '#',
                        category: 'plugins' as const,
                        keywords: [r.category || 'plugin'],
                    })),
                );
            } catch {
                if (!cancelled) setPluginItems([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, parsedQuery.text]);

    // ---- Recents (per user, this browser only) ----
    const [recents, setRecents] = useState<RecentSearchEntry[]>([]);
    useEffect(() => {
        if (open) setRecents(loadRecentSearches(user?.uuid));
    }, [open, user?.uuid]);
    const recordRecent = useCallback(
        (result: GlobalSearchResult) => setRecents(saveRecentSearch(user?.uuid, result)),
        [user?.uuid],
    );
    const clearRecents = useCallback(() => {
        clearRecentSearches(user?.uuid);
        setRecents([]);
    }, [user?.uuid]);
    const recentItems = useMemo<GlobalSearchResult[]>(
        () =>
            recents
                .filter((entry) => canViewAdmin || !ADMIN_RECENT_CATEGORIES.includes(entry.category))
                .map((entry) => ({
                    id: `recent:${entry.id}`,
                    title: entry.title,
                    subtitle: entry.subtitle,
                    href: entry.href,
                    category: 'recent' as const,
                    icon: RECENT_CATEGORY_ICONS[entry.category] ?? History,
                })),
        [recents, canViewAdmin],
    );

    // ---- Commands (`>`): quick actions, permission filtered ----
    const commandItems = useMemo<GlobalSearchResult[]>(() => {
        const commands: Array<Omit<GlobalSearchResult, 'category'>> = [
            {
                id: 'cmd:theme',
                title: t('globalSearch.commands.toggleTheme'),
                href: '#',
                action: 'toggleTheme',
                icon: SunMoon,
                keywords: ['dark', 'light', 'theme', 'mode'],
            },
            {
                id: 'cmd:ticket',
                title: t('globalSearch.commands.newTicket'),
                href: '/dashboard/tickets/create',
                icon: LifeBuoy,
                keywords: ['support', 'help', 'ticket'],
            },
            {
                id: 'cmd:account',
                title: t('globalSearch.commands.accountSecurity'),
                href: '/dashboard/account?tab=security',
                icon: ShieldCheck,
                keywords: ['2fa', 'password', 'sessions'],
            },
            {
                id: 'cmd:new-server',
                title: t('globalSearch.commands.newServer'),
                href: '/admin/servers/create',
                icon: Plus,
                permission: Permissions.ADMIN_SERVERS_CREATE,
                keywords: ['create', 'server'],
            },
            {
                id: 'cmd:new-user',
                title: t('globalSearch.commands.newUser'),
                href: '/admin/users/create',
                icon: Plus,
                permission: Permissions.ADMIN_USERS_CREATE,
                keywords: ['create', 'user', 'account'],
            },
            {
                id: 'cmd:new-node',
                title: t('globalSearch.commands.newNode'),
                href: '/admin/nodes/create',
                icon: Plus,
                permission: Permissions.ADMIN_NODES_CREATE,
                keywords: ['create', 'node', 'wings'],
            },
            {
                id: 'cmd:audit',
                title: t('globalSearch.commands.auditLog'),
                href: '/admin/audit-log',
                icon: ScrollText,
                permission: Permissions.ADMIN_AUDIT_LOG_VIEW,
                keywords: ['activity', 'log', 'audit'],
            },
            {
                id: 'cmd:clear-recents',
                title: t('globalSearch.commands.clearRecents'),
                href: '#',
                action: 'clearRecents',
                icon: Eraser,
                keywords: ['history', 'recent'],
            },
            {
                id: 'cmd:logout',
                title: t('globalSearch.commands.signOut'),
                href: '/auth/logout',
                icon: LogOut,
                keywords: ['logout', 'sign out', 'exit'],
            },
        ];
        return filterByPermission(
            commands.map((command) => ({
                ...command,
                category: 'commands' as const,
                subtitle: command.action ? t('globalSearch.commands.actionHint') : command.href,
            })),
            hasPermission,
        );
    }, [t, hasPermission]);

    // ---- Server-side lookups: nodes, tickets and files (debounced, abortable) ----
    const [remoteItems, setRemoteItems] = useState<GlobalSearchResult[]>([]);
    const [remoteLoading, setRemoteLoading] = useState(false);
    const [filesUnavailable, setFilesUnavailable] = useState<'noServer' | 'error' | null>(null);
    const canViewNodes = hasPermission(Permissions.ADMIN_NODES_VIEW);
    const canViewAdminTickets = hasPermission(Permissions.ADMIN_TICKETS_VIEW);
    const serverRouteId = entityContext?.kind === 'server' ? entityContext.routeId : null;

    useEffect(() => {
        const q = parsedQuery.text.trim();
        const scope = parsedQuery.scope;
        const unscoped = !parsedQuery.scopeExplicit || scope === 'all';
        const wantFiles = scope === 'files';
        const wantNodes =
            canViewNodes && q.length >= 2 && (unscoped || ['admin', 'nodes', 'infrastructure'].includes(scope));
        const wantTickets = !!user && q.length >= 2 && (unscoped || ['tickets', 'admin'].includes(scope));
        setFilesUnavailable(wantFiles && !serverRouteId ? 'noServer' : null);
        if (!open || parsedQuery.mode === 'debug' || (!wantFiles && !wantNodes && !wantTickets)) {
            setRemoteItems([]);
            setRemoteLoading(false);
            return;
        }
        const controller = new AbortController();
        setRemoteLoading(true);
        const timer = window.setTimeout(async () => {
            const jobs: Array<Promise<GlobalSearchResult[]>> = [];
            if (wantFiles && serverRouteId) {
                // `/config/ser` lists /config and filters by "ser"; `/` alone lists the root.
                const slash = q.lastIndexOf('/');
                const directory = slash >= 0 ? `/${q.slice(0, slash)}` : '/';
                const needle = slash >= 0 ? q.slice(slash + 1) : q;
                jobs.push(
                    filesApi
                        .getFiles(serverRouteId, directory, needle || undefined)
                        .then(({ contents }) =>
                            contents
                                .filter((file) => !file.isTrashShortcut)
                                .slice(0, 25)
                                .map((file) => {
                                    const fullPath = `${directory === '/' ? '' : directory}/${file.name}`;
                                    return {
                                        id: `file:${serverRouteId}:${fullPath}`,
                                        title: file.name,
                                        subtitle: fullPath,
                                        href: file.isFile
                                            ? `/server/${serverRouteId}/files/edit?file=${encodeURIComponent(file.name)}&directory=${encodeURIComponent(directory)}`
                                            : `/server/${serverRouteId}/files?path=${encodeURIComponent(fullPath)}`,
                                        category: 'files' as const,
                                        icon: file.isFile ? FileText : Folder,
                                        keywords: [fullPath],
                                        contextTag: entityContext?.entityName,
                                    };
                                }),
                        )
                        .catch(() => {
                            if (!controller.signal.aborted) setFilesUnavailable('error');
                            return [];
                        }),
                );
            }
            if (wantNodes) {
                jobs.push(
                    axios
                        .get('/api/admin/nodes', {
                            params: { page: 1, limit: 5, search: q },
                            signal: controller.signal,
                        })
                        .then(({ data }) =>
                            ((data?.data?.nodes ?? []) as Array<{ id: number; name: string; fqdn?: string }>).map(
                                (node) => ({
                                    id: `node:${node.id}`,
                                    title: node.name,
                                    subtitle: node.fqdn,
                                    href: `/admin/nodes/${node.id}/edit`,
                                    category: 'nodes' as const,
                                    icon: Network,
                                    keywords: [node.fqdn ?? '', q],
                                }),
                            ),
                        )
                        .catch(() => []),
                );
            }
            if (wantTickets) {
                const url = canViewAdminTickets ? '/api/admin/tickets' : '/api/user/tickets';
                jobs.push(
                    axios
                        .get(url, { params: { page: 1, limit: 5, search: q }, signal: controller.signal })
                        .then(({ data }) =>
                            ((data?.data?.tickets ?? []) as Array<{ id: number; uuid: string; title: string }>).map(
                                (ticket) => ({
                                    id: `ticket:${ticket.uuid}`,
                                    title: ticket.title,
                                    subtitle: `#${ticket.id}`,
                                    href: canViewAdminTickets
                                        ? `/admin/tickets/${ticket.uuid}`
                                        : `/dashboard/tickets/${ticket.uuid}`,
                                    category: 'tickets' as const,
                                    icon: LifeBuoy,
                                    keywords: [String(ticket.id), q],
                                }),
                            ),
                        )
                        .catch(() => []),
                );
            }
            const settled = (await Promise.all(jobs)).flat();
            if (!controller.signal.aborted) {
                setRemoteItems(settled);
                setRemoteLoading(false);
            }
        }, 300);
        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [
        open,
        user,
        canViewNodes,
        canViewAdminTickets,
        serverRouteId,
        entityContext?.entityName,
        parsedQuery.text,
        parsedQuery.scope,
        parsedQuery.scopeExplicit,
        parsedQuery.mode,
    ]);

    const results = useMemo(() => {
        if (parsedQuery.mode === 'debug') return [];

        const q = parsedQuery.text.trim();
        const scope = parsedQuery.scope;
        if (scope === 'files') {
            // Wings already filtered the folder by name; sort the matches alphabetically.
            return filterGlobalSearchResults(remoteItems, '', { parsed: { ...parsedQuery, text: '' } });
        }
        const withCommands = q || scope === 'commands' ? commandItems : [];
        const merged = dedupeGlobalSearchResults([
            ...allItems,
            ...pluginItems,
            ...userItems,
            ...remoteItems,
            ...withCommands,
        ]);
        const filtered = filterGlobalSearchResults(merged, query, {
            parsed: parsedQuery,
            recentHrefs: recents.map((entry) => entry.href),
        });
        if (!q && !parsedQuery.scopeExplicit && recentItems.length > 0) {
            const recentHrefs = new Set(recentItems.map((item) => item.href));
            return [...recentItems, ...filtered.filter((item) => !recentHrefs.has(item.href))];
        }

        if (!q && entityContext && showCurrentContext) {
            const contextResults = filtered.filter(
                (result) => result.category === 'currentContext' || result.isCurrentContext,
            );
            if (contextResults.length > 0) return contextResults;
        }

        return filtered;
    }, [
        allItems,
        pluginItems,
        userItems,
        remoteItems,
        commandItems,
        recents,
        recentItems,
        query,
        parsedQuery,
        entityContext,
        showCurrentContext,
    ]);

    return {
        results,
        parsedQuery,
        entityContext,
        loading: serversLoading || webspacesLoading || vmsLoading || adminSettingsLoading || remoteLoading,
        filesUnavailable,
        recordRecent,
        clearRecents,
        hasRecents: recentItems.length > 0,
    };
}

export type { ParsedGlobalSearchQuery, GlobalSearchEntityContext };
