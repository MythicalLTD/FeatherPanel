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

import axios from 'axios';

export interface RateLimitConfig {
    _enabled?: boolean;
    per_second?: number | null;
    per_minute?: number | null;
    per_hour?: number | null;
    per_day?: number | null;
    namespace?: string | null;
}

export interface RateLimitsResponse {
    _enabled?: boolean;
    routes?: Record<string, RateLimitConfig>;
}

export const adminRateLimitsApi = {
    fetchRateLimits: async () => {
        const { data } = await axios.get<{
            success: boolean;
            data?: RateLimitsResponse;
            message?: string;
        }>('/api/admin/rate-limits');
        return data;
    },

    toggleGlobal: async (enabled: boolean) => {
        const { data } = await axios.patch<{ success: boolean; message?: string }>('/api/admin/rate-limits/global', {
            _enabled: enabled,
        });
        return data;
    },

    updateRoute: async (routeName: string, config: Partial<RateLimitConfig>) => {
        const { data } = await axios.put<{ success: boolean; message?: string }>(
            `/api/admin/rate-limits/${routeName}`,
            config,
        );
        return data;
    },

    resetRoute: async (routeName: string) => {
        const { data } = await axios.delete<{ success: boolean; message?: string }>(
            `/api/admin/rate-limits/${routeName}`,
        );
        return data;
    },

    bulkUpdate: async (routes: Record<string, Record<string, unknown>>) => {
        const { data } = await axios.patch<{
            success: boolean;
            data?: { total_updated?: number };
            message?: string;
        }>('/api/admin/rate-limits/bulk', { routes });
        return data;
    },
};
