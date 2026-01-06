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

'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import api from '@/lib/api';
import { ActivityTrendChart, ActivityBreakdownChart } from '@/components/admin/analytics/ActivityCharts';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Activity, Clock, Calendar } from 'lucide-react';

interface ActivityStats {
    total: number;
    today: number;
    this_week: number;
    this_month: number;
    active_users_today: number;
    peak_hour: number;
}

interface ActivityTrend {
    date: string;
    count: number;
}

interface ActivityBreakdown {
    activity_type: string;
    count: number;
}

export default function ActivityAnalyticsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [stats, setStats] = useState<ActivityStats | null>(null);
    const [trend, setTrend] = useState<ActivityTrend[]>([]);
    const [breakdown, setBreakdown] = useState<ActivityBreakdown[]>([]);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [statsRes, trendRes, breakdownRes] = await Promise.all([
                api.get('/admin/analytics/activity/stats'),
                api.get('/admin/analytics/activity/trend'),
                api.get('/admin/analytics/activity/breakdown'),
            ]);

            setStats(statsRes.data.data);
            setTrend(trendRes.data.data.data || []);
            // Map API 'name' to 'activity_type' for the chart
            setBreakdown(
                (breakdownRes.data.data.activities || []).map((a: { name: string; count: number }) => ({
                    activity_type: a.name,
                    count: a.count,
                })),
            );
        } catch (err) {
            console.error('Failed to fetch activity analytics:', err);
            setError(t('admin.analytics.activity.error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className='flex items-center justify-center min-h-[400px]'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='flex flex-col items-center justify-center min-h-[400px] text-center'>
                <p className='text-red-500 mb-4'>{error}</p>
                <button
                    onClick={fetchData}
                    className='px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity'
                >
                    {t('admin.analytics.activity.retry')}
                </button>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.analytics.activity.title')}
                description={t('admin.analytics.activity.subtitle')}
                icon={Activity}
            />

            {/* Overview Stats */}
            {stats && (
                <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                    <ResourceCard
                        title={stats.today.toString()}
                        subtitle={t('admin.analytics.activity.today')}
                        description={t('admin.analytics.activity.active_users', {
                            count: String(stats.active_users_today),
                        })}
                        icon={Activity}
                        className='shadow-none! bg-card/50 backdrop-blur-sm'
                    />
                    <ResourceCard
                        title={stats.this_week.toString()}
                        subtitle={t('admin.analytics.activity.this_week')}
                        description={t('admin.analytics.activity.last_7_days')}
                        icon={Calendar}
                        className='shadow-none! bg-card/50 backdrop-blur-sm'
                    />
                    <ResourceCard
                        title={stats.this_month.toString()}
                        subtitle={t('admin.analytics.activity.this_month')}
                        description={t('admin.analytics.activity.last_30_days')}
                        icon={Calendar}
                        className='shadow-none! bg-card/50 backdrop-blur-sm'
                    />
                    <ResourceCard
                        title={`${stats.peak_hour}:00`}
                        subtitle={t('admin.analytics.activity.peak_hour')}
                        description={t('admin.analytics.activity.most_active_time')}
                        icon={Clock}
                        className='shadow-none! bg-card/50 backdrop-blur-sm'
                    />
                </div>
            )}

            {/* Charts Section 1 */}
            <div className='grid gap-4 md:grid-cols-1 lg:grid-cols-3'>
                <ActivityTrendChart data={trend} />
                <ActivityBreakdownChart data={breakdown} />
            </div>
        </div>
    );
}
