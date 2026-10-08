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

import type { Database } from '@/types/server';

export type BackupKind = 'files' | 'database' | 'full';
export type DatabaseScope = 'all' | 'specific';

export type BackupFields = {
    kind: BackupKind;
    ignored_files: string;
    database_scope: DatabaseScope;
    database_ids: string[];
    directory: string;
    include_metadata: boolean;
    include_encrypted: boolean;
    include_activities: boolean;
};

export const DEFAULT_DB_DIRECTORY = '/.featherpanel-database-backups';

export const emptyBackupFields = (): BackupFields => ({
    kind: 'files',
    ignored_files: '',
    database_scope: 'all',
    database_ids: [],
    directory: DEFAULT_DB_DIRECTORY,
    include_metadata: true,
    include_encrypted: false,
    include_activities: false,
});

export function isMysqlLike(db: Database): boolean {
    const type = (db.database_type || '').toLowerCase();
    return !type || type === 'mysql' || type === 'mariadb';
}

export function isBackupAction(action: string): boolean {
    return action === 'backup' || action === 'database_backup';
}

export function parseBackupFields(action: string, payload: string): BackupFields {
    const base = emptyBackupFields();

    if (action === 'database_backup') {
        base.kind = 'database';
    }

    const trimmed = (payload || '').trim();
    if (!trimmed) {
        return base;
    }

    try {
        const data = JSON.parse(trimmed) as {
            type?: string;
            ignored_files?: string;
            databases?: 'all' | '*' | number[] | string[];
            database_id?: number | string;
            directory?: string;
            path?: string;
            include_metadata?: boolean;
            include_encrypted?: boolean;
            include_activities?: boolean;
        };

        if (data.type === 'full') {
            base.kind = 'full';
            base.ignored_files = data.ignored_files || '';
            base.include_metadata = data.include_metadata !== false;
            base.include_encrypted = Boolean(data.include_encrypted);
            base.include_activities = Boolean(data.include_activities);
            if (data.databases === 'all' || data.databases === '*') {
                base.database_scope = 'all';
            } else if (Array.isArray(data.databases)) {
                base.database_scope = 'specific';
                base.database_ids = data.databases.map(String);
            }
            if (typeof data.directory === 'string' && data.directory.trim()) {
                base.directory = data.directory.trim();
            }
            return base;
        }

        if (data.type === 'database' || action === 'database_backup' || data.database_id != null || data.databases) {
            base.kind = 'database';
            if (data.databases === 'all' || data.databases === '*') {
                base.database_scope = 'all';
            } else if (Array.isArray(data.databases)) {
                base.database_scope = 'specific';
                base.database_ids = data.databases.map(String);
            } else if (data.database_id != null) {
                base.database_scope = 'specific';
                base.database_ids = [String(data.database_id)];
            }
            if (typeof data.directory === 'string' && data.directory.trim()) {
                base.directory = data.directory.trim();
            } else if (typeof data.path === 'string' && data.path.trim()) {
                const path = data.path.trim();
                base.directory = path.toLowerCase().endsWith('.sql')
                    ? path.replace(/\/[^/]+$/, '') || DEFAULT_DB_DIRECTORY
                    : path;
            }
            return base;
        }

        if (data.type === 'files' || typeof data.ignored_files === 'string') {
            base.kind = 'files';
            base.ignored_files = data.ignored_files || '';
            return base;
        }
    } catch {
        base.kind = 'files';
        base.ignored_files = trimmed === '[]' ? '' : trimmed;
    }

    return base;
}

function normalizeDirectory(): string {
    // Always use the fixed panel dump folder (hidden from the file manager).
    return DEFAULT_DB_DIRECTORY;
}

export function buildBackupPayload(fields: BackupFields): string | null {
    if (fields.kind === 'files') {
        return JSON.stringify({
            type: 'files',
            ignored_files: fields.ignored_files.trim(),
        });
    }

    const normalizedDir = normalizeDirectory();
    const databases = fields.database_scope === 'all' ? 'all' : fields.database_ids.map(Number).filter((id) => id > 0);

    if (fields.kind === 'full') {
        if (fields.database_scope === 'specific' && (!Array.isArray(databases) || databases.length === 0)) {
            return null;
        }
        return JSON.stringify({
            type: 'full',
            ignored_files: fields.ignored_files.trim(),
            databases: databases === 'all' ? 'all' : databases,
            directory: normalizedDir,
            include_metadata: fields.include_metadata,
            include_encrypted: fields.include_encrypted,
            include_activities: fields.include_activities,
        });
    }

    if (fields.database_scope === 'all') {
        return JSON.stringify({
            type: 'database',
            databases: 'all',
            directory: normalizedDir,
        });
    }

    if (!Array.isArray(databases) || databases.length === 0) {
        return null;
    }

    return JSON.stringify({
        type: 'database',
        databases,
        directory: normalizedDir,
    });
}

export function formatBackupPayloadDisplay(
    action: string,
    payload: string,
    databases: Database[],
    labels: {
        files: string;
        databases: string;
        full: string;
        all: string;
        specific: string;
        noPayload: string;
    },
): string {
    if (!isBackupAction(action)) {
        return payload || labels.noPayload;
    }

    const fields = parseBackupFields(action, payload);
    if (fields.kind === 'files') {
        return fields.ignored_files ? `${labels.files}: ${fields.ignored_files}` : labels.files;
    }
    if (fields.kind === 'full') {
        const meta = fields.include_metadata ? ' · metadata' : '';
        return `${labels.full}${meta}`;
    }
    if (fields.database_scope === 'all') {
        return `${labels.databases} · ${labels.all}`;
    }
    const names = fields.database_ids
        .map((id) => databases.find((d) => String(d.id) === id)?.database || `#${id}`)
        .join(', ');
    return `${labels.databases} · ${names || labels.specific}`;
}
