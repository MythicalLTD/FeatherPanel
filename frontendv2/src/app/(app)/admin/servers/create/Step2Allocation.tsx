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

import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Label } from '@/components/ui/label';
import { Network, Search, MapPin, Server, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepProps, Location, Node, Allocation } from './types';

interface Step2Props extends StepProps {
    locations: Location[];
    nodes: Node[];
    allocations: Allocation[];
    locationModalOpen: boolean;
    setLocationModalOpen: (val: boolean) => void;
    nodeModalOpen: boolean;
    setNodeModalOpen: (val: boolean) => void;
    allocationModalOpen: boolean;
    setAllocationModalOpen: (val: boolean) => void;
    fetchLocations: () => void;
    fetchNodes: () => void;
    fetchAllocations: () => void;
}

export function Step2Allocation({
    formData,
    selectedEntities,
    setLocationModalOpen,
    setNodeModalOpen,
    setAllocationModalOpen,
    fetchLocations,
    fetchNodes,
    fetchAllocations,
}: Step2Props) {
    const { t } = useTranslation();

    return (
        <div className='space-y-8'>
            <PageCard
                title={t('admin.servers.form.wizard.step2_title')}
                icon={Network}
                className='animate-in fade-in-0 slide-in-from-right-4 duration-300'
            >
                <div className='space-y-6'>
                    {/* Location */}
                    <div className='space-y-3'>
                        <Label className='flex items-center gap-1.5'>
                            {t('admin.servers.form.location')}
                            <span className='text-red-500 font-bold'>*</span>
                        </Label>
                        <div className='flex gap-2'>
                            <div className='flex-1 h-11 px-3 bg-muted/30 rounded-xl border border-border/50 text-sm flex items-center'>
                                {selectedEntities.location ? (
                                    <div className='flex items-center gap-2'>
                                        <MapPin className='h-4 w-4 text-primary' />
                                        <span className='font-medium text-foreground'>
                                            {selectedEntities.location.name}
                                        </span>
                                    </div>
                                ) : (
                                    <span className='text-muted-foreground'>
                                        {t('admin.servers.form.select_location')}
                                    </span>
                                )}
                            </div>
                            <Button
                                type='button'
                                size='icon'
                                onClick={() => {
                                    fetchLocations();
                                    setLocationModalOpen(true);
                                }}
                            >
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                        <p className='text-xs text-muted-foreground'>{t('admin.servers.form.location_help')}</p>
                    </div>

                    {/* Node */}
                    <div className={cn('space-y-3', !formData.locationId && 'opacity-50 pointer-events-none')}>
                        <Label className='flex items-center gap-1.5'>
                            {t('admin.servers.form.node')}
                            <span className='text-red-500 font-bold'>*</span>
                        </Label>
                        <div className='flex gap-2'>
                            <div className='flex-1 h-11 px-3 bg-muted/30 rounded-xl border border-border/50 text-sm flex items-center'>
                                {selectedEntities.node ? (
                                    <div className='flex items-center gap-2'>
                                        <Server className='h-4 w-4 text-primary' />
                                        <span className='font-medium text-foreground'>
                                            {selectedEntities.node.name}
                                        </span>
                                        <span className='text-muted-foreground text-xs'>
                                            ({selectedEntities.node.fqdn})
                                        </span>
                                    </div>
                                ) : (
                                    <span className='text-muted-foreground'>{t('admin.servers.form.select_node')}</span>
                                )}
                            </div>
                            <Button
                                type='button'
                                size='icon'
                                onClick={() => {
                                    fetchNodes();
                                    setNodeModalOpen(true);
                                }}
                                disabled={!formData.locationId}
                            >
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                        <p className='text-xs text-muted-foreground'>{t('admin.servers.form.node_help')}</p>
                    </div>

                    {/* Allocation */}
                    <div className={cn('space-y-3', !formData.nodeId && 'opacity-50 pointer-events-none')}>
                        <Label className='flex items-center gap-1.5'>
                            {t('admin.servers.form.allocation')}
                            <span className='text-red-500 font-bold'>*</span>
                        </Label>
                        <div className='flex gap-2'>
                            <div className='flex-1 h-11 px-3 bg-muted/30 rounded-xl border border-border/50 text-sm flex items-center'>
                                {selectedEntities.allocation ? (
                                    <div className='flex items-center gap-2'>
                                        <Plug className='h-4 w-4 text-primary' />
                                        <span className='font-medium text-foreground'>
                                            {selectedEntities.allocation.ip}:{selectedEntities.allocation.port}
                                        </span>
                                    </div>
                                ) : (
                                    <span className='text-muted-foreground'>
                                        {t('admin.servers.form.select_allocation')}
                                    </span>
                                )}
                            </div>
                            <Button
                                type='button'
                                size='icon'
                                onClick={() => {
                                    fetchAllocations();
                                    setAllocationModalOpen(true);
                                }}
                                disabled={!formData.nodeId}
                            >
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                        <p className='text-xs text-muted-foreground'>{t('admin.servers.form.allocation_help')}</p>
                    </div>
                </div>
            </PageCard>
        </div>
    );
}
