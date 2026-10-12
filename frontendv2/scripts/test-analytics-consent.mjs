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

function compile(path) {
    return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
}

function privacyEnvironment() {
    const events = [];
    const cookies = [];
    const effects = [];
    let reloads = 0;
    const scripts = new Map();
    const document = {
        get cookie() { return 'featherpanel_analytics=1; featherpanel_analytics_consent_v1=1'; },
        set cookie(value) { cookies.push(value); },
        getElementById: id => scripts.get(id),
    };
    const window = { location: { hostname: 'production.example.com', reload: () => reloads++ }, dispatchEvent: event => events.push(event) };
    const context = { exports: {}, document, window, Event, process: { env: { NODE_ENV: 'production' } } };
    vm.runInNewContext(compile('../src/lib/analytics-cookie.ts'), context);
    return { cookies, effects, events, scripts, document, window, consent: context.exports, reloads: () => reloads };
}

test('saved acceptance, hosted development, and production cannot enable browser telemetry', () => {
    const env = privacyEnvironment();
    assert.equal(env.consent.getAnalyticsConsent(), false);
    assert.equal(env.consent.getAnalyticsCookie(), false);
    assert.equal(env.consent.isClientTelemetryEnvironment(), false);
    env.consent.setAnalyticsCookie(true);
    assert.equal(env.consent.getAnalyticsConsent(), false);
    assert.equal(env.cookies.length, 2);
    assert.ok(env.cookies.every(cookie => cookie.includes('max-age=0')));
});

test('the browser component renders no consent dialog or tracker and stops legacy recorder listeners', () => {
    for (const existing of [false, true]) {
        const env = privacyEnvironment();
        if (existing) env.scripts.set('featherpanel-umami-recorder', {});
        const context = { exports: {}, window: env.window, document: env.document, require(name) {
            if (name === 'react') return { useEffect: fn => env.effects.push(fn) };
            if (name.endsWith('analytics-cookie')) return env.consent;
            throw new Error(`Unexpected dependency: ${name}`);
        } };
        vm.runInNewContext(compile('../src/components/common/AnalyticsScript.tsx'), context);
        assert.equal(context.exports.default(), null);
        env.effects.forEach(effect => effect());
        assert.equal(env.reloads(), existing ? 1 : 0);
        assert.equal(env.cookies.length, 2);
    }
});

test('Sentry cannot initialize even when an old caller requests enabling it', async () => {
    const context = { exports: {}, require: name => { throw new Error(`Unexpected SDK import: ${name}`); } };
    vm.runInNewContext(compile('../src/lib/client-error-reporting.ts'), context);
    assert.equal(await context.exports.setClientMonitoringEnabled(true, 'v1.4.0'), null);
    assert.equal(context.exports.captureClientException(new Error('private details')), undefined);
});

test('browser interaction and observation hooks remain inert', () => {
    const env = privacyEnvironment();
    const routeContext = { exports: {} };
    vm.runInNewContext(compile('../src/lib/analytics-routes.ts'), routeContext);
    const context = { exports: {}, window: env.window, URL, require(name) {
        if (name.endsWith('analytics-cookie')) return env.consent;
        if (name.endsWith('analytics-routes')) return routeContext.exports;
        throw new Error(name);
    } };
    vm.runInNewContext(compile('../src/lib/panel-analytics.ts'), context);
    context.exports.reportPanelInteraction('panel.button.click', 'backups');
    context.exports.reportPanelObservation('panel.navigation', { page: '/dashboard' });
    assert.equal(env.events.length, 0);
});
