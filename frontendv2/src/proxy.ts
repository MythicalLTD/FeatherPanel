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

import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    console.log(`[DEBUG] [SSR] [proxy] ${request.method} ${request.url} -> ${pathname} [ip: ${ip}]`);

    const publicRoutes = [
        '/',
        '/auth/login',
        '/auth/register',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/setup-2fa',
        '/auth/verify-2fa',
        '/auth/logout',
        '/maintenance',
    ];

    const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));

    /* If the requested route is a public route (non-authenticated route) then we can pass the request onto further logic. */
    if (isPublicRoute) return NextResponse.next();

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
    /* A simple regex to allow known asset/cdn paths. */
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|locales/).*)'],
};
