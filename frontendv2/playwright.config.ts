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

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3123);
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * Smoke tests against the production build (`pnpm build:next`). The PHP API is mocked per test
 * (see e2e/support), so no database or Wings node is needed.
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: process.env.CI ? 2 : undefined,
    timeout: 60_000,
    expect: { timeout: 15_000 },
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }], ['github']] : [['list']],
    use: {
        baseURL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        locale: 'en-US',
        timezoneId: 'UTC',
        serviceWorkers: 'block',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: `pnpm exec next start -H 127.0.0.1 -p ${PORT}`,
        url: `${baseURL}/auth/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
            // Server-side fetches go to a closed port and fail fast; the pages fall back to client-side loading.
            INTERNAL_API_URL: 'http://127.0.0.1:9',
            NEXT_TELEMETRY_DISABLED: '1',
        },
    },
});
