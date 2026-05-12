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
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { toast } from 'sonner';
import axios from 'axios';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
} from 'recharts';
import { Globe, Loader2, Users, TrendingUp, Languages } from 'lucide-react';

interface LanguageStat {
    locale: string;
    name: string;
    user_count: number;
    percentage: number;
}

interface LanguageTrend {
    locale: string;
    name: string;
    month: string;
    count: number;
}

const COLORS = [
    '#3b82f6',
    '#ef4444',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#f97316',
    '#84cc16',
    '#6366f1',
    '#14b8a6',
    '#a855f7',
    '#22c55e',
    '#eab308',
    '#f43f5e',
];

export default function LanguageAnalyticsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [languages, setLanguages] = useState<LanguageStat[]>([]);
    const [trends, setTrends] = useState<LanguageTrend[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, trendsRes] = await Promise.all([
                axios.get('/api/admin/analytics/languages'),
                axios.get('/api/admin/analytics/languages/trends'),
            ]);

            if (statsRes.data?.success) {
                setLanguages(statsRes.data.data.languages);
                setTotalUsers(statsRes.data.data.total_users);
            }
            if (trendsRes.data?.success) {
                setTrends(trendsRes.data.data.trends);
            }
        } catch (error) {
            console.error(error);
            toast.error(t('admin.analytics.languages.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Prepare trend data for line chart
    const trendData = trends.reduce(
        (acc, trend) => {
            const existing = acc.find((item) => item.month === trend.month);
            if (existing) {
                existing[trend.locale] = trend.count;
            } else {
                acc.push({ month: trend.month, [trend.locale]: trend.count });
            }
            return acc;
        },
        [] as Array<Record<string, string | number>>,
    );

    const topLanguages = languages.slice(0, 5);
    const otherCount = languages.slice(5).reduce((sum, lang) => sum + lang.user_count, 0);

    const pieData =
        otherCount > 0
            ? [
                  ...topLanguages,
                  {
                      locale: 'other',
                      name: t('admin.analytics.languages.other'),
                      user_count: otherCount,
                      percentage: 0,
                  },
              ]
            : topLanguages;

    if (loading) {
        return (
            <div className='flex h-[50vh] items-center justify-center'>
                <Loader2 className='text-primary h-8 w-8 animate-spin' />
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.analytics.languages.title')}
                description={t('admin.analytics.languages.subtitle')}
                icon={Globe}
            />

            {/* Stats Overview */}
            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                <PageCard className='flex items-center gap-4'>
                    <div className='bg-primary/10 rounded-xl p-3'>
                        <Users className='text-primary h-6 w-6' />
                    </div>
                    <div>
                        <div className='text-2xl font-bold'>{totalUsers.toLocaleString()}</div>
                        <div className='text-muted-foreground text-sm'>
                            {t('admin.analytics.languages.total_users')}
                        </div>
                    </div>
                </PageCard>

                <PageCard className='flex items-center gap-4'>
                    <div className='bg-primary/10 rounded-xl p-3'>
                        <Languages className='text-primary h-6 w-6' />
                    </div>
                    <div>
                        <div className='text-2xl font-bold'>{languages.length}</div>
                        <div className='text-muted-foreground text-sm'>
                            {t('admin.analytics.languages.total_languages')}
                        </div>
                    </div>
                </PageCard>

                <PageCard className='flex items-center gap-4'>
                    <div className='bg-primary/10 rounded-xl p-3'>
                        <TrendingUp className='text-primary h-6 w-6' />
                    </div>
                    <div>
                        <div className='text-2xl font-bold'>{languages[0]?.name || '-'}</div>
                        <div className='text-muted-foreground text-sm'>
                            {t('admin.analytics.languages.top_language')}
                        </div>
                    </div>
                </PageCard>
            </div>

            {/* Charts */}
            <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                {/* Pie Chart */}
                <PageCard title={t('admin.analytics.languages.distribution')}>
                    <div className='h-[300px]'>
                        <ResponsiveContainer width='100%' height='100%'>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx='50%'
                                    cy='50%'
                                    labelLine={false}
                                    label={({ name, value }: { name?: string; value?: number }) =>
                                        `${name || 'Unknown'}: ${value || 0}`
                                    }
                                    outerRadius={100}
                                    fill='#8884d8'
                                    dataKey='user_count'
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </PageCard>

                {/* Bar Chart */}
                <PageCard title={t('admin.analytics.languages.breakdown')}>
                    <div className='h-[300px]'>
                        <ResponsiveContainer width='100%' height='100%'>
                            <BarChart data={languages.slice(0, 10)} layout='vertical'>
                                <CartesianGrid strokeDasharray='3 3' />
                                <XAxis type='number' />
                                <YAxis dataKey='name' type='category' width={80} />
                                <Tooltip />
                                <Bar dataKey='user_count' fill='#3b82f6' />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </PageCard>
            </div>

            {/* Language List */}
            <PageCard title={t('admin.analytics.languages.all_languages')}>
                <div className='space-y-2'>
                    {languages.map((language, index) => (
                        <div key={language.locale} className='bg-muted/50 flex items-center gap-4 rounded-lg p-3'>
                            <div
                                className='h-4 w-4 shrink-0 rounded-full'
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <div className='min-w-0 flex-1'>
                                <div className='flex items-center gap-2'>
                                    <span className='font-medium'>{language.name}</span>
                                    <span className='text-muted-foreground text-sm'>({language.locale})</span>
                                </div>
                            </div>
                            <div className='text-right'>
                                <div className='font-medium'>{language.user_count.toLocaleString()}</div>
                                <div className='text-muted-foreground text-sm'>{language.percentage}%</div>
                            </div>
                            <div className='bg-muted h-2 w-32 rounded-full'>
                                <div
                                    className='h-2 rounded-full transition-all'
                                    style={{
                                        width: `${language.percentage}%`,
                                        backgroundColor: COLORS[index % COLORS.length],
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </PageCard>

            {/* Trend Chart */}
            {trendData.length > 0 && (
                <PageCard title={t('admin.analytics.languages.trends')}>
                    <div className='h-[300px]'>
                        <ResponsiveContainer width='100%' height='100%'>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray='3 3' />
                                <XAxis dataKey='month' />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {topLanguages.slice(0, 5).map((lang, index) => (
                                    <Line
                                        key={lang.locale}
                                        type='monotone'
                                        dataKey={lang.locale}
                                        name={lang.name}
                                        stroke={COLORS[index % COLORS.length]}
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </PageCard>
            )}
        </div>
    );
}
