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
import { MODULE_BADGES, type PanelModule } from '@/lib/modules';

export type GlobalSearchMode = 'search' | 'debug';

export const GLOBAL_SEARCH_DEBUG_TRIGGER = '##icanhasfeatherpanel';

export type GlobalSearchCategory =
    | 'recent'
    | 'commands'
    | 'files'
    | 'nodes'
    | 'tickets'
    | 'currentContext'
    | 'servers'
    | 'serverPages'
    | 'webspaces'
    | 'webspacePages'
    | 'vms'
    | 'vdsPages'
    | 'account'
    | 'adminSettings'
    | 'users'
    | 'pages'
    | 'settings'
    | 'admin'
    | 'plugins';

export type GlobalSearchScope =
    | 'all'
    | 'admin'
    | 'settings'
    | 'account'
    | 'servers'
    | 'webspaces'
    | 'vds'
    | 'pages'
    | 'infrastructure'
    | 'commands'
    | 'files'
    | 'nodes'
    | 'tickets';

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
    /** Module the result belongs to (GAME / WEB / VDS badge). */
    module?: PanelModule;
    isCurrentContext?: boolean;
    /** Command results run this palette action instead of (or before) navigating. */
    action?: string;
}

export const GLOBAL_SEARCH_CATEGORY_ORDER: GlobalSearchCategory[] = [
    'recent',
    'currentContext',
    'commands',
    'files',
    'servers',
    'serverPages',
    'webspaces',
    'webspacePages',
    'vms',
    'vdsPages',
    'account',
    'adminSettings',
    'users',
    'nodes',
    'tickets',
    'pages',
    'settings',
    'admin',
    'plugins',
];

const CATEGORY_PRIORITY: Record<GlobalSearchCategory, number> = {
    recent: 950,
    commands: 800,
    files: 750,
    nodes: 390,
    tickets: 380,
    currentContext: 900,
    servers: 700,
    serverPages: 650,
    webspaces: 600,
    webspacePages: 550,
    vms: 500,
    vdsPages: 450,
    account: 420,
    adminSettings: 410,
    users: 400,
    pages: 200,
    settings: 180,
    admin: 100,
    plugins: 350,
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
    node: 'nodes',
    nodes: 'nodes',
    ticket: 'tickets',
    tickets: 'tickets',
    support: 'tickets',
    file: 'files',
    files: 'files',
    cmd: 'commands',
    command: 'commands',
    commands: 'commands',
};

const SCOPE_CATEGORIES: Record<GlobalSearchScope, GlobalSearchCategory[] | 'all'> = {
    all: 'all',
    admin: ['admin', 'adminSettings', 'users', 'nodes', 'tickets'],
    settings: ['settings', 'adminSettings', 'account'],
    account: ['account'],
    servers: ['currentContext', 'servers', 'serverPages'],
    webspaces: ['currentContext', 'webspaces', 'webspacePages'],
    vds: ['currentContext', 'vms', 'vdsPages'],
    pages: ['pages'],
    infrastructure: [
        'currentContext',
        'servers',
        'serverPages',
        'webspaces',
        'webspacePages',
        'vms',
        'vdsPages',
        'nodes',
    ],
    commands: ['commands'],
    files: ['files'],
    nodes: ['nodes'],
    tickets: ['tickets'],
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

    // `>` runs commands, `/` searches files of the current server (`/config/ser` looks in /config).
    if (trimmed.startsWith('>')) {
        return {
            raw: trimmed,
            text: trimmed.slice(1).trim(),
            scope: 'commands',
            scopeExplicit: true,
            scopeLabel: '>',
            mode: 'search',
        };
    }
    if (trimmed.startsWith('/')) {
        return {
            raw: trimmed,
            text: trimmed.slice(1).trim(),
            scope: 'files',
            scopeExplicit: true,
            scopeLabel: '/',
            mode: 'search',
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
    groupLabel?: string | ((item: NavigationItem) => string | undefined),
): GlobalSearchResult[] {
    return flattenNavigationItems(items).map((item) => {
        const icons = extractNavItemIcons(item);
        const label = typeof groupLabel === 'function' ? groupLabel(item) : groupLabel;
        return {
            id: `nav-${category}-${item.id}`,
            title: item.title || item.name,
            subtitle: label ?? item.group,
            href: item.pluginRedirect ?? item.url,
            category,
            ...icons,
            module: item.module,
            keywords: [
                item.name,
                item.title,
                item.description,
                item.group,
                label,
                item.pluginName,
                item.module ? MODULE_BADGES[item.module] : undefined,
            ].filter(Boolean) as string[],
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

/** Characters of `needle` appear in order in `haystack` (gaps allowed). Tighter matches score higher. */
function fuzzyScore(haystack: string, needle: string): number {
    let position = -1;
    let gaps = 0;
    for (const char of needle) {
        const next = haystack.indexOf(char, position + 1);
        if (next === -1) return 0;
        if (position !== -1) gaps += next - position - 1;
        position = next;
    }
    return Math.max(1, 15 - gaps);
}

function scoreToken(title: string, subtitle: string, keywords: string[], token: string): number {
    if (title === token) return 100;
    if (title.startsWith(token)) return 80;
    if (title.split(/[\s\-_./·]+/).some((word) => word.startsWith(token))) return 70;
    if (title.includes(token)) return 60;
    if (subtitle.includes(token)) return 40;
    if (keywords.some((k) => k.includes(token))) return 30;
    if (token.length >= 2) return fuzzyScore(title, token);
    return 0;
}

/** Every word of the query must match somewhere; the score is the weakest word's score plus an exact-title bonus. */
export function scoreResult(result: GlobalSearchResult, query: string): number {
    const q = normalize(query);
    if (!q) return 1;

    const title = normalize(result.title);
    const subtitle = normalize(result.subtitle ?? '');
    const keywords = (result.keywords ?? []).map(normalize);
    if (title === q) return 120;

    const tokens = q.split(/\s+/).filter(Boolean);
    let weakest = Infinity;
    for (const token of tokens) {
        const score = scoreToken(title, subtitle, keywords, token);
        if (score === 0) return 0;
        weakest = Math.min(weakest, score);
    }
    return tokens.length > 1 && title.startsWith(tokens[0]) ? weakest + 5 : weakest;
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
    options?: { limit?: number; parsed?: ParsedGlobalSearchQuery; recentHrefs?: string[] },
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
            // Places you opened recently rank a little higher while you type.
            const recentIndex = q ? (options?.recentHrefs ?? []).indexOf(result.href) : -1;
            const recentBoost = baseScore > 0 && recentIndex !== -1 ? 12 - Math.min(recentIndex, 10) : 0;
            return {
                ...result,
                score: baseScore + contextBoost + recentBoost,
            };
        })
        .filter((result) => !q || (result.score ?? 0) > 0)
        .sort(compareSearchResults);

    return scored.slice(0, limit);
}

export function groupGlobalSearchResults(
    results: GlobalSearchResult[],
    options?: { ranked?: boolean; perGroupLimit?: number },
): Array<{ category: GlobalSearchCategory; items: GlobalSearchResult[] }> {
    const grouped = new Map<GlobalSearchCategory, GlobalSearchResult[]>();
    for (const result of results) {
        const list = grouped.get(result.category) ?? [];
        list.push(result);
        grouped.set(result.category, list);
    }

    const groups = GLOBAL_SEARCH_CATEGORY_ORDER.filter((category) => grouped.has(category)).map((category) => ({
        category,
        items: options?.perGroupLimit ? grouped.get(category)!.slice(0, options.perGroupLimit) : grouped.get(category)!,
    }));
    if (!options?.ranked) return groups;

    // While typing, the group holding the best match comes first (recent and current context stay pinned).
    const pinned: GlobalSearchCategory[] = ['recent', 'currentContext'];
    const best = (items: GlobalSearchResult[]) => Math.max(...items.map((item) => item.score ?? 0));
    return [
        ...groups.filter((group) => pinned.includes(group.category)),
        ...groups
            .filter((group) => !pinned.includes(group.category))
            .map((group, order) => ({ group, order, best: best(group.items) }))
            .sort((a, b) => b.best - a.best || a.order - b.order)
            .map(({ group }) => group),
    ];
}
