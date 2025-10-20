/*
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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

import { computed, ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useSessionStore } from '@/stores/session';
import {
    Home,
    Users,
    Settings,
    Server,
    Database,
    Calendar,
    Archive,
    Network,
    PlayCircle,
    FileText,
    Clock,
    SquareTerminal,
    Folder,
    Newspaper,
    Key,
    Globe,
    ImageIcon,
    Link,
    BookAlert,
    TerminalIcon,
    BarChart3,
    Crown,
    Activity,
} from 'lucide-vue-next';
import type { LucideIcon } from 'lucide-vue-next';
import Permissions from '@/lib/permissions';

export interface NavigationItem {
    id: string;
    name: string;
    title: string;
    url: string;
    icon: LucideIcon | string; // LucideIcon for built-in items, emoji string for plugins
    isActive: boolean;
    category: 'main' | 'admin' | 'server' | 'debug';
    permission?: string;
    isPlugin?: boolean;
    pluginJs?: string;
    pluginRedirect?: string;
    pluginName?: string;
    pluginTag?: string;
    showBadge?: boolean;
    description?: string;
    group?: string; // For organizing admin items into groups
}

export interface NavigationGroup {
    name: string;
    items: NavigationItem[];
}

interface PluginSidebarItem {
    name: string;
    icon: string;
    js?: string;
    redirect?: string;
    description: string;
    category: string;
    plugin: string;
    pluginName: string;
    permission?: string;
    showBadge?: boolean;
}

interface PluginSidebarResponse {
    success: boolean;
    data: {
        sidebar: {
            server: Record<string, PluginSidebarItem>;
            dashboard: Record<string, PluginSidebarItem>;
            admin: Record<string, PluginSidebarItem>;
        };
    };
}

// Plugins can ONLY use emojis - no Lucide icon conversion
function getPluginIcon(emojiIcon: string): string {
    // Return the emoji string as-is
    return emojiIcon;
}

// Shared (module-scoped) plugin sidebar cache so multiple composable consumers see the same data
const sharedPluginRoutes = ref<PluginSidebarResponse['data']['sidebar'] | null>(null);

export function useNavigation() {
    const router = useRouter();
    const route = useRoute();
    const { t } = useI18n();
    const sessionStore = useSessionStore();

    // Point to the shared cache
    const pluginRoutes = sharedPluginRoutes;

    const currentPath = computed(() => router.currentRoute.value.path);

    // Fetch plugin sidebar routes
    const fetchPluginRoutes = async () => {
        try {
            // Avoid refetching if we already have data
            if (pluginRoutes.value) return;

            const response = await fetch('/api/system/plugin-sidebar');
            const data: PluginSidebarResponse = await response.json();

            if (data.success) {
                pluginRoutes.value = data.data.sidebar;
            }
        } catch (error) {
            console.error('Failed to fetch plugin routes:', error);
        }
    };

    // Handle plugin navigation click
    const handlePluginClick = (pluginJs?: string, pluginRedirect?: string) => {
        // JS takes priority
        if (pluginJs) {
            try {
                // Execute the plugin JavaScript
                eval(pluginJs);
            } catch (error) {
                console.error('Failed to execute plugin JavaScript:', error);
            }
        } else if (pluginRedirect) {
            // Use Vue router for redirect
            router.push(pluginRedirect);
        }
    };

    // Convert plugin items to NavigationItems
    const convertPluginItems = (
        pluginItems: Record<string, PluginSidebarItem>,
        category: 'main' | 'admin' | 'server',
        uuidShort?: string,
    ): NavigationItem[] => {
        return Object.entries(pluginItems).map(([url, item]) => {
            // Build absolute URLs for each category to ensure correct routing and active state checks
            let fullUrl = url;
            if (category === 'server' && uuidShort) {
                fullUrl = `/server/${uuidShort}${url}`;
            } else if (category === 'admin') {
                fullUrl = `/admin${url}`;
            } else if (category === 'main') {
                fullUrl = `/dashboard${url}`;
            }

            // Normalize redirect: if plugin provides a redirect, prefix it appropriately; otherwise, default to fullUrl
            let fullRedirect = item.redirect;
            if (fullRedirect) {
                if (category === 'server' && uuidShort) {
                    fullRedirect = `/server/${uuidShort}${item.redirect}`;
                } else if (category === 'admin') {
                    fullRedirect = `/admin${item.redirect}`;
                } else if (category === 'main') {
                    fullRedirect = `/dashboard${item.redirect}`;
                }
            } else {
                fullRedirect = fullUrl;
            }

            return {
                id: `plugin-${item.plugin}-${url.replace(/\//g, '-')}`,
                name: item.name,
                title: item.name,
                url: fullUrl,
                icon: getPluginIcon(item.icon),
                isActive: currentPath.value.startsWith(fullUrl),
                category,
                isPlugin: true,
                pluginJs: item.js,
                pluginRedirect: fullRedirect,
                pluginName: item.pluginName,
                pluginTag: item.pluginName,
                showBadge: item.showBadge !== false,
                description: item.description,
            };
        });
    };

    // Initialize plugin routes on mount
    onMounted(() => {
        void fetchPluginRoutes();
    });

    // Main navigation items
    const mainItems = computed((): NavigationItem[] => {
        const items = [
            {
                id: 'dashboard',
                name: 'Main',
                title: t('nav.dashboard'),
                url: '/dashboard',
                icon: Home,
                isActive:
                    currentPath.value.startsWith('/dashboard') && !currentPath.value.startsWith('/dashboard/account'),
                category: 'main' as const,
            },
            {
                id: 'account',
                name: 'Account',
                title: t('nav.account'),
                url: '/dashboard/account',
                icon: Users,
                isActive: currentPath.value.startsWith('/dashboard/account'),
                category: 'main' as const,
            },
        ];

        // Add plugin dashboard items
        if (pluginRoutes.value?.dashboard) {
            const pluginItems = convertPluginItems(pluginRoutes.value.dashboard, 'main') as typeof items;
            items.push(...pluginItems);
        }

        return items;
    });

    // Admin navigation items
    const adminItems = computed((): NavigationItem[] => {
        const items = [
            // Overview
            {
                id: 'admin-dashboard',
                name: 'Dashboard',
                title: t('nav.dashboard'),
                url: '/admin',
                icon: Home,
                isActive: currentPath.value.startsWith('/admin') && currentPath.value === '/admin',
                category: 'admin' as const,
                permission: Permissions.ADMIN_DASHBOARD_VIEW,
                group: 'overview',
            },
            {
                id: 'admin-kpi-analytics',
                name: 'Analytics (KPIs)',
                title: 'Analytics (KPIs)',
                url: '/admin/kpi/analytics',
                icon: BarChart3,
                isActive: currentPath.value.startsWith('/admin/kpi'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_USERS_VIEW,
                group: 'overview',
            },
            // User Management
            {
                id: 'admin-users',
                name: 'Users',
                title: t('nav.users'),
                url: '/admin/users',
                icon: Users,
                isActive: currentPath.value.startsWith('/admin/users'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_USERS_VIEW,
                group: 'users',
            },
            {
                id: 'admin-roles',
                name: 'Roles',
                title: t('nav.roles'),
                url: '/admin/roles',
                icon: Crown,
                isActive: currentPath.value.startsWith('/admin/roles'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_ROLES_VIEW,
                group: 'users',
            },
            {
                id: 'admin-api-keys',
                name: 'API Keys',
                title: t('nav.apiKeys'),
                url: '/admin/api-keys',
                icon: Key,
                isActive: currentPath.value.startsWith('/admin/api-keys'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_DASHBOARD_VIEW,
                group: 'system',
            },
            // Infrastructure
            {
                id: 'admin-servers',
                name: 'Servers',
                title: t('nav.servers'),
                url: '/admin/servers',
                icon: Server,
                isActive: currentPath.value.startsWith('/admin/servers'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_SERVERS_VIEW,
                group: 'infrastructure',
            },
            {
                id: 'admin-nodes-status',
                name: 'Node Status',
                title: 'Node Status Dashboard',
                url: '/admin/nodes/status',
                icon: Activity,
                isActive: currentPath.value === '/admin/nodes/status',
                category: 'admin' as const,
                permission: Permissions.ADMIN_NODES_VIEW,
                group: 'overview',
            },
            {
                id: 'admin-locations',
                name: 'Locations',
                title: t('nav.locations'),
                url: '/admin/locations',
                icon: Globe,
                isActive: currentPath.value.startsWith('/admin/locations'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_LOCATIONS_VIEW,
                group: 'infrastructure',
            },
            // Content
            {
                id: 'admin-realms',
                name: 'Realms',
                title: t('nav.realms') + ' (Nests)',
                url: '/admin/realms',
                icon: Newspaper,
                isActive: currentPath.value.startsWith('/admin/realms'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_REALMS_VIEW,
                group: 'infrastructure',
            },
            {
                id: 'admin-images',
                name: 'Images',
                title: t('nav.images'),
                url: '/admin/images',
                icon: ImageIcon,
                isActive: currentPath.value.startsWith('/admin/images'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_IMAGES_VIEW,
                group: 'content',
            },
            {
                id: 'admin-mail-templates',
                name: 'Mail Templates',
                title: t('nav.mailTemplates'),
                url: '/admin/mail-templates',
                icon: FileText,
                isActive: currentPath.value.startsWith('/admin/mail-templates'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_TEMPLATE_EMAIL_VIEW,
                group: 'content',
            },
            // System
            {
                id: 'admin-settings',
                name: 'Settings',
                title: t('nav.settings'),
                url: '/admin/settings',
                icon: Settings,
                isActive: currentPath.value.startsWith('/admin/settings'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_SETTINGS_VIEW,
                group: 'system',
            },
            {
                id: 'admin-plugins',
                name: 'Plugins',
                title: t('nav.plugins'),
                url: '/admin/plugins',
                icon: PlayCircle,
                isActive: currentPath.value.startsWith('/admin/plugins'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_PLUGINS_VIEW,
                group: 'system',
            },
            {
                id: 'admin-database-management',
                name: 'DB Management',
                title: 'Database Management',
                url: '/admin/databases/management',
                icon: Database,
                isActive: currentPath.value.startsWith('/admin/databases/management'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_DATABASES_VIEW,
                group: 'system',
            },
            {
                id: 'admin-redirect-links',
                name: 'Redirect Links',
                title: t('nav.redirectLinks'),
                url: '/admin/redirect-links',
                icon: Link,
                isActive: currentPath.value.startsWith('/admin/redirect-links'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_REDIRECT_LINKS_VIEW,
                group: 'content',
            },
        ];

        // Add plugin admin items (no permission checks for plugins)
        if (pluginRoutes.value?.admin) {
            const pluginItems = convertPluginItems(pluginRoutes.value.admin, 'admin') as typeof items;
            // Assign plugins to a 'plugins' group
            pluginItems.forEach((item) => {
                item.group = 'plugins';
            });
            items.push(...pluginItems);
        }

        return items;
    });

    // Server navigation items
    const serverItems = computed((): NavigationItem[] => {
        const uuidShort = route.params.uuidShort;
        if (!uuidShort || !currentPath.value.startsWith('/server')) return [];

        const items = [
            {
                id: 'server-console',
                name: 'Console',
                title: t('nav.console'),
                url: `/server/${uuidShort}`,
                icon: SquareTerminal,
                isActive: currentPath.value === `/server/${uuidShort}`,
                category: 'server' as const,
                group: 'management',
            },
            {
                id: 'server-logs',
                name: 'Logs',
                title: t('nav.logs'),
                url: `/server/${uuidShort}/logs`,
                icon: FileText,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/logs`),
                category: 'server' as const,
                group: 'management',
            },
            {
                id: 'server-activities',
                name: 'Activities',
                title: t('nav.activities'),
                url: `/server/${uuidShort}/activities`,
                icon: Clock,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/activities`),
                category: 'server' as const,
                group: 'management',
            },
            {
                id: 'server-files',
                name: 'Files',
                title: t('nav.files'),
                url: `/server/${uuidShort}/files`,
                icon: Folder,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/files`),
                category: 'server' as const,
                group: 'files',
            },
            {
                id: 'server-databases',
                name: 'Databases',
                title: t('nav.databases'),
                url: `/server/${uuidShort}/databases`,
                icon: Database,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/databases`),
                category: 'server' as const,
                group: 'files',
            },
            {
                id: 'server-schedules',
                name: 'Schedules',
                title: t('nav.schedules'),
                url: `/server/${uuidShort}/schedules`,
                icon: Calendar,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/schedules`),
                category: 'server' as const,
                group: 'automation',
            },
            {
                id: 'server-users',
                name: 'Users',
                title: t('nav.users'),
                url: `/server/${uuidShort}/users`,
                icon: Users,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/users`),
                category: 'server' as const,
                group: 'configuration',
            },
            {
                id: 'server-backups',
                name: 'Backups',
                title: t('nav.backups'),
                url: `/server/${uuidShort}/backups`,
                icon: Archive,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/backups`),
                category: 'server' as const,
                group: 'files',
            },
            {
                id: 'server-allocations',
                name: 'Allocations',
                title: 'Allocations',
                url: `/server/${uuidShort}/allocations`,
                icon: Network,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/allocations`),
                category: 'server' as const,
                group: 'configuration',
            },
            {
                id: 'server-startup',
                name: 'Startup',
                title: t('nav.startup'),
                url: `/server/${uuidShort}/startup`,
                icon: PlayCircle,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/startup`),
                category: 'server' as const,
                group: 'configuration',
            },
            {
                id: 'server-settings',
                name: 'Settings',
                title: t('nav.settings'),
                url: `/server/${uuidShort}/settings`,
                icon: Settings,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/settings`),
                category: 'server' as const,
                group: 'configuration',
            },
        ];

        // Add plugin server items and ensure they are grouped correctly so they render in the sidebar
        if (pluginRoutes.value?.server) {
            const pluginItems = convertPluginItems(
                pluginRoutes.value.server,
                'server',
                uuidShort as string,
            ) as typeof items;
            pluginItems.forEach((item) => {
                item.group = 'plugins';
            });
            items.push(...pluginItems);
        }

        return items;
    });

    const debugItems = computed((): NavigationItem[] => {
        return [
            {
                id: 'debug-logs',
                name: 'Log Viewer',
                title: 'Log Viewer',
                url: '/admin/dev/logs',
                icon: BookAlert,
                isActive: currentPath.value.startsWith('/admin/dev/logs'),
                category: 'debug' as const,
            },
            {
                id: 'debug-file-manager',
                name: 'File Manager',
                title: 'File Manager',
                url: '/admin/dev/files',
                icon: FileText,
                isActive: currentPath.value.startsWith('/admin/dev/files'),
                category: 'debug' as const,
            },
            {
                id: 'debug-console',
                name: 'Console',
                title: 'Console',
                url: '/admin/dev/console',
                icon: TerminalIcon,
                isActive: currentPath.value.startsWith('/admin/dev/console'),
                category: 'debug' as const,
            },
            {
                id: 'debug-plugin-manager',
                name: 'Plugin Manager',
                title: 'Plugin Manager',
                url: '/admin/dev/plugins',
                icon: PlayCircle,
                isActive: currentPath.value.startsWith('/admin/dev/plugin-manager'),
                category: 'debug' as const,
            },
        ];
    });

    const filteredDebugItems = computed(() =>
        debugItems.value.filter((item) => !item.permission || sessionStore.hasPermission(item.permission)),
    );

    // Filter admin items based on permissions
    const filteredAdminItems = computed(() =>
        adminItems.value.filter((item) => !item.permission || sessionStore.hasPermission(item.permission)),
    );

    // Group admin items by their group field
    const groupedAdminItems = computed((): NavigationGroup[] => {
        const groups: Record<string, NavigationItem[]> = {};

        filteredAdminItems.value.forEach((item) => {
            const groupKey = item.group || 'other';
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(item);
        });

        // Define group order and labels
        const groupConfig: Record<string, string> = {
            overview: 'Overview',
            users: 'User Management',
            infrastructure: 'Infrastructure',
            content: 'Content',
            system: 'System',
            plugins: 'Plugins',
        };

        // Return groups in specific order
        return Object.keys(groupConfig)
            .filter((key) => groups[key] && groups[key].length > 0)
            .map((key) => {
                const name = groupConfig[key];
                const items = groups[key];
                if (!name || !items) {
                    return { name: '', items: [] };
                }
                return { name, items };
            })
            .filter((group) => group.name && group.items.length > 0);
    });

    // Grouped server navigation items
    const groupedServerItems = computed((): NavigationGroup[] => {
        const groups: Record<string, NavigationItem[]> = {};

        serverItems.value.forEach((item) => {
            const groupKey = item.group || 'other';
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(item);
        });

        // Define group order and labels
        const groupConfig: Record<string, string> = {
            management: 'Management',
            files: 'Files & Data',
            automation: 'Automation',
            configuration: 'Configuration',
            plugins: 'Plugins',
        };

        // Return groups in specific order
        return Object.keys(groupConfig)
            .filter((key) => groups[key] && groups[key].length > 0)
            .map((key) => {
                const name = groupConfig[key];
                const items = groups[key];
                if (!name || !items) {
                    return { name: '', items: [] };
                }
                return { name, items };
            })
            .filter((group) => group.name && group.items.length > 0);
    });

    // Get all navigation items based on current route
    const allNavigationItems = computed(() => {
        const items: NavigationItem[] = [];

        // Always include main items
        items.push(...mainItems.value);

        // Add admin items if on admin pages
        if (currentPath.value.startsWith('/admin')) {
            items.push(...filteredAdminItems.value);
        }

        // Add server items if on server pages
        if (currentPath.value.startsWith('/server')) {
            items.push(...serverItems.value);
        }

        return items;
    });

    // Get items for sidebar (grouped by category)
    const sidebarNavigation = computed(() => ({
        navMain: mainItems.value,
        navAdmin: filteredAdminItems.value,
        navAdminGrouped: groupedAdminItems.value,
        navServer: serverItems.value,
        navServerGrouped: groupedServerItems.value,
        navDebug: filteredDebugItems.value,
    }));

    // Get items for dock (flattened)
    const dockNavigation = computed(() => allNavigationItems.value);

    return {
        currentPath,
        mainItems,
        adminItems: filteredAdminItems,
        serverItems,
        allNavigationItems,
        sidebarNavigation,
        dockNavigation,
        handlePluginClick,
        fetchPluginRoutes,
    };
}
