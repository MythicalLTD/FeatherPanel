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

import { test, expect, ok, fail, adminUser, signedInMocks } from './support/fixtures';

test.describe('login', () => {
    test('signs in with username and password and opens the dashboard', async ({ page, api, context, baseURL }) => {
        api.put('/api/user/auth/login', async (request) => {
            const body = request.postDataJSON() as { username_or_email?: string; password?: string };
            if (body.username_or_email !== adminUser.username || body.password !== 'correct horse') {
                return fail(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
            }
            // The real endpoint sets the session cookie; from here on the session answers as signed in.
            await context.addCookies([{ name: 'remember_token', value: 'e2e-session', url: baseURL! }]);
            signedInMocks(api);
            return ok({ user: adminUser }, 'Login successful');
        });

        await page.goto('/auth/login');
        await page.getByPlaceholder('Username or Email').fill(adminUser.username);
        await page.getByPlaceholder('Password').fill('correct horse');
        await page.getByRole('button', { name: 'Sign in', exact: true }).click();

        await expect(page).toHaveURL(/\/dashboard/);
        expect(api.callsTo('PUT', '/api/user/auth/login')).toHaveLength(1);
    });

    test('shows an error for wrong credentials and stays on the login page', async ({ page, api }) => {
        api.put('/api/user/auth/login', fail(401, 'INVALID_CREDENTIALS', 'Invalid username or password'));

        await page.goto('/auth/login');
        await page.getByPlaceholder('Username or Email').fill(adminUser.username);
        await page.getByPlaceholder('Password').fill('wrong password');
        await page.getByRole('button', { name: 'Sign in', exact: true }).click();

        // INVALID_CREDENTIALS is shown with the panel's own translated message.
        await expect(
            page.getByRole('alert').filter({ hasText: /invalid username, email address, or password/i }),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('sends signed-out visitors of a protected page to the login page', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fdashboard/);
        await expect(page.getByPlaceholder('Username or Email')).toBeVisible();
    });
});
