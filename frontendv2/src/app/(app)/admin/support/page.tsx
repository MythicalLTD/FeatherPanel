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

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SshxSupportTab } from '@/components/admin/SshxSupportTab';
import { BookOpen, LifeBuoy, MessageSquare, Terminal, UploadCloud } from 'lucide-react';
import { Button } from '@/components/featherui/Button';

type SupportTab = 'sshx' | 'resources';

export default function AdminSupportPage() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<SupportTab>('sshx');

    const tabs = useMemo(
        () => [
            { id: 'sshx' as const, label: t('admin.support.tabs.sshx'), icon: Terminal },
            { id: 'resources' as const, label: t('admin.support.tabs.resources'), icon: LifeBuoy },
        ],
        [t],
    );

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.support.title')}
                description={t('admin.support.description')}
                icon={LifeBuoy}
            />

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SupportTab)}>
                <TabsList className='bg-card/30 border-border/50 flex h-auto w-full flex-wrap gap-2 rounded-2xl border p-2'>
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className='data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/10 h-auto justify-start rounded-xl border border-transparent px-4 py-2.5 text-sm font-normal whitespace-nowrap transition-all data-[state=active]:font-medium'
                            >
                                <Icon className='mr-2 h-4 w-4' />
                                {tab.label}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                <TabsContent value='sshx' className='mt-6 focus-visible:ring-0 focus-visible:outline-none'>
                    <SshxSupportTab />
                </TabsContent>

                <TabsContent value='resources' className='mt-6 focus-visible:ring-0 focus-visible:outline-none'>
                    <div className='grid gap-6 lg:grid-cols-2'>
                        <PageCard
                            title={t('admin.support.resources.logs_title')}
                            description={t('admin.support.resources.logs_description')}
                            icon={UploadCloud}
                        >
                            <Button asChild>
                                <Link href='/admin/settings'>{t('admin.support.resources.open_settings')}</Link>
                            </Button>
                        </PageCard>

                        <PageCard
                            title={t('admin.support.resources.discord_title')}
                            description={t('admin.support.resources.discord_description')}
                            icon={MessageSquare}
                        >
                            <Button variant='outline' asChild>
                                <a href='https://discord.mythical.systems' target='_blank' rel='noopener noreferrer'>
                                    {t('admin.support.resources.open_discord')}
                                </a>
                            </Button>
                        </PageCard>

                        <PageCard
                            title={t('admin.support.resources.docs_title')}
                            description={t('admin.support.resources.docs_description')}
                            icon={BookOpen}
                            className='lg:col-span-2'
                        >
                            <Button variant='outline' asChild>
                                <a href='https://docs.featherpanel.com' target='_blank' rel='noopener noreferrer'>
                                    {t('admin.support.resources.open_docs')}
                                </a>
                            </Button>
                        </PageCard>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
