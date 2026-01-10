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
