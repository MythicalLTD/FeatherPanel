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

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axios from 'axios';
import type { Notification, NotificationsResponse } from '@/types/notification';

interface NotificationContextType {
    notifications: Notification[];
    loading: boolean;
    dismissNotification: (id: number) => void;
    refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [dismissedIds, setDismissedIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    const checkIsAuthPage = useCallback(() => {
        if (typeof window === 'undefined') return false;
        return window.location.pathname.startsWith('/auth');
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('featherpanel_dismissed_notifications');
            if (stored) {
                try {
                    setDismissedIds(JSON.parse(stored));
                } catch (e) {
                    console.error('Failed to parse dismissed notifications', e);
                }
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && dismissedIds.length > 0) {
            localStorage.setItem('featherpanel_dismissed_notifications', JSON.stringify(dismissedIds));
        }
    }, [dismissedIds]);

    const fetchNotifications = useCallback(async () => {
        if (typeof window === 'undefined' || checkIsAuthPage()) {
            setLoading(false);
            return;
        }

        try {
            const { data } = await axios.get<NotificationsResponse>('/api/user/notifications');
            if (data.success && data.data?.notifications) {
                setNotifications(data.data.notifications);
            }
        } catch (error) {
            const axiosError = error as { response?: { status?: number } };
            if (axiosError?.response?.status === 401) {
                setNotifications([]);
            } else {
                if (!checkIsAuthPage()) {
                    console.error('Failed to fetch notifications', error);
                }
            }
        } finally {
            setLoading(false);
        }
    }, [checkIsAuthPage]);

    useEffect(() => {
        if (typeof window !== 'undefined' && !checkIsAuthPage()) {
            fetchNotifications();

            const interval = setInterval(
                () => {
                    if (!checkIsAuthPage()) {
                        fetchNotifications();
                    }
                },
                5 * 60 * 1000,
            );
            return () => clearInterval(interval);
        } else {
            setLoading(false);
        }
    }, [fetchNotifications, checkIsAuthPage]);

    const dismissNotification = useCallback((id: number) => {
        setDismissedIds((prev) => {
            const next = [...prev, id];
            return next;
        });
    }, []);

    const activeNotifications = notifications.filter((n) => !dismissedIds.includes(n.id));

    return (
        <NotificationContext.Provider
            value={{
                notifications: activeNotifications,
                loading,
                dismissNotification,
                refreshNotifications: fetchNotifications,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
