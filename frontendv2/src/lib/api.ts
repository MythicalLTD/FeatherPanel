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

import axios, { AxiosError, AxiosInstance } from 'axios';
import { isCloudflareChallengeResponseData, triggerCloudflareRecovery } from '@/lib/cloudflare-challenge';

// API base configuration
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

const handleAuthStateFailure = () => {
    if (typeof window === 'undefined') return;

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
};

const attachCommonResponseInterceptor = (client: AxiosInstance) => {
    client.interceptors.response.use(
        (response) => {
            const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
            if (contentType.includes('text/html') && isCloudflareChallengeResponseData(response.data)) {
                triggerCloudflareRecovery();
            }
            return response;
        },
        (error: AxiosError<{ error_code?: string; error_message?: string }>) => {
            const responseData = error.response?.data;
            const responseHeaders = error.response?.headers;
            const contentType = String(responseHeaders?.['content-type'] || '').toLowerCase();

            if (
                isCloudflareChallengeResponseData(responseData) ||
                (contentType.includes('text/html') && typeof responseData === 'string')
            ) {
                triggerCloudflareRecovery();
            }

            // Handle common auth state errors
            const errorCode = error.response?.data?.error_code;
            const status = error.response?.status;
            const shouldForceLogout =
                status === 401 || errorCode === 'INVALID_ACCOUNT_TOKEN' || errorCode === 'USER_BANNED';

            if (shouldForceLogout) {
                handleAuthStateFailure();
            }
            return Promise.reject(error);
        },
    );
};

// Attach to both the custom API client and the global axios instance used across the app.
attachCommonResponseInterceptor(api);
attachCommonResponseInterceptor(axios);

export type FeatherpanelApiErrorBody = {
    success?: boolean;
    message?: string;
    error_message?: string;
    error_code?: string | null;
};

/** Human-readable message from panel JSON errors (e.g. ApiResponse::error). */
export function getFeatherpanelApiErrorMessage(error: unknown): string | null {
    if (!axios.isAxiosError(error)) {
        return null;
    }
    const d = error.response?.data;
    if (!d || typeof d !== 'object') {
        return null;
    }
    const body = d as FeatherpanelApiErrorBody;
    const msg = body.message ?? body.error_message;
    return typeof msg === 'string' && msg.trim() !== '' ? msg : null;
}

export function getFeatherpanelApiErrorCode(error: unknown): string | null {
    if (!axios.isAxiosError(error)) {
        return null;
    }
    const d = error.response?.data;
    if (!d || typeof d !== 'object') {
        return null;
    }
    const code = (d as FeatherpanelApiErrorBody).error_code;
    return typeof code === 'string' && code !== '' ? code : null;
}

export default api;
