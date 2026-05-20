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

import { X, Megaphone, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useTranslation } from '@/contexts/TranslationContext';
import type { Notification } from '@/types/notification';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export function AnnouncementBanner() {
    const { notifications, dismissNotification } = useNotifications();
    const { t } = useTranslation();

    if (notifications.length === 0) return null;

    const getTypeStyles = (type: Notification['type']) => {
        switch (type) {
            case 'success':
                return 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400';
            case 'warning':
                return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400';
            case 'error':
            case 'danger':
                return 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400';
            case 'info':
            default:
                return 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400';
        }
    };

    const getTypeIcon = (type: Notification['type']) => {
        switch (type) {
            case 'success':
                return CheckCircle;
            case 'warning':
                return AlertTriangle;
            case 'error':
            case 'danger':
                return AlertOctagon;
            case 'info':
            default:
                return Megaphone;
        }
    };

    return (
        <div className='mb-6 space-y-4'>
            {notifications.map((notification) => {
                const Icon = getTypeIcon(notification.type);
                const styles = getTypeStyles(notification.type);

                return (
                    <div
                        key={notification.id}
                        className={cn(
                            'relative overflow-hidden rounded-xl border p-4 shadow-sm transition-all',
                            styles,
                        )}
                    >
                        <div className='flex items-start justify-between gap-4'>
                            <div className='flex-1'>
                                <div className='mb-1 flex items-center gap-2'>
                                    <Icon className='h-5 w-5 opacity-80' />
                                    <h3 className='text-sm font-semibold tracking-wide uppercase opacity-90'>
                                        {notification.title}
                                    </h3>
                                </div>
                                <div className='prose prose-sm dark:prose-invert prose-p:my-0 prose-headings:my-1 prose-a:text-inherit prose-a:underline max-w-none pl-7 text-sm opacity-90'>
                                    <ReactMarkdown>{notification.message_markdown}</ReactMarkdown>
                                </div>
                            </div>

                            {notification.is_dismissible && !notification.is_sticky && (
                                <button
                                    onClick={() => dismissNotification(notification.id)}
                                    className='shrink-0 rounded-lg p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10'
                                    aria-label={t('common.dismiss')}
                                >
                                    <X className='h-4 w-4 opacity-70' />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
