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

import axios from 'axios';

export type BulkServerAction = 'start' | 'stop' | 'restart' | 'kill' | 'reinstall';

/** Same limits as the backend; the client splits nothing and refuses larger selections up front. */
export const BULK_MAX_SERVERS = 25;
export const BULK_MAX_REINSTALL_SERVERS = 10;

export interface BulkServerResult {
    uuidShort: string;
    name: string | null;
    success: boolean;
    error_code: string | null;
    message: string | null;
}

export interface BulkServerResponse {
    action: BulkServerAction;
    succeeded: number;
    failed: number;
    results: BulkServerResult[];
}

export function bulkLimitFor(action: BulkServerAction): number {
    return action === 'reinstall' ? BULK_MAX_REINSTALL_SERVERS : BULK_MAX_SERVERS;
}

/** Runs one action on several servers in a single request; each server gets its own result. */
export async function runBulkServerAction(action: BulkServerAction, uuidShorts: string[]): Promise<BulkServerResponse> {
    const { data } = await axios.post<{ data: BulkServerResponse }>('/api/user/servers/bulk-action', {
        action,
        servers: uuidShorts,
    });
    return data.data;
}
