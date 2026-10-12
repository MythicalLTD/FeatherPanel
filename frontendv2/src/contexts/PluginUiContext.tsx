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

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginOverrides } from '@/hooks/usePluginOverrides';
import { usePluginUiPacks } from '@/hooks/usePluginUiPacks';
import { matchPluginRoute } from '@/lib/plugin-route-match';
import type { PluginSlotAction, PluginSlotReplace } from '@/types/plugin-overrides';
import type { PluginUiPack, PluginUiPackPage } from '@/types/plugin-ui-packs';

const UI_PACK_LS_KEY = 'uiPackId';
const UI_PACK_OVERRIDE_KEY = 'uiPackUserOverride';

interface PluginUiContextValue {
    activePack: PluginUiPack | null;
    packs: PluginUiPack[];
    uiPackId: string;
    setUiPackId: (id: string) => void;
    isHidden: (slotId: string) => boolean;
    getReplace: (slotId: string) => PluginSlotReplace | null;
    getActions: (slotId: string) => PluginSlotAction[];
    getPageOverride: (pathname: string) => PluginUiPackPage | null;
    loading: boolean;
}

const PluginUiContext = createContext<PluginUiContextValue | undefined>(undefined);

export function PluginUiProvider({ children }: { children: ReactNode }) {
    const { settings } = useSettings();
    const { overrides, loading: overridesLoading } = usePluginOverrides();
    const { packs, loading: packsLoading } = usePluginUiPacks();
    const [uiPackId, setUiPackIdState] = useState('none');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem(UI_PACK_LS_KEY);
        if (saved) {
            setUiPackIdState(saved);
        }
    }, []);

    useEffect(() => {
        if (!mounted || !settings) return;
        const forced = (settings.app_ui_pack_default ?? '').trim();
        const locked = settings.app_ui_pack_lock === 'true';
        const userOverride = localStorage.getItem(UI_PACK_OVERRIDE_KEY) === 'true';
        if (locked || (!userOverride && forced)) {
            const next = forced || 'none';
            if (uiPackId !== next) {
                setUiPackIdState(next);
                localStorage.setItem(UI_PACK_LS_KEY, next);
            }
        } else if (!userOverride && !forced && uiPackId !== 'none' && !localStorage.getItem(UI_PACK_LS_KEY)) {
            setUiPackIdState('none');
        }
    }, [settings, mounted, uiPackId]);

    const setUiPackId = useCallback(
        (id: string) => {
            if (settings?.app_ui_pack_lock === 'true') return;
            const next = id || 'none';
            setUiPackIdState(next);
            localStorage.setItem(UI_PACK_LS_KEY, next);
            localStorage.setItem(UI_PACK_OVERRIDE_KEY, 'true');
        },
        [settings?.app_ui_pack_lock],
    );

    const activePack = useMemo(() => {
        if (!uiPackId || uiPackId === 'none') return null;
        return packs.find((p) => p.id === uiPackId) ?? null;
    }, [packs, uiPackId]);

    const hideSet = useMemo(() => {
        const set = new Set<string>();
        for (const row of overrides.hide) {
            set.add(row.slot);
        }
        if (activePack) {
            for (const slot of activePack.hide) {
                set.add(slot);
            }
            for (const [slot, spec] of Object.entries(activePack.shell.replace)) {
                if (spec.hide) set.add(slot);
            }
        }
        for (const row of overrides.replace) {
            if (row.hide) set.add(row.slot);
        }
        return set;
    }, [overrides, activePack]);

    const replaceMap = useMemo(() => {
        const map = new Map<string, PluginSlotReplace>();
        for (const row of overrides.replace) {
            if (!row.hide) map.set(row.slot, row);
        }
        if (activePack) {
            for (const [slot, spec] of Object.entries(activePack.shell.replace)) {
                if (!spec.hide) map.set(slot, { ...spec, slot });
            }
        }
        return map;
    }, [overrides, activePack]);

    const actionsBySlot = useMemo(() => {
        const map = new Map<string, PluginSlotAction[]>();
        const add = (action: PluginSlotAction) => {
            const list = map.get(action.slot) ?? [];
            list.push(action);
            map.set(action.slot, list);
        };
        for (const action of overrides.actions) add(action);
        if (activePack) {
            for (const action of activePack.actions) add(action);
        }
        for (const [, list] of map) {
            list.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        }
        return map;
    }, [overrides, activePack]);

    const isHidden = useCallback((slotId: string) => hideSet.has(slotId), [hideSet]);

    const getReplace = useCallback((slotId: string) => replaceMap.get(slotId) ?? null, [replaceMap]);

    const getActions = useCallback((slotId: string) => actionsBySlot.get(slotId) ?? [], [actionsBySlot]);

    const getPageOverride = useCallback(
        (pathname: string): PluginUiPackPage | null => {
            if (!activePack) return null;
            for (const page of activePack.pages) {
                if (matchPluginRoute(page.match, pathname)) {
                    return page;
                }
            }
            return null;
        },
        [activePack],
    );

    const value = useMemo<PluginUiContextValue>(
        () => ({
            activePack,
            packs,
            uiPackId,
            setUiPackId,
            isHidden,
            getReplace,
            getActions,
            getPageOverride,
            loading: overridesLoading || packsLoading,
        }),
        [
            activePack,
            packs,
            uiPackId,
            setUiPackId,
            isHidden,
            getReplace,
            getActions,
            getPageOverride,
            overridesLoading,
            packsLoading,
        ],
    );

    return <PluginUiContext.Provider value={value}>{children}</PluginUiContext.Provider>;
}

export function usePluginUi() {
    const ctx = useContext(PluginUiContext);
    if (!ctx) {
        throw new Error('usePluginUi must be used within PluginUiProvider');
    }
    return ctx;
}

/** Safe optional access when provider may be absent (e.g. public pages). */
export function usePluginUiOptional(): PluginUiContextValue | null {
    return useContext(PluginUiContext) ?? null;
}
