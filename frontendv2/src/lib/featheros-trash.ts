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

import { filesApi, type TrashEntry } from '@/lib/files-api';
import { FEATHEROS_TRASH_DIR } from '@/lib/feather-trash';
import featherOsApi, { type FeatherOsTrashEntry } from '@/lib/featheros-api';

export type TrashableFile = {
    name: string;
    directory?: boolean;
    isFile?: boolean;
    size?: number;
};

function normalizeRoot(root: string): string {
    if (!root || root === '/') return '/';
    return root.endsWith('/') ? root.slice(0, -1) : root;
}

function absPath(root: string, name: string): string {
    const r = normalizeRoot(root);
    return r === '/' ? `/${name}` : `${r}/${name}`;
}

async function ensureTrashRoot(serverUuid: string): Promise<void> {
    try {
        await filesApi.createFolder(serverUuid, '/', FEATHEROS_TRASH_DIR);
    } catch {
        // already exists
    }
}

function newTrashId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `t-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Move files into `.featheros-trash/{uuid}/` and register metadata so Restore works
 * even when Wings/panel soft-delete trash is disabled.
 */
export async function moveToFeatherOsTrash(
    serverUuid: string,
    root: string,
    files: TrashableFile[],
): Promise<FeatherOsTrashEntry[]> {
    if (files.length === 0) return [];
    await ensureTrashRoot(serverUuid);
    const registered: FeatherOsTrashEntry[] = [];
    const toRegister: Array<{
        uuid: string;
        server_uuid: string;
        original_root: string;
        original_name: string;
        is_directory: boolean;
        size: number;
    }> = [];

    for (const f of files) {
        const id = newTrashId();
        const isDir = f.directory === true || f.isFile === false;
        try {
            await filesApi.createFolder(serverUuid, `/${FEATHEROS_TRASH_DIR}`, id);
        } catch {
            // race / exists
        }
        const from = absPath(root, f.name);
        const to = `/${FEATHEROS_TRASH_DIR}/${id}/${f.name}`;
        await filesApi.moveFile(serverUuid, '/', [{ from, to }]);
        toRegister.push({
            uuid: id,
            server_uuid: serverUuid,
            original_root: normalizeRoot(root),
            original_name: f.name,
            is_directory: isDir,
            size: Number(f.size ?? 0),
        });
    }

    if (toRegister.length > 0) {
        const created = await featherOsApi.registerTrash(toRegister);
        registered.push(...created);
    }
    return registered;
}

export async function listFeatherOsTrash(): Promise<FeatherOsTrashEntry[]> {
    return featherOsApi.listTrash();
}

export async function restoreFeatherOsTrash(entries: FeatherOsTrashEntry[]): Promise<void> {
    for (const e of entries) {
        const from = e.trash_path || `/${FEATHEROS_TRASH_DIR}/${e.id}/${e.original_name}`;
        const to = absPath(e.original_root, e.original_name);
        await filesApi.moveFile(e.server_uuid, '/', [{ from, to }]);
        try {
            await filesApi.deleteFiles(e.server_uuid, `/${FEATHEROS_TRASH_DIR}`, [e.id], true);
        } catch {
            // empty uuid folder cleanup best-effort
        }
        await featherOsApi.forgetTrash([e.id]);
    }
}

export async function destroyFeatherOsTrash(entries: FeatherOsTrashEntry[]): Promise<void> {
    for (const e of entries) {
        try {
            await filesApi.deleteFiles(e.server_uuid, `/${FEATHEROS_TRASH_DIR}`, [e.id], true);
        } catch {
            // file may already be gone
        }
        await featherOsApi.forgetTrash([e.id]);
    }
}

export async function emptyFeatherOsTrash(serverUuids?: string[]): Promise<void> {
    const all = await listFeatherOsTrash();
    const filtered =
        serverUuids && serverUuids.length > 0 ? all.filter((e) => serverUuids.includes(e.server_uuid)) : all;
    await destroyFeatherOsTrash(filtered);
}

/** Map API entries into the shape TrashApp historically expected from Wings trash. */
export function toTrashRows(
    entries: FeatherOsTrashEntry[],
    servers: { uuidShort: string; name: string }[],
): Array<TrashEntry & { serverUuid: string; serverName: string; trash_path?: string }> {
    const names = new Map(servers.map((s) => [s.uuidShort, s.name]));
    return entries.map((e) => ({
        id: e.id,
        original_root: e.original_root,
        original_name: e.original_name,
        deleted_at: e.deleted_at,
        size: e.size,
        is_directory: e.is_directory,
        serverUuid: e.server_uuid,
        serverName: names.get(e.server_uuid) ?? e.server_uuid,
        trash_path: e.trash_path,
    }));
}
