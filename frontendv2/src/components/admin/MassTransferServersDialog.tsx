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

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { HeadlessModal } from '@/components/ui/headless-modal';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowLeftRight, ChevronRight, Loader2, Search } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ApiNode {
    id: number;
    name: string;
    fqdn: string;
}

interface TransferableServer {
    id: number;
    name: string;
    uuid: string;
    status: string;
    allocations_needed: number;
}

interface MassTransferPreview {
    transferable_servers: TransferableServer[];
    skipped_servers: { id: number; name: string; reason: string }[];
    allocations_required: number;
    free_allocations_on_destination: number;
    has_enough_allocations: boolean;
    max_per_request: number;
    destination_node: { id: number; name: string };
}

interface MassTransferServersDialogProps {
    sourceNodeId: number;
    sourceNodeName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCompleted?: () => void;
}

export function MassTransferServersDialog({
    sourceNodeId,
    sourceNodeName,
    open,
    onOpenChange,
    onCompleted,
}: MassTransferServersDialogProps) {
    const { t } = useTranslation();
    const [nodes, setNodes] = useState<ApiNode[]>([]);
    const [nodeSearch, setNodeSearch] = useState('');
    const [loadingNodes, setLoadingNodes] = useState(false);
    const [nodeModalOpen, setNodeModalOpen] = useState(false);
    const [selectedNode, setSelectedNode] = useState<ApiNode | null>(null);
    const [preview, setPreview] = useState<MassTransferPreview | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [moveAll, setMoveAll] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const resetState = useCallback(() => {
        setSelectedNode(null);
        setPreview(null);
        setSelectedIds(new Set());
        setMoveAll(false);
        setNodeSearch('');
    }, []);

    useEffect(() => {
        if (!open) {
            resetState();
        }
    }, [open, resetState]);

    const fetchNodes = async (search = '') => {
        setLoadingNodes(true);
        try {
            const { data } = await axios.get('/api/admin/nodes', {
                params: { limit: 50, search: search || undefined },
            });
            const list = (data?.data?.nodes || []) as ApiNode[];
            setNodes(list.filter((n) => n.id !== sourceNodeId));
        } catch {
            toast.error(t('admin.node.mass_transfer.fetch_nodes_failed'));
        } finally {
            setLoadingNodes(false);
        }
    };

    const loadPreview = async (destinationNodeId: number) => {
        setLoadingPreview(true);
        try {
            const { data } = await axios.get(`/api/admin/nodes/${sourceNodeId}/mass-transfer/preview`, {
                params: { destination_node_id: destinationNodeId },
            });
            const payload = data?.data as MassTransferPreview;
            setPreview(payload);
            setSelectedIds(new Set(payload.transferable_servers.map((s) => s.id)));
            setMoveAll(false);
        } catch (error) {
            console.error('Mass transfer preview failed:', error);
            const message =
                isAxiosError(error) && error.response?.data?.message
                    ? String(error.response.data.message)
                    : t('admin.node.mass_transfer.preview_failed');
            toast.error(message);
            setPreview(null);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleSelectNode = (node: ApiNode) => {
        setSelectedNode(node);
        setNodeModalOpen(false);
        loadPreview(node.id);
    };

    const transferable = useMemo(() => preview?.transferable_servers ?? [], [preview]);
    const allSelected = transferable.length > 0 && selectedIds.size === transferable.length;

    const selectedCount = moveAll ? transferable.length : selectedIds.size;
    const selectedAllocNeeded = useMemo(() => {
        if (!preview) return 0;
        if (moveAll) return preview.allocations_required;
        return transferable.filter((s) => selectedIds.has(s.id)).reduce((sum, s) => sum + s.allocations_needed, 0);
    }, [preview, moveAll, transferable, selectedIds]);

    const toggleServer = (id: number) => {
        setMoveAll(false);
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        setMoveAll(false);
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(transferable.map((s) => s.id)));
        }
    };

    const handleMoveAllChange = (checked: boolean) => {
        setMoveAll(checked);
        if (checked) {
            setSelectedIds(new Set(transferable.map((s) => s.id)));
        }
    };

    const hasEnoughAllocations = preview !== null && preview.free_allocations_on_destination >= selectedAllocNeeded;

    const canSubmit =
        preview && selectedNode && selectedCount > 0 && (moveAll || selectedIds.size > 0) && hasEnoughAllocations;

    const runMassTransfer = async () => {
        if (!selectedNode || !preview) return;
        setSubmitting(true);
        try {
            const { data } = await axios.post(`/api/admin/nodes/${sourceNodeId}/mass-transfer`, {
                destination_node_id: selectedNode.id,
                move_all: moveAll,
                server_ids: moveAll ? undefined : Array.from(selectedIds),
            });
            const initiated = data?.data?.initiated_count ?? 0;
            const failed = data?.data?.failed_count ?? 0;
            const skipped = data?.data?.skipped_count ?? 0;
            toast.success(
                t('admin.node.mass_transfer.complete_summary', {
                    initiated: String(initiated),
                    failed: String(failed),
                    skipped: String(skipped),
                }),
            );
            setConfirmOpen(false);
            onOpenChange(false);
            onCompleted?.();
        } catch (error) {
            console.error('Mass transfer failed:', error);
            const message =
                isAxiosError(error) && error.response?.data?.message
                    ? String(error.response.data.message)
                    : t('admin.node.mass_transfer.failed');
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <HeadlessModal
                isOpen={open}
                onClose={() => onOpenChange(false)}
                title={t('admin.node.mass_transfer.title')}
                description={t('admin.node.mass_transfer.description', { node: sourceNodeName })}
            >
                <div className='space-y-6'>
                    <div className='space-y-2'>
                        <label className='text-sm font-bold'>{t('admin.node.mass_transfer.destination_node')}</label>
                        <Button
                            variant='outline'
                            className='border-border bg-background/50 h-12 w-full justify-between rounded-xl border px-4'
                            onClick={() => {
                                fetchNodes();
                                setNodeModalOpen(true);
                            }}
                        >
                            <span className={selectedNode ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                                {selectedNode
                                    ? `${selectedNode.name} (${selectedNode.fqdn})`
                                    : t('admin.node.mass_transfer.select_destination')}
                            </span>
                            <ChevronRight className='text-muted-foreground h-4 w-4' />
                        </Button>
                    </div>

                    {loadingPreview && (
                        <div className='flex justify-center py-8'>
                            <Loader2 className='text-primary h-8 w-8 animate-spin' />
                        </div>
                    )}

                    {preview && !loadingPreview && (
                        <>
                            <div className='bg-muted/30 grid grid-cols-2 gap-3 rounded-xl border p-4 text-sm sm:grid-cols-4'>
                                <div>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.node.mass_transfer.transferable')}
                                    </p>
                                    <p className='font-bold'>{transferable.length}</p>
                                </div>
                                <div>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.node.mass_transfer.allocations_needed')}
                                    </p>
                                    <p className='font-bold'>{selectedAllocNeeded}</p>
                                </div>
                                <div>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.node.mass_transfer.free_on_destination')}
                                    </p>
                                    <p className='font-bold'>{preview.free_allocations_on_destination}</p>
                                </div>
                                <div>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.node.mass_transfer.batch_limit')}
                                    </p>
                                    <p className='font-bold'>{preview.max_per_request}</p>
                                </div>
                            </div>

                            {!hasEnoughAllocations && selectedCount > 0 && (
                                <p className='rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600'>
                                    {t('admin.node.mass_transfer.insufficient_allocations')}
                                </p>
                            )}

                            <p className='text-muted-foreground text-xs'>
                                {t('admin.node.mass_transfer.auto_allocate_note')}
                            </p>

                            <div className='flex flex-wrap items-center gap-4 border-b pb-3'>
                                <label className='flex cursor-pointer items-center gap-2 text-sm font-medium'>
                                    <Checkbox
                                        checked={moveAll}
                                        onCheckedChange={(v) => handleMoveAllChange(v === true)}
                                    />
                                    {t('admin.node.mass_transfer.move_all', { count: String(transferable.length) })}
                                </label>
                                {!moveAll && transferable.length > 0 && (
                                    <Button variant='ghost' size='sm' type='button' onClick={toggleSelectAll}>
                                        {allSelected
                                            ? t('admin.node.mass_transfer.deselect_all')
                                            : t('admin.node.mass_transfer.select_all')}
                                    </Button>
                                )}
                            </div>

                            <div className='custom-scrollbar max-h-64 space-y-2 overflow-y-auto pr-1'>
                                {transferable.length === 0 ? (
                                    <p className='text-muted-foreground py-6 text-center text-sm'>
                                        {t('admin.node.mass_transfer.no_transferable')}
                                    </p>
                                ) : (
                                    transferable.map((server) => (
                                        <label
                                            key={server.id}
                                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                                                moveAll || selectedIds.has(server.id)
                                                    ? 'border-primary/40 bg-primary/5'
                                                    : 'border-border/50 hover:bg-muted/40'
                                            }`}
                                        >
                                            <Checkbox
                                                checked={moveAll || selectedIds.has(server.id)}
                                                disabled={moveAll}
                                                onCheckedChange={() => toggleServer(server.id)}
                                            />
                                            <div className='min-w-0 flex-1'>
                                                <p className='truncate text-sm font-bold'>{server.name}</p>
                                                <p className='text-muted-foreground text-xs'>
                                                    {t('admin.node.mass_transfer.allocations_per_server', {
                                                        count: String(server.allocations_needed),
                                                    })}
                                                </p>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>

                            {preview.skipped_servers.length > 0 && (
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.node.mass_transfer.skipped_count', {
                                        count: String(preview.skipped_servers.length),
                                    })}
                                </p>
                            )}
                        </>
                    )}

                    <div className='flex justify-end gap-2 border-t pt-4'>
                        <Button variant='outline' onClick={() => onOpenChange(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            disabled={!canSubmit}
                            onClick={() => setConfirmOpen(true)}
                            className='bg-amber-500 text-white hover:bg-amber-600'
                        >
                            <ArrowLeftRight className='mr-2 h-4 w-4' />
                            {t('admin.node.mass_transfer.start', {
                                count: String(Math.min(selectedCount, preview?.max_per_request ?? selectedCount)),
                            })}
                        </Button>
                    </div>
                </div>
            </HeadlessModal>

            <HeadlessModal
                isOpen={nodeModalOpen}
                onClose={() => setNodeModalOpen(false)}
                title={t('admin.node.mass_transfer.destination_node')}
            >
                <div className='space-y-4'>
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
                                    className='border-border/50 hover:bg-muted/50 w-full rounded-xl border p-4 text-left transition-all'
                                >
                                    <p className='text-sm font-bold'>{node.name}</p>
                                    <p className='text-muted-foreground text-xs'>{node.fqdn}</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </HeadlessModal>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.node.mass_transfer.confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('admin.node.mass_transfer.confirm_description', {
                                count: String(Math.min(selectedCount, preview?.max_per_request ?? selectedCount)),
                                source: sourceNodeName,
                                destination: selectedNode?.name ?? '',
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <p className='text-xs text-amber-600'>{t('admin.servers.transfer.warning_text')}</p>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>{t('common.cancel')}</AlertDialogCancel>
                        <Button
                            onClick={runMassTransfer}
                            disabled={submitting}
                            loading={submitting}
                            className='bg-amber-500 hover:bg-amber-600'
                        >
                            {t('admin.node.mass_transfer.confirm_submit')}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
