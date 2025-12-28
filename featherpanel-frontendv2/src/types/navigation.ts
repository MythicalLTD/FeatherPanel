import type { LucideIcon } from 'lucide-react'

export interface NavigationItem {
    id: string
    name: string
    title: string
    url: string
    icon: LucideIcon | string // LucideIcon for built-in, string (emoji/url) for plugins
    isActive: boolean
    category: 'main' | 'admin' | 'server'
    permission?: string
    isPlugin?: boolean
    pluginJs?: string
    pluginRedirect?: string
    pluginName?: string
    pluginTag?: string
    showBadge?: boolean
    description?: string
    group?: string
    badge?: string
}

export interface NavigationGroup {
    name: string
    items: NavigationItem[]
}

export interface PluginSidebarItem {
    name: string
    icon: string
    js?: string
    redirect?: string
    component?: string
    description?: string
    category: string
    plugin: string
    pluginName?: string
    permission?: string
    showBadge?: boolean
    group?: string
}

export interface PluginSidebarResponse {
    success: boolean
    data: {
        sidebar: {
            server: Record<string, PluginSidebarItem>
            client: Record<string, PluginSidebarItem>
            admin: Record<string, PluginSidebarItem>
        }
    }
}
