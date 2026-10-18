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

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import axios from 'axios';
import { getEffectiveTimezone, type FormatDateOptions } from '@/lib/dateUtils';
import { useSession } from '@/contexts/SessionContext';
import { useTranslation } from '@/contexts/TranslationContext';

interface UserPreferences {
    timezone?: string | null;
    /** Per-user switch that masks server IP addresses in the whole panel. */
    hide_server_ips?: boolean | null;
    [key: string]: unknown;
}

interface PreferencesContextValue {
    preferences: UserPreferences;
    /**
     * The timezone the UI should use for display: the user's explicit
     * preference, falling back to the browser-detected zone (which is also
     * persisted to the server on first visit so the choice survives across
     * devices).
     */
    timezone: string;
    /** Whether the initial fetch + auto-detect cycle has finished. */
    ready: boolean;
    setTimezone: (tz: string | null) => Promise<boolean>;
    /** True when the user hides server IP addresses throughout the panel. */
    hideServerIps: boolean;
    setHideServerIps: (hidden: boolean) => Promise<boolean>;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

function detectBrowserTimezone(): string {
    return getEffectiveTimezone(null);
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
    const { user, isSessionChecked } = useSession();
    const [preferences, setPreferences] = useState<UserPreferences>({});
    const [ready, setReady] = useState(false);
    // Local fallback so date helpers do not flash UTC on first paint while
    // we are still fetching the user's stored preference from the server.
    const [browserTimezone] = useState<string>(() => detectBrowserTimezone());
    const autoPersistedForUuid = useRef<string | null>(null);
    // Values the user changed locally while the initial GET was still in
    // flight. A slow GET must not overwrite them with the stale server copy.
    const localEdits = useRef<Partial<UserPreferences>>({});

    const reset = useCallback(() => {
        setPreferences({});
        setReady(false);
        autoPersistedForUuid.current = null;
        localEdits.current = {};
    }, []);

    useEffect(() => {
        if (!isSessionChecked) return;
        if (!user?.uuid) {
            reset();
            // Mark ready so consumers do not block on a logged-out session.
            setReady(true);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const { data } = await axios.get('/api/user/preferences');
                if (cancelled) return;
                const fetched: UserPreferences =
                    data?.success && data.data?.preferences && typeof data.data.preferences === 'object'
                        ? (data.data.preferences as UserPreferences)
                        : {};
                setPreferences({ ...fetched, ...localEdits.current });

                // Auto-detect & persist the browser timezone on the very first
                // session, so subsequent visits from other browsers still show
                // dates in the user's home timezone. Once a value (or an
                // explicit empty string) is stored we never overwrite it.
                if (
                    !fetched ||
                    (typeof fetched.timezone === 'undefined' && autoPersistedForUuid.current !== user.uuid)
                ) {
                    const detected = detectBrowserTimezone();
                    if (detected && detected !== 'UTC') {
                        autoPersistedForUuid.current = user.uuid;
                        try {
                            await axios.patch('/api/user/preferences', { timezone: detected });
                            if (!cancelled) {
                                setPreferences((prev) => ({ ...prev, timezone: detected }));
                            }
                        } catch {
                            // Non-critical: the user can still set it manually.
                        }
                    }
                }
            } catch {
                // Non-critical fall back to browser detection.
            } finally {
                if (!cancelled) setReady(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user?.uuid, isSessionChecked, reset]);

    const setTimezone = useCallback(async (tz: string | null): Promise<boolean> => {
        localEdits.current = { ...localEdits.current, timezone: tz };
        try {
            const { data } = await axios.patch('/api/user/preferences', { timezone: tz });
            if (data?.success) {
                const updated: UserPreferences | null =
                    data.data?.preferences && typeof data.data.preferences === 'object'
                        ? (data.data.preferences as UserPreferences)
                        : null;
                if (updated) {
                    setPreferences(updated);
                } else {
                    setPreferences((prev) => ({ ...prev, timezone: tz }));
                }
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }, []);

    const setHideServerIps = useCallback(async (hidden: boolean): Promise<boolean> => {
        // Optimistic: the UI flips immediately, the server is the source of truth.
        localEdits.current = { ...localEdits.current, hide_server_ips: hidden };
        setPreferences((prev) => ({ ...prev, hide_server_ips: hidden }));
        try {
            const { data } = await axios.patch('/api/user/preferences', { hide_server_ips: hidden });
            if (data?.success) {
                const updated: UserPreferences | null =
                    data.data?.preferences && typeof data.data.preferences === 'object'
                        ? (data.data.preferences as UserPreferences)
                        : null;
                if (updated) {
                    setPreferences(updated);
                }
                return true;
            }
            localEdits.current = { ...localEdits.current, hide_server_ips: !hidden };
            setPreferences((prev) => ({ ...prev, hide_server_ips: !hidden }));
            return false;
        } catch {
            localEdits.current = { ...localEdits.current, hide_server_ips: !hidden };
            setPreferences((prev) => ({ ...prev, hide_server_ips: !hidden }));
            return false;
        }
    }, []);

    const value = useMemo<PreferencesContextValue>(() => {
        const explicit =
            typeof preferences.timezone === 'string' && preferences.timezone.trim() !== ''
                ? preferences.timezone
                : null;
        return {
            preferences,
            timezone: explicit ?? browserTimezone,
            ready,
            setTimezone,
            // Mask until the stored preference is known so a slow GET never
            // flashes real addresses to a user who chose to hide them.
            hideServerIps: !ready || preferences.hide_server_ips === true,
            setHideServerIps,
        };
    }, [preferences, browserTimezone, ready, setTimezone, setHideServerIps]);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.documentElement.classList.toggle('fp-privacy', value.hideServerIps);
    }, [value.hideServerIps]);

    return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
    const ctx = useContext(PreferencesContext);
    if (!ctx) {
        throw new Error('usePreferences must be used within PreferencesProvider');
    }
    return ctx;
}

/**
 * Convenience hook returning only the effective timezone string.
 * Safe to call outside `PreferencesProvider` falls back to the
 * browser-detected zone in that case rather than throwing, so date helpers
 * embedded in plugin code keep working.
 */
export function useUserTimezone(): string {
    const ctx = useContext(PreferencesContext);
    if (ctx) return ctx.timezone;
    return detectBrowserTimezone();
}

/**
 * Whether the signed-in user wants server IP addresses masked in the UI.
 *
 * Falls back to `false` outside `PreferencesProvider` (plugins, modals
 * rendered into a detached tree) instead of throwing.
 */
export function useHideServerIps(): boolean {
    const ctx = useContext(PreferencesContext);
    return ctx ? ctx.hideServerIps : false;
}

/**
 * Privacy mode: masks IPs, ports, hosts, emails, API keys, SFTP and database
 * credentials across the user and admin areas for this account only. It is the
 * same stored preference as the earlier "hide server IPs" switch.
 */
export function usePrivacyMode(): { enabled: boolean; ready: boolean; setEnabled: (on: boolean) => Promise<boolean> } {
    const ctx = useContext(PreferencesContext);
    return {
        enabled: ctx ? ctx.hideServerIps : false,
        ready: ctx ? ctx.ready : true,
        setEnabled: ctx ? ctx.setHideServerIps : async () => false,
    };
}

/**
 * Returns the `{ timeZone, locale }` options bundle every helper in
 * `@/lib/dateUtils` accepts, populated from the user's preferences and the
 * active translation locale.
 *
 * Use this in components so you don't have to wire up timezone + locale
 * separately every time you format a date.
 *
 * @example
 * const dateOpts = useDateFormatOptions();
 * return <span>{formatRelativeTime(item.created_at, dateOpts)}</span>;
 */
export function useDateFormatOptions(): Required<Pick<FormatDateOptions, 'timeZone' | 'locale'>> {
    const ctx = useContext(PreferencesContext);
    const translation = useTranslation();
    const timeZone = ctx ? ctx.timezone : detectBrowserTimezone();
    return useMemo(() => ({ timeZone, locale: translation.locale }), [timeZone, translation.locale]);
}
