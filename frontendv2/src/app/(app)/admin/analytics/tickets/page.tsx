/*
This file is part of FeatherPanel.
*/

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
import api from '@/lib/api';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { PageHeader } from '@/components/featherui/PageHeader';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { SimplePieChart, SimpleBarChart } from '@/components/admin/analytics/SharedCharts';
import { Ticket, MessageSquare, Paperclip, TrendingUp } from 'lucide-react';

interface Data {
    tickets: Record<string, number>;
    velocity: {
        today: number;
        this_week: number;
        last_week: number;
        weekly_growth_percent: number;
    };
    trend_42d: { date: string; count: number }[];
    totals: { ticket_objects: number };
}

export default function TicketsAnalyticsPage() {
    const { t } = useTranslation();
    const [data, setData] = useState<Data | null>(null);
    const { getWidgets } = usePluginWidgets('admin-analytics-tickets');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/analytics/tickets/dashboard')
            .then((res) => setData(res.data.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className='flex min-h-[300px] items-center justify-center'>{t('common.loading')}</div>;
    if (!data) return <div className='flex min-h-[300px] items-center justify-center'>{t('common.no_data')}</div>;

    const breakdown = [
        { name: t('admin.analytics.tickets.tickets'), value: data.tickets.tickets ?? 0 },
        { name: t('admin.analytics.tickets.messages'), value: data.tickets.messages ?? 0 },
        { name: t('admin.analytics.tickets.attachments'), value: data.tickets.attachments ?? 0 },
        { name: t('admin.analytics.tickets.categories'), value: data.tickets.categories ?? 0 },
        { name: t('admin.analytics.tickets.priorities'), value: data.tickets.priorities ?? 0 },
        { name: t('admin.analytics.tickets.statuses'), value: data.tickets.statuses ?? 0 },
    ];
    const weeklyBars = [
        { name: t('admin.analytics.tickets.today'), value: data.velocity.today ?? 0 },
        { name: t('admin.analytics.tickets.this_week'), value: data.velocity.this_week ?? 0 },
        { name: t('admin.analytics.tickets.last_week'), value: data.velocity.last_week ?? 0 },
    ];
    const trendBars = (data.trend_42d || []).slice(-14).map((p) => ({ name: p.date.slice(5), value: p.count }));

    return (
        <>
            <WidgetRenderer widgets={getWidgets('admin-analytics-tickets', 'top-of-page')} />
            <div className='space-y-6'>
                <PageHeader
                    title={t('admin.analytics.tickets.title')}
                    description={t('admin.analytics.tickets.subtitle')}
                    icon={Ticket}
                />
                <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                    <ResourceCard
                        title={String(data.tickets.tickets ?? 0)}
                        subtitle={t('admin.analytics.tickets.tickets')}
                        description={t('admin.analytics.tickets.total_tickets')}
                        icon={Ticket}
                    />
                    <ResourceCard
                        title={String(data.tickets.messages ?? 0)}
                        subtitle={t('admin.analytics.tickets.ticket_messages')}
                        description={t('admin.analytics.tickets.conversation_volume')}
                        icon={MessageSquare}
                    />
                    <ResourceCard
                        title={String(data.tickets.attachments ?? 0)}
                        subtitle={t('admin.analytics.tickets.ticket_attachments')}
                        description={t('admin.analytics.tickets.uploaded_files')}
                        icon={Paperclip}
                    />
                    <ResourceCard
                        title={`${data.velocity.weekly_growth_percent > 0 ? '+' : ''}${data.velocity.weekly_growth_percent}%`}
                        subtitle={t('admin.analytics.tickets.weekly_growth')}
                        description={t('admin.analytics.tickets.weekly_comparison', {
                            thisWeek: String(data.velocity.this_week),
                            lastWeek: String(data.velocity.last_week),
                        })}
                        icon={TrendingUp}
                    />
                </div>
                <div className='grid gap-4 md:grid-cols-2'>
                    <SimplePieChart
                        title={t('admin.analytics.tickets.breakdown')}
                        description={t('admin.analytics.tickets.breakdown_desc')}
                        data={breakdown}
                    />
                    <SimpleBarChart
                        title={t('admin.analytics.tickets.creation_velocity')}
                        description={t('admin.analytics.tickets.creation_velocity_desc')}
                        data={weeklyBars}
                    />
                </div>
                <div className='grid gap-4 md:grid-cols-1'>
                    <SimpleBarChart
                        title={t('admin.analytics.tickets.recent_trend')}
                        description={t('admin.analytics.tickets.recent_trend_desc')}
                        data={trendBars}
                    />
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('admin-analytics-tickets', 'bottom-of-page')} />
        </>
    );
}
