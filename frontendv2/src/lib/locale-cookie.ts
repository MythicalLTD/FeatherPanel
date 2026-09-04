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

import { LOCALE_COOKIE_NAME } from '@/lib/locale-constants';

const MAX_AGE = 365 * 24 * 60 * 60;

/** Keep SSR locale in sync with the client preference. */
export function writeLocaleCookie(locale: string) {
    if (typeof document === 'undefined') return;
    const normalized = locale.trim().toLowerCase().replace(/_/g, '-');
    if (!normalized) return;
    document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(normalized)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}
