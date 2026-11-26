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

import { test, expect, ok, adminUser } from './support/fixtures';

const location = { id: 3, name: 'Frankfurt', type: 'game' };
const node = { id: 7, name: 'fra-1', fqdn: 'fra-1.e2e.invalid', location_id: 3 };
const allocation = { id: 42, node_id: 7, ip: '10.0.0.10', port: 25565, server_id: null };
const realm = { id: 2, name: 'Minecraft' };
const spell = {
    id: 9,
    realm_id: 2,
    name: 'Paper',
    startup: 'java -Xms128M -jar {{SERVER_JARFILE}}',
    docker_images: JSON.stringify({ 'Java 21': 'ghcr.io/pterodactyl/yolks:java_21' }),
};
const variable = {
    id: 1,
    spell_id: 9,
    name: 'Server Jar File',
    description: 'Jar to run',
    env_variable: 'SERVER_JARFILE',
    default_value: 'server.jar',
    user_viewable: 1,
    user_editable: 1,
    rules: 'required|string|max:64',
    field_type: 'text',
};
const page1 = (total: number) => ({ current_page: 1, per_page: 10, total_records: total, total_pages: 1 });

test('admin creates a server through the wizard', async ({ page, api, signIn }) => {
    await signIn();
    api.get('/api/admin/locations', ok({ locations: [location], pagination: page1(1) }))
        .get('/api/admin/nodes', ok({ nodes: [node], pagination: page1(1) }))
        .get('/api/admin/allocations', ok({ allocations: [allocation], pagination: page1(1) }))
        .get('/api/admin/realms', ok({ realms: [realm], pagination: page1(1) }))
        .get('/api/admin/spells', ok({ spells: [spell], pagination: page1(1) }))
        .get(`/api/admin/spells/${spell.id}`, ok({ spell }))
        .get(`/api/admin/spells/${spell.id}/variables`, ok({ variables: [variable] }))
        .get('/api/admin/users', ok({ users: [adminUser], pagination: page1(1) }))
        .get('/api/admin/servers', ok({ servers: [], pagination: page1(0) }))
        .put('/api/admin/servers', ok({ server: { id: 99, uuid: 'e2e-new-server' } }, 'Server created'));

    await page.goto('/admin/servers/create');

    // Step 1: name and owner.
    await page.getByPlaceholder('My Server').fill('E2E Created Server');
    await page.getByText('Select owner...').first().click();
    await page.getByRole('dialog').getByText(adminUser.username).first().click();
    await expect(page.getByText(adminUser.email).first()).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 2: the only location, node and first free allocation are picked automatically.
    await expect(page.getByText('10.0.0.10:25565').first()).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 3: the only realm and spell are picked, and the spell's image becomes the default.
    await expect(page.getByText('Paper').first()).toBeVisible();
    await page.getByRole('button', { name: 'Use defaults and review' }).click();

    // Review and create.
    await page.getByRole('button', { name: 'Create Server' }).click();
    await expect(page).toHaveURL(/\/admin\/servers$/);

    const [create] = api.callsTo('PUT', '/api/admin/servers');
    expect(create, 'the wizard sends PUT /api/admin/servers').toBeTruthy();
    expect(create.body).toMatchObject({
        name: 'E2E Created Server',
        owner_id: adminUser.id,
        node_id: node.id,
        allocation_id: allocation.id,
        realms_id: realm.id,
        spell_id: spell.id,
        image: 'ghcr.io/pterodactyl/yolks:java_21',
        startup: spell.startup,
        variables: { SERVER_JARFILE: 'server.jar' },
    });
});
