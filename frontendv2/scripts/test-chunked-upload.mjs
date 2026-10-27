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

function load() {
    const axios = {
        create: () => ({}),
        isAxiosError: (e) => Boolean(e && e.isAxiosError),
    };
    const context = { exports: {}, URL, Blob, File, DOMException, setTimeout, clearTimeout, Date, Math, Number, String, Promise, console,
        require(name) {
            if (name === 'axios') return { __esModule: true, default: axios, AxiosError: class {} };
            throw new Error(name);
        } };
    const code = ts.transpileModule(readFileSync(new URL('../src/lib/chunked-upload.ts', import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, context);
    return context.exports;
}

/** In-memory panel/node speaking the /upload/chunk protocol. */
function fakeServer({ maxChunk = 4, stored = '' } = {}) {
    const state = { data: stored, total: stored ? null : null, calls: [], completed: null, deleted: false };
    const fail = (status, data) => Promise.reject(Object.assign(new Error('http ' + status), { isAxiosError: true, response: { status, data } }));
    const client = {
        async get(url) {
            state.calls.push(['GET', url]);
            return { data: { exists: state.data.length > 0, offset: state.data.length, total_size: state.total, max_chunk_size: maxChunk } };
        },
        async post(url, body, cfg) {
            state.calls.push(['POST', url]);
            const u = new URL(url);
            if (u.pathname.endsWith('/upload/chunk/complete')) { state.completed = state.data; return { data: {} }; }
            const offset = Number(u.searchParams.get('offset'));
            state.total = Number(u.searchParams.get('total_size'));
            if (offset !== state.data.length) return fail(409, { offset: state.data.length });
            const text = await body.text();
            if (text.length > maxChunk) return fail(413, {});
            cfg?.onUploadProgress?.({ loaded: text.length });
            state.data += text;
            return { data: { offset: state.data.length } };
        },
        async delete(url) { state.calls.push(['DELETE', url]); state.deleted = true; return { data: {} }; },
    };
    return { client, state };
}

const target = async () => ({ url: 'https://panel.test/api/user/webspaces/ws1/files/upload/chunk', chunkSize: 90 * 1024 * 1024, expiresAt: Number.POSITIVE_INFINITY });

test('chunkCompleteUrl works with and without a query string', () => {
    const { chunkCompleteUrl } = load();
    assert.equal(chunkCompleteUrl('https://n.test/upload/chunk?token=x'), 'https://n.test/upload/chunk/complete?token=x');
    assert.equal(chunkCompleteUrl('https://p.test/api/user/webspaces/a/files/upload/chunk'), 'https://p.test/api/user/webspaces/a/files/upload/chunk/complete');
});

test('uploads in server-sized parts through the given client and completes', async () => {
    const lib = load();
    const { client, state } = fakeServer({ maxChunk: 4 });
    const stats = [];
    await lib.chunkedUpload({ serverUuid: 'webspace:ws1', directory: '/', file: new File(['abcdefghij'], 'a.txt'), getTarget: target, client, onStats: (s) => stats.push(s) });
    assert.equal(state.completed, 'abcdefghij');
    assert.equal(state.calls.filter(([m, u]) => m === 'POST' && !u.includes('complete')).length, 3);
    assert.ok(state.calls.some(([, u]) => u.startsWith('https://panel.test/api/user/webspaces/ws1/files/upload/chunk/complete?upload_id=')));
    assert.equal(stats.at(-1).loaded, 10);
    assert.equal(stats.at(-1).resumed, false);
});

test('resumes from the stored offset', async () => {
    const lib = load();
    const { client, state } = fakeServer({ maxChunk: 4, stored: 'abcdef' });
    state.total = 10;
    let resumed = false;
    await lib.chunkedUpload({ serverUuid: 'webspace:ws1', directory: '/', file: new File(['abcdefghij'], 'a.txt'), getTarget: target, client, onStats: (s) => { resumed ||= s.resumed; } });
    assert.equal(state.completed, 'abcdefghij');
    assert.equal(resumed, true);
    assert.ok(state.calls.some(([m, u]) => m === 'POST' && u.includes('offset=6')));
});

test('a server without max_chunk_size is reported as unsupported', async () => {
    const lib = load();
    const client = { get: async () => ({ data: { success: true } }) };
    await assert.rejects(
        lib.chunkedUpload({ serverUuid: 'x', directory: '/', file: new File(['a'], 'a'), getTarget: target, client }),
        (e) => e instanceof lib.ChunkedUploadUnsupportedError,
    );
});

test('discard sends DELETE through the given client', async () => {
    const lib = load();
    const { client, state } = fakeServer();
    await lib.discardChunkedUpload('webspace:ws1', '/', new File(['a'], 'a'), target, client);
    assert.equal(state.deleted, true);
    assert.ok(state.calls[0][1].includes('upload_id=fp-'));
});
