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

import { Bell, X } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useFeatherOs } from './FeatherOsContext';
import { MENU_BAR_HEIGHT } from './types';

export function NotificationCenter() {
    const { t } = useTranslation();
    const { notificationsOpen, setNotificationsOpen, osNotifications, dismissNotification, clearNotifications } =
        useFeatherOs();
    if (!notificationsOpen) return null;

    return (
        <>
            <button
                type='button'
                aria-label={t('common.close')}
                className='fixed inset-0 z-[9100] bg-black/20'
                onClick={() => setNotificationsOpen(false)}
            />
            <aside
                className='fos-notif fos-sheet fixed top-0 right-0 z-[9101] flex h-full w-[360px] max-w-[90vw] flex-col rounded-none border-y-0 border-r-0'
                style={{ paddingTop: MENU_BAR_HEIGHT }}
            >
                <div className='fos-notif-header flex h-11 items-center gap-2 px-3'>
                    <Bell className='h-4 w-4 opacity-70' />
                    <span className='flex-1 text-[13px] font-semibold'>{t('featheros.notifications.title')}</span>
                    {osNotifications.length > 0 && (
                        <button
                            type='button'
                            className='text-[11px] text-[#0a84ff] hover:underline'
                            onClick={clearNotifications}
                        >
                            {t('featheros.notifications.clear')}
                        </button>
                    )}
                </div>
                <div className='fos-scroll min-h-0 flex-1 overflow-auto p-2'>
                    {osNotifications.length === 0 && (
                        <p className='p-6 text-center text-[12px] opacity-50'>{t('featheros.notifications.empty')}</p>
                    )}
                    {osNotifications.map((n) => (
                        <div key={n.id} className='fos-notif-card mb-2 rounded-[12px] p-3'>
                            <div className='flex items-start gap-2'>
                                <div className='min-w-0 flex-1'>
                                    <div className='text-[13px] font-medium'>{n.title}</div>
                                    {n.body && <div className='mt-0.5 text-[11px] opacity-60'>{n.body}</div>}
                                    <div className='mt-1 text-[10px] opacity-40'>{new Date(n.at).toLocaleString()}</div>
                                </div>
                                <button
                                    type='button'
                                    className='fos-notif-dismiss rounded-md p-0.5'
                                    onClick={() => dismissNotification(n.id)}
                                    aria-label={t('common.close')}
                                >
                                    <X className='h-3.5 w-3.5' />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>
        </>
    );
}
