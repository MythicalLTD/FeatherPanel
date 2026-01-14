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

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Cpu, HardDrive, LayoutGrid, Zap } from 'lucide-react';
import { NodeData, SystemInfoResponse } from '../types';

interface QuickStatsCardsProps {
    node: NodeData;
    systemInfoData: SystemInfoResponse | null;
}

export function QuickStatsCards({ node, systemInfoData }: QuickStatsCardsProps) {
    const { t } = useTranslation();

    const stats = [
        {
            title: t('admin.node.view.stats.cpu'),
            value: systemInfoData?.wings.system.cpu_threads || '0',
            subtitle: t('admin.node.view.stats.cpu_threads'),
            icon: Cpu,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
        },
        {
            title: t('admin.node.view.stats.memory'),
            value: node.memory,
            subtitle: 'MiB',
            icon: Zap,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
        },
        {
            title: t('admin.node.view.stats.disk'),
            value: node.disk,
            subtitle: 'MiB',
            icon: HardDrive,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
        },
        {
            title: t('admin.node.view.stats.docker'),
            value: systemInfoData?.wings.docker.version || 'N/A',
            subtitle: t('admin.node.view.stats.docker_version'),
            icon: LayoutGrid,
            color: 'text-green-500',
            bg: 'bg-green-500/10',
        },
    ];

    return (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6'>
            {stats.map((stat, index) => (
                <PageCard key={index} className='p-0 overflow-hidden' title=''>
                    <div className='p-6 h-full flex items-center gap-4'>
                        <div className={`p-3 rounded-2xl ${stat.bg}`}>
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div>
                            <p className='text-sm text-muted-foreground font-medium'>{stat.title}</p>
                            <div className='flex items-baseline gap-1'>
                                <h3 className='text-2xl font-bold tracking-tight'>{stat.value}</h3>
                                <span className='text-xs text-muted-foreground'>{stat.subtitle}</span>
                            </div>
                        </div>
                    </div>
                </PageCard>
            ))}
        </div>
    );
}
