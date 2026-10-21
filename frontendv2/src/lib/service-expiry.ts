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

import { parseApiDate, type FormatDateOptions, formatDateTimeInTz } from '@/lib/dateUtils';

const DAY_MS = 86_400_000;

/** Days left before the dashboard attention widget highlights an expiry. */
export const EXPIRY_WARNING_DAYS = 7;

export type ExpiryTone = 'expired' | 'warning' | 'normal';

/**
 * Whole days until `expires_at` (ceil). Negative when already past.
 * Returns `null` when the value is missing or unparseable.
 */
export function daysUntilExpiry(value?: string | null): number | null {
    const date = parseApiDate(value);
    if (!date) return null;
    return Math.ceil((date.getTime() - Date.now()) / DAY_MS);
}

export function getExpiryTone(days: number | null): ExpiryTone | null {
    if (days === null) return null;
    if (days < 0) return 'expired';
    if (days <= EXPIRY_WARNING_DAYS) return 'warning';
    return 'normal';
}

export function formatExpiryAbsolute(
    value: string | null | undefined,
    dateOpts: FormatDateOptions = {},
): string | null {
    if (!value) return null;
    const formatted = formatDateTimeInTz(value, dateOpts);
    return formatted === '-' ? null : formatted;
}
