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
import { Plug, Search, Trash2, RefreshCw, Star } from 'lucide-react';
import { ServerAllocations, SelectedEntities } from './types';

interface AllocationsTabProps {
    serverId: string;
    selectedEntities: SelectedEntities;
    openAllocationModal: (mode: 'primary' | 'assign') => void;
    refreshTrigger?: number;
}

export function AllocationsTab({
    serverId,
    selectedEntities,
    openAllocationModal,
    refreshTrigger = 0,
}: AllocationsTabProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [serverAllocations, setServerAllocations] = useState<ServerAllocations>({
        allocations: [],
        server: null,
    });
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [settingPrimaryId, setSettingPrimaryId] = useState<number | null>(null);

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

    const setPrimaryAllocation = async (allocationId: number) => {
        setSettingPrimaryId(allocationId);
        try {
            await axios.post(`/api/admin/servers/${serverId}/allocations/${allocationId}/primary`);
            toast.success(t('admin.servers.edit.allocations.primary_success'));
            fetchServerAllocations();
        } catch (error) {
            console.error('Error setting primary allocation:', error);
            toast.error(t('admin.servers.edit.allocations.primary_failed'));
        } finally {
            setSettingPrimaryId(null);
        }
    };

    return (
        <PageCard
            title={t('admin.servers.edit.allocations.title')}
            description={t('admin.servers.edit.allocations.description')}
        >
            <div className='space-y-6'>
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
                            <RefreshCw className='mr-2 h-4 w-4' />
                            {t('common.refresh')}
                        </Button>
                    </div>
                    <div className='flex gap-2'>
                        <div
                            role='button'
                            tabIndex={0}
                            className='bg-muted/30 border-border/50 focus-visible:ring-ring flex h-11 flex-1 cursor-pointer items-center rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                            onClick={() => openAllocationModal('primary')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openAllocationModal('primary');
                                }
                            }}
                        >
                            {selectedEntities.allocation ? (
                                <div className='flex items-center gap-2'>
                                    <Plug className='text-primary h-4 w-4' />
                                    <span className='text-foreground font-mono font-medium'>
                                        {selectedEntities.allocation.ip}:{selectedEntities.allocation.port}
                                    </span>
                                </div>
                            ) : (
                                <span className='text-muted-foreground'>
                                    {t('admin.servers.form.select_allocation')}
                                </span>
                            )}
                        </div>
                        <Button type='button' size='icon' onClick={() => openAllocationModal('primary')}>
                            <Search className='h-4 w-4' />
                        </Button>
                    </div>
                </div>

                {serverAllocations.server && (
                    <div className='bg-muted/20 border-border/50 flex items-center justify-between rounded-xl border p-4'>
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

                {serverAllocations.allocations.length > 0 && (
                    <div className='space-y-2'>
                        {serverAllocations.allocations.map((allocation) => (
                            <div
                                key={allocation.id}
                                className='bg-muted/20 border-border/50 flex items-center justify-between rounded-xl border p-4'
                            >
                                <div className='flex items-center gap-3'>
                                    <Plug className='text-muted-foreground h-4 w-4' />
                                    <div>
                                        <div className='font-mono font-medium'>
                                            {allocation.ip}:{allocation.port}
                                        </div>
                                        <div className='text-muted-foreground text-xs'>
                                            {allocation.ip_alias || t('admin.servers.edit.allocations.no_alias')}
                                        </div>
                                    </div>
                                    {allocation.is_primary && <Badge variant='default'>{t('common.primary')}</Badge>}
                                </div>
                                {!allocation.is_primary && (
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            onClick={() => setPrimaryAllocation(allocation.id)}
                                            loading={settingPrimaryId === allocation.id}
                                            disabled={deletingId === allocation.id}
                                        >
                                            <Star className='mr-2 h-4 w-4' />
                                            {t('admin.servers.edit.allocations.set_primary')}
                                        </Button>
                                        <Button
                                            type='button'
                                            variant='destructive'
                                            size='sm'
                                            onClick={() => deleteAllocation(allocation.id)}
                                            loading={deletingId === allocation.id}
                                            disabled={settingPrimaryId === allocation.id}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {serverAllocations.server?.can_add_more && (
                    <Button
                        type='button'
                        variant='outline'
                        className='w-full'
                        onClick={() => openAllocationModal('assign')}
                    >
                        {t('admin.servers.edit.allocations.add')}
                    </Button>
                )}
            </div>
        </PageCard>
    );
}
