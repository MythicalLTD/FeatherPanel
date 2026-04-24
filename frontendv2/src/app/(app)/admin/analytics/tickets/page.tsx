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
import { PageHeader } from '@/components/featherui/PageHeader';
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
    const [data, setData] = useState<Data | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/analytics/tickets/dashboard')
            .then((res) => setData(res.data.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className='min-h-[300px] flex items-center justify-center'>Loading...</div>;
    if (!data) return <div className='min-h-[300px] flex items-center justify-center'>No data</div>;

    const breakdown = [
        { name: 'Tickets', value: data.tickets.tickets ?? 0 },
        { name: 'Messages', value: data.tickets.messages ?? 0 },
        { name: 'Attachments', value: data.tickets.attachments ?? 0 },
        { name: 'Categories', value: data.tickets.categories ?? 0 },
        { name: 'Priorities', value: data.tickets.priorities ?? 0 },
        { name: 'Statuses', value: data.tickets.statuses ?? 0 },
    ];
    const weeklyBars = [
        { name: 'Today', value: data.velocity.today ?? 0 },
        { name: 'This Week', value: data.velocity.this_week ?? 0 },
        { name: 'Last Week', value: data.velocity.last_week ?? 0 },
    ];
    const trendBars = (data.trend_42d || []).slice(-14).map((p) => ({ name: p.date.slice(5), value: p.count }));

    return (
        <div className='space-y-6'>
            <PageHeader title='Tickets Analytics' description='Ticketing KPIs and usage metrics.' icon={Ticket} />
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                <ResourceCard
                    title={String(data.tickets.tickets ?? 0)}
                    subtitle='Tickets'
                    description='Total tickets'
                    icon={Ticket}
                />
                <ResourceCard
                    title={String(data.tickets.messages ?? 0)}
                    subtitle='Ticket Messages'
                    description='Conversation volume'
                    icon={MessageSquare}
                />
                <ResourceCard
                    title={String(data.tickets.attachments ?? 0)}
                    subtitle='Ticket Attachments'
                    description='Uploaded files'
                    icon={Paperclip}
                />
                <ResourceCard
                    title={`${data.velocity.weekly_growth_percent > 0 ? '+' : ''}${data.velocity.weekly_growth_percent}%`}
                    subtitle='Weekly Growth'
                    description={`${data.velocity.this_week} this week vs ${data.velocity.last_week} last week`}
                    icon={TrendingUp}
                />
            </div>
            <div className='grid gap-4 md:grid-cols-2'>
                <SimplePieChart title='Ticket Breakdown' description='Distribution by entity type' data={breakdown} />
                <SimpleBarChart
                    title='Ticket Creation Velocity'
                    description='Today and week-over-week ticket volume'
                    data={weeklyBars}
                />
            </div>
            <div className='grid gap-4 md:grid-cols-1'>
                <SimpleBarChart
                    title='Recent Ticket Trend (14d)'
                    description='Tickets created per day over the most recent 14 days'
                    data={trendBars}
                />
            </div>
        </div>
    );
}
