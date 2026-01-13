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

// Tabs
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
