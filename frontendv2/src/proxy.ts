/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

import { NextRequest, NextResponse } from 'next/server';

const STATIC_PUBLIC_ROUTES = [
    '/',
    '/status',
    '/knowledgebase',
    '/knowladgebase',
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/setup-2fa',
    '/auth/verify-2fa',
    '/auth/logout',
    '/maintenance',
];

function normalizePathname(pathname: string): string {
    if (pathname.length > 1 && pathname.endsWith('/')) {
        return pathname.slice(0, -1);
    }
    return pathname;
}

function isStaticPublicRoute(pathname: string): boolean {
    return STATIC_PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

async function getEnabledPluginPublicPaths(request: NextRequest): Promise<string[]> {
    try {
        const origin = request.nextUrl.origin;
        const settingsRes = await fetch(`${origin}/api/system/plugin-public-pages`, {
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            // Short TTL plugin install/settings can change without redeploy.
            next: { revalidate: 30 },
        });

        if (!settingsRes.ok) {
            return [];
        }

        const data = await settingsRes.json();
        const pages = data?.data?.pages;
        if (!Array.isArray(pages)) {
            return [];
        }

        return pages
            .filter((page: { path?: unknown; enabled?: unknown }) => page?.enabled === true)
            .map((page: { path?: unknown }) => (typeof page?.path === 'string' ? normalizePathname(page.path) : null))
            .filter((path: string | null): path is string => !!path && path.startsWith('/'));
    } catch {
        // Fail closed: do not treat unknown paths as public if the registry is unavailable.
        return [];
    }
}

function isPluginPublicRoute(pathname: string, pluginPaths: string[]): boolean {
    const normalized = normalizePathname(pathname);
    return pluginPaths.some((path) => normalized === path || normalized.startsWith(path + '/'));
}

async function applyStatusPageIframeHeaders(request: NextRequest, response: NextResponse): Promise<NextResponse> {
    try {
        const origin = request.nextUrl.origin;
        const settingsRes = await fetch(`${origin}/api/settings/public`, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });

        if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            const allowIframe = settingsData?.data?.settings?.status_page_allow_iframe === 'true';

            if (allowIframe) {
                response.headers.delete('X-Frame-Options');
                response.headers.set('Content-Security-Policy', 'frame-ancestors *');
            } else {
                response.headers.set('X-Frame-Options', 'SAMEORIGIN');
            }
        }
    } catch {
        // On error, keep default SAMEORIGIN behavior
        response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    }

    return response;
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const normalizedPath = normalizePathname(pathname);

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    console.log(`[DEBUG] [SSR] [proxy] ${request.method} ${request.url} -> ${pathname} [ip: ${ip}]`);

    const pluginPublicPaths = isStaticPublicRoute(normalizedPath) ? [] : await getEnabledPluginPublicPaths(request);
    const isPublicRoute = isStaticPublicRoute(normalizedPath) || isPluginPublicRoute(normalizedPath, pluginPublicPaths);

    /* If the requested route is a public route (non-authenticated route) then we can pass the request onto further logic. */
    if (isPublicRoute) {
        const response = NextResponse.next();

        // For the public status page, conditionally control X-Frame-Options
        // to support iframe embedding when the admin has enabled it.
        if (pathname === '/status' || pathname.startsWith('/status/')) {
            return applyStatusPageIframeHeaders(request, response);
        }

        return response;
    }

    const token = request.cookies.get('remember_token')?.value;

    /* Check if the user has a remember token cookie. */
    if (!token) {
        const redirectedLoginUrl = request.nextUrl.clone();

        console.log('[DEBUG] [SSR] [proxy] Failed to validate authentication on route: ', pathname);

        redirectedLoginUrl.pathname = '/auth/login';
        redirectedLoginUrl.searchParams.set('redirect', pathname);

        /* Redirect the users request to the authentication login page with a redirect parameter to the page they wanted to access in said request. */
        return NextResponse.redirect(redirectedLoginUrl);
    }

    /* Pass the request onto further logic. */
    return NextResponse.next();
}

export const config = {
    /* Allow known asset/cdn paths and plugin static assets without auth gating. */
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|locales/|components/|addons/|attachments/).*)'],
};
