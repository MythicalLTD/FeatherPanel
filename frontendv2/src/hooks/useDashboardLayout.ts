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

const LAYOUT_VERSION = 5;

export type DashboardLeftBlockId = 'announcements' | 'recent_mails' | 'resources' | 'tickets' | 'knowledgebase';
export type DashboardRightBlockId = 'profile' | 'activity';
export type DashboardBlockId = 'hero' | DashboardLeftBlockId | DashboardRightBlockId;

/** Default order: recent mail last in the main column (under knowledge base). */
const LEFT_POOL: DashboardLeftBlockId[] = ['announcements', 'resources', 'tickets', 'knowledgebase', 'recent_mails'];

const RIGHT_POOL: DashboardRightBlockId[] = ['profile', 'activity'];

const LEFT_DEFAULT: DashboardLeftBlockId[] = [...LEFT_POOL];
const RIGHT_DEFAULT: DashboardRightBlockId[] = [...RIGHT_POOL];

const ALL_BLOCK_IDS: DashboardBlockId[] = ['hero', ...LEFT_POOL, ...RIGHT_POOL];

export interface DashboardLayoutState {
    hidden: DashboardBlockId[];
    leftOrder: DashboardLeftBlockId[];
    rightOrder: DashboardRightBlockId[];
    columnsReversed: boolean;
    heroAtBottom: boolean;
    layoutVersion: number;
}

const DEFAULT_STATE: DashboardLayoutState = {
    hidden: [],
    leftOrder: [...LEFT_DEFAULT],
    rightOrder: [...RIGHT_DEFAULT],
    columnsReversed: false,
    heroAtBottom: false,
    layoutVersion: LAYOUT_VERSION,
};

/** Normalize ids from older stored layouts (drops removed blocks). */
function normalizeLegacyLeftRaw(raw: unknown): unknown {
    if (!Array.isArray(raw)) return raw;
    return raw.flatMap((x) => {
        if (x === 'quick_stats') return ['recent_mails'];
        if (x === 'shortcuts' || x === 'account_hub') return [];
        return [x];
    });
}

function insertAfterBlock(
    order: DashboardLeftBlockId[],
    after: DashboardLeftBlockId,
    inserts: DashboardLeftBlockId[],
): DashboardLeftBlockId[] {
    const toAdd = inserts.filter((id) => !order.includes(id));
    if (toAdd.length === 0) return order;
    const next: DashboardLeftBlockId[] = [...order];
    const idx = next.indexOf(after);
    if (idx >= 0) {
        next.splice(idx + 1, 0, ...toAdd);
    } else {
        next.push(...toAdd);
    }
    return next;
}

/** Ensure recent_mails sits directly after knowledgebase (default target). */
function migrateMailAfterKnowledgebase(order: DashboardLeftBlockId[]): DashboardLeftBlockId[] {
    const mi = order.indexOf('recent_mails');
    const ki = order.indexOf('knowledgebase');
    if (mi < 0) return order;
    if (ki < 0) {
        const next: DashboardLeftBlockId[] = order.filter((id) => id !== 'recent_mails');
        next.push('recent_mails');
        return next;
    }
    if (mi > ki) return order;
    const without = order.filter((id) => id !== 'recent_mails') as DashboardLeftBlockId[];
    const newKi = without.indexOf('knowledgebase');
    if (newKi < 0) {
        without.push('recent_mails');
        return without;
    }
    without.splice(newKi + 1, 0, 'recent_mails');
    return without;
}

function parseLeftOrder(raw: unknown): DashboardLeftBlockId[] {
    if (!Array.isArray(raw)) return [...LEFT_DEFAULT];
    const out: DashboardLeftBlockId[] = [];
    const seen = new Set<DashboardLeftBlockId>();
    for (const x of raw) {
        if (LEFT_POOL.includes(x as DashboardLeftBlockId) && !seen.has(x as DashboardLeftBlockId)) {
            seen.add(x as DashboardLeftBlockId);
            out.push(x as DashboardLeftBlockId);
        }
    }
    return out;
}

function parseRightOrder(raw: unknown): DashboardRightBlockId[] {
    if (!Array.isArray(raw)) return [...RIGHT_DEFAULT];
    const out: DashboardRightBlockId[] = [];
    const seen = new Set<DashboardRightBlockId>();
    for (const x of raw) {
        if (RIGHT_POOL.includes(x as DashboardRightBlockId) && !seen.has(x as DashboardRightBlockId)) {
            seen.add(x as DashboardRightBlockId);
            out.push(x as DashboardRightBlockId);
        }
    }
    return out;
}

function parseHidden(raw: unknown): DashboardBlockId[] {
    if (!Array.isArray(raw)) return [];
    const mapped = raw.map((x) => {
        if (x === 'quick_stats') return 'recent_mails';
        if (x === 'shortcuts' || x === 'account_hub') return null;
        return x;
    });
    return mapped.filter((x): x is DashboardBlockId => x != null && ALL_BLOCK_IDS.includes(x as DashboardBlockId));
}

function loadState(): DashboardLayoutState {
    if (typeof window === 'undefined') return DEFAULT_STATE;
    try {
        const raw = localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
        if (!raw) return DEFAULT_STATE;
        const parsed = JSON.parse(raw) as Partial<DashboardLayoutState>;
        const storedVersion = typeof parsed.layoutVersion === 'number' ? parsed.layoutVersion : 1;
        const rawLeft = normalizeLegacyLeftRaw(parsed.leftOrder);
        let leftOrder = parseLeftOrder(rawLeft);

        if (storedVersion < 2) {
            leftOrder = insertAfterBlock(leftOrder, 'knowledgebase', ['recent_mails']);
        }

        if (storedVersion < LAYOUT_VERSION) {
            leftOrder = migrateMailAfterKnowledgebase(leftOrder);
        }

        return {
            hidden: parseHidden(parsed.hidden),
            leftOrder,
            rightOrder: parseRightOrder(parsed.rightOrder),
            columnsReversed: Boolean(parsed.columnsReversed),
            heroAtBottom: Boolean(parsed.heroAtBottom),
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

    const toggleHeroAtBottom = useCallback(() => {
        setState((s) => ({ ...s, heroAtBottom: !s.heroAtBottom }));
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
        moveInLeft,
        moveInRight,
        removeFromLeft,
        removeFromRight,
        addToLeft,
        addToRight,
        toggleColumnsReversed,
        toggleHeroAtBottom,
        resetLayout,
        isVisible,
        leftAvailable,
        rightAvailable,
    };
}
