import { useState, useEffect, useMemo, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from '@/contexts/SessionContext'
import { useSettings } from '@/contexts/SettingsContext'
import Permissions from '@/lib/permissions'
import axios from 'axios'
import type { NavigationItem, PluginSidebarItem, PluginSidebarResponse } from '@/types/navigation'
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
    Users
} from 'lucide-react'
import { isEnabled } from '@/lib/utils'

// Cache plugin routes outside hook to persist across re-renders
let cachedPluginRoutes: PluginSidebarResponse['data']['sidebar'] | null = null

export function useNavigation() {
    const pathname = usePathname()
    const { hasPermission } = useSession()
    const { settings } = useSettings()
    const [pluginRoutes, setPluginRoutes] = useState<PluginSidebarResponse['data']['sidebar'] | null>(cachedPluginRoutes)

    useEffect(() => {
        const fetchPluginRoutes = async () => {
            if (cachedPluginRoutes) return

            try {
                 const { data } = await axios.get<PluginSidebarResponse>('/api/system/plugin-sidebar').catch(() => ({ data: { success: false, data: null } }))
                 if (data.success && data.data?.sidebar) {
                     cachedPluginRoutes = data.data.sidebar
                     setPluginRoutes(data.data.sidebar)
                 }
            } catch (error) {
                console.error('Failed to fetch plugin sidebar', error)
            }
        }

        fetchPluginRoutes()
    }, [])

    const convertPluginItems = useCallback((
        pluginItems: Record<string, PluginSidebarItem>,
        category: 'main' | 'admin' | 'server'
    ): NavigationItem[] => {
        return Object.entries(pluginItems).map(([url, item]) => {
            // Build full URL based on category
            let fullUrl = url
            if (category === 'admin') fullUrl = `/admin${url}`
            if (category === 'main') fullUrl = `/dashboard${url}`
            
            // Allow plugins to override redirect
            const fullRedirect = item.redirect 
                ? (item.redirect.startsWith('/') ? item.redirect : `/${item.redirect}`) 
                : fullUrl

            return {
                id: `plugin-${item.plugin}-${url}`,
                name: item.name,
                title: item.name,
                url: fullUrl,
                icon: item.icon, // String (emoji)
                isActive: pathname === fullUrl || pathname.startsWith(fullUrl + '/'),
                category,
                isPlugin: true,
                pluginJs: item.js,
                pluginRedirect: fullRedirect,
                pluginName: item.pluginName,
                showBadge: item.showBadge,
                description: item.description,
                permission: item.permission,
                group: item.group || 'Plugins'
            }
        }).filter(item => {
            if (item.permission) {
                return hasPermission(item.permission)
            }
            return true
        })
    }, [pathname, hasPermission])

    const navigationItems = useMemo(() => {
        // Logic to switch between Main and Admin navigation
        const isAdmin = pathname.startsWith('/admin')

        if (isAdmin) {
            const items: NavigationItem[] = [
                // Overview
                {
                    id: 'admin-dashboard',
                    name: 'Dashboard',
                    title: 'Dashboard',
                    url: '/admin',
                    icon: Home,
                    isActive: pathname === '/admin',
                    category: 'admin',
                    permission: Permissions.ADMIN_DASHBOARD_VIEW,
                    group: 'Overview'
                },
                {
                    id: 'admin-kpi-analytics',
                    name: 'Analytics & KPIs',
                    title: 'Analytics & KPIs',
                    url: '/admin/kpi/analytics',
                    icon: BarChart3,
                    isActive: pathname.startsWith('/admin/kpi'),
                    category: 'admin',
                    permission: Permissions.ADMIN_USERS_VIEW,
                    group: 'Overview'
                },
                // User Management
                {
                    id: 'admin-users',
                    name: 'Users',
                    title: 'Users',
                    url: '/admin/users',
                    icon: Users,
                    isActive: pathname.startsWith('/admin/users'),
                    category: 'admin',
                    permission: Permissions.ADMIN_USERS_VIEW,
                    group: 'Users'
                },
                {
                    id: 'admin-roles',
                    name: 'Roles',
                    title: 'Roles',
                    url: '/admin/roles',
                    icon: Crown,
                    isActive: pathname.startsWith('/admin/roles'),
                    category: 'admin',
                    permission: Permissions.ADMIN_ROLES_VIEW,
                    group: 'Users'
                },
                {
                    id: 'admin-notifications',
                    name: 'Notifications',
                    title: 'Notifications',
                    url: '/admin/notifications',
                    icon: Bell,
                    isActive: pathname.startsWith('/admin/notifications'),
                    category: 'admin',
                    permission: Permissions.ADMIN_NOTIFICATIONS_VIEW,
                    group: 'Users'
                },
                // Infrastructure
                {
                    id: 'admin-servers',
                    name: 'Servers',
                    title: 'Servers',
                    url: '/admin/servers',
                    icon: Server,
                    isActive: pathname.startsWith('/admin/servers'),
                    category: 'admin',
                    permission: Permissions.ADMIN_SERVERS_VIEW,
                    group: 'Infrastructure'
                },
                {
                    id: 'admin-locations',
                    name: 'Locations',
                    title: 'Locations',
                    url: '/admin/locations',
                    icon: Globe,
                    isActive: pathname.startsWith('/admin/locations'),
                    category: 'admin',
                    permission: Permissions.ADMIN_LOCATIONS_VIEW,
                    group: 'Infrastructure'
                },
                {
                    id: 'admin-nodes-status',
                    name: 'Node Status',
                    title: 'Node Status',
                    url: '/admin/nodes/status',
                    icon: Activity,
                    isActive: pathname === '/admin/nodes/status',
                    category: 'admin',
                    permission: Permissions.ADMIN_NODES_VIEW,
                    group: 'Infrastructure'
                },
                {
                    id: 'admin-subdomains',
                    name: 'Subdomains',
                    title: 'Subdomains',
                    url: '/admin/subdomains',
                    icon: Link,
                    isActive: pathname.startsWith('/admin/subdomains'),
                    category: 'admin',
                    permission: Permissions.ADMIN_SUBDOMAINS_VIEW,
                    group: 'Infrastructure'
                },
                {
                    id: 'admin-realms',
                    name: 'Realms',
                    title: 'Realms',
                    url: '/admin/realms',
                    icon: Newspaper,
                    isActive: pathname.startsWith('/admin/realms'),
                    category: 'admin',
                    permission: Permissions.ADMIN_REALMS_VIEW,
                    group: 'Infrastructure'
                },
                {
                    id: 'admin-featherzerotrust',
                    name: 'ZeroTrust Security',
                    title: 'ZeroTrust Security',
                    url: '/admin/featherzerotrust',
                    icon: ShieldCheck,
                    isActive: pathname.startsWith('/admin/featherzerotrust'),
                    category: 'admin',
                    permission: Permissions.ADMIN_FEATHERZEROTRUST_VIEW,
                    group: 'Infrastructure'
                },
                 // Content
                {
                    id: 'admin-images',
                    name: 'Images',
                    title: 'Images',
                    url: '/admin/images',
                    icon: ImageIcon,
                    isActive: pathname.startsWith('/admin/images'),
                    category: 'admin',
                    permission: Permissions.ADMIN_IMAGES_VIEW,
                    group: 'Content'
                },
                {
                    id: 'admin-mail-templates',
                    name: 'Mail Templates',
                    title: 'Mail Templates',
                    url: '/admin/mail-templates',
                    icon: FileText,
                    isActive: pathname.startsWith('/admin/mail-templates'),
                    category: 'admin',
                    permission: Permissions.ADMIN_TEMPLATE_EMAIL_VIEW,
                    group: 'Content'
                },
                {
                    id: 'admin-redirect-links',
                    name: 'Redirect Links',
                    title: 'Redirect Links',
                    url: '/admin/redirect-links',
                    icon: Link,
                    isActive: pathname.startsWith('/admin/redirect-links'),
                    category: 'admin',
                    permission: Permissions.ADMIN_REDIRECT_LINKS_VIEW,
                    group: 'Content'
                },
                {
                    id: 'admin-feathercloud-ai-agent',
                    name: 'AI Agent',
                    title: 'AI Agent',
                    url: '/admin/featherpanel-ai-agent',
                    icon: Bot,
                    isActive: pathname.startsWith('/admin/featherpanel-ai-agent'),
                    category: 'admin',
                    permission: Permissions.ADMIN_STATISTICS_VIEW,
                    group: 'Content'
                },
                // System
                {
                    id: 'admin-settings',
                    name: 'Settings',
                    title: 'Settings',
                    url: '/admin/settings',
                    icon: Settings,
                    isActive: pathname.startsWith('/admin/settings'),
                    category: 'admin',
                    permission: Permissions.ADMIN_SETTINGS_VIEW,
                    group: 'System'
                },
                {
                    id: 'admin-rate-limits',
                    name: 'Rate Limits',
                    title: 'Rate Limits',
                    url: '/admin/rate-limits',
                    icon: Gauge,
                    isActive: pathname.startsWith('/admin/rate-limits'),
                    category: 'admin',
                    permission: Permissions.ADMIN_SETTINGS_VIEW,
                    group: 'System'
                },
                {
                    id: 'admin-database-management',
                    name: 'Database Management',
                    title: 'Database Management',
                    url: '/admin/databases/management',
                    icon: Database,
                    isActive: pathname.startsWith('/admin/databases/management'),
                    category: 'admin',
                    permission: Permissions.ADMIN_DATABASES_VIEW,
                    group: 'System'
                },
                {
                    id: 'admin-pterodactyl-importer',
                    name: 'Pterodactyl Importer',
                    title: 'Pterodactyl Importer',
                    url: '/admin/pterodactyl-importer',
                    icon: Download,
                    isActive: pathname.startsWith('/admin/pterodactyl-importer'),
                    category: 'admin',
                    permission: Permissions.ADMIN_DATABASES_MANAGE,
                    group: 'System'
                },
                {
                    id: 'admin-api-keys',
                    name: 'API Keys',
                    title: 'API Keys',
                    url: '/admin/api-keys',
                    icon: Key,
                    isActive: pathname.startsWith('/admin/api-keys'),
                    category: 'admin',
                    permission: Permissions.ADMIN_DASHBOARD_VIEW,
                    group: 'System'
                },
                {
                    id: 'admin-plugins',
                    name: 'Plugins',
                    title: 'Plugins',
                    url: '/admin/plugins',
                    icon: PlayCircle,
                    isActive: pathname.startsWith('/admin/plugins'),
                    category: 'admin',
                    permission: Permissions.ADMIN_PLUGINS_VIEW,
                    group: 'System'
                },
                // FeatherCloud
                {
                    id: 'admin-feathercloud-marketplace',
                    name: 'Marketplace',
                    title: 'Marketplace',
                    url: '/admin/feathercloud/marketplace',
                    icon: Package,
                    isActive: pathname.startsWith('/admin/feathercloud/marketplace') ||
                            pathname.startsWith('/admin/feathercloud/plugins') ||
                            pathname.startsWith('/admin/feathercloud/spells'),
                    category: 'admin',
                    permission: Permissions.ADMIN_PLUGINS_VIEW,
                    group: 'FeatherCloud'
                },
                {
                    id: 'admin-cloud-management',
                    name: 'Cloud Management',
                    title: 'Cloud Management',
                    url: '/admin/cloud-management',
                    icon: Cloud,
                    isActive: pathname.startsWith('/admin/cloud-management'),
                    category: 'admin',
                    permission: Permissions.ADMIN_ROOT,
                    group: 'FeatherCloud'
                },
            ]

             if (isEnabled(settings?.knowledgebase_enabled)) {
                items.push({
                    id: 'admin-knowledgebase',
                    name: 'Knowledgebase',
                    title: 'Knowledgebase',
                    url: '/admin/knowledgebase/categories',
                    icon: BookOpen,
                    isActive: pathname.startsWith('/admin/knowledgebase'),
                    category: 'admin',
                    permission: Permissions.ADMIN_KNOWLEDGEBASE_CATEGORIES_VIEW,
                    group: 'Users'
                })
            }

            if (isEnabled(settings?.ticket_system_enabled)) {
                items.push(
                    {
                        id: 'admin-tickets',
                        name: 'Tickets',
                        title: 'Support Tickets',
                        url: '/admin/tickets',
                        icon: Ticket,
                        isActive: pathname.startsWith('/admin/tickets') &&
                                !pathname.startsWith('/admin/tickets/categories') &&
                                !pathname.startsWith('/admin/tickets/priorities') &&
                                !pathname.startsWith('/admin/tickets/statuses'),
                        category: 'admin',
                        permission: Permissions.ADMIN_TICKETS_VIEW,
                        group: 'Tickets'
                    },
                    {
                        id: 'admin-ticket-categories',
                        name: 'Ticket Categories',
                        title: 'Ticket Categories',
                        url: '/admin/tickets/categories',
                        icon: Ticket,
                        isActive: pathname.startsWith('/admin/tickets/categories'),
                        category: 'admin',
                        permission: Permissions.ADMIN_TICKET_CATEGORIES_VIEW,
                        group: 'Tickets'
                    },
                    {
                        id: 'admin-ticket-priorities',
                        name: 'Ticket Priorities',
                        title: 'Ticket Priorities',
                        url: '/admin/tickets/priorities',
                        icon: Ticket,
                        isActive: pathname.startsWith('/admin/tickets/priorities'),
                        category: 'admin',
                        permission: Permissions.ADMIN_TICKET_PRIORITIES_VIEW,
                        group: 'Tickets'
                    },
                    {
                        id: 'admin-ticket-statuses',
                        name: 'Ticket Statuses',
                        title: 'Ticket Statuses',
                        url: '/admin/tickets/statuses',
                        icon: Ticket,
                        isActive: pathname.startsWith('/admin/tickets/statuses'),
                        category: 'admin',
                        permission: Permissions.ADMIN_TICKET_STATUSES_VIEW,
                        group: 'Tickets'
                    }
                )
            }
            
            // Add Plugin Admin Items
            if (pluginRoutes?.admin) {
                const pluginItems = convertPluginItems(pluginRoutes.admin, 'admin')
                 // Default admin plugins to the "Plugins" group
                pluginItems.forEach((item) => {
                    if (!item.group || (typeof item.group === 'string' && item.group.trim() === '')) {
                        item.group = 'Plugins'
                    }
                })
                items.push(...pluginItems)
            }
            
            // Add "Back to Dashboard"
             items.push({
                id: 'back-to-dashboard',
                name: 'Back to Dashboard',
                title: 'Back to Dashboard',
                url: '/dashboard',
                icon: Home,
                isActive: false,
                category: 'main',
                group: 'System'
            })


            return items.filter(item => !item.permission || hasPermission(item.permission))
        }

        // MAIN NAVIGATION
        const items: NavigationItem[] = [
            {
                id: 'dashboard',
                name: 'Dashboard',
                title: 'Dashboard',
                url: '/dashboard',
                icon: Home,
                isActive: pathname === '/dashboard',
                category: 'main',
                group: 'Overview'
            },
            {
                id: 'servers',
                name: 'Servers',
                title: 'Servers',
                url: '/dashboard/servers',
                icon: Server,
                isActive: pathname.startsWith('/dashboard/servers'),
                category: 'main',
                group: 'Overview'
            },
            {
                id: 'account',
                name: 'Account',
                title: 'Account',
                url: '/dashboard/account',
                icon: User,
                isActive: pathname.startsWith('/dashboard/account'),
                category: 'main',
                group: 'Account'
            },
        ]

        if (hasPermission(Permissions.ADMIN_DASHBOARD_VIEW)) {
            items.push({
                id: 'admin',
                name: 'Admin',
                title: 'Admin Panel',
                url: '/admin',
                icon: ShieldCheck,
                isActive: pathname.startsWith('/admin'),
                category: 'main',
                group: 'System'
            })
        }

        if (isEnabled(settings?.knowledgebase_enabled)) {
            items.push({
                id: 'knowledgebase',
                name: 'Knowledge Base',
                title: 'Knowledge Base',
                url: '/dashboard/knowledgebase',
                icon: BookOpen,
                isActive: pathname.startsWith('/dashboard/knowledgebase'),
                category: 'main',
                group: 'Support'
            })
        }

        if (isEnabled(settings?.ticket_system_enabled)) {
            items.push({
                id: 'tickets',
                name: 'Support Tickets',
                title: 'Support Tickets',
                url: '/dashboard/tickets',
                icon: Ticket,
                isActive: pathname.startsWith('/dashboard/tickets'),
                category: 'main',
                group: 'Support'
            })
        }

        if (isEnabled(settings?.status_page_enabled)) {
            items.push({
                id: 'status',
                name: 'Status',
                title: 'Status',
                url: '/dashboard/status',
                icon: Activity,
                isActive: pathname.startsWith('/dashboard/status'),
                category: 'main',
                group: 'Support'
            })
        }

        // Add Plugin Items
        if (pluginRoutes?.client) {
            const pluginItems = convertPluginItems(pluginRoutes.client, 'main')
              // Default client plugins to the "Plugins" group
             pluginItems.forEach((item) => {
                if (!item.group || (typeof item.group === 'string' && item.group.trim() === '')) {
                    item.group = 'Plugins'
                }
            })
            items.push(...pluginItems)
        }

        return items
    }, [pathname, hasPermission, pluginRoutes, convertPluginItems, settings])

    return { navigationItems }
}
