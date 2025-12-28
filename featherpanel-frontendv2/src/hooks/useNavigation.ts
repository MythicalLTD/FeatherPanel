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
    Database
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
                url: '/servers',
                icon: Server,
                isActive: pathname.startsWith('/servers'),
                category: 'main',
                group: 'Overview'
            },
            {
                id: 'account',
                name: 'Account',
                title: 'Account',
                url: '/account',
                icon: User,
                isActive: pathname.startsWith('/account'),
                category: 'main',
                group: 'Account'
            }
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

        // Conditional Support Items

        if (isEnabled(settings?.knowledgebase_enabled)) {
            items.push({
                id: 'knowledgebase',
                name: 'Knowledgebase',
                title: 'Knowledgebase',
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
            items.push(...pluginItems)
        }

        return items
    }, [pathname, hasPermission, pluginRoutes, convertPluginItems, settings])

    return { navigationItems }
}
