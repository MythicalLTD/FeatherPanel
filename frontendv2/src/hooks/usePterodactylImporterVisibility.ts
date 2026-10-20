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

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSettings } from '@/contexts/SettingsContext';
import { useSession } from '@/contexts/SessionContext';
import Permissions from '@/lib/permissions';
import type { NavigationItem } from '@/types/navigation';

export type PterodactylImporterVisibility = 'auto' | 'always' | 'hidden';

export const PTERODACTYL_IMPORTER_NAV_ID = 'admin-pterodactyl-importer';
const CACHE_KEY = 'fp_pterodactyl_importer_requirements';
const CACHE_TTL_MS = 10 * 60 * 1000;

export function getPterodactylImporterVisibility(value: string | undefined | null): PterodactylImporterVisibility {
    return value === 'always' || value === 'hidden' ? value : 'auto';
}

let inflight: Promise<boolean> | null = null;

/** Whether the panel still meets the importer requirements (fresh panel). Cached for the session. */
async function fetchRequirementsMet(): Promise<boolean> {
    try {
        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null') as { met: boolean; at: number } | null;
        if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.met;
    } catch {
        // Ignore a broken cache entry.
    }
    inflight ??= axios
        .get('/api/admin/pterodactyl-importer/prerequisites')
        .then((res) => Boolean(res.data?.data?.panel_clean))
        .catch(() => false)
        .then((met) => {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ met, at: Date.now() }));
            inflight = null;
            return met;
        });
    return inflight;
}

/** Store a fresh requirement check, e.g. after the importer page refreshed it. */
export function rememberPterodactylImporterRequirements(met: boolean) {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ met, at: Date.now() }));
    } catch {
        // Storage may be unavailable (private mode); the next check simply refetches.
    }
}

/**
 * Should the Pterodactyl importer show up in the admin sidebar and command palette?
 * - hidden: an admin dismissed it (re-enable in Settings > Modules)
 * - always: always listed
 * - auto (default): listed only while the panel still meets the import requirements
 */
export function usePterodactylImporterVisible(): boolean {
    const { settings } = useSettings();
    const { hasPermission } = useSession();
    const mode = getPterodactylImporterVisibility(settings?.pterodactyl_importer_visibility);
    const canCheck = hasPermission(Permissions.ADMIN_ROOT);
    const [requirementsMet, setRequirementsMet] = useState<boolean | null>(null);

    useEffect(() => {
        if (mode !== 'auto' || !canCheck) return;
        let cancelled = false;
        void fetchRequirementsMet().then((met) => {
            if (!cancelled) setRequirementsMet(met);
        });
        return () => {
            cancelled = true;
        };
    }, [mode, canCheck]);

    if (mode === 'hidden') return false;
    if (mode === 'always') return true;
    // Auto: stay hidden until the check says the importer can actually be used.
    return canCheck && requirementsMet === true;
}

export function withoutPterodactylImporter(items: NavigationItem[], visible: boolean): NavigationItem[] {
    if (visible) return items;
    return items
        .filter((item) => item.id !== PTERODACTYL_IMPORTER_NAV_ID)
        .map((item) =>
            item.children ? { ...item, children: withoutPterodactylImporter(item.children, false) } : item,
        );
}
