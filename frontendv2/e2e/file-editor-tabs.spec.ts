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

import type { Page } from '@playwright/test';
import { test, expect, ok, server, SERVER_SHORT } from './support/fixtures';
import type { MockApi } from './support/mock-api';

const DIR = '/plugins/Skript';
const FEATURES = 'options:\n    prefix: features\n';
const CONFIG = 'language: english\nupdate check: true\n';

const editUrl = (file: string) =>
    `/server/${SERVER_SHORT}/files/edit?file=${encodeURIComponent(file)}&directory=${encodeURIComponent(DIR)}`;

/** CodeMirror renders the whole document in the DOM, which keeps assertions on the buffer simple. */
const editor = (page: Page) => page.locator('.cm-content');

async function typeAtStart(page: Page, text: string) {
    const typed = text.trim();
    const draftStored = () =>
        page.evaluate(
            (needle) =>
                Object.keys(sessionStorage).some(
                    (key) => key.startsWith('fp-editor-draft:') && sessionStorage.getItem(key)?.includes(needle),
                ),
            typed,
        );
    // The editor can still re-render right after it first shows the file, which may drop an early edit.
    // Retry until the edit is stored as a draft (inserting only if it is not in the buffer yet), so a
    // following full page load cannot lose it either.
    await expect(async () => {
        if (!(await editor(page).innerText()).includes(typed)) {
            await editor(page).click();
            await page.keyboard.press('ControlOrMeta+Home');
            await page.keyboard.insertText(text);
        }
        await expect.poll(draftStored, { timeout: 2_000 }).toBe(true);
    }).toPass({ timeout: 20_000 });
}

function mockFiles(api: MockApi) {
    const files: Record<string, string> = { [`${DIR}/features.sk`]: FEATURES, [`${DIR}/config.sk`]: CONFIG };
    api.get(`/api/user/servers/${SERVER_SHORT}`, ok(server))
        .get('/api/system/plugin-widgets', ok({ widgets: {} }))
        .get(`/api/user/servers/${SERVER_SHORT}/files`, ok({ contents: [] }))
        .get(`/api/user/servers/${SERVER_SHORT}/file`, (request) => {
            const path = new URL(request.url()).searchParams.get('path') ?? '';
            return { text: files[path] ?? '' };
        })
        .post(`/api/user/servers/${SERVER_SHORT}/write-file`, (request) => {
            const path = new URL(request.url()).searchParams.get('path') ?? '';
            files[path] = request.postData() ?? '';
            return ok(null, 'File written');
        });
    return files;
}

test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => localStorage.setItem('featherpanel-file-editor-engine', 'codemirror'));
});

test('each editor tab keeps its own buffer and saves to its own file', async ({ page, api, signIn }) => {
    await signIn();
    const files = mockFiles(api);

    await page.goto(editUrl('features.sk'));
    await expect(editor(page)).toContainText('prefix: features');
    await typeAtStart(page, '# edited features\n');

    await page.goto(editUrl('config.sk'));
    await expect(editor(page)).toContainText('language: english');
    await typeAtStart(page, '# edited config\n');

    const tabs = page.getByRole('tablist');
    await expect(tabs.getByRole('tab')).toHaveCount(2);

    // Switching back must show features.sk with its own unsaved edit, not config.sk's buffer.
    await tabs
        .getByRole('tab', { name: /features\.sk/ })
        .getByRole('button')
        .first()
        .click();
    await expect(page).toHaveURL(/file=features\.sk/);
    await expect(editor(page)).toContainText('prefix: features');
    await expect(editor(page)).toContainText('# edited features');
    await expect(editor(page)).not.toContainText('language: english');
    await expect(editor(page)).not.toContainText('# edited config');

    await page.getByRole('button', { name: /Save Changes/ }).click();
    await expect.poll(() => api.callsTo('POST', `/api/user/servers/${SERVER_SHORT}/write-file`).length).toBe(1);
    const [write] = api.callsTo('POST', `/api/user/servers/${SERVER_SHORT}/write-file`);
    expect(write.query.get('path')).toBe(`${DIR}/features.sk`);
    expect(files[`${DIR}/features.sk`]).toBe(`# edited features\n${FEATURES}`);
    expect(files[`${DIR}/config.sk`]).toBe(CONFIG);

    // config.sk still has its own unsaved edit.
    await tabs
        .getByRole('tab', { name: /config\.sk/ })
        .getByRole('button')
        .first()
        .click();
    await expect(page).toHaveURL(/file=config\.sk/);
    await expect(editor(page)).toContainText('# edited config');
    await expect(editor(page)).toContainText('language: english');
    await expect(editor(page)).not.toContainText('prefix: features');
});

test('cancel asks before dropping unsaved edits and closes the tab', async ({ page, api, signIn }) => {
    await signIn();
    mockFiles(api);

    await page.goto(editUrl('features.sk'));
    await expect(editor(page)).toContainText('prefix: features');
    await typeAtStart(page, '# throwaway\n');

    // Dismissing the prompt keeps the user in the editor with the edit intact.
    const prompts: string[] = [];
    page.once('dialog', (dialog) => {
        prompts.push(dialog.message());
        void dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect.poll(() => prompts.length).toBe(1);
    expect(prompts[0]).toContain('unsaved changes');
    await expect(page).toHaveURL(/files\/edit/);
    await expect(editor(page)).toContainText('# throwaway');

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/server/${SERVER_SHORT}/files\\?path=`));

    // Reopening another file must not bring back the cancelled tab or its edit.
    await page.goto(editUrl('config.sk'));
    await expect(editor(page)).toContainText('language: english');
    await expect(page.getByRole('tablist')).toHaveCount(0);

    await page.goto(editUrl('features.sk'));
    await expect(editor(page)).toContainText('prefix: features');
    await expect(editor(page)).not.toContainText('# throwaway');
});

test('a later save of the same file waits for the earlier one', async ({ page, api, signIn }) => {
    await signIn();
    const files = mockFiles(api);
    const writePath = `/api/user/servers/${SERVER_SHORT}/write-file`;

    // Hold the first write until the test releases it.
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    let writes = 0;
    api.post(writePath, async (request) => {
        writes += 1;
        if (writes === 1) await held;
        files[new URL(request.url()).searchParams.get('path') ?? ''] = request.postData() ?? '';
        return ok(null, 'File written');
    });

    await page.goto(editUrl('config.sk'));
    await expect(editor(page)).toContainText('language: english');
    await page.goto(editUrl('features.sk'));
    await expect(editor(page)).toContainText('prefix: features');
    await typeAtStart(page, '# first\n');
    await page.getByRole('button', { name: /Save Changes/ }).click();
    await expect.poll(() => writes).toBe(1);

    // Leave and come back while the first save is still in flight, then save again.
    const tabs = page.getByRole('tablist');
    await tabs
        .getByRole('tab', { name: /config\.sk/ })
        .getByRole('button')
        .first()
        .click();
    await expect(editor(page)).toContainText('language: english');
    await tabs
        .getByRole('tab', { name: /features\.sk/ })
        .getByRole('button')
        .first()
        .click();
    await expect(editor(page)).toContainText('# first');
    await typeAtStart(page, '# second\n');
    await page.getByRole('button', { name: /Save Changes/ }).click();

    await page.waitForTimeout(1_000);
    expect(writes).toBe(1);

    release();
    await expect.poll(() => writes).toBe(2);
    await expect.poll(() => files[`${DIR}/features.sk`]).toBe(`# second\n# first\n${FEATURES}`);
});
