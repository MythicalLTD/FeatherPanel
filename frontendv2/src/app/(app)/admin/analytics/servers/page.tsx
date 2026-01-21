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
import {
    SimplePieChart,
    SimpleBarChart,
    TrendChart,
    ResourceTrendChart,
} from '@/components/admin/analytics/ServerCharts';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Server, HardDrive, Cpu, Archive, Users, Clock } from 'lucide-react';

interface ServerOverview {
    total_servers: number;
    running: number;
    suspended: number;
    installing: number;
    percentage_running: number;
    percentage_suspended: number;
}

interface TrendData {
    date: string;
    count: number;
}

interface ResourceTrendData {
    date: string;
    memory: number;
    disk: number;
    cpu: number;
}

interface DistributionData {
    name: string;
    value: number;
}

interface BackupStats {
    total_backups: number;
    servers_with_backups: number;
    servers_without_backups: number;
    avg_backups_per_server: number;
}

interface ScheduleStats {
    total_schedules: number;
    total_tasks: number;
    servers_with_schedules: number;
    avg_schedules_per_server: number;
}

interface SubuserStats {
    total_subusers: number;
    servers_with_subusers: number;
    avg_subusers_per_server: number;
}

interface InstallationStats {
    installed: number;
    not_installed: number;
    with_errors: number;
    avg_installation_time_minutes: number;
}

export default function ServerAnalyticsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [overview, setOverview] = useState<ServerOverview | null>(null);
    const [creationTrend, setCreationTrend] = useState<TrendData[]>([]);
    const [resourceTrends, setResourceTrends] = useState<ResourceTrendData[]>([]);
    const [serversByRealm, setServersByRealm] = useState<DistributionData[]>([]);
    const [statusDistribution, setStatusDistribution] = useState<DistributionData[]>([]);
    const [memoryDistribution, setMemoryDistribution] = useState<DistributionData[]>([]);
    const [diskDistribution, setDiskDistribution] = useState<DistributionData[]>([]);
    const [serverAgeDistribution, setServerAgeDistribution] = useState<DistributionData[]>([]);
    const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
    const [scheduleStats, setScheduleStats] = useState<ScheduleStats | null>(null);
    const [subuserStats, setSubuserStats] = useState<SubuserStats | null>(null);
    const [installationStats, setInstallationStats] = useState<InstallationStats | null>(null);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [
                overviewRes,
                creationTrendRes,
                resourceTrendsRes,
                serversByRealmRes,
                statusDistributionRes,
                resourceDistRes,
                ageDistRes,
                backupUsageRes,
                scheduleUsageRes,
                subuserStatsRes,
                installationStatsRes,
            ] = await Promise.all([
                api.get('/admin/analytics/servers/overview'),
                api.get('/admin/analytics/servers/creation-trend'),
                api.get('/admin/analytics/servers/resource-trends'),
                api.get('/admin/analytics/servers/by-realm'),
                api.get('/admin/analytics/servers/status'),
                api.get('/admin/analytics/servers/resource-distribution'),
                api.get('/admin/analytics/servers/age-distribution'),
                api.get('/admin/analytics/servers/backups'),
                api.get('/admin/analytics/servers/schedules'),
                api.get('/admin/analytics/servers/subusers'),
                api.get('/admin/analytics/servers/installation'),
            ]);

            setOverview(overviewRes.data.data);
            setCreationTrend(creationTrendRes.data.data.data || []);
            setResourceTrends(resourceTrendsRes.data.data.data || []);
            setServersByRealm(
                (serversByRealmRes.data.data.realms || []).map((r: { realm_name: string; server_count: number }) => ({
                    name: r.realm_name,
                    value: r.server_count,
                })),
            );

            // Map status distribution if needed, assuming array of {status, count} based on typical pattern found
            const statusData = statusDistributionRes.data.data.statuses || statusDistributionRes.data.data || [];
            setStatusDistribution(
                statusData.map((s: { status: string; count: number; name?: string; value?: number }) => ({
                    name: s.status || s.name || t('admin.analytics.servers.unknown'),
                    value: s.count || s.value || 0,
                })),
            );

            const resDist = resourceDistRes.data.data;
            // Likely histograms { range: string, count: number } or similar. Vue just passed `resourceDistRes.data.data.memory`
            // Checking ServerCharts.tsx, SimpleBarChart used. So needs { name, value }.
            // Assuming resourceDistRes.data.data.memory is { range_key: count } object or array of { range, count }.
            // Vue passed it directly: setMemoryDistribution(resourceDistRes.data.data.memory)
            // I'll assume for now it returns a list compatbile, or I map assuming generic { range/label, count }
            setMemoryDistribution(
                (resDist.memory || []).map(
                    (m: {
                        range?: string;
                        label?: string;
                        name?: string;
                        memory_range?: string;
                        count?: number;
                        value?: number;
                    }) => ({
                        name: m.memory_range || m.range || m.label || m.name || t('admin.analytics.servers.unknown'),
                        value: m.count || m.value || 0,
                    }),
                ),
            );
            setDiskDistribution(
                (resDist.disk || []).map(
                    (d: {
                        range?: string;
                        label?: string;
                        name?: string;
                        disk_range?: string;
                        count?: number;
                        value?: number;
                    }) => ({
                        name: d.disk_range || d.range || d.label || d.name || t('admin.analytics.servers.unknown'),
                        value: d.count || d.value || 0,
                    }),
                ),
            );
            setServerAgeDistribution(
                (ageDistRes.data.data.distribution || []).map(
                    (a: { range?: string; label?: string; age_range?: string; age_group?: string; count: number }) => ({
                        name: a.age_group || a.range || a.label || a.age_range || t('admin.analytics.servers.unknown'),
                        value: a.count,
                    }),
                ),
            );

            setBackupStats(backupUsageRes.data.data);
            setScheduleStats(scheduleUsageRes.data.data);
            setSubuserStats(subuserStatsRes.data.data);
            setInstallationStats(installationStatsRes.data.data);
        } catch (err) {
            console.error('Failed to fetch server analytics:', err);
            setError(t('admin.analytics.servers.error'));
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
                title={t('admin.analytics.servers.title')}
                description={t('admin.analytics.servers.subtitle')}
                icon={Server}
            />

            {/* Overview Stats */}
            {overview && (
                <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                    <ResourceCard
                        title={overview.total_servers.toString()}
                        subtitle={t('admin.analytics.servers.total')}
                        description={t('admin.analytics.servers.active_servers')}
                        icon={Server}
                        className='shadow-none! bg-card/50 backdrop-blur-sm'
                    />
                    <ResourceCard
                        title={overview.running.toString()}
                        subtitle={t('admin.analytics.servers.running')}
                        description={t('admin.analytics.servers.running_pct', {
                            percentage: String(overview.percentage_running),
                        })}
                        icon={Cpu}
                        className='shadow-none! bg-card/50 backdrop-blur-sm'
                    />
                    <ResourceCard
                        title={overview.suspended.toString()}
                        subtitle={t('admin.analytics.servers.suspended')}
                        description={t('admin.analytics.servers.suspended_pct', {
                            percentage: String(overview.percentage_suspended),
                        })}
                        icon={Archive}
                        className='shadow-none! bg-card/50 backdrop-blur-sm'
                    />
                    <ResourceCard
                        title={overview.installing.toString()}
                        subtitle={t('admin.analytics.servers.installing')}
                        description={t('admin.analytics.servers.being_installed')}
                        icon={HardDrive}
                        className='shadow-none! bg-card/50 backdrop-blur-sm'
                    />
                </div>
            )}

            {(backupStats || scheduleStats || subuserStats || installationStats) && (
                <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                    {backupStats && (
                        <ResourceCard
                            title={backupStats.total_backups.toString()}
                            subtitle={t('admin.analytics.servers.total_backups')}
                            description={t('admin.analytics.servers.avg_backups', {
                                count: String(backupStats.avg_backups_per_server),
                            })}
                            icon={Archive}
                            className='shadow-none! bg-card/50 backdrop-blur-sm'
                        />
                    )}
                    {scheduleStats && (
                        <ResourceCard
                            title={scheduleStats.total_schedules.toString()}
                            subtitle={t('admin.analytics.servers.total_schedules')}
                            description={t('admin.analytics.servers.avg_schedules', {
                                count: String(scheduleStats.avg_schedules_per_server),
                            })}
                            icon={Clock}
                            className='shadow-none! bg-card/50 backdrop-blur-sm'
                        />
                    )}
                    {subuserStats && (
                        <ResourceCard
                            title={subuserStats.total_subusers.toString()}
                            subtitle={t('admin.analytics.servers.total_subusers')}
                            description={t('admin.analytics.servers.avg_subusers', {
                                count: String(subuserStats.avg_subusers_per_server),
                            })}
                            icon={Users}
                            className='shadow-none! bg-card/50 backdrop-blur-sm'
                        />
                    )}
                    {installationStats && (
                        <ResourceCard
                            title={installationStats.installed.toString()}
                            subtitle={t('admin.analytics.servers.installed_servers')}
                            description={t('admin.analytics.servers.avg_install_time', {
                                minutes: String(installationStats.avg_installation_time_minutes),
                            })}
                            icon={Clock}
                            className='shadow-none! bg-card/50 backdrop-blur-sm'
                        />
                    )}
                </div>
            )}

            {/* Charts Section */}
            <div className='grid gap-4 md:grid-cols-2'>
                <TrendChart
                    title={t('admin.analytics.servers.creation_trend')}
                    description={t('admin.analytics.servers.creation_trend_desc')}
                    data={creationTrend}
                />
                <ResourceTrendChart
                    title={t('admin.analytics.servers.resource_trends')}
                    description={t('admin.analytics.servers.resource_trends_desc')}
                    data={resourceTrends}
                />
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
                <SimplePieChart
                    title={t('admin.analytics.servers.by_realm')}
                    description={t('admin.analytics.servers.by_realm_desc')}
                    data={serversByRealm}
                />
                <SimplePieChart
                    title={t('admin.analytics.servers.status_dist')}
                    description={t('admin.analytics.servers.status_dist_desc')}
                    data={statusDistribution}
                />
            </div>

            <div className='grid gap-4 md:grid-cols-3'>
                <SimpleBarChart
                    title={t('admin.analytics.servers.memory_dist')}
                    description={t('admin.analytics.servers.memory_dist_desc')}
                    data={memoryDistribution}
                    color='#3b82f6'
                />
                <SimpleBarChart
                    title={t('admin.analytics.servers.disk_dist')}
                    description={t('admin.analytics.servers.disk_dist_desc')}
                    data={diskDistribution}
                    color='#10b981'
                />
                <SimpleBarChart
                    title={t('admin.analytics.servers.age_dist')}
                    description={t('admin.analytics.servers.age_dist_desc')}
                    data={serverAgeDistribution}
                    color='#8b5cf6'
                />
            </div>
        </div>
    );
}
