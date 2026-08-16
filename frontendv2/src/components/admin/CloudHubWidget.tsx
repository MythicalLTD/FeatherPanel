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
import { ArrowUpRight, Bug, Cloud, Lightbulb, Package, Sparkles, Store } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface HubItem {
    name: string;
    description: string;
    href: string;
    icon: LucideIcon;
    color: string;
    bg: string;
    border: string;
}

export function CloudHubWidget() {
    const { t } = useTranslation();

    const items: HubItem[] = [
        {
            name: t('admin.cloud_hub.premium'),
            description: t('admin.cloud_hub.premium_desc'),
            href: '/admin/featherpanel-premium',
            icon: Sparkles,
            color: 'text-primary',
            bg: 'bg-primary/10',
            border: 'border-primary/20',
        },
        {
            name: t('admin.cloud_hub.marketplace'),
            description: t('admin.cloud_hub.marketplace_desc'),
            href: '/admin/feathercloud/marketplace',
            icon: Store,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
        },
        {
            name: t('admin.cloud_hub.plugins'),
            description: t('admin.cloud_hub.plugins_desc'),
            href: '/admin/plugins',
            icon: Package,
            color: 'text-fuchsia-500',
            bg: 'bg-fuchsia-500/10',
            border: 'border-fuchsia-500/20',
        },
        {
            name: t('admin.cloud_hub.report_issue'),
            description: t('admin.cloud_hub.report_issue_desc'),
            href: '/admin/feathercloud/issues',
            icon: Bug,
            color: 'text-rose-500',
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/20',
        },
        {
            name: t('admin.cloud_hub.suggest'),
            description: t('admin.cloud_hub.suggest_desc'),
            href: '/admin/feathercloud/suggestions',
            icon: Lightbulb,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
        },
        {
            name: t('admin.cloud_hub.cloud'),
            description: t('admin.cloud_hub.cloud_desc'),
            href: '/admin/cloud-management',
            icon: Cloud,
            color: 'text-sky-500',
            bg: 'bg-sky-500/10',
            border: 'border-sky-500/20',
        },
    ];

    return (
        <PageCard
            title={t('admin.cloud_hub.title')}
            description={t('admin.cloud_hub.description')}
            icon={Cloud}
            className='h-full'
        >
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                {items.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className='bg-muted/10 border-border/50 hover:border-primary/30 hover:bg-muted/20 group relative flex min-h-[6rem] items-start gap-4 rounded-2xl border p-4 transition-all hover:scale-[1.01] active:scale-[0.99] md:rounded-3xl md:p-5'
                    >
                        <div
                            className={cn(
                                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 md:h-12 md:w-12 md:rounded-2xl',
                                item.bg,
                                item.color,
                                item.border,
                            )}
                        >
                            <item.icon className='h-5 w-5' />
                        </div>
                        <div className='min-w-0 flex-1 space-y-1 pr-4'>
                            <p className='text-[11px] leading-snug font-black tracking-widest uppercase md:text-xs'>
                                {item.name}
                            </p>
                            <p className='text-muted-foreground text-[11px] leading-relaxed font-medium tracking-normal normal-case md:text-xs'>
                                {item.description}
                            </p>
                        </div>
                        <ArrowUpRight className='text-muted-foreground absolute top-4 right-4 h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-60' />
                    </Link>
                ))}
            </div>
        </PageCard>
    );
}
