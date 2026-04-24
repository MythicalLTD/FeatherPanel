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

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/featherui/Input';
import { HeadlessModal } from '@/components/ui/headless-modal';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Pause, Play, Trash2, AlertTriangle, ArrowLeftRight, Search, ChevronRight, Loader2 } from 'lucide-react';
import { ApiNode, ApiAllocation } from '@/types/adminServerTypes';

interface ActionsTabProps {
    serverId: string;
    serverName: string;
    isSuspended: boolean;
    currentNodeId?: number | null;
    onRefresh: () => void;
}

export function ActionsTab({ serverId, serverName, isSuspended, currentNodeId, onRefresh }: ActionsTabProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const [suspending, setSuspending] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [isHardDelete, setIsHardDelete] = useState(false);
    const [transferring, setTransferring] = useState(false);
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [nodeModalOpen, setNodeModalOpen] = useState(false);
    const [allocationModalOpen, setAllocationModalOpen] = useState(false);
    const [selectedNode, setSelectedNode] = useState<ApiNode | null>(null);
    const [selectedAllocation, setSelectedAllocation] = useState<ApiAllocation | null>(null);
    const [nodes, setNodes] = useState<ApiNode[]>([]);
    const [allocations, setAllocations] = useState<ApiAllocation[]>([]);
    const [nodeSearch, setNodeSearch] = useState('');
    const [allocationSearch, setAllocationSearch] = useState('');
    const [loadingNodes, setLoadingNodes] = useState(false);
    const [loadingAllocations, setLoadingAllocations] = useState(false);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleSuspend = async () => {
        setSuspending(true);
        try {
            await axios.post(`/api/admin/servers/${serverId}/suspend`);
            toast.success(t('admin.servers.edit.actions.suspend_success'));
            onRefresh();
        } catch (error) {
            console.error('Error suspending server:', error);
            toast.error(t('admin.servers.edit.actions.suspend_failed'));
        } finally {
            setSuspending(false);
        }
    };

    const handleUnsuspend = async () => {
        setSuspending(true);
        try {
            await axios.post(`/api/admin/servers/${serverId}/unsuspend`);
            toast.success(t('admin.servers.edit.actions.unsuspend_success'));
            onRefresh();
        } catch (error) {
            console.error('Error unsuspending server:', error);
            toast.error(t('admin.servers.edit.actions.unsuspend_failed'));
        } finally {
            setSuspending(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const endpoint = isHardDelete ? `/api/admin/servers/${serverId}/hard` : `/api/admin/servers/${serverId}`;
            await axios.delete(endpoint);
            toast.success(
                t(
                    isHardDelete
                        ? 'admin.servers.messages.hard_delete_success'
                        : 'admin.servers.edit.actions.delete_success',
                ),
            );
            router.push('/admin/servers');
        } catch (error) {
            console.error('Error deleting server:', error);
            toast.error(t('admin.servers.edit.actions.delete_failed'));
            setDeleting(false);
        }
    };

    const fetchNodes = async (search = '') => {
        setLoadingNodes(true);
        try {
            const { data } = await axios.get('/api/admin/nodes', {
                params: { limit: 50, search: search || undefined },
            });
            const next = (data?.data?.nodes || []) as ApiNode[];
            setNodes(next.filter((n) => String(n.id) !== String(currentNodeId ?? '')));
        } catch (error) {
            console.error('Error fetching nodes:', error);
            toast.error(t('admin.servers.transfer.fetch_nodes_failed', { defaultValue: 'Failed to fetch nodes.' }));
        } finally {
            setLoadingNodes(false);
        }
    };

    const fetchAllocations = async (nodeId: number, search = '') => {
        setLoadingAllocations(true);
        try {
            const { data } = await axios.get('/api/admin/allocations', {
                params: {
                    limit: 50,
                    node_id: nodeId,
                    not_used: true,
                    search: search || undefined,
                },
            });
            setAllocations((data?.data?.allocations || []) as ApiAllocation[]);
        } catch (error) {
            console.error('Error fetching allocations:', error);
            toast.error(
                t('admin.servers.transfer.fetch_allocations_failed', { defaultValue: 'Failed to fetch allocations.' }),
            );
        } finally {
            setLoadingAllocations(false);
        }
    };

    const handleTransfer = async () => {
        if (!selectedNode || !selectedAllocation) return;
        setTransferring(true);
        try {
            await axios.post(`/api/admin/servers/${serverId}/transfer`, {
                destination_node_id: selectedNode.id,
                destination_allocation_id: selectedAllocation.id,
            });
            toast.success(t('admin.servers.messages.transfer_initiated'));
            setTransferDialogOpen(false);
            onRefresh();
        } catch (error) {
            console.error('Error transferring server:', error);
            toast.error(t('admin.servers.messages.transfer_failed'));
        } finally {
            setTransferring(false);
        }
    };

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.servers.edit.actions.suspension_title')}
                description={t('admin.servers.edit.actions.suspension_description')}
            >
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                        <span className='text-sm'>{t('admin.servers.edit.actions.status')}:</span>
                        <Badge variant={isSuspended ? 'destructive' : 'default'}>
                            {isSuspended
                                ? t('admin.servers.edit.actions.suspended')
                                : t('admin.servers.edit.actions.active')}
                        </Badge>
                    </div>
                    {isSuspended ? (
                        <Button variant='outline' onClick={handleUnsuspend} loading={suspending}>
                            <Play className='h-4 w-4 mr-2' />
                            {t('admin.servers.edit.actions.unsuspend')}
                        </Button>
                    ) : (
                        <Button variant='destructive' onClick={handleSuspend} loading={suspending}>
                            <Pause className='h-4 w-4 mr-2' />
                            {t('admin.servers.edit.actions.suspend')}
                        </Button>
                    )}
                </div>
            </PageCard>

            <PageCard
                title={t('admin.servers.edit.actions.delete_title')}
                description={t('admin.servers.edit.actions.delete_description')}
            >
                <div className='flex items-center gap-2'>
                    <Button
                        variant='outline'
                        className='border-destructive text-destructive hover:bg-destructive/10'
                        onClick={() => {
                            setIsHardDelete(false);
                            setDeleteDialogOpen(true);
                        }}
                    >
                        <Trash2 className='h-4 w-4 mr-2' />
                        {t('admin.servers.edit.actions.soft_delete')}
                    </Button>
                    <Button
                        variant='destructive'
                        onClick={() => {
                            setIsHardDelete(true);
                            setDeleteDialogOpen(true);
                        }}
                    >
                        <Trash2 className='h-4 w-4 mr-2' />
                        {t('admin.servers.edit.actions.hard_delete')}
                    </Button>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.servers.transfer.title')}
                description={t('admin.servers.transfer.description')}
            >
                <Button
                    variant='outline'
                    onClick={() => {
                        setSelectedNode(null);
                        setSelectedAllocation(null);
                        setTransferDialogOpen(true);
                    }}
                >
                    <ArrowLeftRight className='h-4 w-4 mr-2' />
                    {t('admin.servers.actions.transfer')}
                </Button>

                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className='flex items-center gap-2'>
                                <AlertTriangle className='h-5 w-5 text-red-500' />
                                {isHardDelete
                                    ? t('admin.servers.edit.actions.hard_delete_confirm_title')
                                    : t('admin.servers.edit.actions.soft_delete_confirm_title')}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {isHardDelete ? (
                                    <>
                                        <span>{t('admin.servers.edit.actions.hard_delete_confirm_description', { name: serverName })}</span>
                                        <br />
                                        <br />
                                        <span className='font-semibold text-destructive'>
                                            {t('admin.servers.edit.actions.hard_delete_target_node_warning')}
                                        </span>
                                        <br />
                                        <span className='font-semibold text-destructive'>
                                            {t('admin.servers.edit.actions.hard_delete_restore_warning')}
                                        </span>
                                    </>
                                ) : (
                                    t('admin.servers.edit.actions.soft_delete_confirm_description', { name: serverName })
                                )}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
                                {t('common.cancel')}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className='bg-red-600 hover:bg-red-700'
                                disabled={deleting}
                            >
                                {deleting ? t('common.loading') : t('admin.servers.actions.confirm_delete')}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </PageCard>

            <AlertDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.servers.transfer.title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('admin.servers.transfer.description')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className='space-y-3'>
                        <Button
                            variant='outline'
                            className='w-full justify-between'
                            onClick={() => {
                                fetchNodes();
                                setNodeModalOpen(true);
                            }}
                        >
                            <span>
                                {selectedNode
                                    ? `${selectedNode.name} (${selectedNode.fqdn})`
                                    : t('admin.servers.transfer.select_node')}
                            </span>
                            <ChevronRight className='h-4 w-4' />
                        </Button>
                        <Button
                            variant='outline'
                            className='w-full justify-between'
                            disabled={!selectedNode}
                            onClick={() => {
                                if (!selectedNode) return;
                                fetchAllocations(selectedNode.id);
                                setAllocationModalOpen(true);
                            }}
                        >
                            <span>
                                {selectedAllocation
                                    ? `${selectedAllocation.ip}:${selectedAllocation.port}`
                                    : t('admin.servers.transfer.select_allocation')}
                            </span>
                            <ChevronRight className='h-4 w-4' />
                        </Button>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleTransfer} disabled={!selectedNode || !selectedAllocation || transferring}>
                            {transferring ? <Loader2 className='h-4 w-4 animate-spin mr-2' /> : null}
                            {t('admin.servers.transfer.submit')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <HeadlessModal isOpen={nodeModalOpen} onClose={() => setNodeModalOpen(false)} title={t('admin.servers.transfer.destination_node')}>
                <div className='space-y-3'>
                    <div className='relative'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                        <Input
                            placeholder='Search nodes...'
                            className='pl-10'
                            value={nodeSearch}
                            onChange={(e) => {
                                setNodeSearch(e.target.value);
                                fetchNodes(e.target.value);
                            }}
                        />
                    </div>
                    <div className='max-h-[320px] overflow-y-auto space-y-2'>
                        {loadingNodes ? (
                            <div className='py-8 text-center'>
                                <Loader2 className='h-5 w-5 animate-spin mx-auto' />
                            </div>
                        ) : (
                            nodes.map((n) => (
                                <button
                                    key={n.id}
                                    className='w-full p-3 rounded-xl border border-border/50 hover:bg-muted/50 text-left'
                                    onClick={() => {
                                        setSelectedNode(n);
                                        setSelectedAllocation(null);
                                        setNodeModalOpen(false);
                                    }}
                                >
                                    <div className='font-medium'>{n.name}</div>
                                    <div className='text-xs text-muted-foreground'>{n.fqdn}</div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </HeadlessModal>

            <HeadlessModal isOpen={allocationModalOpen} onClose={() => setAllocationModalOpen(false)} title={t('admin.servers.transfer.destination_allocation')}>
                <div className='space-y-3'>
                    <div className='relative'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                        <Input
                            placeholder='Search allocations...'
                            className='pl-10'
                            value={allocationSearch}
                            onChange={(e) => {
                                setAllocationSearch(e.target.value);
                                if (selectedNode) fetchAllocations(selectedNode.id, e.target.value);
                            }}
                        />
                    </div>
                    <div className='max-h-[320px] overflow-y-auto space-y-2'>
                        {loadingAllocations ? (
                            <div className='py-8 text-center'>
                                <Loader2 className='h-5 w-5 animate-spin mx-auto' />
                            </div>
                        ) : (
                            allocations.map((a) => (
                                <button
                                    key={a.id}
                                    className='w-full p-3 rounded-xl border border-border/50 hover:bg-muted/50 text-left'
                                    onClick={() => {
                                        setSelectedAllocation(a);
                                        setAllocationModalOpen(false);
                                    }}
                                >
                                    <div className='font-medium'>
                                        {a.ip}:{a.port}
                                    </div>
                                    <div className='text-xs text-muted-foreground'>{a.ip_alias || 'No Alias'}</div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </HeadlessModal>
        </div>
    );
}
