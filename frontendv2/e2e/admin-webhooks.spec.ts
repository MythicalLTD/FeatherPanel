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
    secret_set: true,
    secret_hint: '…a1b2',
    last_delivery_at: null,
    last_delivery_status: null,
    stats_24h: { delivered: 3, failed: 0, pending: 0 },
    created_at: '2026-01-01 00:00:00',
    updated_at: '2026-01-01 00:00:00',
};
const index = (webhooks: unknown[]) =>
    ok({
        webhooks,
        events,
        formats: ['json', 'discord'],
        settings: { allow_private_targets: false, allow_private_env: false, max_attempts: 5, backoff_seconds: [60, 300, 1800, 7200] },
    });
const page1 = (total: number) => ({
    current_page: 1,
    per_page: 20,
    total_records: total,
    total_pages: 1,
    has_next: false,
    has_prev: false,
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
        stats_24h: { delivered: 0, failed: 0, pending: 0 },
    };
    const secret = 'whsec_e2e_only_shown_once_9f9f';
    api.get('/api/admin/webhooks', index([existing]))
        .post('/api/admin/webhooks', { ...ok({ webhook: created, secret }, 'Webhook created'), status: 201 })
        .get('/api/admin/webhooks', index([existing, created]));

    await page.goto('/admin/webhooks');
    await expect(page.getByText(existing.url).first()).toBeVisible();

    await page.getByRole('button', { name: 'Add webhook' }).first().click();
    const sheet = page.getByRole('dialog');
    await sheet.getByLabel('Payload URL').fill(created.url);
    await sheet.locator('label').filter({ hasText: 'server.created' }).getByRole('checkbox').check();
    const [createResponse] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/admin/webhooks') && r.request().method() === 'POST'),
        sheet.getByRole('button', { name: 'Add webhook' }).click(),
    ]);
    expect(createResponse.ok()).toBeTruthy();

    await expect(sheet.locator('code').filter({ hasText: secret })).toBeVisible();
    const [create] = api.callsTo('POST', '/api/admin/webhooks');
    expect(create, 'the page sends POST /api/admin/webhooks').toBeTruthy();
    expect(create.body).toMatchObject({ url: created.url, events: ['server.created'], format: 'json', enabled: true });
});

test('admin opens the delivery log for a webhook', async ({ page, api, signIn }) => {
    await signIn();
    const delivery = {
        id: 501,
        webhook_id: existing.id,
        event_id: 'evt-e2e-501',
        event: 'server.created',
        status: 'delivered',
        attempts: 1,
        max_attempts: 5,
        status_code: 200,
        error: null,
        duration_ms: 42,
        next_retry_at: null,
        last_attempt_at: '2026-01-02 12:00:00',
        delivered_at: '2026-01-02 12:00:00',
        redelivery_of: null,
        created_at: '2026-01-02 12:00:00',
    };
    api.get('/api/admin/webhooks', index([existing])).get(
        `/api/admin/webhooks/${existing.id}/deliveries`,
        ok({ items: [delivery], pagination: page1(1) }),
    );

    await page.goto('/admin/webhooks');
    await page
        .getByRole('button', { name: 'Recent deliveries' })
        .first()
        .click();

    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('heading', { name: 'Recent deliveries' })).toBeVisible();
    await expect(sheet.getByText('Server created', { exact: true })).toBeVisible();
    const [list] = api.callsTo('GET', `/api/admin/webhooks/${existing.id}/deliveries`);
    expect(list, 'the page loads the delivery log').toBeTruthy();
});