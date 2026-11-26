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

import { test, expect, ok } from './support/fixtures';

const events = [
    { event: 'server.created', group: 'servers' },
    { event: 'server.deleted', group: 'servers' },
    { event: 'user.created', group: 'users' },
];
const existing = {
    id: 1,
    url: 'https://billing.e2e.invalid/hooks/featherpanel',
    description: 'Billing sync',
    events: ['*'],
    format: 'json',
    enabled: true,
    secret_hint: '…a1b2',
    last_delivery_at: null,
    last_delivery_status: null,
    stats: { delivered: 3, failed: 0, pending: 0 },
    created_at: '2026-01-01 00:00:00',
    updated_at: '2026-01-01 00:00:00',
};
const index = (webhooks: unknown[]) =>
    ok({
        webhooks,
        events,
        formats: ['json', 'discord'],
        settings: { allow_private_targets: false, allow_private_env: false, max_attempts: 5 },
    });

test('admin adds a webhook and sees its signing secret once', async ({ page, api, signIn }) => {
    await signIn();
    const created = {
        ...existing,
        id: 2,
        url: 'https://bot.e2e.invalid/hook',
        description: null,
        events: ['server.created'],
        secret_hint: '…9f9f',
        stats: { delivered: 0, failed: 0, pending: 0 },
    };
    api.get('/api/admin/webhooks', index([existing])).post(
        '/api/admin/webhooks',
        ok({ webhook: created, secret: 'whsec_e2e_only_shown_once_9f9f' }, 'Webhook created'),
    );

    await page.goto('/admin/webhooks');
    await expect(page.getByText(existing.url).first()).toBeVisible();

    await page.getByRole('button', { name: 'Add webhook' }).first().click();
    const sheet = page.getByRole('dialog');
    await sheet.getByLabel('Payload URL').fill(created.url);
    await sheet.getByText('Server created', { exact: true }).click();
    await sheet.getByRole('button', { name: 'Add webhook' }).click();

    await expect(sheet.getByText('whsec_e2e_only_shown_once_9f9f')).toBeVisible();
    const [create] = api.callsTo('POST', '/api/admin/webhooks');
    expect(create, 'the page sends POST /api/admin/webhooks').toBeTruthy();
    expect(create.body).toMatchObject({ url: created.url, events: ['server.created'], format: 'json', enabled: true });
});
