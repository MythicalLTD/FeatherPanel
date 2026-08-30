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

import type { WebSpace } from '@/types/webspace';

const RECENT_WEBSPACES_KEY = 'featherpanel_recent_webspaces_v1';

export type WebSpaceSwitcherTab = 'all' | 'favorites' | 'recent';

type RecentEntry = {
    uuidShort: string;
    lastViewedAt: string;
};

export function getRecentWebSpaceUuidShorts(): string[] {
    if (typeof window === 'undefined') return [];

    try {
        const raw = window.localStorage.getItem(RECENT_WEBSPACES_KEY);
        if (!raw) return [];
        const recent = JSON.parse(raw) as RecentEntry[];
        if (!Array.isArray(recent)) return [];
        return recent.map((e) => e.uuidShort).filter(Boolean);
    } catch {
        return [];
    }
}

export function getWebSpaceRouteId(webspace: Pick<WebSpace, 'uuid' | 'uuidShort'>): string {
    return webspace.uuidShort || webspace.uuid.slice(0, 8);
}

export function getCurrentWebSpaceUuidShort(pathname: string): string | null {
    if (!pathname.startsWith('/webspace/')) return null;
    const segment = pathname.split('/')[2];
    return segment || null;
}

function normalizeSearch(search?: string): string {
    if (!search) return '';
    if (search === '?') return '';
    return search.startsWith('?') ? search : `?${search}`;
}

/** Preserve the current webspace sub-route when switching (e.g. /files → /files). */
export function buildWebSpaceSwitchUrl(targetUuidShort: string, pathname: string, search?: string): string {
    const match = pathname.match(/^\/webspace\/[^/]+(\/.*)?$/);
    const subpath = match?.[1] ?? '';
    const qs = normalizeSearch(search);
    return `/webspace/${targetUuidShort}${subpath}${qs}`;
}

export function isWebSpaceFileViewerPath(pathname: string): boolean {
    return /^\/webspace\/[^/]+\/files\/(edit|ide)\/?$/.test(pathname);
}

export function filterWebSpacesForSwitcherTab(
    webspaces: WebSpace[],
    tab: WebSpaceSwitcherTab,
    favoriteUuids: string[],
    recentUuidShorts: string[],
): WebSpace[] {
    if (tab === 'favorites') {
        const favSet = new Set(favoriteUuids);
        return webspaces.filter((w) => favSet.has(w.uuid));
    }

    if (tab === 'recent') {
        const recentSet = new Set(recentUuidShorts);
        const byRecent = webspaces.filter((w) => recentSet.has(getWebSpaceRouteId(w)));
        return byRecent.sort((a, b) => {
            const aId = getWebSpaceRouteId(a);
            const bId = getWebSpaceRouteId(b);
            return recentUuidShorts.indexOf(aId) - recentUuidShorts.indexOf(bId);
        });
    }

    return webspaces;
}

export function filterWebSpacesBySearch(webspaces: WebSpace[], query: string): WebSpace[] {
    const q = query.trim().toLowerCase();
    if (!q) return webspaces;

    return webspaces.filter((webspace) => {
        const name = webspace.name?.toLowerCase() ?? '';
        const description = webspace.description?.toLowerCase() ?? '';
        const routeId = getWebSpaceRouteId(webspace).toLowerCase();
        const plateName = webspace.webplate_name?.toLowerCase() ?? '';
        const nodeName = webspace.web_node_name?.toLowerCase() ?? '';
        const domains = Array.isArray(webspace.domains) ? webspace.domains.join(' ').toLowerCase() : '';
        return (
            name.includes(q) ||
            description.includes(q) ||
            routeId.includes(q) ||
            plateName.includes(q) ||
            nodeName.includes(q) ||
            domains.includes(q)
        );
    });
}

export function sortWebSpacesWithFavoritesFirst(webspaces: WebSpace[], favoriteUuids: string[]): WebSpace[] {
    const favSet = new Set(favoriteUuids);
    return [...webspaces].sort((a, b) => {
        const aFav = favSet.has(a.uuid) ? 0 : 1;
        const bFav = favSet.has(b.uuid) ? 0 : 1;
        if (aFav !== bFav) return aFav - bFav;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
}

export function sortWebSpacesForSwitcher(webspaces: WebSpace[], currentUuidShort: string | null): WebSpace[] {
    const recentOrder = getRecentWebSpaceUuidShorts();

    const score = (webspace: WebSpace): number => {
        const id = getWebSpaceRouteId(webspace);
        if (currentUuidShort && id === currentUuidShort) return -1;
        const recentIndex = recentOrder.indexOf(id);
        if (recentIndex >= 0) return recentIndex;
        return 1000;
    };

    return [...webspaces].sort((a, b) => {
        const scoreA = score(a);
        const scoreB = score(b);
        if (scoreA !== scoreB) return scoreA - scoreB;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
}
