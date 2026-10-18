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

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Per-user dashboard configuration: which widgets show, in what order and size, and how the
 * server section looks. Stored in localStorage under the same key as the earlier layout, which
 * the interface settings sync (lib/ui-prefs-sync.ts) already carries to the user's account, so
 * the dashboard follows them across devices.
 */
export const DASHBOARD_LAYOUT_STORAGE_KEY = 'featherpanel_dashboard_layout_v1';

/** 7: widget list with sizes replaces the fixed two columns of version 6. */
const LAYOUT_VERSION = 7;

export type DashboardWidgetId =
    | 'stats'
    | 'attention'
    | 'servers'
    | 'vds'
    | 'webspaces'
    | 'usage'
    | 'status'
    | 'uptime'
    | 'network'
    | 'backups'
    | 'schedules'
    | 'quick_actions'
    | 'announcements'
    | 'activity'
    | 'tickets'
    | 'knowledgebase'
    | 'recent_mails'
    | 'profile';

export type DashboardWidgetSize = 'small' | 'medium' | 'full';

export interface DashboardWidgetPlacement {
    id: DashboardWidgetId;
    size: DashboardWidgetSize;
}

export type DashboardServerView = 'list' | 'grid' | 'detailed';
export type DashboardServerSort = 'recent' | 'name' | 'status';
export type DashboardServerGroup = 'none' | 'node' | 'folder';
export type DashboardMeter = 'cpu' | 'ram' | 'disk';
export type DashboardStatTileId = 'game' | 'vds' | 'web' | 'support';
export type DashboardDensity = 'comfortable' | 'compact';

export interface DashboardServerOptions {
    view: DashboardServerView;
    sort: DashboardServerSort;
    /** Favourite (pinned) servers stay on top whatever the sort. */
    favoritesFirst: boolean;
    group: DashboardServerGroup;
    images: boolean;
    meters: DashboardMeter[];
    limit: number;
}

export interface DashboardConfig {
    layoutVersion: number;
    widgets: DashboardWidgetPlacement[];
    /** Side column (small widgets) on the left on wide screens. */
    sideFirst: boolean;
    density: DashboardDensity;
    statTiles: DashboardStatTileId[];
    servers: DashboardServerOptions;
    hiddenPluginWidgets: string[];
}

export const SERVER_LIMIT_OPTIONS = [3, 6, 10, 20] as const;
export const STAT_TILE_IDS: DashboardStatTileId[] = ['game', 'vds', 'web', 'support'];
export const METER_IDS: DashboardMeter[] = ['cpu', 'ram', 'disk'];

/** Sizes each widget supports; the first is its default. */
export const WIDGET_SIZES: Record<DashboardWidgetId, DashboardWidgetSize[]> = {
    stats: ['full'],
    attention: ['full'],
    servers: ['medium', 'full'],
    vds: ['medium', 'full'],
    webspaces: ['medium', 'full'],
    usage: ['small', 'medium', 'full'],
    status: ['small', 'medium', 'full'],
    uptime: ['small', 'medium', 'full'],
    network: ['small', 'medium', 'full'],
    backups: ['small', 'medium', 'full'],
    schedules: ['small', 'medium', 'full'],
    quick_actions: ['small', 'medium', 'full'],
    announcements: ['small', 'medium', 'full'],
    activity: ['small', 'medium', 'full'],
    tickets: ['small', 'medium', 'full'],
    knowledgebase: ['small', 'medium', 'full'],
    recent_mails: ['medium', 'full', 'small'],
    profile: ['small', 'medium'],
};

export const ALL_WIDGET_IDS = Object.keys(WIDGET_SIZES) as DashboardWidgetId[];

const place = (id: DashboardWidgetId, size?: DashboardWidgetSize): DashboardWidgetPlacement => ({
    id,
    size: size ?? WIDGET_SIZES[id][0],
});

/** Calm default: what you own on the left, a few helpful cards on the right. */
export const DEFAULT_WIDGETS: DashboardWidgetPlacement[] = [
    place('stats'),
    place('attention'),
    place('servers'),
    place('announcements'),
    place('usage'),
    place('vds'),
    place('webspaces'),
    place('quick_actions'),
    place('activity'),
    place('recent_mails'),
    place('backups'),
    place('tickets'),
    place('knowledgebase'),
];

export const DEFAULT_SERVER_OPTIONS: DashboardServerOptions = {
    view: 'detailed',
    sort: 'recent',
    favoritesFirst: true,
    group: 'none',
    images: true,
    meters: ['cpu', 'ram', 'disk'],
    limit: 6,
};

export function defaultDashboardConfig(): DashboardConfig {
    return {
        layoutVersion: LAYOUT_VERSION,
        widgets: DEFAULT_WIDGETS.map((w) => ({ ...w })),
        sideFirst: false,
        density: 'comfortable',
        statTiles: [...STAT_TILE_IDS],
        servers: { ...DEFAULT_SERVER_OPTIONS, meters: [...DEFAULT_SERVER_OPTIONS.meters] },
        hiddenPluginWidgets: [],
    };
}

function isWidgetId(x: unknown): x is DashboardWidgetId {
    return typeof x === 'string' && x in WIDGET_SIZES;
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    return allowed.includes(value as T) ? (value as T) : fallback;
}

function uniqueStrings(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((x, i): x is string => typeof x === 'string' && x !== '' && raw.indexOf(x) === i);
}

function parseWidgets(raw: unknown): DashboardWidgetPlacement[] | null {
    if (!Array.isArray(raw)) return null;
    const out: DashboardWidgetPlacement[] = [];
    for (const entry of raw) {
        const id = (entry as { id?: unknown })?.id;
        if (!isWidgetId(id) || out.some((w) => w.id === id)) continue;
        const size = (entry as { size?: unknown }).size;
        out.push({ id, size: pick(size, WIDGET_SIZES[id], WIDGET_SIZES[id][0]) });
    }
    return out;
}

/** Version 6 had a main column, a side column and a hidden list; carry the user's choices over. */
function migrateV6(parsed: Record<string, unknown>): DashboardConfig {
    const config = defaultDashboardConfig();
    const hidden = new Set(uniqueStrings(parsed.hidden));
    const left = uniqueStrings(parsed.leftOrder);
    const right = uniqueStrings(parsed.rightOrder);
    if (left.length === 0 && right.length === 0) {
        config.widgets = config.widgets.filter((w) => !hidden.has(w.id));
    } else {
        const widgets: DashboardWidgetPlacement[] = [];
        for (const id of ['stats', 'attention'] as const) if (!hidden.has(id)) widgets.push(place(id));
        const main: DashboardWidgetPlacement[] = [];
        for (const id of left) {
            if (hidden.has(id)) continue;
            if (id === 'resources') main.push(place('servers'), place('vds'), place('webspaces'));
            else if (isWidgetId(id)) main.push(place(id, 'medium'));
        }
        const side = right
            .filter((id) => !hidden.has(id) && isWidgetId(id))
            .map((id) => place(id as DashboardWidgetId, 'small'));
        // Two of the new widgets join the side column so existing users see them once.
        side.splice(Math.min(1, side.length), 0, place('usage'), place('quick_actions'));
        widgets.push(...main, ...side);
        config.widgets = widgets;
    }
    config.sideFirst = Boolean(parsed.columnsReversed);
    config.hiddenPluginWidgets = uniqueStrings(parsed.hiddenPluginWidgets);
    return config;
}

export function parseDashboardConfig(raw: string | null): DashboardConfig {
    if (!raw) return defaultDashboardConfig();
    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const version = typeof parsed.layoutVersion === 'number' ? parsed.layoutVersion : 1;
        if (version < LAYOUT_VERSION) return migrateV6(parsed);

        const base = defaultDashboardConfig();
        const s = (parsed.servers ?? {}) as Record<string, unknown>;
        const meters = uniqueStrings(s.meters).filter((m): m is DashboardMeter =>
            METER_IDS.includes(m as DashboardMeter),
        );
        const limit = SERVER_LIMIT_OPTIONS.includes(s.limit as (typeof SERVER_LIMIT_OPTIONS)[number])
            ? (s.limit as number)
            : base.servers.limit;
        return {
            layoutVersion: LAYOUT_VERSION,
            widgets: parseWidgets(parsed.widgets) ?? base.widgets,
            sideFirst: Boolean(parsed.sideFirst),
            density: pick(parsed.density, ['comfortable', 'compact'] as const, 'comfortable'),
            statTiles: Array.isArray(parsed.statTiles)
                ? uniqueStrings(parsed.statTiles).filter((x): x is DashboardStatTileId =>
                      STAT_TILE_IDS.includes(x as DashboardStatTileId),
                  )
                : base.statTiles,
            servers: {
                view: pick(s.view, ['list', 'grid', 'detailed'] as const, base.servers.view),
                sort: pick(s.sort, ['recent', 'name', 'status'] as const, base.servers.sort),
                favoritesFirst: typeof s.favoritesFirst === 'boolean' ? s.favoritesFirst : true,
                group: pick(s.group, ['none', 'node', 'folder'] as const, 'none'),
                images: typeof s.images === 'boolean' ? s.images : true,
                meters: Array.isArray(s.meters) ? meters : base.servers.meters,
                limit,
            },
            hiddenPluginWidgets: uniqueStrings(parsed.hiddenPluginWidgets),
        };
    } catch {
        return defaultDashboardConfig();
    }
}

export function useDashboardConfig() {
    const [config, setConfig] = useState<DashboardConfig>(defaultDashboardConfig);
    const [loaded, setLoaded] = useState(false);
    const skipSave = useRef(true);

    // Read after hydration so the server render and the first client render match.
    useLayoutEffect(() => {
        setConfig(parseDashboardConfig(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)));
        setLoaded(true);
    }, []);

    useEffect(() => {
        const onStorage = (event: StorageEvent) => {
            if (event.key !== DASHBOARD_LAYOUT_STORAGE_KEY) return;
            skipSave.current = true;
            setConfig(parseDashboardConfig(event.newValue));
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    useEffect(() => {
        if (!loaded) return;
        if (skipSave.current) {
            skipSave.current = false;
            return;
        }
        try {
            localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(config));
        } catch {
            // Storage full or blocked: the layout still works for this visit.
        }
    }, [config, loaded]);

    const update = useCallback((patch: Partial<DashboardConfig>) => setConfig((c) => ({ ...c, ...patch })), []);

    const updateServers = useCallback(
        (patch: Partial<DashboardServerOptions>) => setConfig((c) => ({ ...c, servers: { ...c.servers, ...patch } })),
        [],
    );

    const addWidget = useCallback(
        (id: DashboardWidgetId) =>
            setConfig((c) => (c.widgets.some((w) => w.id === id) ? c : { ...c, widgets: [...c.widgets, place(id)] })),
        [],
    );

    const removeWidget = useCallback(
        (id: DashboardWidgetId) => setConfig((c) => ({ ...c, widgets: c.widgets.filter((w) => w.id !== id) })),
        [],
    );

    const resizeWidget = useCallback(
        (id: DashboardWidgetId, size: DashboardWidgetSize) =>
            setConfig((c) => ({
                ...c,
                widgets: c.widgets.map((w) => (w.id === id && WIDGET_SIZES[id].includes(size) ? { ...w, size } : w)),
            })),
        [],
    );

    /** Move a widget to a new index in the list. */
    const moveWidget = useCallback(
        (id: DashboardWidgetId, toIndex: number) =>
            setConfig((c) => {
                const from = c.widgets.findIndex((w) => w.id === id);
                if (from < 0) return c;
                const next = [...c.widgets];
                const [item] = next.splice(from, 1);
                next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, item);
                return { ...c, widgets: next };
            }),
        [],
    );

    const toggleStatTile = useCallback(
        (id: DashboardStatTileId) =>
            setConfig((c) => ({
                ...c,
                statTiles: c.statTiles.includes(id)
                    ? c.statTiles.filter((x) => x !== id)
                    : STAT_TILE_IDS.filter((x) => x === id || c.statTiles.includes(x)),
            })),
        [],
    );

    const toggleHiddenPluginWidget = useCallback(
        (widgetId: string) =>
            setConfig((c) => ({
                ...c,
                hiddenPluginWidgets: c.hiddenPluginWidgets.includes(widgetId)
                    ? c.hiddenPluginWidgets.filter((x) => x !== widgetId)
                    : [...c.hiddenPluginWidgets, widgetId],
            })),
        [],
    );

    const reset = useCallback(() => setConfig(defaultDashboardConfig()), []);

    return {
        config,
        loaded,
        update,
        updateServers,
        addWidget,
        removeWidget,
        resizeWidget,
        moveWidget,
        toggleStatTile,
        toggleHiddenPluginWidget,
        reset,
    };
}

export type DashboardConfigApi = ReturnType<typeof useDashboardConfig>;
