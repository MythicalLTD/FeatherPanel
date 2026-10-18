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

/**
 * Builds a CSS `url("…")` from a user/admin/plugin supplied image address.
 *
 * Only http(s), same-origin relative paths, `data:image/…` and `blob:` URLs are allowed. Anything
 * else (`file:///…` from a pasted local path, `javascript:`, empty strings) yields `undefined` so
 * the browser never tries to load it, which also avoids Firefox's "may not load or link to file:"
 * security errors. Quotes and backslashes are escaped so the value cannot break out of `url()`.
 */
export function safeCssUrl(raw: string | null | undefined): string | undefined {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) return undefined;

    const lower = value.toLowerCase();
    const allowed =
        lower.startsWith('https://') ||
        lower.startsWith('http://') ||
        lower.startsWith('data:image/') ||
        lower.startsWith('blob:') ||
        (value.startsWith('/') && !value.startsWith('//')) ||
        value.startsWith('./') ||
        value.startsWith('../');
    if (!allowed) return undefined;

    return `url("${value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/[\n\r\f]/g, '')}")`;
}
