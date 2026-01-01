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

import { defineStore } from 'pinia';
import axios from 'axios';

export interface Server {
    id: number;
    uuid: string;
    uuidShort: string;
    name: string;
    description?: string;
    status: string;
    memory: number;
    disk: number;
    cpu: number;
    swap: number;
    io: number;
    is_subuser?: boolean;
    subuser_permissions?: string[];
    subuser_id?: number | null;
    [key: string]: unknown;
}

export interface PaginationInfo {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    from: number;
    to: number;
}

export const useServersStore = defineStore('servers', {
    state: () => ({
        servers: [] as Server[],
        pagination: null as PaginationInfo | null,
        loading: false,
        lastFetched: null as number | null,
        cacheTimeout: 30 * 1000, // 30 seconds cache
    }),
    actions: {
        async fetchServers(params?: { page?: number; limit?: number; search?: string; view_all?: boolean }) {
            // Check if we have fresh cached data
            const now = Date.now();
            if (
                this.servers.length > 0 &&
                this.lastFetched &&
                now - this.lastFetched < this.cacheTimeout &&
                !params // Only use cache if no params (default list)
            ) {
                return;
            }

            // Prevent multiple simultaneous fetches
            if (this.loading) {
                return;
            }

            this.loading = true;
            try {
                const response = await axios.get('/api/user/servers', {
                    params: {
                        page: params?.page || 1,
                        limit: params?.limit || 10,
                        search: params?.search || '',
                        view_all: params?.view_all ? 'true' : 'false',
                    },
                });

                if (response.data.success) {
                    this.servers = response.data.data.servers || [];
                    this.pagination = response.data.data.pagination || null;
                    this.lastFetched = Date.now();
                }
            } catch (error) {
                console.error('Failed to fetch servers:', error);
            } finally {
                this.loading = false;
            }
        },
        getServerByUuid(uuidShort: string): Server | undefined {
            return this.servers.find((s) => s.uuidShort === uuidShort);
        },
        updateServer(uuidShort: string, updates: Partial<Server>) {
            const index = this.servers.findIndex((s) => s.uuidShort === uuidShort);
            if (index !== -1) {
                this.servers[index] = { ...this.servers[index], ...updates } as Server;
            }
        },
        clearCache() {
            this.servers = [];
            this.pagination = null;
            this.lastFetched = null;
        },
    },
    getters: {
        hasServers: (state): boolean => state.servers.length > 0,
    },
});
