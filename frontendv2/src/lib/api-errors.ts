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

API errors: prefer stable error_code → en.json, then raw API message, then caller fallback.
New user-facing ApiResponse::error() calls should include a stable error_code;
UI should resolve copy with getApiErrorMessage.
*/

import { getFeatherpanelApiErrorCode, getFeatherpanelApiErrorMessage } from '@/lib/api';

export type TranslateFn = (key: string, params?: Record<string, string>) => string;

export type ApiErrorPayload = {
    message?: string | null;
    error_message?: string | null;
    error_code?: string | null;
};

/** Re-export for convenience at call sites. */
export function getApiErrorCode(error: unknown): string | null {
    return getFeatherpanelApiErrorCode(error);
}

function resolveFromParts(
    code: string | null | undefined,
    rawMessage: string | null | undefined,
    t: TranslateFn,
    fallbackKey: string,
    params?: Record<string, string>,
): string {
    if (code) {
        const codeKey = `errors.codes.${code}`;
        const translated = t(codeKey, params);
        if (translated !== codeKey) {
            return translated;
        }
    }

    const trimmedRaw = typeof rawMessage === 'string' ? rawMessage.trim() : '';
    // Prefer a concrete API message over any caller fallback (including page-specific ones).
    // Callers often pass a generic key like "failed to load"; that must not hide real errors
    // when the error_code is not yet mapped in locales.
    if (trimmedRaw !== '') {
        return trimmedRaw;
    }

    const fallback = t(fallbackKey, params);
    if (fallback !== fallbackKey) {
        return fallback;
    }

    return t('common.error');
}

/**
 * Resolve a user-facing string from an ApiResponse-shaped body
 * (e.g. authApi returning { success: false, message, error_code }).
 */
export function getApiErrorMessageFromPayload(
    payload: ApiErrorPayload | null | undefined,
    t: TranslateFn,
    fallbackKey: string,
    params?: Record<string, string>,
): string {
    const code = typeof payload?.error_code === 'string' && payload.error_code !== '' ? payload.error_code : null;
    const raw = payload?.message ?? payload?.error_message ?? null;
    return resolveFromParts(code, typeof raw === 'string' ? raw : null, t, fallbackKey, params);
}

/**
 * Resolve a user-facing API error string from an axios/unknown error.
 *
 * Order: errors.codes.{CODE} → raw backend message → caller fallback → common.error
 */
export function getApiErrorMessage(
    error: unknown,
    t: TranslateFn,
    fallbackKey: string,
    params?: Record<string, string>,
): string {
    return resolveFromParts(
        getFeatherpanelApiErrorCode(error),
        getFeatherpanelApiErrorMessage(error),
        t,
        fallbackKey,
        params,
    );
}
