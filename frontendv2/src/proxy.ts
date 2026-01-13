/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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

    console.log('[DEBUG] [SSR] [proxy] Requested route:', pathname);

    const publicRoutes = [
        '/',
        '/auth/login',
        '/auth/register',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/setup-2fa',
        '/auth/verify-2fa',
        '/auth/logout',
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
