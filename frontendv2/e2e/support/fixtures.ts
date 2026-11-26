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

import { test as base, expect } from '@playwright/test';
import { MockApi, ok, fail } from './mock-api';

export const SERVER_UUID = '6f1c2b0e-3d4a-4f5b-9c8d-7e6f5a4b3c2d';
export const SERVER_SHORT = '6f1c2b0e';
export const WINGS_SOCKET = `ws://wings.e2e.invalid:8080/api/servers/${SERVER_UUID}/ws`;

export const adminUser = {
    id: 1,
    uuid: '11111111-1111-4111-8111-111111111111',
    username: 'e2e-admin',
    first_name: 'E2E',
    last_name: 'Admin',
    email: 'admin@e2e.test',
    role_id: 4,
    role: { name: 'admin', display_name: 'Administrator', color: '#7c3aed' },
    avatar: '',
    two_fa_enabled: 'false',
    last_seen: '2026-01-01 00:00:00',
    first_seen: '2026-01-01 00:00:00',
};

export const server = {
    id: 1,
    uuid: SERVER_UUID,
    uuidShort: SERVER_SHORT,
    identifier: SERVER_SHORT,
    name: 'E2E Survival',
    description: 'Smoke test server',
    status: 'running',
    suspended: 0,
    user_id: 1,
    owner_id: 1,
    node_id: 1,
    realm_id: 1,
    spell_id: 1,
    memory: 2048,
    swap: 0,
    disk: 10240,
    io: 500,
    cpu: 200,
    allocation_id: 1,
    allocation_limit: 1,
    database_limit: 1,
    backup_limit: 1,
    created_at: '2026-01-01 00:00:00',
    updated_at: '2026-01-01 00:00:00',
    is_subuser: false,
    node: { id: 1, name: 'e2e-node', fqdn: 'wings.e2e.invalid', scheme: 'http', daemonListen: 8080 },
    allocation: { id: 1, ip: '127.0.0.1', port: 25565 },
    spell: { id: 1, name: 'Paper' },
    realm: { id: 1, name: 'Minecraft' },
};

/** Answers the panel always asks for, whatever page is open. */
export function baseMocks(api: MockApi): MockApi {
    return api
        .get('/api/user/session', fail(401, 'INVALID_ACCOUNT_TOKEN', 'You are not signed in'))
        .get('/api/system/plugin-public-pages', ok({ pages: [] }));
}

export function signedInMocks(api: MockApi, permissions: string[] = ['admin.root']): MockApi {
    return api.get('/api/user/session', ok({ user_info: adminUser, permissions }));
}

type Fixtures = {
    api: MockApi;
    signIn: (permissions?: string[]) => Promise<void>;
};

export const test = base.extend<Fixtures>({
    api: async ({ context }, provide, testInfo) => {
        const api = baseMocks(new MockApi());
        await api.install(context);
        await provide(api);
        if (testInfo.status !== testInfo.expectedStatus && api.unhandled.length > 0) {
            await testInfo.attach('unmocked-api-calls.txt', {
                body: Array.from(new Set(api.unhandled)).join('\n'),
                contentType: 'text/plain',
            });
        }
    },
    signIn: async ({ context, api, baseURL }, provide) => {
        await provide(async (permissions?: string[]) => {
            // The Next.js proxy only checks that the cookie exists; the session itself is mocked.
            await context.addCookies([{ name: 'remember_token', value: 'e2e-session', url: baseURL! }]);
            signedInMocks(api, permissions);
        });
    },
});

export { expect, ok, fail };
