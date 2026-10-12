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
import { Bug, Cloud, Lightbulb, Package, Store } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
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
    const { settings } = useSettings();

    if (settings?.app_demo_yes === 'true') {
        return null;
    }

    const items: HubItem[] = [
        {
            name: t('admin.cloud_hub.premium'),
            description: t('admin.cloud_hub.premium_desc'),
            href: '/admin/featherpanel-premium',
            icon: Package,
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
            color: 'text-primary',
            bg: 'bg-primary/10',
            border: 'border-primary/20',
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
            className='space-y-4 p-4 sm:p-5 [&>div:first-child]:flex-wrap [&>div:first-child]:gap-3 [&>div:first-child]:pb-4'
        >
            <div className='grid grid-cols-1 gap-x-6 sm:grid-cols-2 xl:grid-cols-3'>
                {items.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className='hover:bg-accent flex min-h-11 items-start gap-3 rounded-lg px-2 py-3 transition-colors'
                    >
                        <div className='text-muted-foreground flex h-6 w-5 shrink-0 items-center justify-center'>
                            <item.icon className='h-4 w-4' aria-hidden />
                        </div>
                        <div className='min-w-0 flex-1 space-y-1'>
                            <p className='text-sm font-medium'>{item.name}</p>
                            <p className='text-muted-foreground text-xs leading-relaxed'>{item.description}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </PageCard>
    );
}
