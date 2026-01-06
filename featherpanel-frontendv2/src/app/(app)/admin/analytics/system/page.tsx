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
import { SimplePieChart } from '@/components/admin/analytics/SharedCharts';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, CheckCircle, XCircle, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MailQueueStats {
    total_queued: number;
    total_sent: number;
    total_failed: number;
    success_rate: number;
    recent_queued: {
        id: number;
        subject: string;
        recipient: string;
        status: string;
        attempts: number;
        created_at: string;
    }[];
}

export default function SystemAnalyticsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [stats, setStats] = useState<MailQueueStats | null>(null);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/admin/analytics/mail-queue/stats'); // Removed double /api and fixed path
            setStats(res.data.data);
        } catch (err) {
            console.error('Failed to fetch system analytics:', err);
            setError(t('admin.analytics.system.error'));
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
                title={t('admin.analytics.system.title')}
                description={t('admin.analytics.system.subtitle')}
                icon={Activity}
            />

            {stats && (
                <>
                    {/* Overview Stats */}
                    <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                        <ResourceCard
                            title={stats.total_queued.toString()}
                            subtitle={t('admin.analytics.system.queued')}
                            description={t('admin.analytics.system.pending_emails')}
                            icon={Mail}
                            className='shadow-none! bg-card/50 backdrop-blur-sm'
                        />
                        <ResourceCard
                            title={stats.total_sent.toString()}
                            subtitle={t('admin.analytics.system.sent')}
                            description={t('admin.analytics.system.delivered')}
                            icon={CheckCircle}
                            className='shadow-none! bg-card/50 backdrop-blur-sm'
                        />
                        <ResourceCard
                            title={stats.total_failed.toString()}
                            subtitle={t('admin.analytics.system.failed')}
                            description={t('admin.analytics.system.errors')}
                            icon={XCircle}
                            className='shadow-none! bg-card/50 backdrop-blur-sm'
                        />
                        <ResourceCard
                            title={`${stats.success_rate}%`}
                            subtitle={t('admin.analytics.system.success_rate')}
                            description={t('admin.analytics.system.delivery_rate')}
                            icon={Activity}
                            className='shadow-none! bg-card/50 backdrop-blur-sm'
                        />
                    </div>

                    <div className='grid gap-4 grid-cols-1 md:grid-cols-3'>
                        <div className='md:col-span-1'>
                            <SimplePieChart
                                title={t('admin.analytics.system.queue_status')}
                                description={t('admin.analytics.system.queue_status_desc')}
                                data={[
                                    { name: t('admin.analytics.system.queued'), value: stats.total_queued },
                                    { name: t('admin.analytics.system.sent'), value: stats.total_sent },
                                    { name: t('admin.analytics.system.failed'), value: stats.total_failed },
                                ]}
                            />
                        </div>

                        <Card className='md:col-span-2 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm'>
                            <CardHeader>
                                <CardTitle>{t('admin.analytics.system.recent_activity')}</CardTitle>
                                <CardDescription>{t('admin.analytics.system.recent_activity_desc')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {stats.recent_queued.length > 0 ? (
                                    <div className='space-y-6'>
                                        {stats.recent_queued.map((item) => (
                                            <div
                                                key={item.id}
                                                className='flex items-center justify-between pb-4 border-b last:border-0 last:pb-0'
                                            >
                                                <div className='space-y-1'>
                                                    <p className='text-sm font-medium'>{item.subject}</p>
                                                    <p className='text-xs text-muted-foreground'>{item.recipient}</p>
                                                </div>
                                                <div className='text-right'>
                                                    <span
                                                        className={`text-xs px-2 py-1 rounded-full ${
                                                            item.status === 'sent'
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                                : item.status === 'failed'
                                                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                        }`}
                                                    >
                                                        {t(`admin.analytics.system.status.${item.status}`) ||
                                                            item.status}
                                                    </span>
                                                    <p className='text-xs text-muted-foreground mt-1'>
                                                        {formatDistanceToNow(new Date(item.created_at), {
                                                            addSuffix: true,
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className='flex justify-center py-8 text-muted-foreground'>
                                        {t('admin.analytics.system.no_activity')}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
