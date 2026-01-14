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

import React, { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { LayoutGrid, Trash2, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import axios from 'axios';
import { DockerResponse } from '../types';
import { toast } from 'sonner';

interface DockerTabProps {
    nodeId: number;
    loading: boolean;
    data: DockerResponse | null;
    error: string | null;
    onRefresh: () => void;
}

export function DockerTab({ nodeId, loading, data, error, onRefresh }: DockerTabProps) {
    const { t } = useTranslation();
    const [cleaning, setCleaning] = useState(false);

    const handlePrune = async () => {
        if (!confirm(t('admin.node.view.docker.prune_confirm'))) return;

        setCleaning(true);
        try {
            await axios.delete(`/api/wings/admin/node/${nodeId}/docker/prune`);
            toast.success(t('admin.node.view.docker.prune_success'));
            onRefresh();
        } catch (e: unknown) {
            let msg = t('admin.node.view.docker.prune_failed');
            if (axios.isAxiosError(e)) {
                msg = e.response?.data?.message || e.message;
            }
            toast.error(msg);
        } finally {
            setCleaning(false);
        }
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <RefreshCw className='h-8 w-8 animate-spin text-primary' />
            </div>
        );
    }

    if (error) {
        return (
            <PageCard title={t('admin.node.view.docker.error_title')} icon={AlertTriangle}>
                <div className='p-6 bg-destructive/10 border border-destructive/20 rounded-2xl text-center space-y-4'>
                    <p className='text-destructive'>{error}</p>
                    <Button variant='outline' onClick={onRefresh}>
                        {t('common.retry')}
                    </Button>
                </div>
            </PageCard>
        );
    }

    if (!data) return null;

    const { dockerDiskUsage } = data;

    const stats = [
        {
            label: t('admin.node.view.docker.containers_size'),
            value: formatBytes(dockerDiskUsage.containers_size),
            description: t('admin.node.view.docker.containers_size_help'),
        },
        {
            label: t('admin.node.view.docker.images_total'),
            value: dockerDiskUsage.images_total,
            description: t('admin.node.view.docker.images_total_help'),
        },
        {
            label: t('admin.node.view.docker.images_active'),
            value: dockerDiskUsage.images_active,
            description: t('admin.node.view.docker.images_active_help'),
        },
        {
            label: t('admin.node.view.docker.images_size'),
            value: formatBytes(dockerDiskUsage.images_size),
            description: t('admin.node.view.docker.images_size_help'),
        },
        {
            label: t('admin.node.view.docker.cache_size'),
            value: formatBytes(dockerDiskUsage.build_cache_size),
            description: t('admin.node.view.docker.cache_size_help'),
        },
    ];

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.node.view.docker.title')}
                icon={LayoutGrid}
                action={
                    <Button
                        variant='destructive'
                        size='sm'
                        onClick={handlePrune}
                        loading={cleaning}
                        title={t('admin.node.view.docker.prune')}
                    >
                        <Trash2 className='h-4 w-4 mr-2' />
                        {t('admin.node.view.docker.prune')}
                    </Button>
                }
            >
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {stats.map((stat, index) => (
                        <div key={index} className='p-6 rounded-2xl bg-muted/30 border border-border/50'>
                            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2'>
                                {stat.label}
                            </p>
                            <h3 className='text-2xl font-bold mb-1'>{stat.value}</h3>
                            <p className='text-xs text-muted-foreground italic leading-relaxed'>{stat.description}</p>
                        </div>
                    ))}
                </div>
            </PageCard>

            <PageCard title={t('admin.node.view.docker.info_title')} icon={Info}>
                <p className='text-sm text-muted-foreground leading-relaxed'>
                    {t('admin.node.view.docker.info_description')}
                </p>
            </PageCard>
        </div>
    );
}
