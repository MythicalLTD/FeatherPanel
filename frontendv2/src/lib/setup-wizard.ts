/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useSession } from '@/contexts/SessionContext';
import Permissions from '@/lib/permissions';

/** Set when an admin chose "Finish later"; the wizard then only shows as a banner on Admin Home. */
export const SETUP_DEFER_KEY = 'fp-setup-deferred';
/** Last step an admin reached, so leaving to create a node resumes at the same place. */
export const SETUP_STEP_KEY = 'fp-setup-step';
const COMPLETED_CACHE_KEY = 'fp-setup-completed';

export function isSetupDeferred(): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SETUP_DEFER_KEY) === '1';
}

export function setSetupDeferred(deferred: boolean): void {
    if (typeof window === 'undefined') return;
    if (deferred) window.localStorage.setItem(SETUP_DEFER_KEY, '1');
    else window.localStorage.removeItem(SETUP_DEFER_KEY);
}

export function markSetupCompletedLocally(completed: boolean): void {
    if (typeof window === 'undefined') return;
    if (completed) window.sessionStorage.setItem(COMPLETED_CACHE_KEY, '1');
    else window.sessionStorage.removeItem(COMPLETED_CACHE_KEY);
}

export async function completeSetup(): Promise<void> {
    await axios.post('/api/admin/setup/complete');
    markSetupCompletedLocally(true);
    setSetupDeferred(false);
    window.localStorage.removeItem(SETUP_STEP_KEY);
}

export async function reopenSetup(): Promise<void> {
    await axios.post('/api/admin/setup/reset');
    markSetupCompletedLocally(false);
    setSetupDeferred(false);
    window.localStorage.removeItem(SETUP_STEP_KEY);
}

/**
 * Whether the first-install wizard still needs to run. Only admins who can edit settings are asked;
 * once completed the answer is cached for the browser session so Admin pages skip the request.
 */
export function useSetupStatus() {
    const { hasPermission, isSessionChecked } = useSession();
    const canSetup = isSessionChecked && hasPermission(Permissions.ADMIN_SETTINGS_EDIT);
    const [pending, setPending] = useState<boolean | null>(null);

    const check = useCallback(async () => {
        if (!canSetup) {
            setPending(false);
            return;
        }
        if (window.sessionStorage.getItem(COMPLETED_CACHE_KEY) === '1') {
            setPending(false);
            return;
        }
        try {
            const { data } = await axios.get('/api/admin/setup/status');
            const completed = Boolean(data?.data?.completed);
            if (completed) markSetupCompletedLocally(true);
            setPending(!completed);
        } catch {
            setPending(false);
        }
    }, [canSetup]);

    useEffect(() => {
        if (!isSessionChecked) return;
        void check();
    }, [check, isSessionChecked]);

    return { pending, canSetup, recheck: check };
}
