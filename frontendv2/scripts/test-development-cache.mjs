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

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from '@typescript/typescript6';

const code = ts.transpileModule(readFileSync(new URL('../src/lib/development-cache.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function environment(mode, blocked = false) {
    const removed = [],
        unregistered = [];
    const storage = { app_settings: 'old', translations_en_1: 'old', locale: 'ro', session: 'keep', featheros: 'keep' };
    Object.defineProperty(storage, 'removeItem', {
        value: (key) => {
            removed.push(key);
            delete storage[key];
        },
    });
    const cacheKeys = new Set(['fp-pwa-v2', 'fp-pwa-v3', 'other-app']);
    const caches = { keys: async () => [...cacheKeys], delete: async (key) => cacheKeys.delete(key) };
    const navigator = {
        serviceWorker: {
            getRegistrations: async () =>
                ['https://panel.test/sw.js', 'https://panel.test/other/sw.js', 'https://other.test/sw.js'].map(
                    (scriptURL) => ({ active: { scriptURL }, unregister: async () => unregistered.push(scriptURL) }),
                ),
        },
    };
    const context = {
        exports: {},
        process: { env: { NODE_ENV: mode } },
        URL,
        window: { caches, location: { origin: 'https://panel.test' } },
        caches,
        navigator,
    };
    Object.defineProperty(context, 'localStorage', {
        get() {
            if (blocked) throw new Error('Storage blocked');
            return storage;
        },
    });
    vm.runInNewContext(code, context);
    return { cleanup: context.exports.clearDevelopmentCaches, removed, unregistered, storage, cacheKeys };
}

test('development removes only panel caches and its own worker', async () => {
    const env = environment('development');
    await env.cleanup();
    assert.deepEqual(env.removed.sort(), ['app_settings', 'translations_en_1']);
    assert.deepEqual([...env.cacheKeys], ['other-app']);
    assert.deepEqual(env.unregistered, ['https://panel.test/sw.js']);
    assert.equal(env.storage.session, 'keep');
    assert.equal(env.storage.featheros, 'keep');
    assert.equal(env.storage.locale, 'ro');
});

test('production cleanup is a no-op', async () => {
    const env = environment('production');
    await env.cleanup();
    assert.deepEqual(env.removed, []);
    assert.deepEqual(env.unregistered, []);
    assert.equal(env.cacheKeys.size, 3);
});

test('blocked local storage does not stop worker/cache cleanup', async () => {
    const env = environment('development', true);
    await env.cleanup();
    assert.deepEqual([...env.cacheKeys], ['other-app']);
    assert.deepEqual(env.unregistered, ['https://panel.test/sw.js']);
});
