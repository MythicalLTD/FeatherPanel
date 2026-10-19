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

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { realtimeTopics } from '@/lib/realtime';
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

    const checkIsPublicNoAuthPage = useCallback(() => {
        if (typeof window === 'undefined') return false;
        const { pathname } = window.location;
        return (
            pathname === '/status' ||
            pathname.startsWith('/status/') ||
            pathname === '/knowledgebase' ||
            pathname.startsWith('/knowledgebase/') ||
            pathname === '/knowladgebase' ||
            pathname.startsWith('/knowladgebase/')
        );
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
        if (typeof window === 'undefined' || checkIsAuthPage() || checkIsPublicNoAuthPage()) {
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
            if (axiosError?.response?.status === 401 || axiosError?.response?.status === 400) {
                setNotifications([]);
            } else {
                if (!checkIsAuthPage() && !checkIsPublicNoAuthPage()) {
                    console.error('Failed to fetch notifications', error);
                }
            }
        } finally {
            setLoading(false);
        }
    }, [checkIsAuthPage, checkIsPublicNoAuthPage]);

    useEffect(() => {
        if (typeof window !== 'undefined' && !checkIsAuthPage() && !checkIsPublicNoAuthPage()) {
            fetchNotifications();
        } else {
            setLoading(false);
        }
    }, [fetchNotifications, checkIsAuthPage, checkIsPublicNoAuthPage]);

    // Admins creating / editing / deleting a notification push an event; the
    // 5-minute poll only runs while the live stream is unavailable.
    const liveEnabled = typeof window !== 'undefined' && !checkIsAuthPage() && !checkIsPublicNoAuthPage();
    useLiveRefresh({
        topics: [realtimeTopics.notifications],
        types: ['notifications.updated'],
        refresh: () => {
            if (!checkIsAuthPage()) void fetchNotifications();
        },
        pollMs: 5 * 60 * 1000,
        enabled: liveEnabled,
    });

    const dismissNotification = useCallback((id: number) => {
        setDismissedIds((prev) => {
            const next = [...prev, id];
            return next;
        });
    }, []);

    const activeNotifications = useMemo(
        () => notifications.filter((n) => !dismissedIds.includes(n.id)),
        [notifications, dismissedIds],
    );

    const contextValue = useMemo(
        () => ({
            notifications: activeNotifications,
            loading,
            dismissNotification,
            refreshNotifications: fetchNotifications,
        }),
        [activeNotifications, loading, dismissNotification, fetchNotifications],
    );

    return <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
