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

import { computed, ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import axios from 'axios';
import {
    Home,
    Users,
    Settings,
    Server,
    Database,
    Calendar,
    Archive,
    Download,
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
    ShieldCheck,
    Bot,
    Package,
    Bell,
    BookOpen,
    Mail,
    Ticket,
    Gauge,
    ArrowRightLeft,
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
    group?: string; // Group name for organizing items (e.g., "Minecraft Java Edition")
}

interface PluginSidebarResponse {
    success: boolean;
    data: {
        sidebar: {
            server: Record<string, PluginSidebarItem>;
            client: Record<string, PluginSidebarItem>;
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
    const settingsStore = useSettingsStore();

    // Point to the shared cache
    const pluginRoutes = sharedPluginRoutes;

    const currentPath = computed(() => router.currentRoute.value.path);

    // Store current server's subuser permissions
    const serverPermissions = ref<string[]>([]);
    const isServerOwner = ref(true);

    // Fetch server permissions when on a server page
    const fetchServerPermissions = async (uuidShort: string) => {
        try {
            const response = await axios.get(`/api/user/servers`);
            const data = response.data;

            if (data.success && data.data?.servers) {
                // Find the current server in the list
                const server = data.data.servers.find((s: { uuidShort: string }) => s.uuidShort === uuidShort);

                if (server) {
                    isServerOwner.value = !server.is_subuser;

                    // If user is a subuser, get their permissions
                    if (server.is_subuser && server.subuser_permissions) {
                        serverPermissions.value = server.subuser_permissions;
                    } else if (isServerOwner.value) {
                        // Owner has all permissions
                        serverPermissions.value = ['*'];
                    } else {
                        serverPermissions.value = [];
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch server permissions:', error);
            // Default to showing all items if we can't fetch
            isServerOwner.value = true;
            serverPermissions.value = ['*'];
        }
    };

    // Check if user has permission for a server action
    const hasServerPermission = (permission: string): boolean => {
        // If user has admin.root, they have all permissions
        if (sessionStore.hasPermission('admin.root')) return true;

        // If server owner, has all permissions
        if (isServerOwner.value) return true;

        // Check if subuser has the specific permission
        return serverPermissions.value.includes(permission) || serverPermissions.value.includes('*');
    };

    // Watch for server page changes
    watch(
        () => route.params.uuidShort,
        (newUuidShort) => {
            if (newUuidShort && typeof newUuidShort === 'string') {
                void fetchServerPermissions(newUuidShort);
            } else {
                // Reset when leaving server pages
                serverPermissions.value = [];
                isServerOwner.value = true;
            }
        },
        { immediate: true },
    );

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
        return Object.entries(pluginItems)
            .filter(([, item]) => {
                // If plugin has a permission requirement, check it
                if (item.permission) {
                    if (category === 'server') {
                        // For server plugins, check subuser permissions
                        return hasServerPermission(item.permission);
                    } else {
                        // For admin/main plugins, check session permissions
                        return sessionStore.hasPermission(item.permission);
                    }
                }
                // If no permission specified, show to everyone (for backwards compatibility)
                return true;
            })
            .map(([url, item]) => {
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
                    permission: item.permission, // Include permission for reference
                    group: item.group, // Use group from plugin item, or undefined to fall back to default
                };
            });
    };

    // Initialize plugin routes on mount
    onMounted(() => {
        void fetchPluginRoutes();
    });

    // Main navigation items
    const mainItems = computed((): NavigationItem[] => {
        const items: NavigationItem[] = [
            {
                id: 'dashboard',
                name: t('nav.main'),
                title: t('nav.dashboard'),
                url: '/dashboard',
                icon: Home,
                isActive: currentPath.value === '/dashboard',
                category: 'main' as const,
                group: 'overview',
            },
            // Account section - individual entries for each account tab
            {
                id: 'account-profile',
                name: t('nav.account'),
                title: t('account.profile'),
                url: '/dashboard/account?tab=profile',
                icon: Users,
                isActive:
                    currentPath.value.startsWith('/dashboard/account') &&
                    (!route.query.tab || route.query.tab === 'profile'),
                category: 'main' as const,
                group: 'account',
            },
            {
                id: 'account-settings',
                name: t('nav.account'),
                title: t('account.settings'),
                url: '/dashboard/account?tab=settings',
                icon: Settings,
                isActive: currentPath.value.startsWith('/dashboard/account') && route.query.tab === 'settings',
                category: 'main' as const,
                group: 'account',
            },
            {
                id: 'account-appearance',
                name: t('nav.account'),
                title: t('account.appearance'),
                url: '/dashboard/account?tab=appearance',
                icon: Activity,
                isActive: currentPath.value.startsWith('/dashboard/account') && route.query.tab === 'appearance',
                category: 'main' as const,
                group: 'account',
            },
            {
                id: 'account-ssh-keys',
                name: t('nav.account'),
                title: t('account.sshKeys.title'),
                url: '/dashboard/account?tab=ssh-keys',
                icon: Key,
                isActive: currentPath.value.startsWith('/dashboard/account') && route.query.tab === 'ssh-keys',
                category: 'main' as const,
                group: 'account',
            },
            {
                id: 'account-api-keys',
                name: t('nav.account'),
                title: t('account.apiKeys.title'),
                url: '/dashboard/account?tab=api-keys',
                icon: Key,
                isActive: currentPath.value.startsWith('/dashboard/account') && route.query.tab === 'api-keys',
                category: 'main' as const,
                group: 'account',
            },
            {
                id: 'account-activity',
                name: t('nav.account'),
                title: t('account.activity.title'),
                url: '/dashboard/account?tab=activity',
                icon: Clock,
                isActive: currentPath.value.startsWith('/dashboard/account') && route.query.tab === 'activity',
                category: 'main' as const,
                group: 'account',
            },
            {
                id: 'account-mail',
                name: t('nav.account'),
                title: t('account.mail.title'),
                url: '/dashboard/account?tab=mail',
                icon: Mail,
                isActive: currentPath.value.startsWith('/dashboard/account') && route.query.tab === 'mail',
                category: 'main' as const,
                group: 'account',
            },
            // Support section
            {
                id: 'knowledgebase',
                name: 'Knowledgebase',
                title: 'Knowledgebase',
                url: '/dashboard/knowledgebase',
                icon: BookOpen,
                isActive: currentPath.value.startsWith('/dashboard/knowledgebase'),
                category: 'main' as const,
                group: 'support',
            },
            {
                id: 'tickets',
                name: 'Support Tickets',
                title: 'Support Tickets',
                url: '/dashboard/tickets',
                icon: Ticket,
                isActive: currentPath.value.startsWith('/dashboard/tickets'),
                category: 'main' as const,
                group: 'support',
            },
        ];

        // Only add status page if enabled
        if (settingsStore.statusPageEnabled) {
            items.push({
                id: 'status',
                name: t('nav.status'),
                title: t('nav.status'),
                url: '/dashboard/status',
                icon: Activity,
                isActive: currentPath.value.startsWith('/dashboard/status'),
                category: 'main' as const,
                // Group Status together with Knowledgebase under "support"
                group: 'support',
            });
        }

        // Add plugin client items (with permission filtering)
        if (pluginRoutes.value?.client) {
            const pluginItems = convertPluginItems(pluginRoutes.value.client, 'main');
            // Group all client plugins under the "plugins" main group
            pluginItems.forEach((item) => {
                item.group = 'plugins';
            });
            items.push(...pluginItems);
        }

        return items;
    });

    // Admin navigation items
    const adminItems = computed((): NavigationItem[] => {
        const items: NavigationItem[] = [
            // Overview
            {
                id: 'admin-dashboard',
                name: t('nav.dashboard'),
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
                name: t('nav.analyticsKpis'),
                title: t('nav.analyticsKpis'),
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
                name: t('nav.users'),
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
                name: t('nav.roles'),
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
                name: t('nav.apiKeys'),
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
                name: t('nav.servers'),
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
                name: t('nav.nodeStatus'),
                title: t('nav.nodeStatusDashboard'),
                url: '/admin/nodes/status',
                icon: Activity,
                isActive: currentPath.value === '/admin/nodes/status',
                category: 'admin' as const,
                permission: Permissions.ADMIN_NODES_VIEW,
                group: 'overview',
            },
            {
                id: 'admin-locations',
                name: t('nav.locations'),
                title: t('nav.locations'),
                url: '/admin/locations',
                icon: Globe,
                isActive: currentPath.value.startsWith('/admin/locations'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_LOCATIONS_VIEW,
                group: 'infrastructure',
            },
            {
                id: 'admin-subdomains',
                name: t('nav.subdomains'),
                title: t('nav.subdomains'),
                url: '/admin/subdomains',
                icon: Link,
                isActive: currentPath.value.startsWith('/admin/subdomains'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_SUBDOMAINS_VIEW,
                group: 'infrastructure',
            },
            // Content
            {
                id: 'admin-realms',
                name: t('nav.realms'),
                title: t('nav.realmsLegacy'),
                url: '/admin/realms',
                icon: Newspaper,
                isActive: currentPath.value.startsWith('/admin/realms'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_REALMS_VIEW,
                group: 'infrastructure',
            },
            {
                id: 'admin-images',
                name: t('nav.images'),
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
                name: t('nav.mailTemplates'),
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
                name: t('nav.settings'),
                title: t('nav.settings'),
                url: '/admin/settings',
                icon: Settings,
                isActive: currentPath.value.startsWith('/admin/settings'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_SETTINGS_VIEW,
                group: 'system',
            },
            {
                id: 'admin-rate-limits',
                name: 'Rate Limits',
                title: 'Rate Limits',
                url: '/admin/rate-limits',
                icon: Gauge,
                isActive: currentPath.value.startsWith('/admin/rate-limits'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_SETTINGS_VIEW,
                group: 'system',
            },
            {
                id: 'admin-plugins',
                name: t('nav.plugins'),
                title: t('nav.plugins'),
                url: '/admin/plugins',
                icon: PlayCircle,
                isActive: currentPath.value.startsWith('/admin/plugins'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_PLUGINS_VIEW,
                group: 'system',
            },
            {
                id: 'admin-feathercloud-marketplace',
                name: 'Marketplace',
                title: 'FeatherCloud Marketplace',
                url: '/admin/feathercloud/marketplace',
                icon: Package,
                isActive:
                    currentPath.value.startsWith('/admin/feathercloud/marketplace') ||
                    currentPath.value.startsWith('/admin/feathercloud/plugins') ||
                    currentPath.value.startsWith('/admin/feathercloud/spells'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_PLUGINS_VIEW,
                group: 'feathercloud',
            },
            {
                id: 'admin-feathercloud-ai-agent',
                name: 'AI Agent',
                title: 'AI Agent',
                url: '/admin/featherpanel-ai-agent',
                icon: Bot,
                isActive: currentPath.value.startsWith('/admin/featherpanel-ai-agent'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_STATISTICS_VIEW,
                group: 'content',
            },
            {
                id: 'admin-featherzerotrust',
                name: 'ZeroTrust Security',
                title: 'ZeroTrust Security',
                url: '/admin/featherzerotrust',
                icon: ShieldCheck,
                isActive: currentPath.value.startsWith('/admin/featherzerotrust'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_FEATHERZEROTRUST_VIEW,
                group: 'infrastructure',
            },
            {
                id: 'admin-database-management',
                name: t('nav.databaseManagement'),
                title: t('nav.databaseManagement'),
                url: '/admin/databases/management',
                icon: Database,
                isActive: currentPath.value.startsWith('/admin/databases/management'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_DATABASES_VIEW,
                group: 'system',
            },
            {
                id: 'admin-pterodactyl-importer',
                name: 'Pterodactyl Importer',
                title: 'Pterodactyl Importer',
                url: '/admin/pterodactyl-importer',
                icon: Download,
                isActive: currentPath.value.startsWith('/admin/pterodactyl-importer'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_DATABASES_MANAGE,
                group: 'system',
            },
            {
                id: 'admin-redirect-links',
                name: t('nav.redirectLinks'),
                title: t('nav.redirectLinks'),
                url: '/admin/redirect-links',
                icon: Link,
                isActive: currentPath.value.startsWith('/admin/redirect-links'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_REDIRECT_LINKS_VIEW,
                group: 'content',
            },
            {
                id: 'admin-notifications',
                name: t('nav.notifications'),
                title: t('nav.notifications'),
                url: '/admin/notifications',
                icon: Bell,
                isActive: currentPath.value.startsWith('/admin/notifications'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_NOTIFICATIONS_VIEW,
                group: 'users',
            },
            {
                id: 'admin-knowledgebase',
                name: 'Knowledgebase',
                title: 'Knowledgebase',
                url: '/admin/knowledgebase/categories',
                icon: BookOpen,
                isActive: currentPath.value.startsWith('/admin/knowledgebase'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_KNOWLEDGEBASE_CATEGORIES_VIEW,
                group: 'users',
            },
            // Ticket System
            {
                id: 'admin-tickets',
                name: 'Tickets',
                title: 'Support Tickets',
                url: '/admin/tickets',
                icon: Ticket,
                isActive:
                    currentPath.value.startsWith('/admin/tickets') &&
                    !currentPath.value.startsWith('/admin/tickets/categories') &&
                    !currentPath.value.startsWith('/admin/tickets/priorities') &&
                    !currentPath.value.startsWith('/admin/tickets/statuses'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_TICKETS_VIEW,
                group: 'tickets',
            },
            {
                id: 'admin-ticket-categories',
                name: 'Ticket Categories',
                title: 'Ticket Categories',
                url: '/admin/tickets/categories',
                icon: Ticket,
                isActive: currentPath.value.startsWith('/admin/tickets/categories'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_TICKET_CATEGORIES_VIEW,
                group: 'tickets',
            },
            {
                id: 'admin-ticket-priorities',
                name: 'Ticket Priorities',
                title: 'Ticket Priorities',
                url: '/admin/tickets/priorities',
                icon: Ticket,
                isActive: currentPath.value.startsWith('/admin/tickets/priorities'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_TICKET_PRIORITIES_VIEW,
                group: 'tickets',
            },
            {
                id: 'admin-ticket-statuses',
                name: 'Ticket Statuses',
                title: 'Ticket Statuses',
                url: '/admin/tickets/statuses',
                icon: Ticket,
                isActive: currentPath.value.startsWith('/admin/tickets/statuses'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_TICKET_STATUSES_VIEW,
                group: 'tickets',
            },
        ];

        // Add plugin admin items (with permission filtering)
        if (pluginRoutes.value?.admin) {
            const pluginItems = convertPluginItems(pluginRoutes.value.admin, 'admin');
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

        const items: NavigationItem[] = [
            {
                id: 'server-console',
                name: t('nav.console'),
                title: t('nav.console'),
                url: `/server/${uuidShort}`,
                icon: SquareTerminal,
                isActive: currentPath.value === `/server/${uuidShort}`,
                category: 'server' as const,
                group: 'management',
                permission: 'websocket.connect',
            },
            {
                id: 'server-logs',
                name: t('nav.logs'),
                title: t('nav.logs'),
                url: `/server/${uuidShort}/logs`,
                icon: FileText,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/logs`),
                category: 'server' as const,
                group: 'management',
                permission: 'activity.read',
            },
            {
                id: 'server-activities',
                name: t('nav.activities'),
                title: t('nav.activities'),
                url: `/server/${uuidShort}/activities`,
                icon: Clock,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/activities`),
                category: 'server' as const,
                group: 'management',
                permission: 'activity.read',
            },
            {
                id: 'server-files',
                name: t('nav.files'),
                title: t('nav.files'),
                url: `/server/${uuidShort}/files`,
                icon: Folder,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/files`),
                category: 'server' as const,
                group: 'files',
                permission: 'file.read',
            },
            {
                id: 'server-databases',
                name: t('nav.databases'),
                title: t('nav.databases'),
                url: `/server/${uuidShort}/databases`,
                icon: Database,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/databases`),
                category: 'server' as const,
                group: 'files',
                permission: 'database.read',
            },
            {
                id: 'server-schedules',
                name: t('nav.schedules'),
                title: t('nav.schedules'),
                url: `/server/${uuidShort}/schedules`,
                icon: Calendar,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/schedules`),
                category: 'server' as const,
                group: 'automation',
                permission: 'schedule.read',
            },
            {
                id: 'server-users',
                name: t('nav.users'),
                title: t('nav.users'),
                url: `/server/${uuidShort}/users`,
                icon: Users,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/users`),
                category: 'server' as const,
                group: 'configuration',
                permission: 'user.read',
            },
            {
                id: 'server-backups',
                name: t('nav.backups'),
                title: t('nav.backups'),
                url: `/server/${uuidShort}/backups`,
                icon: Archive,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/backups`),
                category: 'server' as const,
                group: 'files',
                permission: 'backup.read',
            },
            {
                id: 'server-allocations',
                name: t('nav.allocations'),
                title: t('nav.allocations'),
                url: `/server/${uuidShort}/allocations`,
                icon: Network,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/allocations`),
                category: 'server' as const,
                group: 'networking',
                permission: 'allocation.read',
            },
            {
                id: 'server-firewall',
                name: t('nav.firewall'),
                title: t('nav.firewall'),
                url: `/server/${uuidShort}/firewall`,
                icon: ShieldCheck,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/firewall`),
                category: 'server' as const,
                group: 'networking',
                permission: 'firewall.read',
            },
            {
                id: 'server-proxy',
                name: t('nav.proxy'),
                title: t('nav.proxy'),
                url: `/server/${uuidShort}/proxy`,
                icon: ArrowRightLeft,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/proxy`),
                category: 'server' as const,
                group: 'networking',
                permission: 'proxy.read',
            },
            {
                id: 'server-subdomains',
                name: t('nav.subdomains'),
                title: t('nav.subdomains'),
                url: `/server/${uuidShort}/subdomains`,
                icon: Globe,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/subdomains`),
                category: 'server' as const,
                group: 'networking',
                permission: 'subdomain.manage',
            },
            {
                id: 'server-startup',
                name: t('nav.startup'),
                title: t('nav.startup'),
                url: `/server/${uuidShort}/startup`,
                icon: PlayCircle,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/startup`),
                category: 'server' as const,
                group: 'configuration',
                permission: 'startup.read',
            },
            {
                id: 'server-settings',
                name: t('nav.settings'),
                title: t('nav.settings'),
                url: `/server/${uuidShort}/settings`,
                icon: Settings,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/settings`),
                category: 'server' as const,
                group: 'configuration',
                permission: 'settings.rename',
            },
        ];

        // Add plugin server items (with subuser permission filtering)
        if (pluginRoutes.value?.server) {
            const pluginItems = convertPluginItems(pluginRoutes.value.server, 'server', uuidShort as string);
            // Only set default group if plugin didn't specify one
            pluginItems.forEach((item) => {
                if (!item.group) {
                    item.group = 'plugins';
                }
            });
            items.push(...pluginItems);
        }

        return items;
    });

    const debugItems = computed((): NavigationItem[] => {
        return [
            {
                id: 'debug-logs',
                name: t('nav.logViewer'),
                title: t('nav.logViewer'),
                url: '/admin/dev/logs',
                icon: BookAlert,
                isActive: currentPath.value.startsWith('/admin/dev/logs'),
                category: 'debug' as const,
            },
            {
                id: 'debug-file-manager',
                name: t('nav.fileManager'),
                title: t('nav.fileManager'),
                url: '/admin/dev/files',
                icon: FileText,
                isActive: currentPath.value.startsWith('/admin/dev/files'),
                category: 'debug' as const,
            },
            {
                id: 'debug-console',
                name: t('nav.console'),
                title: t('nav.console'),
                url: '/admin/dev/console',
                icon: TerminalIcon,
                isActive: currentPath.value.startsWith('/admin/dev/console'),
                category: 'debug' as const,
            },
            {
                id: 'debug-plugin-manager',
                name: t('nav.pluginManager'),
                title: t('nav.pluginManager'),
                url: '/admin/dev/plugins',
                icon: PlayCircle,
                isActive: currentPath.value.startsWith('/admin/dev/plugin-manager'),
                category: 'debug' as const,
            },
            {
                id: 'debug-database-snapshots',
                name: 'Database Snapshots',
                title: 'Database Snapshots',
                url: '/admin/database-snapshots',
                icon: Archive,
                isActive: currentPath.value.startsWith('/admin/database-snapshots'),
                category: 'debug' as const,
                permission: Permissions.ADMIN_BACKUPS_VIEW,
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

    // Filter server items based on subuser permissions
    const filteredServerItems = computed(() =>
        serverItems.value.filter((item) => !item.permission || hasServerPermission(item.permission)),
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
        const groupConfig: Record<string, () => string> = {
            overview: () => t('navGroups.overview'),
            feathercloud: () => 'FeatherCloud',
            users: () => t('navGroups.userManagement'),
            tickets: () => 'Support Tickets',
            networking: () => t('navGroups.networking'),
            infrastructure: () => t('navGroups.infrastructure'),
            content: () => t('navGroups.content'),
            system: () => t('navGroups.system'),
            plugins: () => t('navGroups.plugins'),
        };

        // Return groups in specific order
        return Object.keys(groupConfig)
            .filter((key) => groups[key] && groups[key].length > 0)
            .map((key) => {
                const labelResolver = groupConfig[key];
                const name = labelResolver ? labelResolver() : '';
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

        filteredServerItems.value.forEach((item) => {
            const groupKey = item.group || 'other';
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(item);
        });

        // Define group order and labels for known groups
        const groupConfig: Record<string, () => string> = {
            management: () => t('navGroups.management'),
            files: () => t('navGroups.filesData'),
            networking: () => t('navGroups.networking'),
            automation: () => t('navGroups.automation'),
            configuration: () => t('navGroups.configuration'),
            plugins: () => t('navGroups.plugins'),
        };

        // Get all group keys, prioritizing known groups first
        const knownGroupKeys = Object.keys(groupConfig);
        const customGroupKeys = Object.keys(groups).filter((key) => !knownGroupKeys.includes(key) && key !== 'other');
        const allGroupKeys = [...knownGroupKeys, ...customGroupKeys];

        // Return groups in specific order, including custom plugin groups
        return allGroupKeys
            .filter((key) => groups[key] && groups[key].length > 0)
            .map((key) => {
                const labelResolver = groupConfig[key];
                // Use translated label if available, otherwise use the group key as-is (for custom plugin groups)
                const name = labelResolver ? labelResolver() : key;
                const items = groups[key];
                if (!name || !items) {
                    return { name: '', items: [] };
                }
                return { name, items };
            })
            .filter((group) => group.name && group.items.length > 0);
    });

    // Group main navigation items
    const groupedMainItems = computed((): NavigationGroup[] => {
        const groups: Record<string, NavigationItem[]> = {};

        mainItems.value.forEach((item) => {
            const groupKey = item.group || 'other';
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(item);
        });

        const groupConfig: Record<string, () => string> = {
            overview: () => t('navGroups.overview'),
            account: () => t('navGroups.account'),
            support: () => t('navGroups.support'),
            plugins: () => t('navGroups.plugins'),
        };

        return Object.keys(groupConfig)
            .filter((key) => groups[key] && groups[key].length > 0)
            .map((key) => {
                const labelResolver = groupConfig[key];
                const name = labelResolver ? labelResolver() : '';
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
            items.push(...filteredServerItems.value);
        }

        return items;
    });

    // Get items for sidebar (grouped by category)
    const sidebarNavigation = computed(() => ({
        navMain: mainItems.value,
        navMainGrouped: groupedMainItems.value,
        navAdmin: filteredAdminItems.value,
        navAdminGrouped: groupedAdminItems.value,
        navServer: filteredServerItems.value,
        navServerGrouped: groupedServerItems.value,
        navDebug: filteredDebugItems.value,
    }));

    // Get items for dock (flattened)
    const dockNavigation = computed(() => allNavigationItems.value);

    return {
        currentPath,
        mainItems,
        adminItems: filteredAdminItems,
        serverItems: filteredServerItems,
        allNavigationItems,
        sidebarNavigation,
        dockNavigation,
        handlePluginClick,
        fetchPluginRoutes,
        hasServerPermission,
    };
}
