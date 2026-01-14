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

import axios, { AxiosError } from 'axios';

// API base configuration
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Response interceptor
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ error_code?: string; error_message?: string }>) => {
        // Handle common errors
        const errorCode = error.response?.data?.error_code;
        const status = error.response?.status;

        // Check for invalid account token error (can be 400 or 401)
        if (
            errorCode === 'INVALID_ACCOUNT_TOKEN' ||
            status === 401 ||
            (status === 400 && errorCode === 'INVALID_ACCOUNT_TOKEN')
        ) {
            // Invalid token or unauthorized - clear all storage and redirect to login
            if (typeof window !== 'undefined') {
                // Clear all storage
                localStorage.clear();
                sessionStorage.clear();

                // Clear cookies
                document.cookie.split(';').forEach((cookie) => {
                    const eqPos = cookie.indexOf('=');
                    const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                });

                // Redirect to logout page (which will clean up and redirect to login)
                if (!window.location.pathname.startsWith('/auth')) {
                    window.location.href = '/auth/logout';
                }
            }
        }
        return Promise.reject(error);
    },
);

export default api;
