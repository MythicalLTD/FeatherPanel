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

import type { LucideIcon } from 'lucide-react';

export interface NavigationItem {
    id: string;
    name: string;
    title: string;
    url: string;
    icon: LucideIcon | string; // LucideIcon for built-in, string (emoji/url) for plugins
    lucideIcon?: string; // Lucide icon name for dynamic loading (e.g., "camera", "search") - if provided, will be used instead of icon
    isActive: boolean;
    category: 'main' | 'admin' | 'server';
    permission?: string;
    isPlugin?: boolean;
    pluginJs?: string;
    pluginRedirect?: string;
    pluginName?: string;
    pluginTag?: string;
    showBadge?: boolean;
    description?: string;
    group?: string;
    badge?: string;
    children?: NavigationItem[]; // Optional submenu items
}

export interface NavigationGroup {
    name: string;
    items: NavigationItem[];
}

export interface PluginSidebarItem {
    name: string;
    icon: string;
    lucideIcon?: string; // Lucide icon name (e.g., "camera", "search") - if provided, will be used instead of icon emoji
    js?: string;
    redirect?: string;
    component?: string;
    description?: string;
    category: string;
    plugin: string;
    pluginName?: string;
    permission?: string;
    showBadge?: boolean;
    group?: string;
    allowedOnlyOnSpells?: number[] | null; // Array of spell IDs if restricted, null if no restrictions
}

export interface PluginSidebarResponse {
    success: boolean;
    data: {
        sidebar: {
            server: Record<string, PluginSidebarItem>;
            client: Record<string, PluginSidebarItem>;
            admin: Record<string, PluginSidebarItem>;
        };
    };
}
