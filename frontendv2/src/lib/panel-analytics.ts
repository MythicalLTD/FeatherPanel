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

import type { AxiosInstance } from 'axios';
import { getAnalyticsConsent } from '@/lib/analytics-cookie';
import { ANALYTICS_ROUTES } from '@/lib/analytics-routes';

export const PANEL_ANALYTICS_EVENT = 'featherpanel:analytics-action';
export type PanelAnalyticsAction = {
    area: 'admin' | 'user';
    resource: string;
    action: string;
    outcome: 'success' | 'failure';
    method?: string;
    status?: string;
    duration?: string;
};

const routes = ANALYTICS_ROUTES.map((template) => ({
    template,
    pattern: new RegExp(
        '^' +
            template
                .split('/')
                .filter(Boolean)
                .map((segment) => {
                    if (segment.startsWith('[[...')) return '(?:/.*)?';
                    if (segment.startsWith('[...')) return '/.+';
                    if (segment.startsWith('[')) return '/[^/]+';
                    return '/' + segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                })
                .join('') +
            '/?$',
    ),
}));

export function analyticsPage(pathname: string): string {
    const path = pathname.split(/[?#]/)[0];
    return routes.find((route) => route.pattern.test(path))?.template || '/other';
}

/** Apply to every tracker payload, including automatic page views and custom events. */
export function sanitizeAnalyticsPayload(payload: Record<string, unknown>, origin: string): Record<string, unknown> {
    let page = '/other';
    try {
        page = analyticsPage(new URL(String(payload.url || '/'), origin).pathname);
    } catch {
        /* Ignore malformed URLs. */
    }
    let referrer = '';
    if (typeof payload.referrer === 'string' && payload.referrer) {
        try {
            const url = new URL(payload.referrer, origin);
            referrer = url.origin === origin ? analyticsPage(url.pathname) : url.origin;
        } catch {
            /* Ignore malformed referrers. */
        }
    }
    return { ...payload, url: page, title: `Panel ${page}`, referrer };
}

const resources = new Set([
    'servers',
    'webspaces',
    'vm-instances',
    'vds',
    'tickets',
    'settings',
    'profile',
    'account',
    'users',
    'nodes',
    'web-nodes',
    'vds-nodes',
    'spells',
    'plugins',
    'databases',
    'roles',
    'api-keys',
    'backups',
    'schedules',
    'ssh-keys',
    'mail',
    'notifications',
    'knowledgebase',
    'cloud-plugins',
    'featherzerotrust',
    'webplates',
    'realms',
    'locations',
    'mounts',
    'dns-hosts',
    'mail-hosts',
    'mail-templates',
    'hosting-packages',
    'subdomains',
    'storage-sense',
    'database-snapshots',
    'rate-limits',
    'blocked-email-domains',
    'translations',
    'oidc-providers',
    'ldap-providers',
    'passkeys',
    'cache',
    'updates',
]);
const actions = new Set([
    'power',
    'backups',
    'restore',
    'schedules',
    'tasks',
    'run',
    'startup',
    'settings',
    'reinstall',
    'install',
    'abort',
    'transfer',
    'suspend',
    'unsuspend',
    'users',
    'databases',
    'files',
    'write-file',
    'create-directory',
    'rename',
    'copy-files',
    'delete-files',
    'compress-files',
    'decompress-archive',
    'change-permissions',
    'upload',
    'write',
    'copy',
    'delete',
    'compress',
    'decompress',
    'chmod',
    'trash',
    'empty',
    'reply',
    'replies',
    'close',
    'reopen',
    'messages',
    'domains',
    'email',
    'network',
    'waf',
    'apps',
    'password',
    'avatar',
    'preferences',
    'download',
    'export',
    'import',
    'enable',
    'disable',
    'test',
    'scan',
    'cleanup',
    'rotate',
    'reset',
    'prune',
    'purge',
    'restore',
    'execute',
    'reply',
    'revoke',
    'create',
    'update',
    'delete',
    'remove',
    'attach',
    'detach',
    'install',
    'uninstall',
    'sync',
    'start',
    'stop',
    'restart',
    'kill',
    'reboot',
    'shutdown',
]);

/** Returns only fixed categories. Credentials, request bodies, IDs and query strings are never emitted. */
export function analyticsAction(method: string, pathname: string, success: boolean): PanelAnalyticsAction | null {
    const verb = method.toLowerCase();
    if (!['post', 'put', 'patch', 'delete'].includes(verb)) return null;
    const parts = pathname
        .split(/[?#]/)[0]
        .replace(/^\/api\//, '/')
        .split('/')
        .filter(Boolean);
    const [area, resource, ...tail] = parts;
    if (area !== 'user' && area !== 'admin') return null;
    let action: string;
    if (area === 'user' && resource === 'auth') {
        const auth = tail.join('/');
        if (
            ![
                'login',
                'logout',
                'register',
                'ldap/login',
                'forgot-password',
                'reset-password',
                'verify-2fa',
                'enable-2fa',
                'disable-2fa',
                'verify-email/resend',
                'email-login/request',
                'email-login/verify',
                'discord/link',
                'discord/register',
                'passkeys/authentication/verify',
                'qr/start',
                'qr/confirm',
            ].includes(auth)
        )
            return null;
        action = auth.replace('/', '.');
    } else {
        if (!resources.has(resource)) return null;
        // Automatic access-token/socket/polling requests are not user actions.
        if (tail.some((part) => ['jwt', 'token', 'session', 'heartbeat', 'status', 'connection', 'ws'].includes(part)))
            return null;
        const category = tail.filter((part) => actions.has(part)).join('.');
        if (tail.length > 1 && !category) return null;
        action =
            category ||
            ({ post: 'create', put: 'update', patch: 'update', delete: 'delete' } as Record<string, string>)[verb];
    }
    return { area, resource, action, outcome: success ? 'success' : 'failure' };
}

export function analyticsDuration(milliseconds: number): string {
    if (milliseconds < 250) return 'under-250ms';
    if (milliseconds < 1000) return '250-999ms';
    if (milliseconds < 3000) return '1-3s';
    return 'over-3s';
}

export function analyticsPowerAction(data: unknown): string | undefined {
    try {
        const body = typeof data === 'string' && data.length < 1024 ? JSON.parse(data) : data;
        if (!body || typeof body !== 'object') return undefined;
        const value = body.signal ?? body.action;
        return ['start', 'stop', 'restart', 'kill', 'reboot', 'shutdown'].includes(value) ? value : undefined;
    } catch {
        return undefined;
    }
}

export const PANEL_ANALYTICS_UI_EVENT = 'featherpanel:analytics-interaction';
const interactionEvents = new Set([
    'panel.download.start',
    'panel.clipboard.copy',
    'panel.editor.change',
    'panel.console.connection',
    'panel.console.command',
    'panel.error.retry',
    'panel.preference.change',
    'panel.list.change',
    'panel.list.reset',
    'panel.pagination',
    'panel.file.browse',
    'panel.file.select',
    'panel.tab.select',
    'panel.dialog.open',
    'panel.dialog.close',
    'panel.confirm.accept',
    'panel.confirm.cancel',
    'panel.search.open',
    'panel.search.used',
    'panel.search.select',
]);
const categories = new Set([
    'attempt',
    'failure',
    'sent',
    'blocked',
    'connected',
    'disconnected',
    'auth-failed',
    'reconnect',
    'monaco',
    'codemirror',
    'retry',
    'refresh',
    'theme',
    'accent',
    'background',
    'motion',
    'font',
    'theme-pack',
    'language',
    'previous',
    'next',
    'jump',
    'sort',
    'filter',
    'page-size',
    'single',
    'select-all',
    'clear-selection',
    'overview',
    'profile',
    'settings',
    'security',
    'activity',
    'activities',
    'console',
    'files',
    'backups',
    'schedules',
    'startup',
    'network',
    'users',
    'databases',
    'domains',
    'email',
    'waf',
    'apps',
    'logs',
    'api-keys',
    'ssh-keys',
    'notifications',
    'appearance',
    'integrations',
    'billing',
    'permissions',
    'configuration',
    'diagnostics',
    'allocation',
    'allocations',
    'general',
    'destructive',
    'standard',
    'search',
    'other',
]);

/** Classify changed filter keys without sending their names or values. */
export function analyticsListChanges(keys: string[]): string[] {
    const result = new Set<string>();
    for (const key of keys) {
        if (/search|query/i.test(key)) result.add('search');
        else if (/sort|order/i.test(key)) result.add('sort');
        else if (/pagesize|perpage|limit/i.test(key)) result.add('page-size');
        else if (!/^page$/i.test(key)) result.add('filter');
    }
    return [...result];
}

/** Web Vitals values are grouped using their standard good/poor thresholds. */
export function analyticsVital(name: string, value: number): { metric: string; rating: string } | null {
    const thresholds: Record<string, [number, number]> = {
        CLS: [0.1, 0.25],
        FCP: [1800, 3000],
        INP: [200, 500],
        LCP: [2500, 4000],
        TTFB: [800, 1800],
    };
    const bounds = thresholds[name];
    if (!bounds || !Number.isFinite(value) || value < 0) return null;
    return { metric: name, rating: value <= bounds[0] ? 'good' : value <= bounds[1] ? 'needs-improvement' : 'poor' };
}

export function analyticsCategory(value: string): string {
    return categories.has(value) ? value : 'other';
}

/** Fixed event/category names only. UI labels, search terms, and dialog contents never enter events. */
export function reportPanelInteraction(event: string, category = 'other'): void {
    if (typeof window === 'undefined' || getAnalyticsConsent() !== true || !interactionEvents.has(event)) return;
    try {
        reportPanelObservation(event, {
            category: analyticsCategory(category),
            page: analyticsPage(window.location.pathname),
        });
        window.dispatchEvent(
            new CustomEvent(PANEL_ANALYTICS_UI_EVENT, {
                detail: { event, category: analyticsCategory(category) },
            }),
        );
    } catch {
        /* Tracking must never interrupt a user action. */
    }
}

export const PANEL_MONITORING_EVENT = 'featherpanel:monitoring-event';
export type PanelObservation = { event: string; data: Record<string, string> };
const observations = new Set([
    ...interactionEvents,
    'panel.navigation',
    'panel.navigation.click',
    'panel.link.external',
    'panel.download',
    'panel.form.submit',
    'panel.form.invalid',
    'panel.action',
    'panel.scroll.depth',
    'panel.engagement',
    'panel.connectivity',
    'panel.performance',
    'panel.request.failure',
    'panel.request.slow',
]);
const failureKinds = new Set([
    'network',
    'timeout',
    'server',
    'rate-limit',
    'access',
    'not-found',
    'validation',
    'application',
    'other',
]);
const authOperations = new Set([
    'login',
    'logout',
    'register',
    'ldap.login',
    'forgot-password',
    'reset-password',
    'verify-2fa',
    'enable-2fa',
    'disable-2fa',
    'verify-email.resend',
    'email-login.request',
    'email-login.verify',
    'discord.link',
    'discord.register',
    'passkeys.authentication/verify',
    'qr.start',
    'qr.confirm',
]);

export function analyticsFeature(pathname: string): string {
    const parts = analyticsPage(pathname).split('/').filter(Boolean);
    const first = parts[0];
    if (!first) return 'overview';
    if (first === 'auth') return 'authentication';
    if (first === 'server') return 'servers';
    if (first === 'webspace') return 'webspaces';
    if (first === 'admin') return resources.has(parts[1]) ? parts[1] : 'administration';
    return resources.has(first) ? first : 'other';
}

/** Validate every field again before it enters diagnostic context. */
export function sanitizePanelObservation(value: unknown): PanelObservation | null {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as { event?: unknown; data?: unknown };
    if (
        typeof candidate.event !== 'string' ||
        !observations.has(candidate.event) ||
        !candidate.data ||
        typeof candidate.data !== 'object'
    )
        return null;
    const data: Record<string, string> = {};
    for (const [key, raw] of Object.entries(candidate.data)) {
        if (typeof raw !== 'string') continue;
        if (['page', 'from', 'to'].includes(key)) data[key] = analyticsPage(raw);
        else if (key === 'category') data[key] = analyticsCategory(raw);
        else if (key === 'area' && ['admin', 'user'].includes(raw)) data[key] = raw;
        else if (key === 'resource' && (resources.has(raw) || raw === 'auth')) data[key] = raw;
        else if (
            key === 'action' &&
            (raw === 'read' || authOperations.has(raw) || raw.split('.').every((part) => actions.has(part)))
        )
            data[key] = raw;
        else if (key === 'outcome' && ['success', 'failure'].includes(raw)) data[key] = raw;
        else if (key === 'method' && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(raw)) data[key] = raw;
        else if (key === 'status' && ['2xx', '3xx', '4xx', '5xx', 'network-error'].includes(raw)) data[key] = raw;
        else if (key === 'duration' && ['under-250ms', '250-999ms', '1-3s', 'over-3s'].includes(raw)) data[key] = raw;
        else if (key === 'kind' && failureKinds.has(raw)) data[key] = raw;
        else if (key === 'state' && ['online', 'offline'].includes(raw)) data[key] = raw;
        else if (key === 'metric' && ['CLS', 'FCP', 'INP', 'LCP', 'TTFB'].includes(raw)) data[key] = raw;
        else if (key === 'rating' && ['good', 'needs-improvement', 'poor'].includes(raw)) data[key] = raw;
        else if (key === 'reason' && ['required', 'format', 'range', 'other'].includes(raw)) data[key] = raw;
        else if (key === 'format' && ['pdf', 'zip', 'tar', 'gz', 'json', 'txt', 'csv', 'other'].includes(raw))
            data[key] = raw;
        else if (key === 'percent' && ['25', '50', '75', '100'].includes(raw)) data[key] = raw;
        else if (key === 'active_seconds' && ['30', '60', '120'].includes(raw)) data[key] = raw;
    }
    if (data.page) data.feature = analyticsFeature(data.page);
    return { event: candidate.event, data };
}

export function reportPanelObservation(event: string, data: Record<string, string>): void {
    if (typeof window === 'undefined' || getAnalyticsConsent() !== true) return;
    const observation = sanitizePanelObservation({ event, data });
    if (!observation) return;
    try {
        window.dispatchEvent(new CustomEvent(PANEL_MONITORING_EVENT, { detail: observation }));
    } catch {
        /* Diagnostics must not interrupt panel actions. */
    }
}

export function analyticsFailureKind(status: number, timeout = false): string {
    if (timeout) return 'timeout';
    if (!status) return 'network';
    if (status >= 500) return 'server';
    if (status === 429) return 'rate-limit';
    if (status === 401 || status === 403) return 'access';
    if (status === 404) return 'not-found';
    if (status === 400 || status === 422) return 'validation';
    if (status >= 200 && status < 300) return 'application';
    return 'other';
}

export function attachPanelAnalyticsInterceptor(client: AxiosInstance): void {
    const started = new WeakMap<object, number>();
    client.interceptors.request.use((config) => {
        if (typeof window !== 'undefined' && getAnalyticsConsent() === true) started.set(config, Date.now());
        return config;
    });
    const report = (
        config: { method?: string; url?: string; baseURL?: string; data?: unknown } | undefined,
        success: boolean,
        status: number,
        timeout = false,
    ) => {
        if (typeof window === 'undefined' || getAnalyticsConsent() !== true || !config?.url) return;
        const timestamp = started.get(config);
        if (timestamp === undefined) return;
        started.delete(config);
        try {
            const base = new URL(config.baseURL || '/', window.location.origin);
            const url = /^(https?:)?\/\//i.test(config.url)
                ? new URL(config.url, window.location.origin)
                : new URL(`${base.pathname.replace(/\/$/, '')}/${config.url.replace(/^\//, '')}`, base.origin);
            if (base.origin !== window.location.origin || url.origin !== window.location.origin) return;
            const method = (config.method || 'get').toLowerCase();
            const action = analyticsAction(method, url.pathname, success);
            const read = method === 'get' ? analyticsAction('post', url.pathname, success) : null;
            if (!action && (!read || read.resource === 'auth')) return;
            if (action?.action === 'power') {
                const signal = analyticsPowerAction(config.data);
                if (signal) action.action = `power.${signal}`;
            }
            const operation = action || { ...read!, action: 'read' };
            const elapsed = Math.max(0, Date.now() - timestamp);
            const context = {
                area: operation.area,
                resource: operation.resource,
                action: operation.action,
                method: method.toUpperCase(),
                status: status ? `${Math.floor(status / 100)}xx` : 'network-error',
                duration: analyticsDuration(elapsed),
                page: analyticsPage(window.location.pathname),
            };
            if (!success)
                reportPanelObservation('panel.request.failure', {
                    ...context,
                    kind: analyticsFailureKind(status, timeout),
                });
            else if (elapsed >= 3000) reportPanelObservation('panel.request.slow', context);
            if (!action) return;
            reportPanelObservation('panel.action', { ...context, action: action.action, outcome: action.outcome });
            window.dispatchEvent(
                new CustomEvent(PANEL_ANALYTICS_EVENT, {
                    detail: {
                        ...action,
                        method: (config.method || 'get').toUpperCase(),
                        status: status ? `${Math.floor(status / 100)}xx` : 'network-error',
                        duration: analyticsDuration(Date.now() - timestamp),
                    },
                }),
            );
        } catch {
            /* Analytics must never interrupt a panel operation. */
        }
    };
    client.interceptors.response.use(
        (response) => {
            report(
                response.config,
                response.status >= 200 && response.status < 300 && response.data?.success !== false,
                response.status,
            );
            return response;
        },
        (error) => {
            if (error.code !== 'ERR_CANCELED' && (error.response || error.request))
                report(
                    error.config,
                    false,
                    error.response?.status || 0,
                    ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code),
                );
            return Promise.reject(error);
        },
    );
}
