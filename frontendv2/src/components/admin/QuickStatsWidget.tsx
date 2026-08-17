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

import Link from 'next/link';
import { Server, Users, HardDrive, Scroll, Cloud, Monitor, ArrowUpRight } from 'lucide-react';
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
            href: '/admin/servers',
        },
        {
            name: t('admin.stats.total_users'),
            value: stats?.users || 0,
            icon: Users,
            href: '/admin/users',
        },
        {
            name: t('admin.stats.total_nodes'),
            value: stats?.nodes || 0,
            icon: HardDrive,
            href: '/admin/nodes',
        },
        {
            name: t('admin.stats.total_spells'),
            value: stats?.spells || 0,
            icon: Scroll,
            href: '/admin/spells',
        },
        {
            name: t('admin.stats.total_vm_nodes'),
            value: stats?.vm_nodes || 0,
            icon: Cloud,
            href: '/admin/vds-nodes',
        },
        {
            name: t('admin.stats.total_vm_instances'),
            value: stats?.vm_instances || 0,
            icon: Monitor,
            href: '/admin/vm-instances',
        },
    ];

    return (
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-6'>
            {items.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className='group bg-card/30 border-border/40 hover:border-primary/40 hover:bg-card/50 relative overflow-hidden rounded-2xl border p-4 backdrop-blur-3xl transition-all duration-300 md:rounded-3xl md:p-5'
                >
                    <div className='bg-primary/0 group-hover:bg-primary/5 pointer-events-none absolute inset-0 transition-colors' />
                    <div className='relative z-10 flex items-start justify-between gap-3'>
                        <div
                            className={cn(
                                'bg-primary/10 text-primary border-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 md:h-11 md:w-11',
                            )}
                        >
                            <item.icon className='h-4 w-4 md:h-5 md:w-5' />
                        </div>
                        <ArrowUpRight className='text-muted-foreground h-4 w-4 shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-70' />
                    </div>
                    <div className='relative z-10 mt-4 min-w-0 space-y-1'>
                        <p className='text-muted-foreground truncate text-[9px] font-black tracking-widest uppercase opacity-60 md:text-[10px]'>
                            {item.name}
                        </p>
                        <h3 className='text-xl font-black tracking-tight md:text-2xl'>
                            {loading ? (
                                <div className='bg-muted mt-1 h-6 w-14 animate-pulse rounded-md' />
                            ) : (
                                item.value.toLocaleString()
                            )}
                        </h3>
                    </div>
                </Link>
            ))}
        </div>
    );
}
