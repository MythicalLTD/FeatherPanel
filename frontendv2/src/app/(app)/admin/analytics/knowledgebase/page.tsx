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
import { BookOpen, FolderTree, Paperclip, Tags } from 'lucide-react';

interface Data {
    knowledgebase: Record<string, number>;
    totals: { knowledgebase_objects: number };
}

export default function KnowledgebaseAnalyticsPage() {
    const [data, setData] = useState<Data | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/analytics/knowledgebase/dashboard')
            .then((res) => setData(res.data.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className='min-h-[300px] flex items-center justify-center'>Loading...</div>;
    if (!data) return <div className='min-h-[300px] flex items-center justify-center'>No data</div>;

    const breakdown = [
        { name: 'Categories', value: data.knowledgebase.categories ?? 0 },
        { name: 'Articles', value: data.knowledgebase.articles ?? 0 },
        { name: 'Attachments', value: data.knowledgebase.attachments ?? 0 },
        { name: 'Tags', value: data.knowledgebase.tags ?? 0 },
    ];

    return (
        <div className='space-y-6'>
            <PageHeader title='Knowledgebase Analytics' description='Knowledgebase content KPIs.' icon={BookOpen} />
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                <ResourceCard
                    title={String(data.knowledgebase.categories ?? 0)}
                    subtitle='Categories'
                    description='Knowledgebase category entries'
                    icon={FolderTree}
                />
                <ResourceCard
                    title={String(data.knowledgebase.articles ?? 0)}
                    subtitle='Articles'
                    description='Published/support articles'
                    icon={BookOpen}
                />
                <ResourceCard
                    title={String(data.knowledgebase.attachments ?? 0)}
                    subtitle='Attachments'
                    description='Uploaded article attachments'
                    icon={Paperclip}
                />
                <ResourceCard
                    title={String(data.totals.knowledgebase_objects ?? 0)}
                    subtitle='Total KB Objects'
                    description='All knowledgebase entities'
                    icon={Tags}
                />
            </div>
            <div className='grid gap-4 md:grid-cols-2'>
                <SimplePieChart
                    title='Knowledgebase Breakdown'
                    description='Distribution by KB object type'
                    data={breakdown}
                />
                <SimpleBarChart
                    title='Knowledgebase Objects'
                    description='Counts across KB entities'
                    data={breakdown}
                />
            </div>
        </div>
    );
}
