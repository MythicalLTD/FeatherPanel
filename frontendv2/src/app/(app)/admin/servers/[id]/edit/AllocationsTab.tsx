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

import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plug, Search, Trash2, RefreshCw } from 'lucide-react';
import { ServerAllocations, SelectedEntities } from './types';

interface AllocationsTabProps {
    serverId: string;
    selectedEntities: SelectedEntities;
    setAllocationModalOpen: (open: boolean) => void;
    fetchAllocations: () => void;
    refreshTrigger?: number;
}

export function AllocationsTab({
    serverId,
    selectedEntities,
    setAllocationModalOpen,
    fetchAllocations,
    refreshTrigger = 0,
}: AllocationsTabProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [serverAllocations, setServerAllocations] = useState<ServerAllocations>({
        allocations: [],
        server: null,
    });
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchServerAllocations = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/admin/servers/${serverId}/allocations`);
            if (data.success) {
                setServerAllocations({
                    allocations: data.data.allocations || [],
                    server: data.data.server || null,
                });
            }
        } catch (error) {
            console.error('Error fetching allocations:', error);
        } finally {
            setLoading(false);
        }
    }, [serverId]);

    useEffect(() => {
        fetchServerAllocations();
    }, [fetchServerAllocations, refreshTrigger]);

    const deleteAllocation = async (allocationId: number) => {
        setDeletingId(allocationId);
        try {
            await axios.delete(`/api/admin/servers/${serverId}/allocations/${allocationId}`);
            toast.success(t('admin.servers.edit.allocations.delete_success'));
            fetchServerAllocations();
        } catch (error) {
            console.error('Error deleting allocation:', error);
            toast.error(t('admin.servers.edit.allocations.delete_failed'));
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <PageCard
            title={t('admin.servers.edit.allocations.title')}
            description={t('admin.servers.edit.allocations.description')}
        >
            <div className='space-y-6'>
                {/* Default Allocation */}
                <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                        <label className='font-medium'>{t('admin.servers.edit.allocations.default')}</label>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={fetchServerAllocations}
                            loading={loading}
                        >
                            <RefreshCw className='h-4 w-4 mr-2' />
                            {t('common.refresh')}
                        </Button>
                    </div>
                    <div className='flex gap-2'>
                        <div className='flex-1 h-11 px-3 bg-muted/30 rounded-xl border border-border/50 text-sm flex items-center'>
                            {selectedEntities.allocation ? (
                                <div className='flex items-center gap-2'>
                                    <Plug className='h-4 w-4 text-primary' />
                                    <span className='font-medium text-foreground font-mono'>
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
                        >
                            <Search className='h-4 w-4' />
                        </Button>
                    </div>
                </div>

                {/* Allocation Status */}
                {serverAllocations.server && (
                    <div className='p-4 bg-muted/20 rounded-xl border border-border/50 flex items-center justify-between'>
                        <div className='text-sm'>
                            {t('admin.servers.edit.allocations.using')}{' '}
                            <span className='font-bold'>{serverAllocations.server.current_allocations}</span>{' '}
                            {t('admin.servers.edit.allocations.of')}{' '}
                            <span className='font-bold'>{serverAllocations.server.allocation_limit}</span>{' '}
                            {t('admin.servers.edit.allocations.allowed')}
                        </div>
                        <Badge variant={serverAllocations.server.can_add_more ? 'default' : 'destructive'}>
                            {serverAllocations.server.can_add_more
                                ? t('admin.servers.edit.allocations.can_add')
                                : t('admin.servers.edit.allocations.limit_reached')}
                        </Badge>
                    </div>
                )}

                {/* Allocations List */}
                {serverAllocations.allocations.length > 0 && (
                    <div className='space-y-2'>
                        {serverAllocations.allocations.map((allocation) => (
                            <div
                                key={allocation.id}
                                className='flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50'
                            >
                                <div className='flex items-center gap-3'>
                                    <Plug className='h-4 w-4 text-muted-foreground' />
                                    <div>
                                        <div className='font-medium font-mono'>
                                            {allocation.ip}:{allocation.port}
                                        </div>
                                        <div className='text-xs text-muted-foreground'>
                                            {allocation.ip_alias || t('admin.servers.edit.allocations.no_alias')}
                                        </div>
                                    </div>
                                    {allocation.is_primary && <Badge variant='default'>{t('common.primary')}</Badge>}
                                </div>
                                {!allocation.is_primary && (
                                    <Button
                                        type='button'
                                        variant='destructive'
                                        size='sm'
                                        onClick={() => deleteAllocation(allocation.id)}
                                        loading={deletingId === allocation.id}
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Allocation Button */}
                {serverAllocations.server?.can_add_more && (
                    <Button
                        type='button'
                        variant='outline'
                        className='w-full'
                        onClick={() => {
                            fetchAllocations();
                            setAllocationModalOpen(true);
                        }}
                    >
                        {t('admin.servers.edit.allocations.add')}
                    </Button>
                )}
            </div>
        </PageCard>
    );
}
