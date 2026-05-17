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

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/featherui/Input';
import { Clock, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { formatRelativeTime } from '@/lib/dateUtils';
import type { Activity } from '@/types/activity';

interface PaginationInfo {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    from: number;
    to: number;
}

export default function ActivityTab() {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchActivities = useCallback(
        async (page: number = 1) => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page: page.toString(),
                    limit: '10',
                });
                if (searchQuery.trim()) {
                    params.append('search', searchQuery.trim());
                }

                const { data } = await axios.get(`/api/user/activities?${params.toString()}`);
                if (data.success && data.data) {
                    setActivities(data.data.activities || []);
                    setPagination(data.data.pagination);
                    setCurrentPage(page);
                }
            } catch (error) {
                console.error('Error fetching activities:', error);
                toast.error(t('account.activity.loadFailed'));
            } finally {
                setLoading(false);
            }
        },
        [searchQuery, t],
    );

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (searchQuery !== undefined) {
                fetchActivities(1);
            }
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchQuery, fetchActivities]);

    const formatDate = (dateString: string): string => formatRelativeTime(dateString, dateOpts);

    const visiblePages = () => {
        if (!pagination) return [];
        const pages: number[] = [];
        const total = pagination.total_pages;
        const current = pagination.current_page;

        pages.push(1);
        for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
            if (!pages.includes(i)) pages.push(i);
        }
        if (total > 1 && !pages.includes(total)) {
            pages.push(total);
        }
        return pages.sort((a, b) => a - b);
    };

    if (loading && activities.length === 0) {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='flex items-center gap-3'>
                    <div className='border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent'></div>
                    <span className='text-muted-foreground'>{t('account.activity.loading')}</span>
                </div>
            </div>
        );
    }

    return (
        <div className='space-y-5'>
            <div className='border-border/50 bg-muted/20 rounded-xl border p-4'>
                <h3 className='text-foreground text-lg font-semibold'>{t('account.activity.title')}</h3>
                <p className='text-muted-foreground mt-1 text-sm'>{t('account.activity.description')}</p>
            </div>

            <div className='relative'>
                <Input
                    type='text'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('account.activity.searchPlaceholder')}
                />
            </div>

            <div className='flex items-center justify-between'>
                <p className='text-muted-foreground text-sm'>
                    {pagination ? (
                        <span>
                            {t('account.activity.showingActivities', {
                                from: pagination.from.toString(),
                                to: pagination.to.toString(),
                                total: pagination.total_records.toString(),
                            })}
                        </span>
                    ) : (
                        <span>{t('account.activity.totalActivities', { count: activities.length.toString() })}</span>
                    )}
                </p>
                <Button variant='outline' size='sm' onClick={() => fetchActivities(currentPage)}>
                    <RefreshCw className='mr-2 h-4 w-4' />
                    {t('account.activity.refresh')}
                </Button>
            </div>

            {pagination && pagination.total_pages > 1 && (
                <div className='border-border bg-card/50 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!pagination.has_prev}
                        onClick={() => fetchActivities(pagination.current_page - 1)}
                        className='gap-1.5'
                    >
                        <ChevronLeft className='h-4 w-4' />
                        {t('common.previous')}
                    </Button>
                    <span className='text-sm font-medium'>
                        {pagination.current_page} / {pagination.total_pages}
                    </span>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!pagination.has_next}
                        onClick={() => fetchActivities(pagination.current_page + 1)}
                        className='gap-1.5'
                    >
                        {t('common.next')}
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            {activities.length > 0 ? (
                <ActivityFeed activities={activities} formatDate={formatDate} />
            ) : (
                <div className='py-12 text-center'>
                    <Clock className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                    <h4 className='text-foreground mb-2 text-sm font-semibold'>
                        {searchQuery ? t('account.activity.noSearchResults') : t('account.activity.noActivities')}
                    </h4>
                    <p className='text-muted-foreground text-sm'>
                        {searchQuery
                            ? t('account.activity.tryDifferentSearch')
                            : t('account.activity.emptyDescription')}
                    </p>
                </div>
            )}

            {pagination && pagination.total_pages > 1 && (
                <div className='flex items-center justify-center gap-1'>
                    {visiblePages().map((page) => (
                        <Button
                            key={page}
                            variant={page === pagination.current_page ? 'default' : 'outline'}
                            size='sm'
                            onClick={() => fetchActivities(page)}
                        >
                            {page}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
