/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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
