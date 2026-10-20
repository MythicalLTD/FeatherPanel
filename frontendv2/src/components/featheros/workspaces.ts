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

import { toast } from 'sonner';
import type { useFeatherOs } from './FeatherOsContext';
import type { OsWorkspace } from './types';

type Os = ReturnType<typeof useFeatherOs>;
type T = (key: string, params?: Record<string, string>) => string;

export async function promptSaveWorkspace(os: Os, t: T) {
    if (os.windows.length === 0) {
        toast.info(t('featheros.workspaces.empty_desktop'));
        return;
    }
    const name = await os.prompt({
        title: t('featheros.workspaces.save_title'),
        message: t('featheros.workspaces.save_message'),
        defaultValue: t('featheros.workspaces.default_name', { n: String((os.settings.workspaces?.length ?? 0) + 1) }),
        confirmLabel: t('featheros.workspaces.save'),
    });
    if (!name?.trim()) return;
    const saved = os.saveWorkspace(name);
    toast.success(t('featheros.workspaces.saved', { name: saved.name }));
}

export async function confirmRestoreWorkspace(os: Os, t: T, ws: OsWorkspace) {
    if (os.windows.length > 0) {
        const ok = await os.confirm({
            title: t('featheros.workspaces.restore_title', { name: ws.name }),
            message: t('featheros.workspaces.restore_message'),
            confirmLabel: t('featheros.workspaces.restore'),
        });
        if (!ok) return;
    }
    if (os.restoreWorkspace(ws.id)) toast.success(t('featheros.workspaces.restored', { name: ws.name }));
}
