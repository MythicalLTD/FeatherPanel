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

import { AdminWidgetLoading } from './AdminWidgetLoading';

import React, { useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Activity, Lock, User } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { useTranslation } from '@/contexts/TranslationContext';
import { formatRelativeTime } from '@/lib/dateUtils';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { cn } from '@/lib/utils';
import { useAdminWidgetList } from '@/hooks/useAdminWidgetList';

interface ActivityItem {
    id: number;
    name: string;
    context?: string | null;
    ip_address?: string | null;
    created_at: string;
    username?: string | null;
    email?: string | null;
    avatar?: string | null;
    role_name?: string | null;
    role_color?: string | null;
}

function initials(name?: string | null) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export function RecentActivityWidget() {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();

    const fetchActivities = useCallback(
        () =>
            axios.get('/api/admin/analytics/activity/recent', {
                params: { limit: 8 },
                withCredentials: true,
            }),
        [],
    );
    const extractActivities = useCallback(
        (data: unknown) => (data as { activities?: ActivityItem[] } | undefined)?.activities || [],
        [],
    );
    const {
        items: activities,
        state,
        retry: retryFetchActivities,
    } = useAdminWidgetList(fetchActivities, extractActivities);

    return (
        <PageCard
            title={t('admin.activity.title')}
            description={t('admin.activity.description')}
            icon={Activity}
            className='space-y-4 p-4 sm:p-5 [&>div:first-child]:flex-wrap [&>div:first-child]:gap-3 [&>div:first-child]:pb-4'
            action={
                state !== 'forbidden' ? (
                    <Link
                        href='/admin/analytics/activity'
                        className='text-muted-foreground hover:text-foreground hover:bg-accent inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-medium transition-colors'
                    >
                        {t('admin.activity.view_all')}
                    </Link>
                ) : undefined
            }
        >
            {state === 'loading' && <AdminWidgetLoading label={t('admin.activity.title')} />}

            {state === 'forbidden' && (
                <div className='flex flex-col items-center justify-center gap-3 py-3 text-center'>
                    <div className='bg-muted/30 text-muted-foreground flex h-12 w-12 items-center justify-center rounded-2xl'>
                        <Lock className='h-5 w-5' />
                    </div>
                    <p className='text-sm font-bold'>{t('admin.activity.no_permission_title')}</p>
                    <p className='text-muted-foreground max-w-xs text-xs font-medium'>
                        {t('admin.activity.no_permission_desc')}
                    </p>
                </div>
            )}

            {(state === 'empty' || state === 'error') && (
                <div className='flex flex-col items-center justify-center gap-3 py-3 text-center'>
                    <div className='bg-muted/30 text-muted-foreground flex h-12 w-12 items-center justify-center rounded-2xl'>
                        <User className='h-5 w-5' />
                    </div>
                    <p className='text-sm font-bold'>
                        {state === 'error' ? t('admin.activity.error_title') : t('admin.activity.empty_title')}
                    </p>
                    <p className='text-muted-foreground max-w-xs text-xs font-medium'>
                        {state === 'error' ? t('admin.activity.error_desc') : t('admin.activity.empty_desc')}
                    </p>
                    {state === 'error' && (
                        <button
                            type='button'
                            onClick={retryFetchActivities}
                            className='bg-secondary hover:bg-accent mt-1 min-h-11 rounded-lg px-4 py-2 text-sm font-medium transition-colors'
                        >
                            {t('admin.activity.retry')}
                        </button>
                    )}
                </div>
            )}

            {state === 'ready' && (
                <div className='divide-border divide-y'>
                    {activities.map((item) => (
                        <div key={item.id} className='flex items-start gap-3 py-3.5'>
                            <div
                                className={cn(
                                    'bg-muted text-foreground flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-medium',
                                )}
                            >
                                {item.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.avatar} alt='' className='h-full w-full object-cover' />
                                ) : (
                                    initials(item.username)
                                )}
                            </div>
                            <div className='min-w-0 flex-1 space-y-0.5'>
                                <p className='text-sm font-medium wrap-break-word'>
                                    <span className='text-foreground'>
                                        {item.username || t('admin.activity.unknown_user')}
                                    </span>
                                    <span className='text-muted-foreground font-medium'> · </span>
                                    <span className='text-muted-foreground font-normal'>{item.name}</span>
                                </p>
                                <div className='text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-relaxed'>
                                    <span>
                                        {formatRelativeTime(item.created_at, {
                                            ...dateOpts,
                                            relativeStyle: 'long',
                                        })}
                                    </span>
                                    {item.role_name && (
                                        <>
                                            <span aria-hidden>·</span>
                                            <span>{item.role_name}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </PageCard>
    );
}
