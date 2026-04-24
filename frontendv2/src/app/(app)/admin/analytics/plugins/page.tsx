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
import { SimpleBarChart } from '@/components/admin/analytics/SharedCharts';
import { Puzzle, ShieldCheck, Plug, Import, FileCode, FileJson, BookOpenText } from 'lucide-react';

interface Data {
    plugins: Record<string, number>;
    system_endpoints: Record<string, number>;
    totals: { plugin_objects: number };
}

export default function PluginsAnalyticsPage() {
    const [data, setData] = useState<Data | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/analytics/plugins/dashboard')
            .then((res) => setData(res.data.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className='min-h-[300px] flex items-center justify-center'>Loading...</div>;
    if (!data) return <div className='min-h-[300px] flex items-center justify-center'>No data</div>;

    const integrationObjects = [
        { name: 'Installed Plugins', value: data.plugins.installed_plugins ?? 0 },
        { name: 'Server Imports', value: data.plugins.server_imports ?? 0 },
        { name: 'Server Proxies', value: data.plugins.server_proxies ?? 0 },
        { name: 'Server Transfers', value: data.plugins.server_transfers ?? 0 },
        { name: 'SSO Tokens', value: data.plugins.sso_tokens ?? 0 },
    ];
    const endpointCoverage = [
        { name: 'CSS Sources', value: data.system_endpoints.plugin_css_sources ?? 0 },
        { name: 'JS Sources', value: data.system_endpoints.plugin_js_sources ?? 0 },
        { name: 'Sidebar Configs', value: data.system_endpoints.plugin_sidebar_configs ?? 0 },
        { name: 'Widget Configs', value: data.system_endpoints.plugin_widget_configs ?? 0 },
        { name: 'Widget Definitions', value: data.system_endpoints.plugin_widget_definitions ?? 0 },
    ];

    return (
        <div className='space-y-6'>
            <PageHeader
                title='Plugins & Integrations Analytics'
                description='KPIs for plugins and integration-related entities.'
                icon={Puzzle}
            />
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                <ResourceCard
                    title={String(data.plugins.installed_plugins ?? 0)}
                    subtitle='Installed Plugins'
                    description='Currently installed plugin entries'
                    icon={Puzzle}
                />
                <ResourceCard
                    title={String(data.plugins.server_imports ?? 0)}
                    subtitle='Server Imports'
                    description='Imported server records'
                    icon={Import}
                />
                <ResourceCard
                    title={String(data.plugins.server_proxies ?? 0)}
                    subtitle='Server Proxies'
                    description='Proxy configurations'
                    icon={Plug}
                />
                <ResourceCard
                    title={String(data.totals.plugin_objects ?? 0)}
                    subtitle='Total Integration Objects'
                    description='All plugin/integration entities'
                    icon={ShieldCheck}
                />
                <ResourceCard
                    title={String(data.system_endpoints.plugin_css_sources ?? 0)}
                    subtitle='Plugin CSS Sources'
                    description='Used by PluginCssController'
                    icon={FileCode}
                />
                <ResourceCard
                    title={String(data.system_endpoints.plugin_sidebar_configs ?? 0)}
                    subtitle='Sidebar Configs'
                    description='Used by PluginSidebarController'
                    icon={FileJson}
                />
                <ResourceCard
                    title={`${data.system_endpoints.apidocs_cache_ttl_seconds ?? 0}s`}
                    subtitle='OpenAPI Cache TTL'
                    description='From ApiDocs endpoint behavior'
                    icon={BookOpenText}
                />
            </div>
            <div className='grid gap-4 md:grid-cols-2'>
                <SimpleBarChart
                    title='Plugin Integration Objects'
                    description='Counts for plugin/integration entities'
                    data={integrationObjects}
                />
                <SimpleBarChart
                    title='System Plugin Endpoint Coverage'
                    description='Stats behind PluginCss/Js/Sidebar/Widget and ApiDocs'
                    data={endpointCoverage}
                    color='#0ea5e9'
                />
            </div>
        </div>
    );
}
