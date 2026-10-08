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

function sessionEnvironment(pathname = '/server/test/console') {
    const slots = [], effects = [], requests = [], redirects = [], cache = new Map();
    let cursor = 0, dirty = true, value, renders = 0;
    const router = { push: url => redirects.push(url) };
    const hookEffect = (fn, deps) => {
        const index = cursor++, before = slots[index];
        if (!before || deps.some((dep, i) => !Object.is(dep, before.deps[i]))) effects.push(() => {
            before?.cleanup?.(); slots[index] = { deps, cleanup: fn() };
        });
    };
    const React = {
        createContext: () => ({ Provider: 'provider' }), useContext() {},
        useState(initial) {
            const index = cursor++; slots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
            return [slots[index].value, next => {
                const resolved = typeof next === 'function' ? next(slots[index].value) : next;
                if (!Object.is(resolved, slots[index].value)) { slots[index].value = resolved; dirty = true; }
            }];
        },
        useRef(initial) { return slots[cursor++] ??= { current: initial }; },
        useCallback(fn, deps) {
            const index = cursor++, before = slots[index];
            if (!before || deps.some((dep, i) => !Object.is(dep, before.deps[i]))) slots[index] = { deps, fn };
            return slots[index].fn;
        },
        useEffect: hookEffect, useLayoutEffect: hookEffect,
    };
    const api = { get(url) { return new Promise((resolve, reject) => requests.push({ url, resolve, reject })); }, delete: async () => {} };
    const context = { exports: {}, console: { error() {}, warn() {} }, window: { location: { pathname, search: '' } }, sessionStorage: { getItem: key => cache.get(key), setItem: (key, data) => cache.set(key, data), removeItem: key => cache.delete(key) }, setTimeout, require(name) {
        if (name === 'react') return React;
        if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
        if (name === 'next/navigation') return { useRouter: () => router };
        if (name.endsWith('/api')) return { __esModule: true, default: api, getFeatherpanelApiErrorMessage: () => null };
        if (name.endsWith('/permissions')) return { __esModule: true, default: { ADMIN_ROOT: '*' } };
        if (name.endsWith('usePluginPublicPages')) return { getCachedPluginPublicPages: async () => [] };
        if (name.endsWith('cloudflare-challenge')) return { isCloudflareChallengeAxios: () => false, isCloudflareChallengeResponseData: () => false };
        throw new Error(name);
    } };
    const code = ts.transpileModule(readFileSync(new URL('../src/contexts/SessionContext.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInNewContext(code, context);
    const render = () => { cursor = 0; dirty = false; renders++; value = context.exports.SessionProvider({ children: null }).props.value; effects.splice(0).forEach(fn => fn()); };
    const settle = async () => {
        for (let i = 0; i < 20; i++) { if (dirty) render(); await Promise.resolve(); }
        assert.equal(dirty, false, 'provider must settle rather than continually updating');
    };
    return { requests, redirects, settle, get value() { return value; }, get renders() { return renders; }, success(index, username = 'test') { requests[index].resolve({ data: { success: true, error: false, data: { user_info: { username, uuid: username }, permissions: ['read'] } } }); } };
}

test('session startup requests once and user changes do not trigger a fetch loop', async () => {
    const env = sessionEnvironment(); await env.settle(); assert.equal(env.requests.length, 1);
    const fetchSession = env.value.fetchSession;
    env.success(0); await env.settle();
    assert.equal(env.requests.length, 1); assert.equal(env.value.user.username, 'test'); assert.equal(env.value.fetchSession, fetchSession);
    assert.equal(await env.value.fetchSession(), true); assert.equal(env.requests.length, 1);
    const first = env.value.refreshSession(), second = env.value.refreshSession();
    assert.equal(env.requests.length, 2);
    env.success(1, 'updated'); assert.equal(await first, true); assert.equal(await second, true); await env.settle();
    assert.equal(env.requests.length, 2); assert.equal(env.value.user.username, 'updated'); assert.equal(env.value.fetchSession, fetchSession);
});

test('forced login refresh supersedes a startup guest probe and ignores its late failure', async () => {
    const env = sessionEnvironment('/auth/login'); await env.settle();
    const probe = env.value.fetchSession(), login = env.value.fetchSession(true);
    assert.equal(env.requests.length, 2);
    env.success(1, 'logged-in'); assert.equal(await login, true); await env.settle();
    env.requests[0].reject({ response: { status: 401, data: { error_code: 'INVALID_ACCOUNT_TOKEN' } } });
    assert.equal(await probe, false); await env.settle();
    assert.equal(env.value.user.username, 'logged-in'); assert.equal(env.requests.length, 2); assert.equal(env.redirects.length, 0);
});

test('clearing session invalidates pending responses; public routes skip authentication probes', async () => {
    const env = sessionEnvironment(); await env.settle(); env.value.clearSession(); env.success(0); await env.settle();
    assert.equal(env.value.user, null); assert.equal(env.requests.length, 1);
    const publicEnv = sessionEnvironment('/status'); await publicEnv.settle(); assert.equal(publicEnv.requests.length, 0); assert.equal(publicEnv.value.isLoading, false);
});


test('an unauthenticated guest is checked once until an explicit refresh', async () => {
    const env = sessionEnvironment('/auth/login'); await env.settle();
    env.requests[0].reject({ response: { status: 401 } }); await env.settle();
    assert.equal(env.value.isSessionChecked, true); assert.equal(await env.value.fetchSession(), false);
    assert.equal(env.requests.length, 1);
});
