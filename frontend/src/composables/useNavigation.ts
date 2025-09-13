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
    Shield,
    AlertTriangle,
    Lock,
    FileSearch,
    Cog,
    type LucideIcon,
} from 'lucide-vue-next';
import Permissions from '@/lib/permissions';

export interface NavigationItem {
    id: string;
    name: string;
    title: string;
    url: string;
    icon: LucideIcon;
    isActive: boolean;
    category: 'main' | 'admin' | 'server';
    permission?: string;
    isPlugin?: boolean;
    pluginJs?: string;
    pluginName?: string;
    pluginTag?: string;
    description?: string;
}

interface PluginSidebarItem {
    name: string;
    icon: string;
    js: string;
    description: string;
    category: string;
    plugin: string;
    pluginName: string;
    permission?: string;
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

// Convert emoji icons to Lucide components
function getPluginIcon(emoji: string): LucideIcon {
    const iconMap: Record<string, LucideIcon> = {
        '🔍': FileSearch,
        '🚫': AlertTriangle,
        '🔐': Lock,
        '🛡️': Shield,
        '⚙️': Cog,
        '📋': FileText,
    };

    return iconMap[emoji] || Shield; // Default to Shield icon
}

export function useNavigation() {
    const router = useRouter();
    const route = useRoute();
    const { t } = useI18n();
    const sessionStore = useSessionStore();

    const pluginRoutes = ref<PluginSidebarResponse['data']['sidebar'] | null>(null);

    const currentPath = computed(() => router.currentRoute.value.path);

    // Fetch plugin sidebar routes
    const fetchPluginRoutes = async () => {
        try {
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
    const handlePluginClick = (pluginJs: string) => {
        try {
            // Execute the plugin JavaScript
            eval(pluginJs);
        } catch (error) {
            console.error('Failed to execute plugin JavaScript:', error);
        }
    };

    // Convert plugin items to NavigationItems
    const convertPluginItems = (
        pluginItems: Record<string, PluginSidebarItem>,
        category: 'main' | 'admin' | 'server',
        uuidShort?: string,
    ): NavigationItem[] => {
        return Object.entries(pluginItems).map(([url, item]) => {
            const fullUrl = category === 'server' && uuidShort ? `/server/${uuidShort}${url}` : url;

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
                pluginName: item.pluginName,
                pluginTag: item.pluginName,
                description: item.description,
            };
        });
    };

    // Initialize plugin routes on mount
    onMounted(() => {
        fetchPluginRoutes();
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
                id: 'activities',
                name: 'Activities',
                title: t('nav.activities'),
                url: '/dashboard/activities',
                icon: Clock,
                isActive: currentPath.value.startsWith('/dashboard/activities'),
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
            {
                id: 'admin-dashboard',
                name: 'Dashboard',
                title: t('nav.dashboard'),
                url: '/admin',
                icon: Home,
                isActive: currentPath.value.startsWith('/admin') && currentPath.value === '/admin',
                category: 'admin' as const,
                permission: Permissions.ADMIN_DASHBOARD_VIEW,
            },
            {
                id: 'admin-users',
                name: 'Users',
                title: t('nav.users'),
                url: '/admin/users',
                icon: Users,
                isActive: currentPath.value.startsWith('/admin/users'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_USERS_VIEW,
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
            },
            {
                id: 'admin-realms',
                name: 'Realms',
                title: t('nav.realms'),
                url: '/admin/realms',
                icon: Newspaper,
                isActive: currentPath.value.startsWith('/admin/realms'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_REALMS_VIEW,
            },
            {
                id: 'admin-roles',
                name: 'Roles',
                title: t('nav.roles'),
                url: '/admin/roles',
                icon: Users,
                isActive: currentPath.value.startsWith('/admin/roles'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_ROLES_VIEW,
            },
            {
                id: 'admin-servers',
                name: 'Servers',
                title: t('nav.servers'),
                url: '/admin/servers',
                icon: Server,
                isActive: currentPath.value.startsWith('/admin/servers'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_SERVERS_VIEW,
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
            },
            {
                id: 'admin-settings',
                name: 'Settings',
                title: t('nav.settings'),
                url: '/admin/settings',
                icon: Settings,
                isActive: currentPath.value.startsWith('/admin/settings'),
                category: 'admin' as const,
                permission: Permissions.ADMIN_SETTINGS_VIEW,
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
            },
        ];

        // Add plugin admin items (no permission checks for plugins)
        if (pluginRoutes.value?.admin) {
            const pluginItems = convertPluginItems(pluginRoutes.value.admin, 'admin') as typeof items;
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
            },
            {
                id: 'server-logs',
                name: 'Logs',
                title: t('nav.logs'),
                url: `/server/${uuidShort}/logs`,
                icon: FileText,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/logs`),
                category: 'server' as const,
            },
            {
                id: 'server-activities',
                name: 'Activities',
                title: t('nav.activities'),
                url: `/server/${uuidShort}/activities`,
                icon: Clock,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/activities`),
                category: 'server' as const,
            },
            {
                id: 'server-files',
                name: 'Files',
                title: t('nav.files'),
                url: `/server/${uuidShort}/files`,
                icon: Folder,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/files`),
                category: 'server' as const,
            },
            {
                id: 'server-databases',
                name: 'Databases',
                title: t('nav.databases'),
                url: `/server/${uuidShort}/databases`,
                icon: Database,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/databases`),
                category: 'server' as const,
            },
            {
                id: 'server-schedules',
                name: 'Schedules',
                title: t('nav.schedules'),
                url: `/server/${uuidShort}/schedules`,
                icon: Calendar,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/schedules`),
                category: 'server' as const,
            },
            {
                id: 'server-users',
                name: 'Users',
                title: t('nav.users'),
                url: `/server/${uuidShort}/users`,
                icon: Users,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/users`),
                category: 'server' as const,
            },
            {
                id: 'server-backups',
                name: 'Backups',
                title: t('nav.backups'),
                url: `/server/${uuidShort}/backups`,
                icon: Archive,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/backups`),
                category: 'server' as const,
            },
            {
                id: 'server-allocations',
                name: 'Allocations',
                title: 'Allocations',
                url: `/server/${uuidShort}/allocations`,
                icon: Network,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/allocations`),
                category: 'server' as const,
            },
            {
                id: 'server-startup',
                name: 'Startup',
                title: t('nav.startup'),
                url: `/server/${uuidShort}/startup`,
                icon: PlayCircle,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/startup`),
                category: 'server' as const,
            },
            {
                id: 'server-settings',
                name: 'Settings',
                title: t('nav.settings'),
                url: `/server/${uuidShort}/settings`,
                icon: Settings,
                isActive: currentPath.value.startsWith(`/server/${uuidShort}/settings`),
                category: 'server' as const,
            },
        ];

        // Add plugin server items
        if (pluginRoutes.value?.server) {
            const pluginItems = convertPluginItems(
                pluginRoutes.value.server,
                'server',
                uuidShort as string,
            ) as typeof items;
            items.push(...pluginItems);
        }

        return items;
    });

    // Filter admin items based on permissions
    const filteredAdminItems = computed(() =>
        adminItems.value.filter((item) => !item.permission || sessionStore.hasPermission(item.permission)),
    );

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
        navServer: serverItems.value,
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
