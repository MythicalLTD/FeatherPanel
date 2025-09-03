import { defineStore } from 'pinia';
import axios from 'axios';

export interface DashboardStats {
    users: number;
    nodes: number;
    spells: number;
    servers: number;
}

export const useDashboardStore = defineStore('dashboard', {
    state: () => ({
        stats: null as DashboardStats | null,
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

            // Return cached stats if already loaded
            if (this.loaded && this.stats) {
                return;
            }

            this.loading = true;
            this.error = null;

            try {
                const res = await axios.get('/api/admin/dashboard');
                const json = res.data;

                if (json.success && json.data?.count) {
                    this.stats = json.data.count as DashboardStats;
                    this.loaded = true;
                } else {
                    console.warn('Dashboard API response invalid:', json);
                    this.stats = null;
                    this.loaded = false;
                    this.error = 'Invalid response from server';
                }
            } catch (e) {
                console.error('Failed to fetch dashboard stats:', e);
                this.stats = null;
                this.loaded = false;
                this.error = 'Failed to fetch dashboard statistics';
            } finally {
                this.loading = false;
            }
        },
        clearStats() {
            this.stats = null;
            this.loaded = false;
            this.error = null;
        },
    },
    getters: {
        hasStats: (state) => state.stats !== null,
        isLoading: (state) => state.loading,
        hasError: (state) => state.error !== null,
    },
});
