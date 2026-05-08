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

import { Server, Users, HardDrive, Scroll, Cloud, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';

interface QuickStatsWidgetProps {
    stats?: {
        servers: number;
        users: number;
        nodes: number;
        spells: number;
        vm_nodes: number;
        vm_instances: number;
    };
    loading?: boolean;
}

export function QuickStatsWidget({ stats, loading }: QuickStatsWidgetProps) {
    const { t } = useTranslation();

    const items = [
        {
            name: t('admin.stats.total_servers'),
            value: stats?.servers || 0,
            icon: Server,
            color: 'text-primary',
            bg: 'bg-primary/10',
            border: 'border-primary/20',
        },
        {
            name: t('admin.stats.total_users'),
            value: stats?.users || 0,
            icon: Users,
            color: 'text-primary',
            bg: 'bg-primary/10',
            border: 'border-primary/20',
        },
        {
            name: t('admin.stats.total_nodes'),
            value: stats?.nodes || 0,
            icon: HardDrive,
            color: 'text-primary',
            bg: 'bg-primary/10',
            border: 'border-primary/20',
        },
        {
            name: t('admin.stats.total_spells'),
            value: stats?.spells || 0,
            icon: Scroll,
            color: 'text-primary',
            bg: 'bg-primary/10',
            border: 'border-primary/20',
        },
        {
            name: t('admin.stats.total_vm_nodes'),
            value: stats?.vm_nodes || 0,
            icon: Cloud,
            color: 'text-primary',
            bg: 'bg-primary/10',
            border: 'border-primary/20',
        },
        {
            name: t('admin.stats.total_vm_instances'),
            value: stats?.vm_instances || 0,
            icon: Monitor,
            color: 'text-primary',
            bg: 'bg-primary/10',
            border: 'border-primary/20',
        },
    ];

    return (
        <div className='mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:mb-8 md:gap-4 lg:grid-cols-3 xl:grid-cols-6'>
            {items.map((item, index) => (
                <div
                    key={index}
                    className='group bg-card/20 border-border/40 hover:border-primary/30 relative rounded-2xl border p-4 backdrop-blur-3xl transition-all duration-300 md:rounded-3xl md:p-5'
                >
                    <div className='flex items-center gap-3 md:gap-4'>
                        <div
                            className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/5 md:h-10 md:w-10 md:rounded-xl',
                                item.bg,
                                item.color,
                            )}
                        >
                            <item.icon className='h-4 w-4 md:h-5 md:w-5' />
                        </div>
                        <div className='min-w-0 flex-1'>
                            <p className='text-muted-foreground truncate text-[9px] font-black tracking-widest uppercase opacity-60 md:text-[10px]'>
                                {item.name}
                            </p>
                            <h3 className='text-lg font-black md:text-xl'>
                                {loading ? (
                                    <div className='bg-muted mt-1 h-5 w-12 animate-pulse rounded-md md:h-6' />
                                ) : (
                                    item.value.toLocaleString()
                                )}
                            </h3>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
