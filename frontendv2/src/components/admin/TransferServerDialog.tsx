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

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { getFeatherpanelApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { HeadlessModal } from '@/components/ui/headless-modal';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeftRight, ChevronRight, Loader2, Search, ShieldCheck } from 'lucide-react';
import { ApiAllocation, ApiNode, ApiServer } from '@/types/adminServerTypes';

interface TransferServerDialogProps {
    server: ApiServer | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCompleted?: () => void;
}

export function TransferServerDialog({ server, open, onOpenChange, onCompleted }: TransferServerDialogProps) {
    const { t } = useTranslation();

    const [nodes, setNodes] = useState<ApiNode[]>([]);
    const [nodeSearch, setNodeSearch] = useState('');
    const [loadingNodes, setLoadingNodes] = useState(false);
    const [nodeModalOpen, setNodeModalOpen] = useState(false);

    const [allocations, setAllocations] = useState<ApiAllocation[]>([]);
    const [allocationSearch, setAllocationSearch] = useState('');
    const [loadingAllocations, setLoadingAllocations] = useState(false);
    const [allocationModalOpen, setAllocationModalOpen] = useState(false);

    const [selectedNode, setSelectedNode] = useState<ApiNode | null>(null);
    const [selectedAllocation, setSelectedAllocation] = useState<ApiAllocation | null>(null);
    const [autoAllocate, setAutoAllocate] = useState(true);
    const [autoOpenPorts, setAutoOpenPorts] = useState(false);

    const [allocationsNeeded, setAllocationsNeeded] = useState(1);
    const [freeOnDestination, setFreeOnDestination] = useState<number | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [transferError, setTransferError] = useState<string | null>(null);

    const resetState = useCallback(() => {
        setSelectedNode(null);
        setSelectedAllocation(null);
        setAutoAllocate(true);
        setAutoOpenPorts(false);
        setAllocationsNeeded(1);
        setFreeOnDestination(null);
        setTransferError(null);
        setNodeSearch('');
        setAllocationSearch('');
    }, []);

    useEffect(() => {
        if (!open) {
            resetState();
        }
    }, [open, resetState]);

    const loadServerAllocations = useCallback(async (serverId: number) => {
        try {
            const { data } = await axios.get(`/api/admin/servers/${serverId}/allocations`);
            const count = (data?.data?.allocations || []).length;
            setAllocationsNeeded(Math.max(1, count));
        } catch {
            setAllocationsNeeded(1);
        }
    }, []);

    useEffect(() => {
        if (open && server) {
            loadServerAllocations(server.id);
        }
    }, [open, server, loadServerAllocations]);

    const fetchNodes = async (search = '') => {
        if (!server) return;
        setLoadingNodes(true);
        try {
            const { data } = await axios.get('/api/admin/nodes', {
                params: { limit: 50, search: search || undefined },
            });
            const list = (data?.data?.nodes || []) as ApiNode[];
            setNodes(list.filter((n) => n.id !== server.node_id));
        } catch {
            toast.error(t('admin.servers.transfer.fetch_nodes_failed'));
        } finally {
            setLoadingNodes(false);
        }
    };

    const loadDestinationPreview = async (nodeId: number) => {
        setLoadingPreview(true);
        try {
            const { data } = await axios.get('/api/admin/allocations', {
                params: { node_id: nodeId, not_used: true, limit: 1, page: 1 },
            });
            setFreeOnDestination(data?.data?.pagination?.total_records ?? 0);
        } catch {
            setFreeOnDestination(null);
        } finally {
            setLoadingPreview(false);
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
            setAllocations(data.data.allocations || []);
        } catch {
            toast.error(t('admin.servers.transfer.fetch_allocations_failed'));
        } finally {
            setLoadingAllocations(false);
        }
    };

    const handleSelectNode = (node: ApiNode) => {
        setSelectedNode(node);
        setSelectedAllocation(null);
        setTransferError(null);
        setNodeModalOpen(false);
        loadDestinationPreview(node.id);
    };

    const hasEnoughAllocations = !autoAllocate || freeOnDestination === null || freeOnDestination >= allocationsNeeded;

    const canSubmit =
        selectedNode &&
        (autoAllocate || selectedAllocation) &&
        (hasEnoughAllocations || (autoAllocate && autoOpenPorts)) &&
        !submitting &&
        !loadingPreview;

    const initiateTransfer = async () => {
        if (!server || !selectedNode || !canSubmit) return;

        setSubmitting(true);
        setTransferError(null);
        try {
            const payload: {
                destination_node_id: number;
                destination_allocation_id?: number;
                auto_allocate?: boolean;
                auto_open_ports?: boolean;
            } = {
                destination_node_id: selectedNode.id,
                auto_allocate: autoAllocate,
            };
            if (autoAllocate && autoOpenPorts) {
                payload.auto_open_ports = true;
            }
            if (!autoAllocate && selectedAllocation) {
                payload.destination_allocation_id = selectedAllocation.id;
            }
            await axios.post(`/api/admin/servers/${server.id}/transfer`, payload);
            toast.success(t('admin.servers.messages.transfer_initiated'));
            onOpenChange(false);
            onCompleted?.();
        } catch (error) {
            console.error('Error initiating transfer:', error);
            const message = getFeatherpanelApiErrorMessage(error) ?? t('admin.servers.messages.transfer_failed');
            setTransferError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <HeadlessModal
                isOpen={open}
                onClose={() => !submitting && onOpenChange(false)}
                title={t('admin.servers.transfer.title')}
                description={t('admin.servers.transfer.description')}
                className='max-w-xl'
            >
                <div className='space-y-6 px-6 pb-6'>
                    {server && (
                        <p className='text-muted-foreground text-sm'>
                            <span className='text-foreground font-medium'>{server.name}</span>
                            <span className='text-muted-foreground/50 mx-2'>·</span>
                            {server.node?.name || 'Unknown'}
                        </p>
                    )}

                    <div className='space-y-2'>
                        <label className='text-sm font-medium'>{t('admin.servers.transfer.destination_node')}</label>
                        <Button
                            variant='outline'
                            className='h-11 w-full justify-between px-4'
                            onClick={() => {
                                fetchNodes();
                                setNodeModalOpen(true);
                            }}
                            disabled={submitting}
                        >
                            <span className={selectedNode ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                                {selectedNode
                                    ? `${selectedNode.name} (${selectedNode.fqdn})`
                                    : t('admin.servers.transfer.select_node')}
                            </span>
                            <ChevronRight className='text-muted-foreground h-4 w-4' />
                        </Button>
                        {selectedNode && (
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.servers.transfer.allocations_needed')}:{' '}
                                <span className='text-foreground font-medium'>{allocationsNeeded}</span>
                                <span className='mx-2'>·</span>
                                {t('admin.servers.transfer.free_on_destination')}:{' '}
                                <span className='text-foreground font-medium'>
                                    {loadingPreview ? (
                                        <Loader2 className='inline h-3.5 w-3.5 animate-spin' />
                                    ) : (
                                        (freeOnDestination ?? '—')
                                    )}
                                </span>
                            </p>
                        )}
                    </div>

                    {selectedNode &&
                        autoAllocate &&
                        !loadingPreview &&
                        freeOnDestination !== null &&
                        !hasEnoughAllocations && (
                            <p className='text-sm text-red-500'>
                                {t('admin.servers.transfer.insufficient_allocations', {
                                    needed: String(allocationsNeeded),
                                    found: String(freeOnDestination),
                                })}
                                {!autoOpenPorts && (
                                    <span className='mt-1 block text-xs text-red-400'>
                                        {t('admin.servers.transfer.insufficient_allocations_hint')}
                                    </span>
                                )}
                            </p>
                        )}

                    <div className='space-y-4'>
                        <label className='flex cursor-pointer items-start gap-3'>
                            <Checkbox
                                checked={autoAllocate}
                                onCheckedChange={(v) => {
                                    const enabled = v === true;
                                    setAutoAllocate(enabled);
                                    if (enabled) {
                                        setSelectedAllocation(null);
                                    } else {
                                        setAutoOpenPorts(false);
                                    }
                                }}
                                disabled={submitting}
                                className='mt-0.5'
                            />
                            <div>
                                <p className='text-sm font-medium'>{t('admin.servers.transfer.auto_allocate')}</p>
                                <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>
                                    {t('admin.servers.transfer.auto_allocate_help')}
                                </p>
                            </div>
                        </label>

                        {autoAllocate && (
                            <label className='flex cursor-pointer items-start gap-3 pl-1'>
                                <Checkbox
                                    checked={autoOpenPorts}
                                    onCheckedChange={(v) => setAutoOpenPorts(v === true)}
                                    disabled={submitting}
                                    className='mt-0.5'
                                />
                                <div>
                                    <p className='text-sm font-medium'>{t('admin.servers.transfer.auto_open_ports')}</p>
                                    <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>
                                        {t('admin.servers.transfer.auto_open_ports_help')}
                                    </p>
                                </div>
                            </label>
                        )}
                    </div>

                    {!autoAllocate && (
                        <div className='space-y-2'>
                            <label className='text-sm font-medium'>
                                {t('admin.servers.transfer.destination_allocation')}
                            </label>
                            <Button
                                variant='outline'
                                className='h-11 w-full justify-between px-4'
                                onClick={() => {
                                    if (selectedNode) {
                                        fetchAllocations(selectedNode.id);
                                        setAllocationModalOpen(true);
                                    } else {
                                        toast.error(t('admin.servers.transfer.select_node'));
                                    }
                                }}
                                disabled={submitting || !selectedNode}
                            >
                                <span
                                    className={
                                        selectedAllocation ? 'text-foreground font-medium' : 'text-muted-foreground'
                                    }
                                >
                                    {selectedAllocation
                                        ? `${selectedAllocation.ip}:${selectedAllocation.port}`
                                        : t('admin.servers.transfer.select_allocation')}
                                </span>
                                <ChevronRight className='text-muted-foreground h-4 w-4' />
                            </Button>
                        </div>
                    )}

                    {transferError && (
                        <p className='text-sm text-red-500'>
                            <span className='font-medium'>{t('admin.servers.transfer.error_title')}: </span>
                            {transferError}
                        </p>
                    )}

                    <div className='bg-muted/40 flex gap-3 rounded-lg p-3'>
                        <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0 text-amber-500' />
                        <div className='space-y-1.5'>
                            <p className='text-xs font-medium text-amber-500/90'>
                                {t('admin.servers.transfer.beta_title')}
                            </p>
                            <p className='text-muted-foreground text-xs leading-relaxed'>
                                {t('admin.servers.transfer.warning_text')}
                            </p>
                        </div>
                    </div>

                    <div className='flex justify-end gap-2 pt-2'>
                        <Button variant='outline' onClick={() => onOpenChange(false)} disabled={submitting}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={initiateTransfer}
                            disabled={!canSubmit}
                            loading={submitting}
                            className='bg-amber-500 text-white hover:bg-amber-600'
                        >
                            <ArrowLeftRight className='mr-2 h-4 w-4' />
                            {submitting ? t('admin.servers.transfer.submitting') : t('admin.servers.transfer.submit')}
                        </Button>
                    </div>
                </div>
            </HeadlessModal>

            <HeadlessModal
                isOpen={nodeModalOpen}
                onClose={() => setNodeModalOpen(false)}
                title={t('admin.servers.transfer.destination_node')}
            >
                <div className='space-y-4 px-6 pb-6'>
                    <div className='relative'>
                        <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                        <Input
                            placeholder={t('admin.servers.transfer.search_nodes')}
                            value={nodeSearch}
                            onChange={(e) => {
                                setNodeSearch(e.target.value);
                                fetchNodes(e.target.value);
                            }}
                            className='h-11 pl-10'
                        />
                    </div>
                    <div className='custom-scrollbar max-h-87.5 space-y-2 overflow-y-auto pr-1'>
                        {loadingNodes ? (
                            <div className='flex justify-center py-10'>
                                <Loader2 className='text-primary h-6 w-6 animate-spin' />
                            </div>
                        ) : nodes.length === 0 ? (
                            <div className='text-muted-foreground py-10 text-center'>{t('common.no_results')}</div>
                        ) : (
                            nodes.map((node) => (
                                <button
                                    key={node.id}
                                    type='button'
                                    onClick={() => handleSelectNode(node)}
                                    className={`hover:bg-muted/50 w-full rounded-lg p-3 text-left transition-colors ${
                                        selectedNode?.id === node.id ? 'bg-primary/10' : ''
                                    }`}
                                >
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <p className='text-sm font-bold'>{node.name}</p>
                                            <p className='text-muted-foreground text-xs'>{node.fqdn}</p>
                                        </div>
                                        {selectedNode?.id === node.id && (
                                            <ShieldCheck className='text-primary h-5 w-5' />
                                        )}
                                    </div>
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
                <div className='space-y-4 px-6 pb-6'>
                    <div className='relative'>
                        <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                        <Input
                            placeholder={t('admin.servers.transfer.search_allocations')}
                            value={allocationSearch}
                            onChange={(e) => {
                                setAllocationSearch(e.target.value);
                                if (selectedNode) fetchAllocations(selectedNode.id, e.target.value);
                            }}
                            className='h-11 pl-10'
                        />
                    </div>
                    <div className='custom-scrollbar max-h-87.5 space-y-2 overflow-y-auto pr-1'>
                        {loadingAllocations ? (
                            <div className='flex justify-center py-10'>
                                <Loader2 className='text-primary h-6 w-6 animate-spin' />
                            </div>
                        ) : allocations.length === 0 ? (
                            <div className='text-muted-foreground py-10 text-center'>
                                {t('admin.servers.transfer.no_free_allocations')}
                            </div>
                        ) : (
                            allocations.map((allc) => (
                                <button
                                    key={allc.id}
                                    type='button'
                                    onClick={() => {
                                        setSelectedAllocation(allc);
                                        setTransferError(null);
                                        setAllocationModalOpen(false);
                                    }}
                                    className={`hover:bg-muted/50 w-full rounded-lg p-3 text-left transition-colors ${
                                        selectedAllocation?.id === allc.id ? 'bg-primary/10' : ''
                                    }`}
                                >
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <p className='text-sm font-bold'>
                                                {allc.ip}:{allc.port}
                                            </p>
                                            <p className='text-muted-foreground text-xs'>
                                                {allc.ip_alias || 'No Alias'}
                                            </p>
                                        </div>
                                        {selectedAllocation?.id === allc.id && (
                                            <ShieldCheck className='text-primary h-5 w-5' />
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </HeadlessModal>
        </>
    );
}
