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

import { SettingsResponse, AppSettings, CoreInfo } from '@/types/settings';

// Helper to determine base URL
export const getBaseUrl = () => {
    if (typeof window !== 'undefined') return ''; // Client side, use relative path (proxied by Next.js)

    // Server-side: Use environment variable or default to Docker service name / localhost
    if (process.env.INTERNAL_API_URL) return process.env.INTERNAL_API_URL;
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;

    // Fallback for local development (matches next.config.ts)
    return 'http://localhost:8721';
};

export const settingsApi = {
    getPublicSettings: async (): Promise<{
        settings: AppSettings;
        core: CoreInfo;
    } | null> => {
        try {
            const baseUrl = getBaseUrl();
            // If we are server side, we might need to use fetch directly or configure axios instance
            // Using fetch is safer for Next.js caching rules
            const res = await fetch(`${baseUrl}/api/system/settings`, {
                next: { revalidate: 60, tags: ['settings'] },
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            });

            if (!res.ok) {
                // Check if it's an invalid token error
                if (res.status === 401 || res.status === 400) {
                    const errorData = await res.json().catch(() => null);
                    if (errorData?.error_code === 'INVALID_ACCOUNT_TOKEN') {
                        // This is a public endpoint, but if we get invalid token, something is wrong
                        // Don't log out here as this endpoint shouldn't require auth
                        console.warn('Invalid token on public settings endpoint');
                    }
                }
                return null;
            }

            const data: SettingsResponse = await res.json();

            // Check for invalid token in response data
            if (data.error_code === 'INVALID_ACCOUNT_TOKEN') {
                console.warn('Invalid token in settings response');
                return null;
            }

            return data.success ? data.data : null;
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            return null;
        }
    },
};
