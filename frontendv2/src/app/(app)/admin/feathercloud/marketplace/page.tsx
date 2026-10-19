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

import { TipCard, TipGrid } from '@/components/featherui/TipCard';
import { StatusDot } from '@/components/featherui/DataTable';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ArrowRight, Info, Languages, Link2, Puzzle, Sparkles, Store } from 'lucide-react';

const SECTIONS = [
    {
        href: '/admin/feathercloud/products',
        icon: Puzzle,
        title: 'admin.marketplace.index.plugins.title',
        description: 'ui.admin.feathercloud.marketplace.teamMythicMarketplaceProductsReleasesFpa',
        badge: 'admin.marketplace.index.plugins.available',
    },
    {
        href: '/admin/feathercloud/spells',
        icon: Sparkles,
        title: 'admin.marketplace.index.spells.title',
        description: 'admin.marketplace.index.spells.description',
        badge: 'admin.marketplace.index.spells.available',
    },
    {
        href: '/admin/feathercloud/translations',
        icon: Languages,
        title: 'admin.marketplace.index.translations.title',
        description: 'admin.marketplace.index.translations.description',
        badge: 'admin.marketplace.index.translations.available',
    },
] as const;

export default function MarketplacePage() {
    const { t } = useTranslation();
    const router = useRouter();

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-feathercloud-marketplace');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-feathercloud-marketplace', 'top-of-page')} />

            <PageHeader
                title={t('admin.marketplace.title')}
                description={t('admin.marketplace.subtitle')}
                icon={Store}
            />

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-marketplace', 'after-header')} />

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-marketplace', 'before-content')} />

            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                {SECTIONS.map((section) => (
                    <button
                        key={section.href}
                        type='button'
                        onClick={() => router.push(section.href)}
                        className='fp-surface group hover:border-primary/30 flex flex-col gap-4 rounded-2xl border p-5 text-left transition-colors'
                    >
                        <div className='flex items-center justify-between'>
                            <div className='fp-icon-tile flex h-11 w-11 items-center justify-center rounded-xl'>
                                <section.icon className='h-5 w-5' />
                            </div>
                            <StatusDot tone='success'>{t(section.badge)}</StatusDot>
                        </div>
                        <div className='space-y-1'>
                            <h2 className='text-base font-semibold'>{t(section.title)}</h2>
                            <p className='text-muted-foreground text-sm leading-relaxed'>{t(section.description)}</p>
                        </div>
                        <span className='text-primary mt-auto inline-flex items-center gap-1.5 text-sm font-medium'>
                            {t('admin.marketplace.index.browse')}
                            <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
                        </span>
                    </button>
                ))}
            </div>

            <TipCard title={t('admin.marketplace.index.about.title')} icon={Info}>
                <p>{t('admin.marketplace.index.about.description')}</p>
            </TipCard>

            <TipGrid>
                <TipCard title={t('admin.marketplace.index.tips.start_title')} icon={Link2}>
                    <p>{t('admin.marketplace.index.tips.start_body')}</p>
                </TipCard>
                <TipCard title={t('admin.marketplace.index.tips.spells_title')} icon={Sparkles}>
                    <p>{t('admin.marketplace.index.tips.spells_body')}</p>
                </TipCard>
                <TipCard title={t('admin.marketplace.index.tips.translations_title')} icon={Languages}>
                    <p>{t('admin.marketplace.index.tips.translations_body')}</p>
                </TipCard>
            </TipGrid>

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-marketplace', 'bottom-of-page')} />
        </div>
    );
}
