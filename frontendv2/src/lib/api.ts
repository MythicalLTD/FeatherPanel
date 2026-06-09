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

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getClientSyncHeaders } from '@/lib/clientIdentity';
import { acquireWingsSlot, isWingsAdminNodeRequest, releaseWingsSlot } from '@/lib/wingsRequestQueue';

type WingsQueuedAxiosRequestConfig = InternalAxiosRequestConfig & {
    _wingsQueued?: boolean;
};

// Same-origin panel API calls must include cookies (session). Default axios does not.
axios.defaults.withCredentials = true;

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

    const preservedClientSync = localStorage.getItem('fp:ui:pref:sync');

    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();

    if (preservedClientSync) {
        localStorage.setItem('fp:ui:pref:sync', preservedClientSync);
    }

    // Clear cookies
    document.cookie.split(';').forEach((cookie) => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        if (name === '_fp_ui_sid') {
            return;
        }
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });

    // Redirect unauthenticated users directly to login.
    if (!window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login';
    }
};

const attachClientSyncRequestInterceptor = (client: AxiosInstance) => {
    client.interceptors.request.use((config) => {
        const syncHeaders = getClientSyncHeaders();
        if (syncHeaders) {
            config.headers = config.headers ?? {};
            Object.assign(config.headers, syncHeaders);
        }
        return config;
    });
};

const releaseWingsQueueSlot = (config?: InternalAxiosRequestConfig) => {
    const wingsConfig = config as WingsQueuedAxiosRequestConfig | undefined;
    if (!wingsConfig?._wingsQueued) {
        return;
    }

    wingsConfig._wingsQueued = false;
    releaseWingsSlot();
};

const attachWingsQueueInterceptor = (client: AxiosInstance) => {
    client.interceptors.request.use(async (config) => {
        const url = String(config.url || '');
        const baseUrl = String(config.baseURL || '');
        const requestPath = url.startsWith('http') ? url : `${baseUrl}${url}`;

        if (!isWingsAdminNodeRequest(url) && !isWingsAdminNodeRequest(requestPath)) {
            return config;
        }

        await acquireWingsSlot();
        (config as WingsQueuedAxiosRequestConfig)._wingsQueued = true;
        return config;
    });

    client.interceptors.response.use(
        (response) => {
            releaseWingsQueueSlot(response.config);
            return response;
        },
        (error: AxiosError) => {
            releaseWingsQueueSlot(error.config);
            return Promise.reject(error);
        },
    );
};

const attachCommonResponseInterceptor = (client: AxiosInstance) => {
    client.interceptors.response.use(
        (response) => response,
        (error: AxiosError<{ error_code?: string; error_message?: string }>) => {
            // Handle common auth state errors
            const errorCode = error.response?.data?.error_code;
            const status = error.response?.status;
            const requestUrl = String(error.config?.url || '');
            // Only force logout on explicit session/auth failures.
            // Some non-auth endpoints (e.g. FeatherCloud integration) can also return 401
            // for external credential issues and should not clear the user's panel session.
            const isSessionEndpoint = requestUrl.includes('/api/user/session') || requestUrl.includes('/user/session');
            const isAuthEndpoint = requestUrl.includes('/api/user/auth/') || requestUrl.includes('/user/auth/');
            const shouldForceLogout =
                errorCode === 'INVALID_ACCOUNT_TOKEN' ||
                errorCode === 'USER_BANNED' ||
                (status === 401 && (isSessionEndpoint || isAuthEndpoint) && errorCode !== 'TWO_FACTOR_REQUIRED');

            if (shouldForceLogout) {
                handleAuthStateFailure();
            }
            return Promise.reject(error);
        },
    );
};

// Attach to both the custom API client and the global axios instance used across the app.
attachClientSyncRequestInterceptor(api);
attachClientSyncRequestInterceptor(axios);
attachWingsQueueInterceptor(api);
attachWingsQueueInterceptor(axios);
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
