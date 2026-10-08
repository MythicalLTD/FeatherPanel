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
import { SkeletonLine } from './AdminWidgetLoading';
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
            value: stats?.servers,
            href: '/admin/servers',
        },
        {
            name: t('admin.stats.total_users'),
            value: stats?.users,
            href: '/admin/users',
        },
        {
            name: t('admin.stats.total_nodes'),
            value: stats?.nodes,
            href: '/admin/nodes',
        },
        {
            name: t('admin.stats.total_spells'),
            value: stats?.spells,
            href: '/admin/spells',
        },
        {
            name: t('admin.stats.total_vm_nodes'),
            value: stats?.vm_nodes,
            href: '/admin/vds-nodes',
        },
        {
            name: t('admin.stats.total_vm_instances'),
            value: stats?.vm_instances,
            href: '/admin/vm-instances',
        },
    ];

    return (
        <div className='border-border/50 bg-card/50 grid grid-cols-2 overflow-hidden rounded-2xl border backdrop-blur-sm sm:grid-cols-3 xl:grid-cols-6'>
            {items.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className='group border-border/30 hover:bg-primary/5 min-w-0 border-r border-b px-4 py-3 transition-colors sm:py-4'
                >
                    <div className='min-w-0 space-y-1.5'>
                        <p className='text-muted-foreground group-hover:text-foreground text-xs leading-relaxed'>
                            {item.name}
                        </p>
                        <p
                            className='text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl'
                            aria-busy={loading}
                        >
                            {loading ? (
                                <span className='flex h-9 items-center' role='status'>
                                    <SkeletonLine className='h-7 w-12' />
                                    <span className='sr-only'>{t('common.loading')}</span>
                                </span>
                            ) : (
                                (item.value?.toLocaleString() ?? t('common.unknown'))
                            )}
                        </p>
                    </div>
                </Link>
            ))}
        </div>
    );
}
