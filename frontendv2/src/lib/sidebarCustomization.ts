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

import type { NavigationItem } from '@/types/navigation';

export type SidebarScope = 'admin' | 'main' | 'server' | 'vds' | 'webspace';

export type SidebarCustomLink = {
    id: string;
    name: string;
    url: string;
    group?: string;
    icon?: string;
    open_in_new_tab?: boolean;
    priority?: number;
};

export type SidebarScopeConfig = {
    hidden?: string[];
    order?: string[];
    custom_links?: SidebarCustomLink[];
};

export type SidebarNavigationConfig = Partial<Record<SidebarScope, SidebarScopeConfig>>;

export function parseSidebarNavigationConfig(raw: unknown): SidebarNavigationConfig {
    if (!raw) return {};
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) return {};
        try {
            const parsed = JSON.parse(trimmed) as unknown;
            return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
                ? (parsed as SidebarNavigationConfig)
                : {};
        } catch {
            return {};
        }
    }
    if (typeof raw === 'object' && !Array.isArray(raw)) {
        return raw as SidebarNavigationConfig;
    }
    return {};
}

export function hasSidebarCustomization(config: SidebarNavigationConfig | null | undefined): boolean {
    if (!config) return false;
    return Object.values(config).some((scope) => {
        if (!scope) return false;
        return (
            (scope.hidden?.length ?? 0) > 0 || (scope.order?.length ?? 0) > 0 || (scope.custom_links?.length ?? 0) > 0
        );
    });
}

function isExternalUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
}

/**
 * Admin submenus that were flattened into sidebar sections. Saved configs may still hide or
 * order these parent ids; expand them to the items that used to live inside so a hidden
 * submenu stays hidden and an ordered one keeps its place.
 */
const LEGACY_ADMIN_PARENTS: Record<string, string[]> = {
    'admin-myfeatherpanel': [
        'admin-myfeatherpanel-cloud',
        'admin-myfeatherpanel-premium',
        'admin-myfeatherpanel-report-issue',
        'admin-myfeatherpanel-suggest',
        'admin-myfeatherpanel-marketplace',
        'admin-plugins',
        'admin-updates',
        'admin-translations',
    ],
    'admin-servers-parent': [
        'admin-servers',
        'admin-vm-instances',
        'admin-webspaces',
        'admin-backup-schedules',
        'admin-wings-backups',
    ],
    'admin-locations-parent': [
        'admin-locations',
        'admin-nodes',
        'admin-vds-nodes',
        'admin-web-nodes',
        'admin-mail-hosts',
        'admin-dns-hosts',
        'admin-nodes-status',
        'admin-mounts',
        'admin-node-databases',
    ],
    'admin-realms-parent': ['admin-realms', 'admin-spells', 'admin-webplates'],
    'admin-settings': [
        'admin-settings-general',
        'admin-support',
        'admin-oidc-providers',
        'admin-ldap-providers',
        'admin-rate-limits',
        'admin-blocked-email-domains',
        'admin-blocked-ips',
        'admin-abuseipdb',
        'admin-subdomains',
        'admin-mail-templates',
        'admin-feathercloud-ai-agent',
    ],
};

/** Replace legacy admin parent ids with their former children (order preserved, no duplicates). */
export function expandLegacyAdminIds(ids: string[]): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    const add = (id: string) => {
        if (seen.has(id)) return;
        seen.add(id);
        out.push(id);
    };
    for (const id of ids) {
        const children = LEGACY_ADMIN_PARENTS[id];
        if (children) children.forEach(add);
        else add(id);
    }
    return out;
}

/**
 * Apply Premium sidebar hide / reorder / custom links for one scope.
 * Safe no-op when config is empty.
 */
export function applySidebarCustomization(
    items: NavigationItem[],
    config: SidebarNavigationConfig | null | undefined,
    scope: SidebarScope,
    category: NavigationItem['category'] = scope === 'main' ? 'main' : scope === 'server' ? 'server' : 'admin',
): NavigationItem[] {
    const scopeConfig = config?.[scope];
    if (!scopeConfig) {
        return items;
    }

    const legacy = scope === 'admin' ? expandLegacyAdminIds : (ids: string[]) => ids;
    const hidden = new Set(legacy((scopeConfig.hidden ?? []).filter(Boolean)));
    let next = items
        .filter((item) => !hidden.has(item.id))
        .map((item) => {
            if (!item.children?.length) return item;
            const children = item.children.filter((child) => !hidden.has(child.id));
            return { ...item, children };
        });

    for (const link of scopeConfig.custom_links ?? []) {
        if (!link?.id || !link.name || !link.url) continue;
        const id = link.id.startsWith('custom-') ? link.id : `custom-${link.id}`;
        if (hidden.has(id) || hidden.has(link.id)) continue;
        if (next.some((item) => item.id === id)) continue;

        const openInNewTab = Boolean(link.open_in_new_tab) || isExternalUrl(link.url);
        next.push({
            id,
            name: link.name,
            title: link.name,
            url: link.url,
            icon: '🔗',
            lucideIcon: link.icon || (openInNewTab ? 'external-link' : 'link'),
            isActive: false,
            category,
            group: link.group || 'overview',
            priority: typeof link.priority === 'number' ? link.priority : 1000,
            openInNewTab,
            isCustom: true,
        });
    }

    const order = legacy((scopeConfig.order ?? []).filter(Boolean));
    if (order.length > 0) {
        const indexMap = new Map(order.map((id, index) => [id, index]));
        next = [...next].sort((a, b) => {
            const ai = indexMap.has(a.id) ? (indexMap.get(a.id) as number) : 10_000 + (a.priority ?? 0);
            const bi = indexMap.has(b.id) ? (indexMap.get(b.id) as number) : 10_000 + (b.priority ?? 0);
            if (ai !== bi) return ai - bi;
            return (a.priority ?? 0) - (b.priority ?? 0);
        });
        next = next.map((item, index) => ({ ...item, priority: index, sidebarOrderIndex: index }));
    }

    return next;
}

/** Flatten top-level + children for the Premium editor list. */
export function flattenNavCatalog(items: NavigationItem[]): Array<{ id: string; name: string; group?: string }> {
    const rows: Array<{ id: string; name: string; group?: string }> = [];
    for (const item of items) {
        rows.push({ id: item.id, name: item.name, group: item.group });
        for (const child of item.children ?? []) {
            rows.push({
                id: child.id,
                name: `${item.name} → ${child.name}`,
                group: item.group,
            });
        }
    }
    return rows;
}
