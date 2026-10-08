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

/** Database dump folder managed via Backups → Database dumps (hidden from file manager). */
export const DATABASE_BACKUPS_DIR = '.featherpanel-database-backups';

/** Legacy dump folder name (still hidden if leftover dumps exist). */
export const LEGACY_DATABASE_BACKUPS_DIR = 'database-backups';

/** Panel metadata pack folder written before full Wings backups (hidden from file manager). */
export const FEATHERPANEL_BACKUP_META_DIR = '.featherpanel-backup';

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

function normalizeEntryPath(name: string): string {
    return name.replace(/\\/g, '/').replace(/^\/+/, '');
}

export function isFeatherTrashEntry(name: string): boolean {
    const n = normalizeEntryPath(name);
    return n === FEATHER_TRASH_DIR || n.startsWith(`${FEATHER_TRASH_DIR}/`);
}

export function isDatabaseBackupsEntry(name: string): boolean {
    const n = normalizeEntryPath(name);
    return (
        n === DATABASE_BACKUPS_DIR ||
        n.startsWith(`${DATABASE_BACKUPS_DIR}/`) ||
        n === LEGACY_DATABASE_BACKUPS_DIR ||
        n.startsWith(`${LEGACY_DATABASE_BACKUPS_DIR}/`)
    );
}

export function isFeatherpanelBackupMetaEntry(name: string): boolean {
    const n = normalizeEntryPath(name);
    return n === FEATHERPANEL_BACKUP_META_DIR || n.startsWith(`${FEATHERPANEL_BACKUP_META_DIR}/`);
}

/** Paths that should not appear or be navigable in the file manager UI. */
export function isHiddenServerEntry(name: string): boolean {
    return isFeatherTrashEntry(name) || isDatabaseBackupsEntry(name) || isFeatherpanelBackupMetaEntry(name);
}

export function filterFeatherTrashFiles<T extends { name: string }>(files: T[]): T[] {
    return files.filter((f) => !isHiddenServerEntry(f.name));
}

export function filterFeatherTrashNames(names: string[]): string[] {
    return names.filter((n) => !isHiddenServerEntry(n));
}

export function filterSelectableFiles<T extends Pick<FileObject, 'isTrashShortcut'>>(files: T[]): T[] {
    return files.filter((f) => !isTrashShortcut(f));
}
