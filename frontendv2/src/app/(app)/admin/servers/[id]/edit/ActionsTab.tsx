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
import { Checkbox } from '@/components/ui/checkbox';
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
import {
    ModerationReasonFields,
    ModerationReasonValue,
    isModerationReasonValid,
} from '@/components/admin/ModerationReasonFields';
import { ModerationStatusCard, ModerationStaffActor } from '@/components/admin/ModerationStatusCard';
import { toast } from 'sonner';
import { Pause, Play, Trash2, AlertTriangle, ArrowLeftRight, Search, ChevronRight, Loader2 } from 'lucide-react';
import { ApiNode, ApiAllocation } from '@/types/adminServerTypes';

interface ActionsTabProps {
    serverId: string;
    serverName: string;
    isSuspended: boolean;
    suspensionReason?: string | null;
    suspendedAt?: string | null;
    suspendedBy?: ModerationStaffActor | null;
    currentNodeId?: number | null;
    onRefresh: () => void;
}

const emptyReason: ModerationReasonValue = {
    reason_category: '',
    reason_details: '',
};

export function ActionsTab({
    serverId,
    serverName,
    isSuspended,
    suspensionReason,
    suspendedAt,
    suspendedBy,
    currentNodeId,
    onRefresh,
}: ActionsTabProps) {
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
    const [autoAllocate, setAutoAllocate] = useState(true);
    const [nodes, setNodes] = useState<ApiNode[]>([]);
    const [allocations, setAllocations] = useState<ApiAllocation[]>([]);
    const [nodeSearch, setNodeSearch] = useState('');
    const [allocationSearch, setAllocationSearch] = useState('');
    const [loadingNodes, setLoadingNodes] = useState(false);
    const [loadingAllocations, setLoadingAllocations] = useState(false);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
    const [suspendReason, setSuspendReason] = useState<ModerationReasonValue>(emptyReason);

    const handleSuspend = async () => {
        if (!isModerationReasonValid(suspendReason)) {
            toast.error(t('admin.moderation.reason_required'));
            return;
        }

        setSuspending(true);
        try {
            await axios.post(`/api/admin/servers/${serverId}/suspend`, suspendReason);
            toast.success(t('admin.servers.edit.actions.suspend_success'));
            setSuspendDialogOpen(false);
            setSuspendReason(emptyReason);
            onRefresh();
        } catch (error: unknown) {
            console.error('Error suspending server:', error);
            const message =
                axios.isAxiosError(error) && error.response?.data?.message
                    ? String(error.response.data.message)
                    : t('admin.servers.edit.actions.suspend_failed');
            toast.error(message);
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
        if (!selectedNode || (!autoAllocate && !selectedAllocation)) return;
        setTransferring(true);
        try {
            const payload: {
                destination_node_id: number;
                destination_allocation_id?: number;
                auto_allocate?: boolean;
            } = {
                destination_node_id: selectedNode.id,
                auto_allocate: autoAllocate,
            };
            if (!autoAllocate && selectedAllocation) {
                payload.destination_allocation_id = selectedAllocation.id;
            }
            await axios.post(`/api/admin/servers/${serverId}/transfer`, payload);
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
                <div className='space-y-4'>
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
                                <Play className='mr-2 h-4 w-4' />
                                {t('admin.servers.edit.actions.unsuspend')}
                            </Button>
                        ) : (
                            <Button
                                variant='destructive'
                                onClick={() => {
                                    setSuspendReason(emptyReason);
                                    setSuspendDialogOpen(true);
                                }}
                                loading={suspending}
                            >
                                <Pause className='mr-2 h-4 w-4' />
                                {t('admin.servers.edit.actions.suspend')}
                            </Button>
                        )}
                    </div>

                    <ModerationStatusCard
                        active={isSuspended}
                        reason={suspensionReason}
                        actedAt={suspendedAt}
                        actedBy={suspendedBy}
                        title={t('admin.moderation.server_suspended_title')}
                        inactiveLabel={t('admin.moderation.server_not_suspended')}
                    />
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
                        <Trash2 className='mr-2 h-4 w-4' />
                        {t('admin.servers.edit.actions.soft_delete')}
                    </Button>
                    <Button
                        variant='destructive'
                        onClick={() => {
                            setIsHardDelete(true);
                            setDeleteDialogOpen(true);
                        }}
                    >
                        <Trash2 className='mr-2 h-4 w-4' />
                        {t('admin.servers.edit.actions.hard_delete')}
                    </Button>
                </div>
            </PageCard>

            <PageCard title={t('admin.servers.transfer.title')} description={t('admin.servers.transfer.description')}>
                <Button
                    variant='outline'
                    onClick={() => {
                        setSelectedNode(null);
                        setSelectedAllocation(null);
                        setAutoAllocate(true);
                        setTransferDialogOpen(true);
                    }}
                >
                    <ArrowLeftRight className='mr-2 h-4 w-4' />
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
                                        <span>
                                            {t('admin.servers.edit.actions.hard_delete_confirm_description', {
                                                name: serverName,
                                            })}
                                        </span>
                                        <br />
                                        <br />
                                        <span className='text-destructive font-semibold'>
                                            {t('admin.servers.edit.actions.hard_delete_target_node_warning')}
                                        </span>
                                        <br />
                                        <span className='text-destructive font-semibold'>
                                            {t('admin.servers.edit.actions.hard_delete_restore_warning')}
                                        </span>
                                    </>
                                ) : (
                                    t('admin.servers.edit.actions.soft_delete_confirm_description', {
                                        name: serverName,
                                    })
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

            <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
                <AlertDialogContent className='max-w-lg'>
                    <AlertDialogHeader>
                        <AlertDialogTitle className='flex items-center gap-2'>
                            <AlertTriangle className='h-5 w-5 text-red-500' />
                            {t('admin.servers.edit.actions.suspend_confirm_title')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('admin.servers.edit.actions.suspend_confirm_description', { name: serverName })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <ModerationReasonFields value={suspendReason} onChange={setSuspendReason} disabled={suspending} />
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={suspending}>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                void handleSuspend();
                            }}
                            className='bg-red-600 hover:bg-red-700'
                            disabled={suspending || !isModerationReasonValid(suspendReason)}
                        >
                            {suspending ? t('common.loading') : t('admin.servers.edit.actions.suspend')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
                        <label className='flex cursor-pointer items-start gap-3 rounded-xl border p-3'>
                            <Checkbox
                                checked={autoAllocate}
                                onCheckedChange={(v) => {
                                    const enabled = v === true;
                                    setAutoAllocate(enabled);
                                    if (enabled) setSelectedAllocation(null);
                                }}
                            />
                            <div>
                                <p className='text-sm font-medium'>{t('admin.servers.transfer.auto_allocate')}</p>
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.servers.transfer.auto_allocate_help')}
                                </p>
                            </div>
                        </label>
                        {!autoAllocate ? (
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
                        ) : null}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleTransfer}
                            disabled={!selectedNode || (!autoAllocate && !selectedAllocation) || transferring}
                        >
                            {transferring ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                            {t('admin.servers.transfer.submit')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <HeadlessModal
                isOpen={nodeModalOpen}
                onClose={() => setNodeModalOpen(false)}
                title={t('admin.servers.transfer.destination_node')}
            >
                <div className='space-y-3'>
                    <div className='relative'>
                        <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
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
                    <div className='max-h-[320px] space-y-2 overflow-y-auto'>
                        {loadingNodes ? (
                            <div className='py-8 text-center'>
                                <Loader2 className='mx-auto h-5 w-5 animate-spin' />
                            </div>
                        ) : (
                            nodes.map((n) => (
                                <button
                                    key={n.id}
                                    className='border-border/50 hover:bg-muted/50 w-full rounded-xl border p-3 text-left'
                                    onClick={() => {
                                        setSelectedNode(n);
                                        setSelectedAllocation(null);
                                        setNodeModalOpen(false);
                                    }}
                                >
                                    <div className='font-medium'>{n.name}</div>
                                    <div className='text-muted-foreground text-xs'>{n.fqdn}</div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </HeadlessModal>

            <HeadlessModal
                isOpen={allocationModalOpen}
                onClose={() => setAllocationModalOpen(false)}
                title={t('admin.servers.transfer.destination_allocation')}
            >
                <div className='space-y-3'>
                    <div className='relative'>
                        <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
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
                    <div className='max-h-[320px] space-y-2 overflow-y-auto'>
                        {loadingAllocations ? (
                            <div className='py-8 text-center'>
                                <Loader2 className='mx-auto h-5 w-5 animate-spin' />
                            </div>
                        ) : (
                            allocations.map((a) => (
                                <button
                                    key={a.id}
                                    className='border-border/50 hover:bg-muted/50 w-full rounded-xl border p-3 text-left'
                                    onClick={() => {
                                        setSelectedAllocation(a);
                                        setAllocationModalOpen(false);
                                    }}
                                >
                                    <div className='font-medium'>
                                        {a.ip}:{a.port}
                                    </div>
                                    <div className='text-muted-foreground text-xs'>{a.ip_alias || 'No Alias'}</div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </HeadlessModal>
        </div>
    );
}
