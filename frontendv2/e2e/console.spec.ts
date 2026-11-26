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

import type { WebSocketRoute } from '@playwright/test';
import { test, expect, ok, server, SERVER_SHORT, SERVER_UUID, WINGS_SOCKET } from './support/fixtures';

test('server console streams output, sends commands and power actions', async ({ page, api, signIn }) => {
    await signIn();
    api.get(`/api/user/servers/${SERVER_SHORT}`, ok(server))
        .post(`/api/user/servers/${SERVER_SHORT}/jwt`, ok({ token: 'e2e-jwt', connection_string: WINGS_SOCKET }))
        .post(`/api/user/servers/${SERVER_UUID}/power/:action`, ok(null))
        .post(`/api/user/servers/${SERVER_SHORT}/power/:action`, ok(null));

    // Stand-in for the Wings websocket: accept the token, report "running" and print a line.
    const received: { event: string; args?: unknown[] }[] = [];
    const sockets: WebSocketRoute[] = [];
    await page.routeWebSocket(/wings\.e2e\.invalid/, (ws) => {
        sockets.push(ws);
        ws.onMessage((message) => {
            const data = JSON.parse(String(message)) as { event: string; args?: unknown[] };
            received.push(data);
            if (data.event === 'auth') {
                ws.send(JSON.stringify({ event: 'auth success' }));
                ws.send(JSON.stringify({ event: 'status', args: ['running'] }));
                ws.send(
                    JSON.stringify({ event: 'console output', args: ['[E2E] Done (1.234s)! For help, type "help"'] }),
                );
            }
            if (data.event === 'send command') {
                ws.send(JSON.stringify({ event: 'console output', args: [`[E2E] ran: ${String(data.args?.[0])}`] }));
            }
        });
    });

    await page.goto(`/server/${SERVER_SHORT}`);

    await expect(page.getByRole('heading', { name: server.name }).first()).toBeVisible();
    const terminal = page.locator('.xterm-rows');
    await expect(terminal).toContainText('[E2E] Done (1.234s)!');

    const input = page.getByPlaceholder('Enter command...');
    await input.fill('say hello from e2e');
    await input.press('Enter');
    await expect(terminal).toContainText('[E2E] ran: say hello from e2e');
    expect(received).toContainEqual({ event: 'auth', args: ['e2e-jwt'] });
    expect(received).toContainEqual({ event: 'send command', args: ['say hello from e2e'] });

    await page.getByRole('main').getByRole('button', { name: 'Stop', exact: true }).click();
    await expect.poll(() => api.calls.filter((c) => /\/power\/stop$/.test(c.path)).length).toBe(1);
});
