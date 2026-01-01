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

'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { PageCard } from '@/components/featherui/PageCard';
import { Puzzle, Sparkles, Languages, Info, Store } from 'lucide-react';

export default function MarketplacePage() {
    const { t } = useTranslation();
    const router = useRouter();

    return (
        <div className='space-y-8 animate-in fade-in duration-500'>
            {/* Header section */}
            <PageHeader
                title={t('admin.marketplace.title')}
                description={t('admin.marketplace.subtitle')}
                icon={Store}
            />

            {/* Marketplace Grid */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {/* Plugins */}
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
                />

                {/* Spells */}
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
                />

                {/* Translations */}
                <ResourceCard
                    title={t('admin.marketplace.index.translations.title')}
                    description={t('admin.marketplace.index.translations.description')}
                    icon={Languages}
                    badges={[
                        {
                            label: t('admin.marketplace.index.translations.coming_soon'),
                            className: 'bg-muted text-muted-foreground',
                        },
                    ]}
                    className='opacity-75 grayscale-[0.5]'
                />
            </div>

            {/* Info Section */}
            <div className='pt-4'>
                <PageCard title={t('admin.marketplace.index.about.title')} icon={Info}>
                    <p className='text-base text-muted-foreground leading-relaxed'>
                        {t('admin.marketplace.index.about.description')}
                    </p>
                </PageCard>
            </div>
        </div>
    );
}
