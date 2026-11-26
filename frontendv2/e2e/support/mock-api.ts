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

import type { BrowserContext, Page, Request, Route } from '@playwright/test';

/**
 * Playwright smoke tests run the production Next.js build without a PHP backend.
 * Every browser call to `/api/**` is answered here, so tests never depend on a
 * database, Wings or timing on a real server.
 */

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface MockResponse {
    status?: number;
    body?: unknown;
    headers?: Record<string, string>;
}

type Responder = MockResponse | ((request: Request, match: RegExpMatchArray) => MockResponse | Promise<MockResponse>);

export interface ApiCall {
    method: string;
    path: string;
    query: URLSearchParams;
    body: unknown;
}

interface Handler {
    method: string;
    pattern: RegExp;
    respond: Responder;
}

export function ok(data: unknown = null, message = 'OK'): MockResponse {
    return {
        status: 200,
        body: { success: true, message, data, error: false, error_message: null, error_code: null },
    };
}

export function fail(status: number, errorCode: string, message: string): MockResponse {
    return {
        status,
        body: {
            success: false,
            message,
            data: null,
            error: true,
            error_message: message,
            error_code: errorCode,
            errors: [{ code: errorCode, detail: message, status }],
        },
    };
}

function toPattern(path: string | RegExp): RegExp {
    if (path instanceof RegExp) {
        return path;
    }
    // "/api/user/servers/:id" style paths, matched against the pathname only.
    const source = path
        .split('/')
        .map((part) => (part.startsWith(':') ? '([^/]+)' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
        .join('/');
    return new RegExp(`^${source}$`);
}

export class MockApi {
    private handlers: Handler[] = [];

    /** Requests that reached the fallback (useful when a test fails). */
    readonly unhandled: string[] = [];

    /** Every request the browser sent to the API, in order. */
    readonly calls: ApiCall[] = [];

    /** Register a response. Later registrations win over earlier ones for the same request. */
    on(method: string, path: string | RegExp, respond: Responder): this {
        this.handlers.unshift({ method: method.toUpperCase(), pattern: toPattern(path), respond });
        return this;
    }

    get(path: string | RegExp, respond: Responder): this {
        return this.on('GET', path, respond);
    }

    post(path: string | RegExp, respond: Responder): this {
        return this.on('POST', path, respond);
    }

    put(path: string | RegExp, respond: Responder): this {
        return this.on('PUT', path, respond);
    }

    callsTo(method: string, path: string | RegExp): ApiCall[] {
        const pattern = toPattern(path);
        return this.calls.filter((call) => call.method === method.toUpperCase() && pattern.test(call.path));
    }

    async install(target: BrowserContext | Page): Promise<void> {
        await target.route(
            (url) => url.pathname.startsWith('/api/'),
            (route) => this.handle(route),
        );
    }

    private async handle(route: Route): Promise<void> {
        const request = route.request();
        const method = request.method();
        const { pathname, searchParams } = new URL(request.url());

        let body: unknown = null;
        const raw = request.postData();
        if (raw) {
            try {
                body = JSON.parse(raw);
            } catch {
                body = raw;
            }
        }
        this.calls.push({ method, path: pathname, query: searchParams, body });

        for (const handler of this.handlers) {
            if (handler.method !== method && handler.method !== '*') {
                continue;
            }
            const match = pathname.match(handler.pattern);
            if (!match) {
                continue;
            }
            const response =
                typeof handler.respond === 'function' ? await handler.respond(request, match) : handler.respond;
            await route.fulfill({
                status: response.status ?? 200,
                contentType: 'application/json',
                headers: response.headers,
                body: JSON.stringify(response.body ?? null),
            });
            return;
        }

        // Same answer the panel gives for a route it does not know.
        this.unhandled.push(`${method} ${pathname}`);
        const notFound = fail(404, 'NOT_FOUND', 'Not found');
        await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify(notFound.body),
        });
    }
}
