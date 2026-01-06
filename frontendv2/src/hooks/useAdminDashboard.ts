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

'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface AdminDashboardData {
    count: {
        users: number;
        nodes: number;
        spells: number;
        servers: number;
    };
    cron: {
        recent: {
            id: number;
            task_name: string;
            last_run_at: string | null;
            last_run_success: boolean;
            late: boolean;
        }[];
        summary: string | null;
    };
    version: {
        current: {
            version: string;
            type: string;
            release_name: string;
            release_description?: string;
            php_version?: string;
            changelog_added?: string[];
            changelog_fixed?: string[];
            changelog_improved?: string[];
            changelog_updated?: string[];
            changelog_removed?: string[];
        } | null;
        latest: {
            version: string;
            type: string;
            release_description?: string;
            changelog_added?: string[];
            changelog_fixed?: string[];
            changelog_improved?: string[];
            changelog_updated?: string[];
            changelog_removed?: string[];
        } | null;
        update_available: boolean;
        last_checked: string | null;
    };
}

export function useAdminDashboard() {
    const [data, setData] = useState<AdminDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/dashboard', {
                withCredentials: true,
            });
            if (response.data.success) {
                setData(response.data.data);
            } else {
                setError(response.data.message || 'Failed to fetch dashboard data');
            }
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || err.message);
            } else {
                setError('An unexpected error occurred');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    return { data, loading, error, refresh: fetchDashboard };
}
