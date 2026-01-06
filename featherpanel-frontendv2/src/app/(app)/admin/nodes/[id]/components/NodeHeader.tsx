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
