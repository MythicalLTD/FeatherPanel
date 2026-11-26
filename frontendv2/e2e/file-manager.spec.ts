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

import { test, expect, ok, server, SERVER_SHORT } from './support/fixtures';

function entry(name: string, directory: boolean, size = 0) {
    return {
        name,
        mode: directory ? 'drwxr-xr-x' : '-rw-r--r--',
        mode_bits: directory ? '755' : '644',
        size,
        file: !directory,
        directory,
        symlink: false,
        mime: directory ? 'inode/directory' : 'text/plain',
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
    };
}

test('file manager lists folders, opens one and creates a folder', async ({ page, api, signIn }) => {
    await signIn();

    // A tiny in-memory file tree standing in for Wings.
    const tree: Record<string, ReturnType<typeof entry>[]> = {
        '/': [entry('plugins', true), entry('server.properties', false, 1200)],
        '/plugins': [entry('EssentialsX.jar', false, 2048)],
    };

    api.get(`/api/user/servers/${SERVER_SHORT}`, ok(server))
        .get(`/api/user/servers/${SERVER_SHORT}/files`, (request) => {
            const path = new URL(request.url()).searchParams.get('path') || '/';
            return ok({ contents: tree[path] ?? [] });
        })
        .post(`/api/user/servers/${SERVER_SHORT}/create-directory`, (request) => {
            const { path, name } = request.postDataJSON() as { path: string; name: string };
            tree[path] = [...(tree[path] ?? []), entry(name, true)];
            tree[`${path === '/' ? '' : path}/${name}`] = [];
            return ok(null, 'Directory created');
        });

    await page.goto(`/server/${SERVER_SHORT}/files`);

    const rows = page.getByRole('main');
    await expect(rows.getByText('server.properties', { exact: true })).toBeVisible();
    await rows.getByText('plugins', { exact: true }).click();

    await expect(rows.getByText('EssentialsX.jar', { exact: true })).toBeVisible();
    await expect(rows.getByText('server.properties', { exact: true })).toHaveCount(0);
    expect(
        api
            .callsTo('GET', `/api/user/servers/${SERVER_SHORT}/files`)
            .some((call) => call.query.get('path') === '/plugins'),
    ).toBe(true);

    await page.getByRole('button', { name: 'New Folder' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Folder Name').fill('world_backups');
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(rows.getByText('world_backups', { exact: true })).toBeVisible();
    expect(api.callsTo('POST', `/api/user/servers/${SERVER_SHORT}/create-directory`).map((c) => c.body)).toEqual([
        { path: '/plugins', name: 'world_backups' },
    ]);
});
