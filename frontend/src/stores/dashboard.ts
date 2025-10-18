/*
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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

import { defineStore } from 'pinia';
import axios from 'axios';

export interface DashboardStats {
    users: number;
    nodes: number;
    spells: number;
    servers: number;
}

export interface CronItem {
    id: number;
    task_name: string;
    last_run_at: string | null;
    last_run_success: boolean;
    last_run_message: string | null;
    expected_interval_seconds: number;
    late: boolean;
}

export interface CronData {
    recent: CronItem[];
    summary: string | null;
}

export interface VersionInfo {
    id: number;
    version: string;
    type: string;
    release_name: string;
    description: string;
    min_supported_php: string;
    max_supported_php: string;
    is_security_release: boolean;
    changelog_fixed?: string[];
    changelog_added?: string[];
    changelog_removed?: string[];
    changelog_improved?: string[];
    changelog_updated?: string[];
    created_at: string;
    updated_at: string;
}

export interface VersionData {
    current: VersionInfo | null;
    latest: VersionInfo | null;
    update_available: boolean;
    last_checked: string;
}

export const useDashboardStore = defineStore('dashboard', {
    state: () => ({
        stats: null as DashboardStats | null,
        cron: null as CronData | null,
        versionInfo: null as VersionData | null,
        loaded: false,
        loading: false,
        error: null as string | null,
    }),
    actions: {
        async fetchDashboardStats() {
            // Prevent multiple simultaneous fetches
            if (this.loading) {
                return;
            }

            // Always fetch fresh data for now to ensure version info is loaded
            // TODO: Implement proper cache invalidation for version info

            this.loading = true;
            this.error = null;

            try {
                const res = await axios.get('/api/admin/dashboard');
                const json = res.data;

                if (json.success && json.data?.count) {
                    this.stats = json.data.count as DashboardStats;
                    this.cron = (json.data.cron ?? null) as CronData | null;
                    this.versionInfo = (json.data.version ?? null) as VersionData | null;
                    this.loaded = true;
                } else {
                    console.warn('Dashboard API response invalid:', json);
                    this.stats = null;
                    this.cron = null;
                    this.versionInfo = null;
                    this.loaded = false;
                    this.error = 'Invalid response from server';
                }
            } catch (e) {
                console.error('Failed to fetch dashboard stats:', e);
                this.stats = null;
                this.cron = null;
                this.versionInfo = null;
                this.loaded = false;
                this.error = 'Failed to fetch dashboard statistics';
            } finally {
                this.loading = false;
            }
        },
        clearStats() {
            this.stats = null;
            this.cron = null;
            this.versionInfo = null;
            this.loaded = false;
            this.error = null;
        },
    },
    getters: {
        hasStats: (state) => state.stats !== null,
        isLoading: (state) => state.loading,
        hasError: (state) => state.error !== null,
        cronRecent: (state): CronItem[] | null => state.cron?.recent ?? null,
        cronSummary: (state): string | null => state.cron?.summary ?? null,
        getVersionInfo: (state): VersionData | null => state.versionInfo,
    },
});
