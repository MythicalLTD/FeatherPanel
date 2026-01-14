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
import { Button } from '@/components/featherui/Button';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Database, Network, ArrowLeft, Activity } from 'lucide-react';
import { NodeData, SystemInfoResponse } from '../types';

interface NodeHeaderProps {
    node: NodeData;
    locationName: string;
    systemInfoData: SystemInfoResponse | null;
    systemInfoError: string | null;
    onDatabases: () => void;
    onAllocations: () => void;
    onBack: () => void;
}

export function NodeHeader({
    node,
    locationName,
    systemInfoData,
    systemInfoError,
    onDatabases,
    onAllocations,
    onBack,
}: NodeHeaderProps) {
    const { t } = useTranslation();

    const isOnline = !!systemInfoData && !systemInfoError;

    return (
        <PageHeader
            title={node.name}
            description={
                <div className='flex items-center gap-2 mt-1'>
                    <span className='text-sm text-muted-foreground'>{node.fqdn}</span>
                    <span className='text-muted-foreground/30'>•</span>
                    <span className='text-sm text-muted-foreground'>{locationName}</span>
                </div>
            }
            icon={Activity}
            actions={
                <div className='flex items-center gap-3'>
                    <div className='flex items-center gap-2 mr-2 px-3 py-1.5 rounded-full bg-background/50 border border-border/50'>
                        {isOnline ? (
                            <>
                                <div className='h-2 w-2 rounded-full bg-green-500 animate-pulse' />
                                <span className='text-xs font-medium text-green-500'>
                                    {t('admin.node.health.online')}
                                </span>
                            </>
                        ) : (
                            <>
                                <div className='h-2 w-2 rounded-full bg-red-500' />
                                <span className='text-xs font-medium text-red-500'>
                                    {t('admin.node.health.offline')}
                                </span>
                            </>
                        )}
                    </div>
                    <Button variant='outline' size='sm' onClick={onBack}>
                        <ArrowLeft className='h-4 w-4 mr-2' />
                        {t('common.back')}
                    </Button>
                    <Button variant='outline' size='sm' onClick={onDatabases}>
                        <Database className='h-4 w-4 mr-2' />
                        {t('admin.node.view.databases')}
                    </Button>
                    <Button variant='outline' size='sm' onClick={onAllocations}>
                        <Network className='h-4 w-4 mr-2' />
                        {t('admin.node.view.allocations')}
                    </Button>
                </div>
            }
        />
    );
}
