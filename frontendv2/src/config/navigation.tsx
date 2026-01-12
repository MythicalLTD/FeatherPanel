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

import Permissions from '@/lib/permissions';
import { NavigationItem } from '@/types/navigation';
import type { AppSettings } from '@/types/settings';
import {
    Home,
    Server,
    User,
    ShieldCheck,
    Settings,
    Activity,
    BookOpen,
    Ticket,
    BarChart3,
    Crown,
    Key,
    Globe,
    Link,
    Newspaper,
    ImageIcon,
    FileText,
    Gauge,
    PlayCircle,
    Package,
    Cloud,
    Bot,
    Bell,
    Download,
    Database,
    Users,
    SquareTerminal,
    Calendar,
    Archive,
    Network,
    ArrowRightLeft,
    Upload,
    Clock,
    Folder,
    Sparkles,
    Code,
} from 'lucide-react';
import { isEnabled } from '@/lib/utils';

// Helper type for translation function
type TFunction = (key: string) => string;

export const getAdminNavigationItems = (t: TFunction, settings: AppSettings | null): NavigationItem[] => {
    const items: NavigationItem[] = [
        // Overview
        {
            id: 'admin-dashboard',
            name: t('navigation.items.dashboard'),
            title: t('landing.hero.title') || 'Dashboard',
            url: '/admin',
            icon: Home,
            isActive: false, // Active state handled by hook
            category: 'admin',
            permission: Permissions.ADMIN_DASHBOARD_VIEW,
            group: 'overview',
        },
        {
            id: 'admin-kpi-analytics',
            name: t('navigation.items.analytics'),
            title: t('navigation.items.analytics'),
            url: '/admin/analytics',
            icon: BarChart3,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_USERS_VIEW,
            group: 'overview',
        },
        {
            id: 'admin-nodes-status',
            name: t('navigation.items.nodeStatus'),
            title: t('navigation.items.nodeStatus'),
            url: '/admin/nodes/status',
            icon: Activity,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_NODES_VIEW,
            group: 'overview',
        },
        // User Management
        {
            id: 'admin-users',
            name: t('navigation.items.users'),
            title: t('navigation.items.users'),
            url: '/admin/users',
            icon: Users,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_USERS_VIEW,
            group: 'users',
        },
        {
            id: 'admin-notifications',
            name: t('navigation.items.notifications'),
            title: t('navigation.items.notifications'),
            url: '/admin/notifications',
            icon: Bell,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_NOTIFICATIONS_VIEW,
            group: 'users',
        },
        {
            id: 'admin-roles',
            name: t('navigation.items.roles'),
            title: t('navigation.items.roles'),
            url: '/admin/roles',
            icon: Crown,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_ROLES_VIEW,
            group: 'users',
        },
        // Infrastructure
        {
            id: 'admin-servers',
            name: t('navigation.items.servers'),
            title: t('navigation.items.servers'),
            url: '/admin/servers',
            icon: Server,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_SERVERS_VIEW,
            group: 'infrastructure',
        },
        {
            id: 'admin-locations-parent',
            name: t('navigation.items.locations_and_nodes'),
            title: t('navigation.items.locations_and_nodes'),
            url: '/admin/locations',
            icon: Globe,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_LOCATIONS_VIEW,
            group: 'infrastructure',
            children: [
                {
                    id: 'admin-locations',
                    name: t('navigation.items.locations'),
                    title: t('navigation.items.locations'),
                    url: '/admin/locations',
                    icon: Globe,
                    isActive: false,
                    category: 'admin',
                    permission: Permissions.ADMIN_LOCATIONS_VIEW,
                    group: 'infrastructure',
                },
                {
                    id: 'admin-nodes',
                    name: t('navigation.items.nodes'),
                    title: t('navigation.items.nodes'),
                    url: '/admin/nodes',
                    icon: Server,
                    isActive: false,
                    category: 'admin',
                    permission: Permissions.ADMIN_NODES_VIEW,
                    group: 'infrastructure',
                },
                {
                    id: 'admin-node-databases',
                    name: t('navigation.items.nodeDatabases'),
                    title: t('navigation.items.nodeDatabases'),
                    url: '/admin/databases/nodes',
                    icon: Database,
                    isActive: false,
                    category: 'admin',
                    permission: Permissions.ADMIN_NODES_VIEW,
                    group: 'infrastructure',
                },
            ],
        },
        {
            id: 'admin-subdomains',
            name: t('navigation.items.subdomains'),
            title: t('navigation.items.subdomains'),
            url: '/admin/subdomains',
            icon: Link,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_SUBDOMAINS_VIEW,
            group: 'infrastructure',
        },
        {
            id: 'admin-realms-parent',
            name: t('navigation.items.realms'),
            title: t('navigation.items.realms'),
            url: '/admin/realms',
            icon: Newspaper,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_REALMS_VIEW,
            group: 'infrastructure',
            children: [
                {
                    id: 'admin-realms',
                    name: t('navigation.items.realms'),
                    title: t('navigation.items.realms'),
                    url: '/admin/realms',
                    icon: Newspaper,
                    isActive: false,
                    category: 'admin',
                    permission: Permissions.ADMIN_REALMS_VIEW,
                    group: 'infrastructure',
                },
                {
                    id: 'admin-spells',
                    name: t('navigation.items.spells'),
                    title: t('navigation.items.spells'),
                    url: '/admin/spells',
                    icon: Sparkles,
                    isActive: false,
                    category: 'admin',
                    permission: Permissions.ADMIN_REALMS_VIEW,
                    group: 'infrastructure',
                },
            ],
        },
        {
            id: 'admin-featherzerotrust',
            name: t('navigation.items.zeroTrust'),
            title: t('navigation.items.zeroTrust'),
            url: '/admin/featherzerotrust',
            icon: ShieldCheck,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_FEATHERZEROTRUST_VIEW,
            group: 'infrastructure',
        },
        // Content
        {
            id: 'admin-images',
            name: t('navigation.items.images'),
            title: t('navigation.items.images'),
            url: '/admin/images',
            icon: ImageIcon,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_IMAGES_VIEW,
            group: 'content',
        },
        {
            id: 'admin-mail-templates',
            name: t('navigation.items.mailTemplates'),
            title: t('navigation.items.mailTemplates'),
            url: '/admin/mail-templates',
            icon: FileText,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_TEMPLATE_EMAIL_VIEW,
            group: 'content',
        },
        {
            id: 'admin-feathercloud-ai-agent',
            name: t('navigation.items.aiAgent'),
            title: t('navigation.items.aiAgent'),
            url: '/admin/featherpanel-ai-agent',
            icon: Bot,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_STATISTICS_VIEW,
            group: 'content',
        },
        {
            id: 'admin-redirect-links',
            name: t('navigation.items.redirectLinks'),
            title: t('navigation.items.redirectLinks'),
            url: '/admin/redirect-links',
            icon: Link,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_REDIRECT_LINKS_VIEW,
            group: 'content',
        },
        {
            id: 'admin-translations',
            name: t('navigation.items.translations'),
            title: t('navigation.items.translations'),
            url: '/admin/translations',
            icon: Globe,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_ROOT,
            group: 'content',
        },
        // System
        {
            id: 'admin-api-keys',
            name: t('navigation.items.apiKeys'),
            title: t('navigation.items.apiKeys'),
            url: '/admin/api-keys',
            icon: Key,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_DASHBOARD_VIEW,
            group: 'system',
        },
        {
            id: 'admin-settings',
            name: t('navigation.items.settings'),
            title: t('navigation.items.settings'),
            url: '/admin/settings',
            icon: Settings,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_SETTINGS_VIEW,
            group: 'system',
        },
        {
            id: 'admin-rate-limits',
            name: t('navigation.items.rateLimits'),
            title: t('navigation.items.rateLimits'),
            url: '/admin/rate-limits',
            icon: Gauge,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_SETTINGS_VIEW,
            group: 'system',
        },
        {
            id: 'admin-plugins',
            name: t('navigation.items.plugins'),
            title: t('navigation.items.plugins'),
            url: '/admin/plugins',
            icon: PlayCircle,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_PLUGINS_VIEW,
            group: 'system',
        },
        {
            id: 'admin-database-management',
            name: t('navigation.items.databaseManagement'),
            title: t('navigation.items.databaseManagement'),
            url: '/admin/databases/management',
            icon: Database,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_DATABASES_VIEW,
            group: 'system',
        },
        {
            id: 'admin-pterodactyl-importer',
            name: t('navigation.items.pterodactylImporter'),
            title: t('navigation.items.pterodactylImporter'),
            url: '/admin/pterodactyl-importer',
            icon: Download,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_DATABASES_MANAGE,
            group: 'system',
        },
        // Developer Tools
        {
            id: 'admin-dev-plugins',
            name: t('navigation.items.devPlugins'),
            title: t('navigation.items.devPlugins'),
            url: '/admin/dev/plugins',
            icon: Code,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_ROOT,
            group: 'developer',
        },
        // FeatherCloud
        {
            id: 'admin-feathercloud-marketplace',
            name: t('navigation.items.marketplace'),
            title: t('navigation.items.marketplace'),
            url: '/admin/feathercloud/marketplace',
            icon: Package,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_PLUGINS_VIEW,
            group: 'feathercloud',
        },
        {
            id: 'admin-cloud-management',
            name: t('navigation.items.cloudManagement'),
            title: t('navigation.items.cloudManagement'),
            url: '/admin/cloud-management',
            icon: Cloud,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_ROOT,
            group: 'feathercloud',
        },
    ];

    if (isEnabled(settings?.knowledgebase_enabled)) {
        items.push({
            id: 'admin-knowledgebase',
            name: t('navigation.items.knowledgebase'),
            title: t('navigation.items.knowledgebase'),
            url: '/admin/knowledgebase/categories',
            icon: BookOpen,
            isActive: false,
            category: 'admin',
            permission: Permissions.ADMIN_KNOWLEDGEBASE_CATEGORIES_VIEW,
            group: 'users',
        });
    }

    if (isEnabled(settings?.ticket_system_enabled)) {
        items.push(
            {
                id: 'admin-tickets',
                name: t('navigation.items.tickets'),
                title: t('navigation.items.tickets'),
                url: '/admin/tickets',
                icon: Ticket,
                isActive: false,
                category: 'admin',
                permission: Permissions.ADMIN_TICKETS_VIEW,
                group: 'tickets',
            },
            {
                id: 'ticket-configs',
                name: t('navigation.items.ticketConfigs'),
                title: t('navigation.items.ticketConfigs'),
                url: '/admin/tickets/configs',
                icon: Ticket,
                isActive: false,
                category: 'admin',
                permission: Permissions.ADMIN_TICKETS_VIEW,
                group: 'tickets',
                children: [
                    {
                        id: 'admin-ticket-categories',
                        name: t('navigation.items.ticketCategories'),
                        title: t('navigation.items.ticketCategories'),
                        url: '/admin/tickets/categories',
                        icon: Ticket,
                        isActive: false,
                        category: 'admin',
                        permission: Permissions.ADMIN_TICKET_CATEGORIES_VIEW,
                        group: 'tickets',
                    },
                    {
                        id: 'admin-ticket-priorities',
                        name: t('navigation.items.ticketPriorities'),
                        title: t('navigation.items.ticketPriorities'),
                        url: '/admin/tickets/priorities',
                        icon: Ticket,
                        isActive: false,
                        category: 'admin',
                        permission: Permissions.ADMIN_TICKET_PRIORITIES_VIEW,
                        group: 'tickets',
                    },
                    {
                        id: 'admin-ticket-statuses',
                        name: t('navigation.items.ticketStatuses'),
                        title: t('navigation.items.ticketStatuses'),
                        url: '/admin/tickets/statuses',
                        icon: Ticket,
                        isActive: false,
                        category: 'admin',
                        permission: Permissions.ADMIN_TICKET_STATUSES_VIEW,
                        group: 'tickets',
                    },
                ],
            },
        );
    }

    return items;
};

export const getServerNavigationItems = (
    t: TFunction,
    serverUuid: string,
    settings: AppSettings | null,
): NavigationItem[] => {
    const items: NavigationItem[] = [
        // Management
        {
            id: 'server-overview',
            name: t('navigation.items.console'),
            title: t('navigation.items.console'),
            url: `/server/${serverUuid}`,
            icon: SquareTerminal,
            isActive: false,
            category: 'server',
            group: 'management',
        },
        {
            id: 'server-activities',
            name: t('navigation.items.activities'),
            title: t('navigation.items.activities'),
            url: `/server/${serverUuid}/activities`,
            icon: Clock,
            isActive: false,
            category: 'server',
            group: 'management',
            permission: 'activity.read',
        },
        // Files
        {
            id: 'server-files',
            name: t('navigation.items.files'),
            title: t('navigation.items.files'),
            url: `/server/${serverUuid}/files`,
            icon: Folder,
            isActive: false,
            category: 'server',
            group: 'files',
            permission: 'file.read',
        },
        {
            id: 'server-databases',
            name: t('navigation.items.databases'),
            title: t('navigation.items.databases'),
            url: `/server/${serverUuid}/databases`,
            icon: Database,
            isActive: false,
            category: 'server',
            group: 'files',
            permission: 'database.read',
        },
        {
            id: 'server-backups',
            name: t('navigation.items.backups'),
            title: t('navigation.items.backups'),
            url: `/server/${serverUuid}/backups`,
            icon: Archive,
            isActive: false,
            category: 'server',
            group: 'files',
            permission: 'backup.read',
        },
    ];

    if (isEnabled(settings?.server_allow_user_made_import)) {
        items.push({
            id: 'server-import',
            name: t('navigation.items.import'),
            title: t('navigation.items.import'),
            url: `/server/${serverUuid}/import`,
            icon: Upload,
            isActive: false,
            category: 'server',
            group: 'files',
            permission: 'import.read',
        });
    }

    if (isEnabled(settings?.server_allow_schedules)) {
        items.push({
            id: 'server-schedules',
            name: t('navigation.items.schedules'),
            title: t('navigation.items.schedules'),
            url: `/server/${serverUuid}/schedules`,
            icon: Calendar,
            isActive: false,
            category: 'server',
            group: 'automation',
            permission: 'schedule.read',
        });
    }

    // Configuration
    if (isEnabled(settings?.server_allow_subusers)) {
        items.push({
            id: 'server-users',
            name: t('navigation.items.users'),
            title: t('navigation.items.users'),
            url: `/server/${serverUuid}/users`,
            icon: Users,
            isActive: false,
            category: 'server',
            group: 'configuration',
            permission: 'user.read',
        });
    }

    items.push(
        {
            id: 'server-startup',
            name: t('navigation.items.startup'),
            title: t('navigation.items.startup'),
            url: `/server/${serverUuid}/startup`,
            icon: PlayCircle,
            isActive: false,
            category: 'server',
            group: 'configuration',
            permission: 'startup.read',
        },
        {
            id: 'server-settings',
            name: t('navigation.items.settings'),
            title: t('navigation.items.settings'),
            url: `/server/${serverUuid}/settings`,
            icon: Settings,
            isActive: false,
            category: 'server',
            group: 'configuration',
            permission: 'settings.rename',
        },
        // Networking
        {
            id: 'server-allocations',
            name: t('navigation.items.allocations'),
            title: t('navigation.items.allocations'),
            url: `/server/${serverUuid}/allocations`,
            icon: Network,
            isActive: false,
            category: 'server',
            group: 'networking',
            permission: 'allocation.read',
        },
    );

    if (isEnabled(settings?.server_allow_user_made_firewall)) {
        items.push({
            id: 'server-firewall',
            name: t('navigation.items.firewall'),
            title: t('navigation.items.firewall'),
            url: `/server/${serverUuid}/firewall`,
            icon: ShieldCheck,
            isActive: false,
            category: 'server',
            group: 'networking',
            permission: 'firewall.read',
        });
    }

    if (isEnabled(settings?.server_allow_user_made_proxy)) {
        items.push({
            id: 'server-proxy',
            name: t('navigation.items.proxy'),
            title: t('navigation.items.proxy'),
            url: `/server/${serverUuid}/proxy`,
            icon: ArrowRightLeft,
            isActive: false,
            category: 'server',
            group: 'networking',
            permission: 'proxy.read',
        });
    }

    items.push({
        id: 'server-subdomains',
        name: t('navigation.items.subdomains'),
        title: t('navigation.items.subdomains'),
        url: `/server/${serverUuid}/subdomains`,
        icon: Globe,
        isActive: false,
        category: 'server',
        group: 'networking',
        permission: 'subdomain.manage',
    });

    return items;
};

export const getMainNavigationItems = (
    t: TFunction,
    settings: AppSettings | null,
    hasPermission: (permission: string) => boolean,
): NavigationItem[] => {
    const items: NavigationItem[] = [
        {
            id: 'dashboard',
            name: t('navigation.items.dashboard'),
            title: t('landing.hero.title') || 'Dashboard',
            url: '/dashboard',
            icon: Home,
            isActive: false,
            category: 'main',
            group: 'overview',
        },
        {
            id: 'servers',
            name: t('navigation.items.servers'),
            title: t('navigation.items.servers'),
            url: '/dashboard/servers',
            icon: Server,
            isActive: false,
            category: 'main',
            group: 'overview',
        },
        {
            id: 'account',
            name: t('navigation.items.account'),
            title: t('navigation.items.account'),
            url: '/dashboard/account',
            icon: User,
            isActive: false,
            category: 'main',
            group: 'account',
        },
    ];

    if (hasPermission(Permissions.ADMIN_DASHBOARD_VIEW)) {
        items.push({
            id: 'admin',
            name: t('navigation.items.admin'),
            title: t('navbar.adminPanelTooltip'),
            url: '/admin',
            icon: ShieldCheck,
            isActive: false,
            category: 'main',
            group: 'overview',
        });
    }

    if (isEnabled(settings?.knowledgebase_enabled)) {
        items.push({
            id: 'knowledgebase',
            name: t('navigation.items.knowledgebase'),
            title: t('navigation.items.knowledgebase'),
            url: '/dashboard/knowledgebase',
            icon: BookOpen,
            isActive: false,
            category: 'main',
            group: 'support',
        });
    }

    if (isEnabled(settings?.ticket_system_enabled)) {
        items.push({
            id: 'tickets',
            name: t('navigation.items.tickets'),
            title: t('navigation.items.tickets'),
            url: '/dashboard/tickets',
            icon: Ticket,
            isActive: false,
            category: 'main',
            group: 'support',
        });
    }

    if (isEnabled(settings?.status_page_enabled)) {
        items.push({
            id: 'status',
            name: t('navigation.items.status'),
            title: t('navigation.items.status'),
            url: '/dashboard/status',
            icon: Activity,
            isActive: false,
            category: 'main',
            group: 'support',
        });
    }

    return items;
};
