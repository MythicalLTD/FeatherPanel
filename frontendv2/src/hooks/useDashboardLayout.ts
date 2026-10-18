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

import { useCallback, useEffect, useState } from 'react';

export const DASHBOARD_LAYOUT_STORAGE_KEY = 'featherpanel_dashboard_layout_v1';

/**
 * 6: dashboard redesign. Announcements, support and the knowledge base moved to the side column,
 * the welcome hero became a fixed header and the profile card is opt-in. Stored orders from
 * earlier versions are reset to the new defaults; hidden blocks and plugin widgets are kept.
 */
const LAYOUT_VERSION = 6;

export type DashboardLeftBlockId = 'resources' | 'recent_mails';
export type DashboardRightBlockId = 'announcements' | 'activity' | 'tickets' | 'knowledgebase' | 'profile';
export type DashboardBlockId = 'stats' | 'attention' | DashboardLeftBlockId | DashboardRightBlockId;

const LEFT_POOL: DashboardLeftBlockId[] = ['resources', 'recent_mails'];
const RIGHT_POOL: DashboardRightBlockId[] = ['announcements', 'activity', 'tickets', 'knowledgebase', 'profile'];

const LEFT_DEFAULT: DashboardLeftBlockId[] = ['resources', 'recent_mails'];
const RIGHT_DEFAULT: DashboardRightBlockId[] = ['announcements', 'activity', 'tickets', 'knowledgebase'];

const ALL_BLOCK_IDS: DashboardBlockId[] = ['stats', 'attention', ...LEFT_POOL, ...RIGHT_POOL];

export interface DashboardLayoutState {
    hidden: DashboardBlockId[];
    /** Plugin widget ids the user has hidden from the dashboard. */
    hiddenPluginWidgets: string[];
    leftOrder: DashboardLeftBlockId[];
    rightOrder: DashboardRightBlockId[];
    columnsReversed: boolean;
    layoutVersion: number;
}

const DEFAULT_STATE: DashboardLayoutState = {
    hidden: [],
    hiddenPluginWidgets: [],
    leftOrder: [...LEFT_DEFAULT],
    rightOrder: [...RIGHT_DEFAULT],
    columnsReversed: false,
    layoutVersion: LAYOUT_VERSION,
};

function parseOrder<T extends string>(raw: unknown, pool: T[], fallback: T[]): T[] {
    if (!Array.isArray(raw)) return [...fallback];
    const out: T[] = [];
    for (const x of raw) {
        if (pool.includes(x as T) && !out.includes(x as T)) out.push(x as T);
    }
    return out;
}

function parseHidden(raw: unknown): DashboardBlockId[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter(
        (x, i): x is DashboardBlockId => ALL_BLOCK_IDS.includes(x as DashboardBlockId) && raw.indexOf(x) === i,
    );
}

function parseHiddenPluginWidgets(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    for (const x of raw) {
        if (typeof x === 'string' && x && !out.includes(x)) out.push(x);
    }
    return out;
}

function loadState(): DashboardLayoutState {
    if (typeof window === 'undefined') return DEFAULT_STATE;
    try {
        const raw = localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
        if (!raw) return DEFAULT_STATE;
        const parsed = JSON.parse(raw) as Partial<DashboardLayoutState>;
        const storedVersion = typeof parsed.layoutVersion === 'number' ? parsed.layoutVersion : 1;
        const current = storedVersion >= LAYOUT_VERSION;

        return {
            hidden: parseHidden(parsed.hidden),
            hiddenPluginWidgets: parseHiddenPluginWidgets(parsed.hiddenPluginWidgets),
            leftOrder: current ? parseOrder(parsed.leftOrder, LEFT_POOL, LEFT_DEFAULT) : [...LEFT_DEFAULT],
            rightOrder: current ? parseOrder(parsed.rightOrder, RIGHT_POOL, RIGHT_DEFAULT) : [...RIGHT_DEFAULT],
            columnsReversed: Boolean(parsed.columnsReversed),
            layoutVersion: LAYOUT_VERSION,
        };
    } catch {
        return DEFAULT_STATE;
    }
}

function saveState(state: DashboardLayoutState) {
    try {
        localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save dashboard layout', e);
    }
}

export function useDashboardLayout() {
    const [state, setState] = useState<DashboardLayoutState>(() => loadState());

    useEffect(() => {
        saveState(state);
    }, [state]);

    const toggleHidden = useCallback((id: DashboardBlockId) => {
        setState((s) => ({
            ...s,
            hidden: s.hidden.includes(id) ? s.hidden.filter((x) => x !== id) : [...s.hidden, id],
        }));
    }, []);

    const toggleHiddenPluginWidget = useCallback((widgetId: string) => {
        if (!widgetId) return;
        setState((s) => ({
            ...s,
            hiddenPluginWidgets: s.hiddenPluginWidgets.includes(widgetId)
                ? s.hiddenPluginWidgets.filter((x) => x !== widgetId)
                : [...s.hiddenPluginWidgets, widgetId],
        }));
    }, []);

    const isPluginWidgetVisible = useCallback(
        (widgetId: string, customizing: boolean) => !state.hiddenPluginWidgets.includes(widgetId) || customizing,
        [state.hiddenPluginWidgets],
    );

    const moveInLeft = useCallback((id: DashboardLeftBlockId, direction: -1 | 1) => {
        setState((s) => {
            const idx = s.leftOrder.indexOf(id);
            if (idx < 0) return s;
            const ni = idx + direction;
            if (ni < 0 || ni >= s.leftOrder.length) return s;
            const next = [...s.leftOrder];
            [next[idx], next[ni]] = [next[ni], next[idx]];
            return { ...s, leftOrder: next };
        });
    }, []);

    const moveInRight = useCallback((id: DashboardRightBlockId, direction: -1 | 1) => {
        setState((s) => {
            const idx = s.rightOrder.indexOf(id);
            if (idx < 0) return s;
            const ni = idx + direction;
            if (ni < 0 || ni >= s.rightOrder.length) return s;
            const next = [...s.rightOrder];
            [next[idx], next[ni]] = [next[ni], next[idx]];
            return { ...s, rightOrder: next };
        });
    }, []);

    const removeFromLeft = useCallback((id: DashboardLeftBlockId) => {
        setState((s) => ({ ...s, leftOrder: s.leftOrder.filter((x) => x !== id) }));
    }, []);

    const removeFromRight = useCallback((id: DashboardRightBlockId) => {
        setState((s) => ({ ...s, rightOrder: s.rightOrder.filter((x) => x !== id) }));
    }, []);

    const addToLeft = useCallback((id: DashboardLeftBlockId) => {
        setState((s) => {
            if (s.leftOrder.includes(id)) return s;
            return { ...s, leftOrder: [...s.leftOrder, id] };
        });
    }, []);

    const addToRight = useCallback((id: DashboardRightBlockId) => {
        setState((s) => {
            if (s.rightOrder.includes(id)) return s;
            return { ...s, rightOrder: [...s.rightOrder, id] };
        });
    }, []);

    const toggleColumnsReversed = useCallback(() => {
        setState((s) => ({ ...s, columnsReversed: !s.columnsReversed }));
    }, []);

    const resetLayout = useCallback(() => {
        setState(DEFAULT_STATE);
    }, []);

    const isVisible = useCallback(
        (id: DashboardBlockId, customizing: boolean) => !state.hidden.includes(id) || customizing,
        [state.hidden],
    );

    const leftAvailable = LEFT_POOL.filter((id) => !state.leftOrder.includes(id));
    const rightAvailable = RIGHT_POOL.filter((id) => !state.rightOrder.includes(id));

    return {
        ...state,
        toggleHidden,
        toggleHiddenPluginWidget,
        isPluginWidgetVisible,
        moveInLeft,
        moveInRight,
        removeFromLeft,
        removeFromRight,
        addToLeft,
        addToRight,
        toggleColumnsReversed,
        resetLayout,
        isVisible,
        leftAvailable,
        rightAvailable,
    };
}
