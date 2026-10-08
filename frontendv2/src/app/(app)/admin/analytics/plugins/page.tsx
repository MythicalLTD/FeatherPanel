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
import { SimpleBarChart } from '@/components/admin/analytics/SharedCharts';
import { Puzzle, ShieldCheck, Plug, Import, FileCode, FileJson, BookOpenText } from 'lucide-react';

interface Data {
    plugins: Record<string, number>;
    system_endpoints: Record<string, number>;
    totals: { plugin_objects: number };
}

export default function PluginsAnalyticsPage() {
    const { t } = useTranslation();
    const [data, setData] = useState<Data | null>(null);
    const { getWidgets } = usePluginWidgets('admin-analytics-plugins');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/analytics/plugins/dashboard')
            .then((res) => setData(res.data.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className='flex min-h-[300px] items-center justify-center'>{t('common.loading')}</div>;
    if (!data) return <div className='flex min-h-[300px] items-center justify-center'>{t('common.no_data')}</div>;

    const integrationObjects = [
        { name: t('admin.analytics.plugins.installed_plugins'), value: data.plugins.installed_plugins ?? 0 },
        { name: t('admin.analytics.plugins.server_imports'), value: data.plugins.server_imports ?? 0 },
        { name: t('admin.analytics.plugins.server_proxies'), value: data.plugins.server_proxies ?? 0 },
        { name: t('admin.analytics.plugins.server_transfers'), value: data.plugins.server_transfers ?? 0 },
        { name: t('admin.analytics.plugins.sso_tokens'), value: data.plugins.sso_tokens ?? 0 },
    ];
    const endpointCoverage = [
        { name: t('admin.analytics.plugins.css_sources'), value: data.system_endpoints.plugin_css_sources ?? 0 },
        { name: t('admin.analytics.plugins.js_sources'), value: data.system_endpoints.plugin_js_sources ?? 0 },
        {
            name: t('admin.analytics.plugins.sidebar_configs'),
            value: data.system_endpoints.plugin_sidebar_configs ?? 0,
        },
        { name: t('admin.analytics.plugins.widget_configs'), value: data.system_endpoints.plugin_widget_configs ?? 0 },
        {
            name: t('admin.analytics.plugins.widget_definitions'),
            value: data.system_endpoints.plugin_widget_definitions ?? 0,
        },
    ];

    return (
        <>
            <WidgetRenderer widgets={getWidgets('admin-analytics-plugins', 'top-of-page')} />
            <div className='space-y-6'>
                <PageHeader
                    title={t('admin.analytics.plugins.title')}
                    description={t('admin.analytics.plugins.subtitle')}
                    icon={Puzzle}
                />
                <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                    <ResourceCard
                        title={String(data.plugins.installed_plugins ?? 0)}
                        subtitle={t('admin.analytics.plugins.installed_plugins')}
                        description={t('admin.analytics.plugins.installed_plugins_desc')}
                        icon={Puzzle}
                    />
                    <ResourceCard
                        title={String(data.plugins.server_imports ?? 0)}
                        subtitle={t('admin.analytics.plugins.server_imports')}
                        description={t('admin.analytics.plugins.server_imports_desc')}
                        icon={Import}
                    />
                    <ResourceCard
                        title={String(data.plugins.server_proxies ?? 0)}
                        subtitle={t('admin.analytics.plugins.server_proxies')}
                        description={t('admin.analytics.plugins.server_proxies_desc')}
                        icon={Plug}
                    />
                    <ResourceCard
                        title={String(data.totals.plugin_objects ?? 0)}
                        subtitle={t('admin.analytics.plugins.total_integration_objects')}
                        description={t('admin.analytics.plugins.total_integration_objects_desc')}
                        icon={ShieldCheck}
                    />
                    <ResourceCard
                        title={String(data.system_endpoints.plugin_css_sources ?? 0)}
                        subtitle={t('admin.analytics.plugins.plugin_css_sources')}
                        description={t('admin.analytics.plugins.plugin_css_sources_desc')}
                        icon={FileCode}
                    />
                    <ResourceCard
                        title={String(data.system_endpoints.plugin_sidebar_configs ?? 0)}
                        subtitle={t('admin.analytics.plugins.sidebar_configs')}
                        description={t('admin.analytics.plugins.sidebar_configs_desc')}
                        icon={FileJson}
                    />
                    <ResourceCard
                        title={`${data.system_endpoints.apidocs_cache_ttl_seconds ?? 0}s`}
                        subtitle={t('admin.analytics.plugins.openapi_cache_ttl')}
                        description={t('admin.analytics.plugins.openapi_cache_ttl_desc')}
                        icon={BookOpenText}
                    />
                </div>
                <div className='grid gap-4 md:grid-cols-2'>
                    <SimpleBarChart
                        title={t('admin.analytics.plugins.integration_objects')}
                        description={t('admin.analytics.plugins.integration_objects_desc')}
                        data={integrationObjects}
                    />
                    <SimpleBarChart
                        title={t('admin.analytics.plugins.endpoint_coverage')}
                        description={t('admin.analytics.plugins.endpoint_coverage_desc')}
                        data={endpointCoverage}
                        color='#0ea5e9'
                    />
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('admin-analytics-plugins', 'bottom-of-page')} />
        </>
    );
}
