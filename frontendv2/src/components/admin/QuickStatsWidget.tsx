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

import React from 'react';
import { Server, Users, HardDrive, Scroll } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';

interface QuickStatsWidgetProps {
    stats?: {
        servers: number;
        users: number;
        nodes: number;
        spells: number;
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
            color: 'text-indigo-500',
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20',
        },
        {
            name: t('admin.stats.total_users'),
            value: stats?.users || 0,
            icon: Users,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
        },
        {
            name: t('admin.stats.total_nodes'),
            value: stats?.nodes || 0,
            icon: HardDrive,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
        },
        {
            name: t('admin.stats.total_spells'),
            value: stats?.spells || 0,
            icon: Scroll,
            color: 'text-pink-500',
            bg: 'bg-pink-500/10',
            border: 'border-pink-500/20',
        },
    ];

    return (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8'>
            {items.map((item, index) => (
                <div
                    key={index}
                    className='group relative p-4 md:p-5 rounded-2xl md:rounded-3xl bg-card/20 border border-border/40 backdrop-blur-3xl hover:border-primary/30 transition-all duration-300'
                >
                    <div className='flex items-center gap-3 md:gap-4'>
                        <div
                            className={cn(
                                'h-9 w-9 md:h-10 md:w-10 rounded-lg md:rounded-xl flex items-center justify-center border border-white/5 shrink-0',
                                item.bg,
                                item.color,
                            )}
                        >
                            <item.icon className='h-4 w-4 md:h-5 md:w-5' />
                        </div>
                        <div className='min-w-0 flex-1'>
                            <p className='text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60 truncate'>
                                {item.name}
                            </p>
                            <h3 className='text-lg md:text-xl font-black'>
                                {loading ? (
                                    <div className='h-5 md:h-6 w-12 bg-muted animate-pulse rounded-md mt-1' />
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
