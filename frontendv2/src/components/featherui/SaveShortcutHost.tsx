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

import { triggerSaveShortcutTarget, useSaveShortcut } from '@/hooks/useSaveShortcut';

/**
 * Global Ctrl/Cmd+S router for forms/buttons marked with `data-fp-save-shortcut`.
 * Sheets/dialogs register a capture handler first; this is the page-level fallback.
 */
export function SaveShortcutHost() {
    useSaveShortcut(() => triggerSaveShortcutTarget(document), { enabled: true });
    return null;
}
