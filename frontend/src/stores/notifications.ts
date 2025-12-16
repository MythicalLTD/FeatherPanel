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

export interface Notification {
    id: number;
    title: string;
    message_markdown: string;
    type: 'info' | 'warning' | 'danger' | 'success' | 'error';
    is_dismissible: boolean;
    is_sticky: boolean;
    created_at: string;
    updated_at: string | null;
}

export const useNotificationsStore = defineStore('notifications', {
    state: () => ({
        notifications: [] as Notification[],
        loading: false,
        lastFetched: null as number | null,
        refreshInterval: null as ReturnType<typeof setInterval> | null,
    }),
    actions: {
        async fetchNotifications() {
            // Prevent multiple simultaneous fetches
            if (this.loading) {
                return;
            }

            this.loading = true;
            try {
                const response = await axios.get('/api/user/notifications');
                this.notifications = response.data.data.notifications || [];
                this.lastFetched = Date.now();
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
            } finally {
                this.loading = false;
            }
        },
        async dismissNotification(notificationId: number) {
            try {
                await axios.post(`/api/user/notifications/${notificationId}/dismiss`);
                // Remove from local state
                this.notifications = this.notifications.filter((n) => n.id !== notificationId);
            } catch (error) {
                console.warn('Failed to dismiss notification on backend:', error);
            }
        },
        startAutoRefresh(intervalMs = 5 * 60 * 1000) {
            // Clear existing interval if any
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }

            // Set up new interval
            this.refreshInterval = setInterval(() => {
                void this.fetchNotifications();
            }, intervalMs);
        },
        stopAutoRefresh() {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
        },
        clearNotifications() {
            this.notifications = [];
            this.stopAutoRefresh();
            this.lastFetched = null;
        },
    },
    getters: {
        unreadCount: (state): number => state.notifications.length,
    },
});
