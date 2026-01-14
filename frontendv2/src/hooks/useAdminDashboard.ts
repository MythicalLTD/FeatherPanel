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
