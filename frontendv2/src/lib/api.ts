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
