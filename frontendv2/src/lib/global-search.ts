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
import { isReactIconComponent, lucideComponentToSlug } from '@/lib/iconLibrary';
import type { NavigationItem } from '@/types/navigation';

export type GlobalSearchMode = 'search' | 'debug';

export const GLOBAL_SEARCH_DEBUG_TRIGGER = '##icanhasfeatherpanel';

export type GlobalSearchCategory =
    | 'currentContext'
    | 'servers'
    | 'serverPages'
    | 'webspaces'
    | 'webspacePages'
    | 'vms'
    | 'vdsPages'
    | 'account'
    | 'adminSettings'
    | 'pages'
    | 'settings'
    | 'admin';

export type GlobalSearchScope =
    'all' | 'admin' | 'settings' | 'account' | 'servers' | 'webspaces' | 'vds' | 'pages' | 'infrastructure';

export interface ParsedGlobalSearchQuery {
    raw: string;
    text: string;
    scope: GlobalSearchScope;
    scopeExplicit: boolean;
    scopeLabel?: string;
    mode: GlobalSearchMode;
    debugCommand?: string;
}

export function extractNavItemIcons(item: NavigationItem): {
    icon?: LucideIcon;
    lucideIcon?: string;
    panelIcon?: string;
} {
    const icon = isReactIconComponent(item.icon) ? item.icon : undefined;
    const lucideIcon = item.lucideIcon ?? (icon ? (lucideComponentToSlug(icon) ?? undefined) : undefined);
    return {
        icon,
        lucideIcon,
        panelIcon: item.panelIcon,
    };
}

export type ScopedEntityKind = 'server' | 'webspace' | 'vds';

export interface GlobalSearchResult {
    id: string;
    title: string;
    subtitle?: string;
    href: string;
    category: GlobalSearchCategory;
    icon?: LucideIcon;
    panelIcon?: string;
    lucideIcon?: string;
    keywords?: string[];
    permission?: string;
    score?: number;
    /** Entity name badge for context-scoped results (current webspace/server/VDS). */
    contextTag?: string;
    isCurrentContext?: boolean;
}

export const GLOBAL_SEARCH_CATEGORY_ORDER: GlobalSearchCategory[] = [
    'currentContext',
    'servers',
    'serverPages',
    'webspaces',
    'webspacePages',
    'vms',
    'vdsPages',
    'account',
    'adminSettings',
    'pages',
    'settings',
    'admin',
];

const CATEGORY_PRIORITY: Record<GlobalSearchCategory, number> = {
    currentContext: 900,
    servers: 700,
    serverPages: 650,
    webspaces: 600,
    webspacePages: 550,
    vms: 500,
    vdsPages: 450,
    account: 420,
    adminSettings: 410,
    pages: 200,
    settings: 180,
    admin: 100,
};

const SCOPE_ALIASES: Record<string, GlobalSearchScope> = {
    admin: 'admin',
    administration: 'admin',
    settings: 'settings',
    setting: 'settings',
    config: 'settings',
    account: 'account',
    user: 'account',
    profile: 'account',
    server: 'servers',
    servers: 'servers',
    gameserver: 'servers',
    webspace: 'webspaces',
    webspaces: 'webspaces',
    web: 'webspaces',
    hosting: 'webspaces',
    vds: 'vds',
    vm: 'vds',
    vms: 'vds',
    page: 'pages',
    pages: 'pages',
    infra: 'infrastructure',
    infrastructure: 'infrastructure',
};

const SCOPE_CATEGORIES: Record<GlobalSearchScope, GlobalSearchCategory[] | 'all'> = {
    all: 'all',
    admin: ['admin', 'adminSettings'],
    settings: ['settings', 'adminSettings', 'account'],
    account: ['account'],
    servers: ['currentContext', 'servers', 'serverPages'],
    webspaces: ['currentContext', 'webspaces', 'webspacePages'],
    vds: ['currentContext', 'vms', 'vdsPages'],
    pages: ['pages'],
    infrastructure: ['currentContext', 'servers', 'serverPages', 'webspaces', 'webspacePages', 'vms', 'vdsPages'],
};

export function parseGlobalSearchQuery(query: string): ParsedGlobalSearchQuery {
    const trimmed = query.trim();

    if (trimmed.toLowerCase().startsWith(GLOBAL_SEARCH_DEBUG_TRIGGER)) {
        const debugCommand = trimmed.slice(GLOBAL_SEARCH_DEBUG_TRIGGER.length).trim();
        return {
            raw: trimmed,
            text: debugCommand,
            scope: 'all',
            scopeExplicit: true,
            scopeLabel: 'debug',
            mode: 'debug',
            debugCommand,
        };
    }

    const atMatch = trimmed.match(/^@(?:(\w+)\s*)?([\s\S]*)$/);
    if (atMatch) {
        const alias = atMatch[1]?.toLowerCase();
        const text = atMatch[2]?.trim() ?? '';
        const scope = alias ? (SCOPE_ALIASES[alias] ?? 'admin') : 'admin';
        return {
            raw: trimmed,
            text,
            scope,
            scopeExplicit: true,
            scopeLabel: alias ? `@${alias}` : '@admin',
            mode: 'search',
        };
    }

    const hashMatch = trimmed.match(/^#(?!#)(?:(\w+)\s*)?([\s\S]*)$/);
    if (hashMatch) {
        const alias = hashMatch[1]?.toLowerCase();
        const text = hashMatch[2]?.trim() ?? '';
        const scope = alias ? (SCOPE_ALIASES[alias] ?? 'infrastructure') : 'infrastructure';
        return {
            raw: trimmed,
            text,
            scope,
            scopeExplicit: true,
            scopeLabel: alias ? `#${alias}` : '#infra',
            mode: 'search',
        };
    }

    return { raw: trimmed, text: trimmed, scope: 'all', scopeExplicit: false, mode: 'search' };
}

function categoriesForScope(scope: GlobalSearchScope): GlobalSearchCategory[] | 'all' {
    return SCOPE_CATEGORIES[scope] ?? 'all';
}

export function flattenNavigationItems(items: NavigationItem[]): NavigationItem[] {
    const flat: NavigationItem[] = [];
    for (const item of items) {
        flat.push(item);
        if (item.children?.length) {
            flat.push(...flattenNavigationItems(item.children));
        }
    }
    return flat;
}

export function navigationToSearchResults(
    items: NavigationItem[],
    category: GlobalSearchCategory,
    groupLabel?: string,
): GlobalSearchResult[] {
    return flattenNavigationItems(items).map((item) => {
        const icons = extractNavItemIcons(item);
        return {
            id: `nav-${category}-${item.id}`,
            title: item.title || item.name,
            subtitle: groupLabel ?? item.group,
            href: item.pluginRedirect ?? item.url,
            category,
            ...icons,
            keywords: [item.name, item.title, item.description, item.group, item.pluginName].filter(
                Boolean,
            ) as string[],
        };
    });
}

function normalize(value: string): string {
    return value.trim().toLowerCase();
}

export function shouldExpandEntityNav(
    entityName: string,
    entityKeywords: string[],
    navItems: NavigationItem[],
    query: string,
): 'all' | 'matching' | 'none' {
    const q = normalize(query);
    if (!q) return 'none';

    const entityHaystack = [entityName, ...entityKeywords].map(normalize);
    if (entityHaystack.some((value) => value.includes(q))) return 'all';

    const flat = flattenNavigationItems(navItems);
    if (
        flat.some((item) => {
            const title = normalize(item.title || item.name);
            const description = normalize(item.description ?? '');
            const group = normalize(item.group ?? '');
            return title.includes(q) || description.includes(q) || group.includes(q);
        })
    ) {
        return 'matching';
    }

    return 'none';
}

function navItemMatchesQuery(item: NavigationItem, query: string): boolean {
    const q = normalize(query);
    if (!q) return true;

    const title = normalize(item.title || item.name);
    const description = normalize(item.description ?? '');
    const group = normalize(item.group ?? '');
    return title.includes(q) || description.includes(q) || group.includes(q);
}

export function currentContextToSearchResults(
    navItems: NavigationItem[],
    opts: {
        entityKey: string;
        entityName: string;
        entityKind: ScopedEntityKind;
        query: string;
    },
): GlobalSearchResult[] {
    const flat = flattenNavigationItems(navItems);

    return flat
        .filter((item) => navItemMatchesQuery(item, opts.query))
        .map((item) => {
            const icons = extractNavItemIcons(item);
            return {
                id: `current-${opts.entityKind}-${opts.entityKey}-${item.id}`,
                title: item.title || item.name,
                subtitle: item.group,
                href: item.pluginRedirect ?? item.url,
                category: 'currentContext' as const,
                ...icons,
                permission: item.permission,
                contextTag: opts.entityName,
                isCurrentContext: true,
                keywords: [
                    item.name,
                    item.title,
                    item.description,
                    item.group,
                    opts.entityName,
                    opts.entityKind,
                ].filter(Boolean) as string[],
            };
        });
}

export function dedupeGlobalSearchResults(results: GlobalSearchResult[]): GlobalSearchResult[] {
    const byHref = new Map<string, GlobalSearchResult>();

    for (const result of results) {
        const existing = byHref.get(result.href);
        if (!existing || result.isCurrentContext) {
            byHref.set(result.href, result);
        }
    }

    return Array.from(byHref.values());
}

export function navItemsToScopedSearchResults(
    navItems: NavigationItem[],
    opts: {
        category: GlobalSearchCategory;
        entityKey: string;
        entityName: string;
        entityKind: ScopedEntityKind;
        kindLabel: string;
        query: string;
        expand: 'all' | 'matching';
    },
): GlobalSearchResult[] {
    const q = normalize(opts.query);
    const flat = flattenNavigationItems(navItems);

    return flat
        .filter((item) => {
            if (opts.expand === 'all') return true;
            const title = normalize(item.title || item.name);
            const description = normalize(item.description ?? '');
            const group = normalize(item.group ?? '');
            return title.includes(q) || description.includes(q) || group.includes(q);
        })
        .map((item) => {
            const icons = extractNavItemIcons(item);
            return {
                id: `${opts.category}-${opts.entityKey}-${item.id}`,
                title: item.title || item.name,
                subtitle: `${opts.kindLabel} · ${opts.entityName}`,
                href: item.pluginRedirect ?? item.url,
                category: opts.category,
                ...icons,
                permission: item.permission,
                keywords: [
                    item.name,
                    item.title,
                    item.description,
                    item.group,
                    opts.entityName,
                    opts.entityKind,
                    opts.kindLabel,
                ].filter(Boolean) as string[],
            };
        });
}

function scoreResult(result: GlobalSearchResult, query: string): number {
    const q = normalize(query);
    if (!q) return 1;

    const title = normalize(result.title);
    const subtitle = normalize(result.subtitle ?? '');
    const keywords = (result.keywords ?? []).map(normalize);

    if (title === q) return 100;
    if (title.startsWith(q)) return 80;
    if (title.includes(q)) return 60;
    if (subtitle.includes(q)) return 40;
    if (keywords.some((k) => k.includes(q))) return 30;
    if (`${title} ${subtitle} ${keywords.join(' ')}`.includes(q)) return 20;
    return 0;
}

function compareSearchResults(a: GlobalSearchResult, b: GlobalSearchResult): number {
    if (a.isCurrentContext !== b.isCurrentContext) {
        return a.isCurrentContext ? -1 : 1;
    }

    const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
    if (Math.abs(scoreDiff) > 5) return scoreDiff;

    const categoryDiff = (CATEGORY_PRIORITY[b.category] ?? 0) - (CATEGORY_PRIORITY[a.category] ?? 0);
    if (categoryDiff !== 0) return categoryDiff;

    return a.title.localeCompare(b.title);
}

export function filterGlobalSearchResults(
    results: GlobalSearchResult[],
    query: string,
    options?: { limit?: number; parsed?: ParsedGlobalSearchQuery },
): GlobalSearchResult[] {
    const parsed = options?.parsed ?? parseGlobalSearchQuery(query);
    const q = normalize(parsed.text);
    const allowed = categoriesForScope(parsed.scope);
    const limit = options?.limit ?? 80;

    const scoped = allowed === 'all' ? results : results.filter((result) => allowed.includes(result.category));

    const scored = scoped
        .map((result) => {
            const baseScore = q ? scoreResult(result, q) : (CATEGORY_PRIORITY[result.category] ?? 1);
            const contextBoost = result.isCurrentContext ? 500 : 0;
            return {
                ...result,
                score: baseScore + contextBoost,
            };
        })
        .filter((result) => !q || (result.score ?? 0) > 0)
        .sort(compareSearchResults);

    return scored.slice(0, limit);
}

export function groupGlobalSearchResults(
    results: GlobalSearchResult[],
): Array<{ category: GlobalSearchCategory; items: GlobalSearchResult[] }> {
    const grouped = new Map<GlobalSearchCategory, GlobalSearchResult[]>();
    for (const result of results) {
        const list = grouped.get(result.category) ?? [];
        list.push(result);
        grouped.set(result.category, list);
    }

    return GLOBAL_SEARCH_CATEGORY_ORDER.filter((category) => grouped.has(category)).map((category) => ({
        category,
        items: grouped.get(category)!,
    }));
}
