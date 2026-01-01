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
