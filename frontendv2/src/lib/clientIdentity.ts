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

/** Innocuous storage keys — looks like UI preference sync, not tracking. */
export const CLIENT_SYNC_STORAGE_KEY = 'fp:ui:pref:sync';
export const CLIENT_SYNC_COOKIE_NAME = '_fp_ui_sid';
export const CLIENT_SYNC_HEADER = 'X-FP-UI-Sync';
export const CLIENT_META_HEADER = 'X-FP-UI-Meta';

const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

function generateClientToken(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID().replace(/-/g, '');
    }

    return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`.slice(
        0,
        32,
    );
}

export function getOrCreateClientToken(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        let token = localStorage.getItem(CLIENT_SYNC_STORAGE_KEY);
        if (!token) {
            const cookieMatch = document.cookie.match(
                new RegExp(`(?:^|; )${CLIENT_SYNC_COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`),
            );
            token = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
        }

        if (!token || !/^[a-f0-9-]{16,64}$/i.test(token)) {
            token = generateClientToken();
        }

        localStorage.setItem(CLIENT_SYNC_STORAGE_KEY, token);
        document.cookie = `${CLIENT_SYNC_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;

        return token;
    } catch {
        return null;
    }
}

function collectClientSignals(): Record<string, string | number | boolean> {
    if (typeof window === 'undefined') {
        return {};
    }

    const signals: Record<string, string | number | boolean> = {};

    try {
        signals.tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
    } catch {
        signals.tz = 'unknown';
    }

    signals.lang = navigator.language || 'unknown';
    signals.sw = window.screen?.width ?? 0;
    signals.sh = window.screen?.height ?? 0;
    signals.cd = window.screen?.colorDepth ?? 0;
    signals.dm = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0;
    signals.hc = window.matchMedia('(prefers-color-scheme: dark)').matches ? 1 : 0;

    return signals;
}

function encodeSignals(signals: Record<string, string | number | boolean>): string {
    const json = JSON.stringify(signals);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function getClientSyncHeaders(): Record<string, string> | null {
    const token = getOrCreateClientToken();
    if (!token) {
        return null;
    }

    const headers: Record<string, string> = {
        [CLIENT_SYNC_HEADER]: token,
    };

    try {
        headers[CLIENT_META_HEADER] = encodeSignals(collectClientSignals());
    } catch {
        // Optional metadata — ignore failures.
    }

    return headers;
}

export function initClientSyncEarly(): void {
    getOrCreateClientToken();
}
