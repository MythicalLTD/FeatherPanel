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
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { PageHeader } from '@/components/featherui/PageHeader';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { SimplePieChart, SimpleBarChart } from '@/components/admin/analytics/SharedCharts';
import { Boxes, Server, Archive, Activity } from 'lucide-react';

interface DashboardData {
    vds: Record<string, number>;
    totals: {
        vds_objects: number;
    };
}

export default function VdsAnalyticsPage() {
    const { t } = useTranslation();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-analytics-vds');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/admin/analytics/vds/dashboard');
            setDashboard(res.data.data);
        } catch (err) {
            console.error('Failed to fetch VDS analytics:', err);
            setError(t('admin.analytics.vds.error'));
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

    const vdsBreakdown = [
        { name: t('admin.analytics.vds.instances'), value: dashboard?.vds.instances ?? 0 },
        { name: t('admin.analytics.vds.nodes'), value: dashboard?.vds.nodes ?? 0 },
        { name: t('admin.analytics.vds.templates'), value: dashboard?.vds.templates ?? 0 },
        { name: t('admin.analytics.vds.backups'), value: dashboard?.vds.instance_backups ?? 0 },
        { name: t('admin.analytics.vds.tasks'), value: dashboard?.vds.tasks ?? 0 },
    ];

    const vdsRuntimeBreakdown = [
        { name: t('admin.analytics.vds.subusers'), value: dashboard?.vds.subusers ?? 0 },
        { name: t('admin.analytics.vds.instance_ips'), value: dashboard?.vds.instance_ips ?? 0 },
        { name: t('admin.analytics.vds.activities'), value: dashboard?.vds.instance_activities ?? 0 },
        { name: t('admin.analytics.vds.backups'), value: dashboard?.vds.instance_backups ?? 0 },
    ];

    return (
        <>
            <WidgetRenderer widgets={getWidgets('admin-analytics-vds', 'top-of-page')} />
            <div className='space-y-6'>
                <PageHeader
                    title={t('admin.analytics.vds.title')}
                    description={t('admin.analytics.vds.subtitle')}
                    icon={Boxes}
                />

                {dashboard && (
                    <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                        <ResourceCard
                            title={String(dashboard.vds.instances)}
                            subtitle={t('admin.analytics.vds.vds_instances')}
                            description={t('admin.analytics.vds.nodes_templates', {
                                nodes: String(dashboard.vds.nodes),
                                templates: String(dashboard.vds.templates),
                            })}
                            icon={Boxes}
                            className='bg-card/50 shadow-none! backdrop-blur-sm'
                        />
                        <ResourceCard
                            title={String(dashboard.vds.nodes)}
                            subtitle={t('admin.analytics.vds.vds_nodes')}
                            description={t('admin.analytics.vds.templates_tasks', {
                                templates: String(dashboard.vds.templates),
                                tasks: String(dashboard.vds.tasks),
                            })}
                            icon={Server}
                            className='bg-card/50 shadow-none! backdrop-blur-sm'
                        />
                        <ResourceCard
                            title={String(dashboard.vds.instance_backups)}
                            subtitle={t('admin.analytics.vds.instance_backups')}
                            description={t('admin.analytics.vds.ips_subusers', {
                                ips: String(dashboard.vds.instance_ips),
                                subusers: String(dashboard.vds.subusers),
                            })}
                            icon={Archive}
                            className='bg-card/50 shadow-none! backdrop-blur-sm'
                        />
                        <ResourceCard
                            title={String(dashboard.vds.instance_activities)}
                            subtitle={t('admin.analytics.vds.instance_activities')}
                            description={t('admin.analytics.vds.total_vds_objects', {
                                count: String(dashboard.totals.vds_objects),
                            })}
                            icon={Activity}
                            className='bg-card/50 shadow-none! backdrop-blur-sm'
                        />
                    </div>
                )}

                <div className='grid gap-4 md:grid-cols-2'>
                    <SimplePieChart
                        title={t('admin.analytics.vds.breakdown')}
                        description={t('admin.analytics.vds.breakdown_desc')}
                        data={vdsBreakdown}
                    />
                    <SimpleBarChart
                        title={t('admin.analytics.vds.totals')}
                        description={t('admin.analytics.vds.totals_desc')}
                        data={[
                            { name: t('admin.analytics.vds.vds_objects'), value: dashboard?.totals.vds_objects ?? 0 },
                        ]}
                        color='#6366f1'
                    />
                </div>

                <div className='grid gap-4 md:grid-cols-1'>
                    <SimpleBarChart
                        title={t('admin.analytics.vds.runtime_breakdown')}
                        description={t('admin.analytics.vds.runtime_breakdown_desc')}
                        data={vdsRuntimeBreakdown}
                        color='#22c55e'
                    />
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('admin-analytics-vds', 'bottom-of-page')} />
        </>
    );
}
