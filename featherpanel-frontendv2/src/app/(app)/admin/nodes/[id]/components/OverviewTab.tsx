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

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { NodeData } from '../types';
import { Info, MapPin, Globe, HardDrive, Zap, Clock } from 'lucide-react';

interface OverviewTabProps {
    node: NodeData;
    locationName: string;
}

export default function OverviewTab({ node, locationName }: OverviewTabProps) {
    const { t } = useTranslation();

    const infoItems = [
        {
            label: t('admin.node.view.overview.name'),
            value: node.name,
            icon: Info,
        },
        {
            label: t('admin.node.view.overview.fqdn'),
            value: node.fqdn,
            icon: Globe,
        },
        {
            label: t('admin.node.view.overview.location'),
            value: locationName,
            icon: MapPin,
        },
        {
            label: t('admin.node.view.overview.memory'),
            value: `${node.memory} MiB`,
            icon: Zap,
        },
        {
            label: t('admin.node.view.overview.disk'),
            value: `${node.disk} MiB`,
            icon: HardDrive,
        },
        {
            label: t('admin.node.view.overview.created'),
            value: node.created_at,
            icon: Clock,
        },
    ];

    return (
        <div className='space-y-6'>
            <PageCard title={t('admin.node.view.overview.title')} icon={Info}>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
                    {infoItems.map((item, index) => (
                        <div key={index} className='flex gap-4'>
                            <div className='p-2 rounded-xl bg-primary/10 h-fit'>
                                <item.icon className='h-5 w-5 text-primary' />
                            </div>
                            <div>
                                <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1'>
                                    {item.label}
                                </p>
                                <p className='text-sm font-medium'>{item.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </PageCard>

            {node.description && (
                <PageCard title={t('admin.node.view.overview.description')} icon={Info}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>{node.description}</p>
                </PageCard>
            )}
        </div>
    );
}
