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

    const openLocationModal = () => {
        fetchLocations();
        setLocationModalOpen(true);
    };

    const openNodeModal = () => {
        if (!formData.locationId) return;
        fetchNodes();
        setNodeModalOpen(true);
    };

    const openAllocationModal = () => {
        if (!formData.nodeId) return;
        fetchAllocations();
        setAllocationModalOpen(true);
    };

    return (
        <div className='space-y-8'>
            <PageCard
                title={t('admin.servers.form.wizard.step2_title')}
                icon={Network}
                className='animate-in fade-in-0 slide-in-from-right-4 duration-300'
            >
                <div className='space-y-6'>
                    <div className='space-y-3'>
                        <Label className='flex items-center gap-1.5'>
                            {t('admin.servers.form.location')}
                            <span className='font-bold text-red-500'>*</span>
                        </Label>
                        <div className='flex gap-2'>
                            <div
                                role='button'
                                tabIndex={0}
                                className='bg-muted/30 border-border/50 focus-visible:ring-ring flex h-11 flex-1 cursor-pointer items-center rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                                onClick={openLocationModal}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openLocationModal();
                                    }
                                }}
                            >
                                {selectedEntities.location ? (
                                    <div className='flex items-center gap-2'>
                                        <MapPin className='text-primary h-4 w-4' />
                                        <span className='text-foreground font-medium'>
                                            {selectedEntities.location.name}
                                        </span>
                                    </div>
                                ) : (
                                    <span className='text-muted-foreground'>
                                        {t('admin.servers.form.select_location')}
                                    </span>
                                )}
                            </div>
                            <Button type='button' size='icon' onClick={openLocationModal}>
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                        <p className='text-muted-foreground text-xs'>{t('admin.servers.form.location_help')}</p>
                    </div>

                    <div className={cn('space-y-3', !formData.locationId && 'pointer-events-none opacity-50')}>
                        <Label className='flex items-center gap-1.5'>
                            {t('admin.servers.form.node')}
                            <span className='font-bold text-red-500'>*</span>
                        </Label>
                        <div className='flex gap-2'>
                            <div
                                role='button'
                                tabIndex={formData.locationId ? 0 : -1}
                                className={cn(
                                    'bg-muted/30 border-border/50 focus-visible:ring-ring flex h-11 flex-1 items-center rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                    formData.locationId ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                                )}
                                onClick={openNodeModal}
                                onKeyDown={(e) => {
                                    if (!formData.locationId) return;
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openNodeModal();
                                    }
                                }}
                            >
                                {selectedEntities.node ? (
                                    <div className='flex items-center gap-2'>
                                        <Server className='text-primary h-4 w-4' />
                                        <span className='text-foreground font-medium'>
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
                            <Button type='button' size='icon' onClick={openNodeModal} disabled={!formData.locationId}>
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                        <p className='text-muted-foreground text-xs'>{t('admin.servers.form.node_help')}</p>
                    </div>

                    <div className={cn('space-y-3', !formData.nodeId && 'pointer-events-none opacity-50')}>
                        <Label className='flex items-center gap-1.5'>
                            {t('admin.servers.form.allocation')}
                            <span className='font-bold text-red-500'>*</span>
                        </Label>
                        <div className='flex gap-2'>
                            <div
                                role='button'
                                tabIndex={formData.nodeId ? 0 : -1}
                                className={cn(
                                    'bg-muted/30 border-border/50 focus-visible:ring-ring flex h-11 flex-1 items-center rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                    formData.nodeId ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                                )}
                                onClick={openAllocationModal}
                                onKeyDown={(e) => {
                                    if (!formData.nodeId) return;
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openAllocationModal();
                                    }
                                }}
                            >
                                {selectedEntities.allocation ? (
                                    <div className='flex items-center gap-2'>
                                        <Plug className='text-primary h-4 w-4' />
                                        <span className='text-foreground font-medium'>
                                            {selectedEntities.allocation.ip}:{selectedEntities.allocation.port}
                                        </span>
                                    </div>
                                ) : (
                                    <span className='text-muted-foreground'>
                                        {t('admin.servers.form.select_allocation')}
                                    </span>
                                )}
                            </div>
                            <Button type='button' size='icon' onClick={openAllocationModal} disabled={!formData.nodeId}>
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                        <p className='text-muted-foreground text-xs'>{t('admin.servers.form.allocation_help')}</p>
                    </div>
                </div>
            </PageCard>
        </div>
    );
}
