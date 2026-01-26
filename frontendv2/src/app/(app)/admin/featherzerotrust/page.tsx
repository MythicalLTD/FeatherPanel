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

import React, { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShieldCheck, Database, Eye, Settings } from 'lucide-react';

import ScannerTab from './tabs/ScannerTab';
import HashesTab from './tabs/HashesTab';
import LogsTab from './tabs/LogsTab';
import ConfigTab from './tabs/ConfigTab';

const FeatherZeroTrustPage = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'scanner' | 'hashes' | 'logs' | 'config'>('scanner');

    const tabs = [
        { id: 'scanner', label: t('admin.featherzerotrust.tabs.scanner'), icon: ShieldCheck },
        { id: 'hashes', label: t('admin.featherzerotrust.tabs.hashes'), icon: Database },
        { id: 'logs', label: t('admin.featherzerotrust.tabs.logs'), icon: Eye },
        { id: 'config', label: t('admin.featherzerotrust.tabs.config'), icon: Settings },
    ] as const;

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.featherzerotrust.title')}
                description={t('admin.featherzerotrust.description')}
            />

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
                <TabsList className='grid w-full grid-cols-4'>
                    {tabs.map((tab) => (
                        <TabsTrigger key={tab.id} value={tab.id} className='flex items-center gap-2'>
                            <tab.icon className='h-4 w-4' />
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value='scanner' className='mt-6'>
                    <ScannerTab />
                </TabsContent>

                <TabsContent value='hashes' className='mt-6'>
                    <HashesTab />
                </TabsContent>

                <TabsContent value='logs' className='mt-6'>
                    <LogsTab />
                </TabsContent>

                <TabsContent value='config' className='mt-6'>
                    <ConfigTab />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default FeatherZeroTrustPage;
