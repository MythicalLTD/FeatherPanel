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

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import api from '@/lib/api';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { SimplePieChart } from '@/components/admin/analytics/SharedCharts';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { PageHeader } from '@/components/featherui/PageHeader';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, CheckCircle, XCircle, Activity, Bot, KeyRound, ShieldCheck, UserCircle } from 'lucide-react';
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

interface FeatureAdoptionStats {
    chatbot_conversations: number;
    chatbot_messages: number;
    chatbot_active_users_30d: number;
    avg_messages_per_conversation: number;
    api_clients: number;
    oauth2_authorizations: number;
    oidc_enabled_providers: number;
}

export default function SystemAnalyticsPage() {
    const { t } = useTranslation();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-analytics-system');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [stats, setStats] = useState<MailQueueStats | null>(null);
    const [featureStats, setFeatureStats] = useState<FeatureAdoptionStats | null>(null);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [mailRes, featureRes] = await Promise.all([
                api.get('/admin/analytics/mail-queue/stats'),
                api.get('/admin/analytics/system/feature-adoption'),
            ]);
            setStats(mailRes.data.data);
            setFeatureStats(featureRes.data.data);
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

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    if (loading) {
        return (
            <div className='flex min-h-[400px] items-center justify-center'>
                <div className='border-primary h-8 w-8 animate-spin rounded-full border-b-2'></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='flex min-h-[400px] flex-col items-center justify-center text-center'>
                <p className='mb-4 text-red-500'>{error}</p>
                <button
                    onClick={fetchData}
                    className='bg-primary text-primary-foreground rounded-md px-4 py-2 transition-opacity hover:opacity-90'
                >
                    {t('admin.analytics.activity.retry')}
                </button>
            </div>
        );
    }

    return (
        <>
            <WidgetRenderer widgets={getWidgets('admin-analytics-system', 'top-of-page')} />
            <div className='space-y-6'>
                <PageHeader
                    title={t('admin.analytics.system.title')}
                    description={t('admin.analytics.system.subtitle')}
                    icon={Activity}
                />

                {stats && (
                    <>
                        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                            <ResourceCard
                                title={stats.total_queued.toString()}
                                subtitle={t('admin.analytics.system.queued')}
                                description={t('admin.analytics.system.pending_emails')}
                                icon={Mail}
                                className='bg-card/50 shadow-none! backdrop-blur-sm'
                            />
                            <ResourceCard
                                title={stats.total_sent.toString()}
                                subtitle={t('admin.analytics.system.sent')}
                                description={t('admin.analytics.system.delivered')}
                                icon={CheckCircle}
                                className='bg-card/50 shadow-none! backdrop-blur-sm'
                            />
                            <ResourceCard
                                title={stats.total_failed.toString()}
                                subtitle={t('admin.analytics.system.failed')}
                                description={t('admin.analytics.system.errors')}
                                icon={XCircle}
                                className='bg-card/50 shadow-none! backdrop-blur-sm'
                            />
                            <ResourceCard
                                title={`${stats.success_rate}%`}
                                subtitle={t('admin.analytics.system.success_rate')}
                                description={t('admin.analytics.system.delivery_rate')}
                                icon={Activity}
                                className='bg-card/50 shadow-none! backdrop-blur-sm'
                            />
                        </div>

                        {featureStats && (
                            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                                <ResourceCard
                                    title={featureStats.chatbot_conversations.toString()}
                                    subtitle={t('admin.analytics.system.chat_conversations')}
                                    description={t('admin.analytics.system.messages_count', {
                                        count: featureStats.chatbot_messages.toString(),
                                    })}
                                    icon={Bot}
                                    className='bg-card/50 shadow-none! backdrop-blur-sm'
                                />
                                <ResourceCard
                                    title={featureStats.chatbot_active_users_30d.toString()}
                                    subtitle={t('admin.analytics.system.chat_users_30d')}
                                    description={t('admin.analytics.system.avg_messages_per_conversation', {
                                        count: featureStats.avg_messages_per_conversation.toString(),
                                    })}
                                    icon={UserCircle}
                                    className='bg-card/50 shadow-none! backdrop-blur-sm'
                                />
                                <ResourceCard
                                    title={featureStats.api_clients.toString()}
                                    subtitle={t('admin.analytics.system.api_clients')}
                                    description={t('admin.analytics.system.oauth2_authorizations', {
                                        count: featureStats.oauth2_authorizations.toString(),
                                    })}
                                    icon={KeyRound}
                                    className='bg-card/50 shadow-none! backdrop-blur-sm'
                                />
                                <ResourceCard
                                    title={featureStats.oidc_enabled_providers.toString()}
                                    subtitle={t('admin.analytics.system.enabled_oidc_providers')}
                                    description={t('admin.analytics.system.identity_providers_configured')}
                                    icon={ShieldCheck}
                                    className='bg-card/50 shadow-none! backdrop-blur-sm'
                                />
                            </div>
                        )}

                        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
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

                            <Card className='border-border/50 bg-card/50 shadow-sm backdrop-blur-sm md:col-span-2'>
                                <CardHeader>
                                    <CardTitle>{t('admin.analytics.system.recent_activity')}</CardTitle>
                                    <CardDescription>
                                        {t('admin.analytics.system.recent_activity_desc')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {stats.recent_queued.length > 0 ? (
                                        <div className='space-y-6'>
                                            {stats.recent_queued.map((item) => {
                                                const statusKey = item.status === 'pending' ? 'queued' : item.status;
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className='flex items-center justify-between border-b pb-4 last:border-0 last:pb-0'
                                                    >
                                                        <div className='space-y-1'>
                                                            <p className='text-sm font-medium'>{item.subject}</p>
                                                            <p className='text-muted-foreground text-xs'>
                                                                {item.recipient}
                                                            </p>
                                                        </div>
                                                        <div className='text-right'>
                                                            <span
                                                                className={`rounded-full px-2 py-1 text-xs ${
                                                                    item.status === 'sent'
                                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                                        : item.status === 'failed'
                                                                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                                }`}
                                                            >
                                                                {t(`admin.analytics.system.status.${statusKey}`) ||
                                                                    item.status}
                                                            </span>
                                                            <p className='text-muted-foreground mt-1 text-xs'>
                                                                {formatDistanceToNow(new Date(item.created_at), {
                                                                    addSuffix: true,
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className='text-muted-foreground flex justify-center py-8'>
                                            {t('admin.analytics.system.no_activity')}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>
            <WidgetRenderer widgets={getWidgets('admin-analytics-system', 'bottom-of-page')} />
        </>
    );
}
