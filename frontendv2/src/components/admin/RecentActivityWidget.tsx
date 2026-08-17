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

import React, { useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Activity, ArrowUpRight, Lock, User } from 'lucide-react';
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
            className='h-full'
            action={
                state !== 'forbidden' ? (
                    <Link
                        href='/admin/analytics/activity'
                        className='text-muted-foreground hover:text-primary flex items-center gap-1 text-[9px] font-black tracking-widest uppercase transition-colors md:text-[10px]'
                    >
                        {t('admin.activity.view_all')}
                        <ArrowUpRight className='h-3.5 w-3.5' />
                    </Link>
                ) : undefined
            }
        >
            {state === 'loading' && (
                <div className='space-y-3'>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className='flex animate-pulse items-center gap-3'>
                            <div className='bg-muted h-9 w-9 rounded-full' />
                            <div className='flex-1 space-y-2'>
                                <div className='bg-muted h-3 w-2/3 rounded' />
                                <div className='bg-muted h-2.5 w-1/3 rounded' />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {state === 'forbidden' && (
                <div className='flex flex-col items-center justify-center gap-3 py-10 text-center'>
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
                <div className='flex flex-col items-center justify-center gap-3 py-10 text-center'>
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
                            className='bg-secondary border-border/50 mt-1 rounded-xl border px-4 py-2 text-[10px] font-black tracking-widest uppercase transition-all hover:scale-105'
                        >
                            {t('admin.activity.retry')}
                        </button>
                    )}
                </div>
            )}

            {state === 'ready' && (
                <div className='space-y-1'>
                    {activities.map((item) => (
                        <div
                            key={item.id}
                            className='hover:bg-muted/15 flex items-start gap-3 rounded-xl px-1 py-2.5 transition-colors md:rounded-2xl'
                        >
                            <div
                                className={cn(
                                    'bg-primary/10 text-primary border-primary/20 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border text-[10px] font-black',
                                )}
                                style={
                                    item.role_color
                                        ? { borderColor: `${item.role_color}55`, color: item.role_color }
                                        : undefined
                                }
                            >
                                {item.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.avatar} alt='' className='h-full w-full object-cover' />
                                ) : (
                                    initials(item.username)
                                )}
                            </div>
                            <div className='min-w-0 flex-1 space-y-0.5'>
                                <p className='truncate text-xs font-bold md:text-sm'>
                                    <span className='text-foreground'>
                                        {item.username || t('admin.activity.unknown_user')}
                                    </span>
                                    <span className='text-muted-foreground font-medium'> · </span>
                                    <span className='text-muted-foreground font-semibold'>{item.name}</span>
                                </p>
                                <div className='text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-bold uppercase opacity-70 md:text-[10px]'>
                                    <span>
                                        {formatRelativeTime(item.created_at, {
                                            ...dateOpts,
                                            relativeStyle: 'long',
                                        })}
                                    </span>
                                    {item.role_name && (
                                        <>
                                            <span aria-hidden>·</span>
                                            <span style={item.role_color ? { color: item.role_color } : undefined}>
                                                {item.role_name}
                                            </span>
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
