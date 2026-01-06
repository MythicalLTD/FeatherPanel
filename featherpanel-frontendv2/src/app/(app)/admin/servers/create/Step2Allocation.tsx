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
