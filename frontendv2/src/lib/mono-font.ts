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

/** Canonical monospace stack for editors, terminals, and code surfaces. */
export const APP_MONO_FONT_STACK =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

/**
 * Resolve monospace font for xterm / CodeMirror.
 * Prefers CSS `--font-mono` when set, otherwise the app mono stack.
 */
export function resolveMonoFontFamily(cssVarValue?: string | null): string {
    const raw = (cssVarValue || '').trim();
    if (raw && raw !== 'undefined' && !raw.includes('geist')) {
        return `${raw}, ${APP_MONO_FONT_STACK}`;
    }
    return APP_MONO_FONT_STACK;
}
