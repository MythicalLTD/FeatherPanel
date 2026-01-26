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

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { PageCard } from '@/components/featherui/PageCard';
import { Puzzle, Sparkles, Languages, Info, Store } from 'lucide-react';

export default function MarketplacePage() {
    const { t } = useTranslation();
    const router = useRouter();

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-feathercloud-marketplace');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    return (
        <div className='space-y-8 '>
            <WidgetRenderer widgets={getWidgets('admin-feathercloud-marketplace', 'top-of-page')} />

            <PageHeader
                title={t('admin.marketplace.title')}
                description={t('admin.marketplace.subtitle')}
                icon={Store}
            />

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-marketplace', 'after-header')} />

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-marketplace', 'before-content')} />

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                <ResourceCard
                    title={t('admin.marketplace.index.plugins.title')}
                    description={t('admin.marketplace.index.plugins.description')}
                    icon={Puzzle}
                    badges={[
                        {
                            label: t('admin.marketplace.index.plugins.available'),
                            className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                        },
                    ]}
                    onClick={() => router.push('/admin/feathercloud/plugins')}
                    className='border-blue-500/20 hover:border-blue-500/40'
                    highlightClassName='bg-linear-to-br from-blue-500/10 via-transparent to-transparent'
                    iconClassName='text-blue-500'
                    iconWrapperClassName='bg-blue-500/10 border-blue-500/20'
                />

                <ResourceCard
                    title={t('admin.marketplace.index.spells.title')}
                    description={t('admin.marketplace.index.spells.description')}
                    icon={Sparkles}
                    badges={[
                        {
                            label: t('admin.marketplace.index.spells.available'),
                            className: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
                        },
                    ]}
                    onClick={() => router.push('/admin/feathercloud/spells')}
                    className='border-purple-500/20 hover:border-purple-500/40'
                    highlightClassName='bg-linear-to-br from-purple-500/10 via-transparent to-transparent'
                    iconClassName='text-purple-500'
                    iconWrapperClassName='bg-purple-500/10 border-purple-500/20'
                />

                <ResourceCard
                    title={t('admin.marketplace.index.translations.title')}
                    description={t('admin.marketplace.index.translations.description')}
                    icon={Languages}
                    badges={[
                        {
                            label: t('admin.marketplace.index.translations.available'),
                            className: 'bg-green-500/10 text-green-600 border-green-500/20',
                        },
                    ]}
                    onClick={() => router.push('/admin/feathercloud/translations')}
                    className='border-green-500/20 hover:border-green-500/40'
                    highlightClassName='bg-linear-to-br from-green-500/10 via-transparent to-transparent'
                    iconClassName='text-green-500'
                    iconWrapperClassName='bg-green-500/10 border-green-500/20'
                />
            </div>

            <div className='pt-4'>
                <PageCard title={t('admin.marketplace.index.about.title')} icon={Info}>
                    <p className='text-base text-muted-foreground leading-relaxed'>
                        {t('admin.marketplace.index.about.description')}
                    </p>
                </PageCard>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-marketplace', 'bottom-of-page')} />
        </div>
    );
}
