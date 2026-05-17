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
import { BookOpen, FolderTree, Paperclip, Tags } from 'lucide-react';

interface Data {
    knowledgebase: Record<string, number>;
    totals: { knowledgebase_objects: number };
}

export default function KnowledgebaseAnalyticsPage() {
    const { t } = useTranslation();
    const [data, setData] = useState<Data | null>(null);
    const { getWidgets } = usePluginWidgets('admin-analytics-knowledgebase');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/analytics/knowledgebase/dashboard')
            .then((res) => setData(res.data.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className='flex min-h-[300px] items-center justify-center'>{t('common.loading')}</div>;
    if (!data) return <div className='flex min-h-[300px] items-center justify-center'>{t('common.no_data')}</div>;

    const breakdown = [
        { name: t('admin.analytics.knowledgebase.categories'), value: data.knowledgebase.categories ?? 0 },
        { name: t('admin.analytics.knowledgebase.articles'), value: data.knowledgebase.articles ?? 0 },
        { name: t('admin.analytics.knowledgebase.attachments'), value: data.knowledgebase.attachments ?? 0 },
        { name: t('admin.analytics.knowledgebase.tags'), value: data.knowledgebase.tags ?? 0 },
    ];

    return (
        <>
            <WidgetRenderer widgets={getWidgets('admin-analytics-knowledgebase', 'top-of-page')} />
            <div className='space-y-6'>
                <PageHeader
                    title={t('admin.analytics.knowledgebase.title')}
                    description={t('admin.analytics.knowledgebase.subtitle')}
                    icon={BookOpen}
                />
                <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                    <ResourceCard
                        title={String(data.knowledgebase.categories ?? 0)}
                        subtitle={t('admin.analytics.knowledgebase.categories')}
                        description={t('admin.analytics.knowledgebase.category_entries')}
                        icon={FolderTree}
                    />
                    <ResourceCard
                        title={String(data.knowledgebase.articles ?? 0)}
                        subtitle={t('admin.analytics.knowledgebase.articles')}
                        description={t('admin.analytics.knowledgebase.published_articles')}
                        icon={BookOpen}
                    />
                    <ResourceCard
                        title={String(data.knowledgebase.attachments ?? 0)}
                        subtitle={t('admin.analytics.knowledgebase.attachments')}
                        description={t('admin.analytics.knowledgebase.uploaded_attachments')}
                        icon={Paperclip}
                    />
                    <ResourceCard
                        title={String(data.totals.knowledgebase_objects ?? 0)}
                        subtitle={t('admin.analytics.knowledgebase.total_kb_objects')}
                        description={t('admin.analytics.knowledgebase.all_entities')}
                        icon={Tags}
                    />
                </div>
                <div className='grid gap-4 md:grid-cols-2'>
                    <SimplePieChart
                        title={t('admin.analytics.knowledgebase.breakdown')}
                        description={t('admin.analytics.knowledgebase.breakdown_desc')}
                        data={breakdown}
                    />
                    <SimpleBarChart
                        title={t('admin.analytics.knowledgebase.objects')}
                        description={t('admin.analytics.knowledgebase.objects_desc')}
                        data={breakdown}
                    />
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('admin-analytics-knowledgebase', 'bottom-of-page')} />
        </>
    );
}
