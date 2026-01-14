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
