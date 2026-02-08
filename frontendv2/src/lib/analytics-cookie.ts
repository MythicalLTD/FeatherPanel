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

export const ANALYTICS_COOKIE_NAME = 'featherpanel_analytics';

const COOKIE_MAX_AGE_DAYS = 365;

export function setAnalyticsCookie(enabled: boolean): void {
    if (typeof document === 'undefined') return;
    const value = enabled ? '1' : '0';
    const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${ANALYTICS_COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getAnalyticsCookie(): boolean {
    if (typeof document === 'undefined') return true;
    const match = document.cookie.match(new RegExp(`(?:^|; )${ANALYTICS_COOKIE_NAME}=([^;]*)`));
    const value = match ? match[1] : null;
    return value !== '0';
}
