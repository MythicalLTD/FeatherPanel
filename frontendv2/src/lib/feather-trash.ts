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

import type { TrashEntry } from '@/lib/files-api';
import type { FileObject } from '@/types/server';

/** Internal trash folder on the server (hidden from file manager listings). */
export const FEATHER_TRASH_DIR = '.featherpanel-trash';

export type TrashFolderStats = {
    totalSize: number;
    lastModified: string | null;
    itemCount: number;
};

export function isTrashShortcut(file: Pick<FileObject, 'isTrashShortcut'>): boolean {
    return file.isTrashShortcut === true;
}

export function trashStatsFromList(data: { entries: TrashEntry[]; total_size: number }): TrashFolderStats {
    let lastModified: string | null = null;
    for (const entry of data.entries) {
        if (!entry.deleted_at) continue;
        if (!lastModified || entry.deleted_at > lastModified) {
            lastModified = entry.deleted_at;
        }
    }
    return {
        totalSize: data.total_size ?? 0,
        lastModified,
        itemCount: data.entries?.length ?? 0,
    };
}

/** Synthetic folder row shown at the top of the file list when trash is enabled. */
export function createTrashFolderEntry(stats?: TrashFolderStats): FileObject {
    const modified = stats?.lastModified ?? '';
    const totalSize = stats?.totalSize ?? 0;
    return {
        name: FEATHER_TRASH_DIR,
        mode: 'drwxr-xr-x',
        mode_bits: '755',
        size: totalSize,
        directory_size: totalSize,
        isFile: false,
        symlink: false,
        mimetype: 'inode/directory',
        created_at: modified,
        modified_at: modified,
        directory: true,
        file: false,
        isTrashShortcut: true,
        trashItemCount: stats?.itemCount ?? 0,
    };
}

export function isFeatherTrashEntry(name: string): boolean {
    const n = name.replace(/\\/g, '/').replace(/^\/+/, '');
    return n === FEATHER_TRASH_DIR || n.startsWith(`${FEATHER_TRASH_DIR}/`);
}

export function filterFeatherTrashFiles<T extends { name: string }>(files: T[]): T[] {
    return files.filter((f) => !isFeatherTrashEntry(f.name));
}

export function filterFeatherTrashNames(names: string[]): string[] {
    return names.filter((n) => !isFeatherTrashEntry(n));
}

export function filterSelectableFiles<T extends Pick<FileObject, 'isTrashShortcut'>>(files: T[]): T[] {
    return files.filter((f) => !isTrashShortcut(f));
}
