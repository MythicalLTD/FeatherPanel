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
import { useSettings } from '@/contexts/SettingsContext';
import { getModuleForPath, getModuleStates } from '@/lib/modules';
import { ModuleBadge } from '@/components/ui/module-badge';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Boxes, Cpu, HardDrive, Server, Sparkles, Users, type LucideIcon } from 'lucide-react';

/** Columns per visible tile count, so the row always spans the full width. */
const STAT_GRID: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 2xl:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6',
};

type StatTone = 'sky' | 'violet' | 'emerald' | 'amber' | 'rose' | 'indigo';

/** Icon tile and soft corner glow per tile, kept readable in both themes. */
const STAT_TONES: Record<StatTone, { icon: string; glow: string }> = {
    sky: { icon: 'bg-sky-500/12 text-sky-600 dark:text-sky-400 ring-sky-500/20', glow: 'from-sky-500/12' },
    violet: {
        icon: 'bg-violet-500/12 text-violet-600 dark:text-violet-400 ring-violet-500/20',
        glow: 'from-violet-500/12',
    },
    emerald: {
        icon: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
        glow: 'from-emerald-500/12',
    },
    amber: { icon: 'bg-amber-500/12 text-amber-700 dark:text-amber-400 ring-amber-500/20', glow: 'from-amber-500/12' },
    rose: { icon: 'bg-rose-500/12 text-rose-600 dark:text-rose-400 ring-rose-500/20', glow: 'from-rose-500/12' },
    indigo: {
        icon: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20',
        glow: 'from-indigo-500/12',
    },
};

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
    const { settings } = useSettings();
    const modules = getModuleStates(settings);

    const allItems = [
        {
            name: t('admin.stats.total_servers'),
            value: stats?.servers,
            href: '/admin/servers',
            icon: Server as LucideIcon,
            tone: 'sky' as StatTone,
        },
        {
            name: t('admin.stats.total_users'),
            value: stats?.users,
            href: '/admin/users',
            icon: Users as LucideIcon,
            tone: 'violet' as StatTone,
        },
        {
            name: t('admin.stats.total_nodes'),
            value: stats?.nodes,
            href: '/admin/nodes',
            icon: HardDrive as LucideIcon,
            tone: 'emerald' as StatTone,
        },
        {
            name: t('admin.stats.total_spells'),
            value: stats?.spells,
            href: '/admin/spells',
            icon: Sparkles as LucideIcon,
            tone: 'amber' as StatTone,
        },
        {
            name: t('admin.stats.total_vm_nodes'),
            value: stats?.vm_nodes,
            href: '/admin/vds-nodes',
            icon: Cpu as LucideIcon,
            tone: 'rose' as StatTone,
        },
        {
            name: t('admin.stats.total_vm_instances'),
            value: stats?.vm_instances,
            href: '/admin/vm-instances',
            icon: Boxes as LucideIcon,
            tone: 'indigo' as StatTone,
        },
    ];
    const items = allItems
        .map((item) => ({ ...item, module: getModuleForPath(item.href) }))
        .filter((item) => !item.module || modules[item.module]);

    return (
        <div className={cn('grid gap-3', STAT_GRID[items.length] ?? STAT_GRID[6])}>
            {items.map((item, index) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        'group fp-surface fp-surface-interactive fp-lift relative min-w-0 overflow-hidden rounded-xl border p-4',
                        // An odd tile left over in the two column phone grid takes the whole row.
                        items.length % 2 === 1 && index === items.length - 1 && 'col-span-2 sm:col-span-1',
                    )}
                >
                    <span
                        aria-hidden
                        className={cn(
                            'pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-radial to-transparent opacity-80 blur-xl transition-opacity group-hover:opacity-100',
                            STAT_TONES[item.tone].glow,
                        )}
                    />
                    <div className='relative flex items-start justify-between gap-2'>
                        <p className='text-muted-foreground group-hover:text-foreground flex min-w-0 items-center gap-1.5 text-xs'>
                            <span className='truncate'>{item.name}</span>
                            {item.module && <ModuleBadge module={item.module} />}
                        </p>
                        <span
                            aria-hidden
                            className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition-transform group-hover:scale-105 motion-reduce:transition-none',
                                STAT_TONES[item.tone].icon,
                            )}
                        >
                            <item.icon className='h-4 w-4' />
                        </span>
                    </div>
                    <p
                        className='relative mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl'
                        aria-busy={loading}
                    >
                        {loading ? (
                            <span className='flex h-9 items-center' role='status'>
                                <SkeletonLine className='h-7 w-12' />
                                <span className='sr-only'>{t('common.loading')}</span>
                            </span>
                        ) : typeof item.value === 'number' ? (
                            <AnimatedNumber value={item.value} />
                        ) : (
                            t('common.unknown')
                        )}
                    </p>
                </Link>
            ))}
        </div>
    );
}
