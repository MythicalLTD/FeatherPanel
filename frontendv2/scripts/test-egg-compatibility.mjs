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

import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from '@typescript/typescript6';

async function load(path) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    });
    return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const config = await load('../src/lib/spellConfig.ts');
const rules = await load('../src/lib/eggVariableRules.ts');

test('editor preserves inherited nulls and canonical object JSON', () => {
    assert.equal(config.spellConfigText(null), '');
    assert.equal(config.spellConfigText(JSON.stringify('{}')), '{}');
    const payload = config.spellConfigPayload({
        config_files: '', config_startup: '{"done":["Ready","Listening"]}',
        config_logs: '{}', config_stop: '', file_denylist: '["secret"]',
    });
    assert.equal(payload.config_files, null);
    assert.equal(payload.config_stop, null);
    assert.deepEqual(JSON.parse(payload.config_startup).done, ['Ready', 'Listening']);
});

test('editor rejects malformed JSON and list-shaped config', () => {
    const form = { config_files: '{}', config_startup: '{}', config_logs: '{}', config_stop: 'stop', file_denylist: '[]' };
    assert.throws(() => config.spellConfigPayload({ ...form, config_files: '{bad}' }));
    assert.throws(() => config.spellConfigPayload({ ...form, config_files: '[1]' }));
    assert.throws(() => config.spellConfigPayload({ ...form, file_denylist: '{}' }));
});

test('startup rules preserve regex alternatives and accept signed decimal numbers', () => {
    assert.deepEqual(rules.splitEggRules('required|regex:/^(foo|bar)$/i|max:3'), ['required', 'regex:/^(foo|bar)$/i', 'max:3']);
    const t = (key) => key;
    assert.equal(rules.validateEggVariable('-1.5', 'numeric|min:-2|max:3', t), '');
    assert.equal(rules.validateEggVariable('1.5', 'integer', t), 'serverStartup.fieldMustBeNumeric');
    assert.equal(rules.validateEggVariable('ftp', 'in:http,https', t), 'serverStartup.valueDoesNotMatchFormat');
    assert.equal(rules.validateEggVariable('foo', 'regex:/\\A(foo|bar)\\z/', t), '');
    assert.equal(rules.validateEggVariable(' ', 'required', t), 'serverStartup.fieldRequired');
});
