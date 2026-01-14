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

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check, RefreshCw, Cpu, LayoutGrid, Shield } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import axios from 'axios';
import { SystemInfoResponse, VersionStatus } from '../types';

interface SystemInfoTabProps {
    nodeId: number;
    loading: boolean;
    data: SystemInfoResponse | null;
    error: string | null;
    onRefresh: () => void;
}

export function SystemInfoTab({ nodeId, loading, data, error, onRefresh }: SystemInfoTabProps) {
    const { t } = useTranslation();
    const [versionStatus, setVersionStatus] = useState<VersionStatus | null>(null);
    const [versionLoading, setVersionLoading] = useState(false);

    const fetchVersionStatus = async () => {
        if (!nodeId || !data) return;
        setVersionLoading(true);
        try {
            const res = await axios.get(`/api/admin/nodes/${nodeId}/version-status`);
            if (res.data.success) {
                setVersionStatus(res.data.data);
            }
        } catch (e) {
            console.error('Failed to fetch version status', e);
        } finally {
            setVersionLoading(false);
        }
    };

    useEffect(() => {
        if (data && nodeId) {
            fetchVersionStatus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, nodeId]);

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <RefreshCw className='h-8 w-8 animate-spin text-primary' />
            </div>
        );
    }

    if (error) {
        return (
            <PageCard title={t('admin.node.view.system.error_title')} icon={AlertTriangle}>
                <div className='p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-center'>
                    <p className='text-destructive mb-4'>{error}</p>
                    <Button variant='outline' onClick={onRefresh}>
                        {t('common.retry')}
                    </Button>
                </div>
            </PageCard>
        );
    }

    if (!data) return null;

    return (
        <div className='space-y-6'>
            {/* Wings Information */}
            <PageCard title={t('admin.node.view.system.wings_info')} icon={Shield}>
                <div className='space-y-6'>
                    <div>
                        <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1'>
                            {t('admin.node.view.system.wings_version')}
                        </p>
                        <p className='text-sm font-mono'>{data.wings.version}</p>
                    </div>

                    {versionLoading ? (
                        <div className='flex items-center gap-2 p-4 rounded-2xl bg-muted/30'>
                            <RefreshCw className='h-4 w-4 animate-spin text-primary' />
                            <span className='text-sm text-muted-foreground'>
                                {t('admin.node.view.system.checking_updates')}
                            </span>
                        </div>
                    ) : versionStatus?.update_available ? (
                        <div className='flex items-start gap-4 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20'>
                            <div className='p-2 rounded-xl bg-orange-500/20 h-fit'>
                                <AlertTriangle className='h-5 w-5 text-orange-500' />
                            </div>
                            <div className='flex-1'>
                                <p className='text-sm font-bold text-orange-500 mb-1'>
                                    {t('admin.node.view.system.update_available')}
                                </p>
                                <p className='text-sm text-orange-500/80 mb-2'>
                                    {t('admin.node.view.system.current')}:{' '}
                                    <span className='font-mono'>{versionStatus.current_version}</span> →{' '}
                                    {t('admin.node.view.system.latest')}:{' '}
                                    <span className='font-mono'>v{versionStatus.latest_version}</span>
                                </p>
                                <p className='text-xs text-orange-500/60 leading-relaxed italic'>
                                    {t('admin.node.view.system.update_help')}
                                </p>
                            </div>
                        </div>
                    ) : versionStatus?.is_up_to_date ? (
                        <div className='flex items-center gap-4 p-4 rounded-2xl bg-green-500/10 border border-green-500/20'>
                            <div className='p-2 rounded-xl bg-green-500/20 h-fit'>
                                <Check className='h-5 w-5 text-green-500' />
                            </div>
                            <div>
                                <p className='text-sm font-bold text-green-500 mb-1'>
                                    {t('admin.node.view.system.up_to_date')}
                                </p>
                                <p className='text-sm text-green-500/80 font-mono'>{versionStatus.current_version}</p>
                            </div>
                        </div>
                    ) : versionStatus?.github_error ? (
                        <div className='flex items-center gap-3 p-4 rounded-2xl bg-muted/30 text-muted-foreground'>
                            <AlertTriangle className='h-4 w-4' />
                            <span className='text-sm italic'>{versionStatus.github_error}</span>
                        </div>
                    ) : null}
                </div>
            </PageCard>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                {/* Docker Information */}
                <PageCard title={t('admin.node.view.system.docker_info')} icon={LayoutGrid}>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <div>
                            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1'>
                                {t('admin.node.view.system.docker_version')}
                            </p>
                            <p className='text-sm font-mono'>{data.wings.docker.version}</p>
                        </div>
                        <div>
                            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1'>
                                {t('admin.node.view.system.cgroups_driver')}
                            </p>
                            <p className='text-sm'>
                                {data.wings.docker.cgroups.driver} (v{data.wings.docker.cgroups.version})
                            </p>
                        </div>
                        <div>
                            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1'>
                                {t('admin.node.view.system.storage_driver')}
                            </p>
                            <p className='text-sm'>
                                {data.wings.docker.storage.driver} ({data.wings.docker.storage.filesystem})
                            </p>
                        </div>
                        <div>
                            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1'>
                                {t('admin.node.view.system.runc_version')}
                            </p>
                            <p className='text-sm font-mono'>{data.wings.docker.runc.version}</p>
                        </div>
                        <div className='md:col-span-2 pt-4 border-t border-border/50'>
                            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3'>
                                {t('admin.node.view.system.containers')}
                            </p>
                            <div className='flex flex-wrap gap-3'>
                                <Badge
                                    variant='secondary'
                                    className='px-3 py-1 bg-primary/5 text-primary border-primary/10'
                                >
                                    {t('admin.node.view.system.total')}: {data.wings.docker.containers.total}
                                </Badge>
                                <Badge
                                    variant='secondary'
                                    className='px-3 py-1 bg-green-500/5 text-green-500 border-green-500/10'
                                >
                                    {t('admin.node.view.system.running')}: {data.wings.docker.containers.running}
                                </Badge>
                                <Badge
                                    variant='secondary'
                                    className='px-3 py-1 bg-yellow-500/5 text-yellow-500 border-yellow-500/10'
                                >
                                    {t('admin.node.view.system.paused')}: {data.wings.docker.containers.paused}
                                </Badge>
                                <Badge
                                    variant='secondary'
                                    className='px-3 py-1 bg-red-500/5 text-red-500 border-red-500/10'
                                >
                                    {t('admin.node.view.system.stopped')}: {data.wings.docker.containers.stopped}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </PageCard>

                {/* Host System Information */}
                <PageCard title={t('admin.node.view.system.host_info')} icon={Cpu}>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <div>
                            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1'>
                                {t('admin.node.view.system.architecture')}
                            </p>
                            <p className='text-sm font-mono uppercase'>{data.wings.system.architecture}</p>
                        </div>
                        <div>
                            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1'>
                                {t('admin.node.view.system.cpu_threads')}
                            </p>
                            <p className='text-sm'>{data.wings.system.cpu_threads}</p>
                        </div>
                        <div>
                            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1'>
                                {t('admin.node.view.system.total_memory')}
                            </p>
                            <p className='text-sm'>{formatBytes(data.wings.system.memory_bytes)}</p>
                        </div>
                        <div>
                            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1'>
                                {t('admin.node.view.system.kernel_version')}
                            </p>
                            <p className='text-sm font-mono'>{data.wings.system.kernel_version}</p>
                        </div>
                        <div>
                            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1'>
                                {t('admin.node.view.system.operating_system')}
                            </p>
                            <p className='text-sm'>{data.wings.system.os}</p>
                        </div>
                        <div>
                            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1'>
                                {t('admin.node.view.system.os_type')}
                            </p>
                            <p className='text-sm capitalize'>{data.wings.system.os_type}</p>
                        </div>
                    </div>
                </PageCard>
            </div>
        </div>
    );
}
