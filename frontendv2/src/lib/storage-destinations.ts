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

import axios from 'axios';

export interface StorageDestination {
    id: number;
    uuid: string;
    name: string;
    provider: string;
    status: 'active' | 'error' | 'revoked';
    last_error: string | null;
    last_tested_at: string | null;
    created_at: string | null;
    backups_count: number;
    /** Connected through OAuth (Google Drive, ...): no editable config, only account and quota. */
    oauth: boolean;
    account: string | null;
    quota: { used: number; total: number | null } | null;
    config: {
        endpoint: string;
        region: string;
        bucket: string;
        prefix: string;
        path_style: boolean;
        access_key_hint: string;
        has_secret: boolean;
    } | null;
}

export interface StorageCapabilities {
    byo_enabled: boolean;
    byo_s3: boolean;
    providers: string[];
    oauth_providers: string[];
    max_destinations: number;
}

export interface BackupDestinationRef {
    id: number;
    name: string | null;
    provider: string | null;
    state: 'active' | 'error' | 'revoked' | 'orphaned' | null;
}

export async function fetchStorageDestinations(): Promise<{
    destinations: StorageDestination[];
    capabilities: StorageCapabilities;
}> {
    const { data } = await axios.get('/api/user/storage-destinations');
    return {
        destinations: data?.data?.destinations ?? [],
        capabilities: data?.data?.capabilities ?? {
            byo_enabled: false,
            byo_s3: false,
            providers: [],
            oauth_providers: [],
            max_destinations: 0,
        },
    };
}

/** Start an OAuth connection (or reconnect an existing destination) and go to the provider. */
export async function startStorageOAuth(
    provider: string,
    body: { name?: string; reconnect_id?: number },
): Promise<void> {
    const { data } = await axios.post(`/api/user/storage-destinations/oauth/${provider}/start`, body);
    const url = data?.data?.authorize_url as string | undefined;
    if (!url) throw new Error('No authorize URL');
    window.location.assign(url);
}
