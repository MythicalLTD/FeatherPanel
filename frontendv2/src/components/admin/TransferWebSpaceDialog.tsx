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

import { useCallback, useEffect, useRef, useState } from 'react';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from '@/contexts/TranslationContext';

interface WebNodeOption {
    id: number;
    name: string;
}

interface TransferWebSpaceDialogProps {
    uuid: string;
    currentNodeId?: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCompleted?: () => void;
}

type TransferPhase = 'idle' | 'running' | 'completed' | 'failed';

function phaseProgress(phase: TransferPhase): number {
    switch (phase) {
        case 'completed':
            return 100;
        case 'failed':
            return 100;
        case 'running':
            return 50;
        default:
            return 0;
    }
}

export function TransferWebSpaceDialog({
    uuid,
    currentNodeId,
    open,
    onOpenChange,
    onCompleted,
}: TransferWebSpaceDialogProps) {
    const { t } = useTranslation();
    const [nodes, setNodes] = useState<WebNodeOption[]>([]);
    const [destId, setDestId] = useState('');
    const [includeBackups, setIncludeBackups] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [transferPhase, setTransferPhase] = useState<TransferPhase>('idle');
    const [transferMessage, setTransferMessage] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const loadNodes = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/web-nodes?limit=200');
            const list = (data.data?.web_nodes || data.data?.nodes || data.data || []) as WebNodeOption[];
            setNodes(Array.isArray(list) ? list.filter((n) => n.id !== currentNodeId) : []);
        } catch {
            setNodes([]);
        } finally {
            setLoading(false);
        }
    }, [currentNodeId]);

    useEffect(() => {
        if (open) {
            setDestId('');
            setIncludeBackups(false);
            setTransferPhase('idle');
            setTransferMessage(null);
            void loadNodes();
        } else {
            stopPolling();
        }

        return () => stopPolling();
    }, [open, loadNodes, stopPolling]);

    const pollTransferStatus = useCallback(() => {
        stopPolling();
        pollRef.current = setInterval(async () => {
            try {
                const { data } = await axios.get(`/api/admin/webspaces/${uuid}/transfer/status`);
                const daemon = data.data?.daemon as { phase?: string; message?: string } | undefined;
                const phase = (daemon?.phase || 'running') as TransferPhase;
                setTransferPhase(phase);
                setTransferMessage(daemon?.message ?? null);

                if (phase === 'completed') {
                    stopPolling();
                    toast.success(t('webSpaces.transfer.completed'));
                    onOpenChange(false);
                    onCompleted?.();
                } else if (phase === 'failed') {
                    stopPolling();
                    toast.error(daemon?.message || t('webSpaces.transfer.failed'));
                    setSubmitting(false);
                }
            } catch {
                // keep polling while transfer may still be running
            }
        }, 2000);
    }, [uuid, stopPolling, onOpenChange, onCompleted, t]);

    const submit = async () => {
        if (!destId) {
            toast.error(t('webSpaces.transfer.selectDest'));
            return;
        }
        setSubmitting(true);
        setTransferPhase('running');
        setTransferMessage(t('webSpaces.transfer.starting'));
        try {
            await axios.post(`/api/admin/webspaces/${uuid}/transfer`, {
                dest_web_node_id: Number(destId),
                start_on_completion: true,
                include_backups: includeBackups,
            });
            toast.info(t('webSpaces.transfer.started'));
            pollTransferStatus();
        } catch (err) {
            setTransferPhase('failed');
            const message = isAxiosError(err)
                ? err.response?.data?.message || t('webSpaces.transfer.failed')
                : t('webSpaces.transfer.failed');
            setTransferMessage(message);
            toast.error(message);
            setSubmitting(false);
        }
    };

    const transferring = transferPhase === 'running';

    return (
        <Dialog
            open={open}
            onClose={() => !transferring && onOpenChange(false)}
            onOpenChange={(next) => {
                if (!next && !transferring) {
                    onOpenChange(false);
                }
            }}
        >
            <DialogHeader>
                <DialogTitle>{t('webSpaces.transfer.title')}</DialogTitle>
            </DialogHeader>
            <div className='space-y-4 p-1'>
                <p className='text-muted-foreground text-sm'>{t('webSpaces.transfer.description')}</p>
                <div className='space-y-2'>
                    <Label>{t('webSpaces.transfer.destLabel')}</Label>
                    {loading ? (
                        <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                            <Loader2 className='h-4 w-4 animate-spin' /> {t('webSpaces.transfer.loadingNodes')}
                        </div>
                    ) : (
                        <Select value={destId} onChange={(e) => setDestId(e.target.value)} disabled={transferring}>
                            <option value=''>{t('webSpaces.transfer.selectNode')}</option>
                            {nodes.map((n) => (
                                <option key={n.id} value={String(n.id)}>
                                    {n.name} (#{n.id})
                                </option>
                            ))}
                        </Select>
                    )}
                </div>

                <label className='flex items-center gap-2 text-sm'>
                    <input
                        type='checkbox'
                        checked={includeBackups}
                        disabled={transferring}
                        onChange={(e) => setIncludeBackups(e.target.checked)}
                    />
                    {t('webSpaces.transfer.includeBackups')}
                </label>

                {transferPhase !== 'idle' && (
                    <div className='space-y-2'>
                        <div className='flex items-center justify-between text-sm'>
                            <span className='text-muted-foreground capitalize'>{transferPhase}</span>
                            {transferring && <Loader2 className='h-4 w-4 animate-spin' />}
                        </div>
                        <Progress value={phaseProgress(transferPhase)} />
                        {transferMessage && <p className='text-muted-foreground text-xs'>{transferMessage}</p>}
                    </div>
                )}

                <div className='flex justify-end gap-2'>
                    <Button variant='outline' onClick={() => onOpenChange(false)} disabled={submitting && transferring}>
                        {transferring ? t('webSpaces.transfer.closeWhenDone') : t('common.cancel')}
                    </Button>
                    <Button onClick={() => void submit()} disabled={submitting || !destId || transferring}>
                        {submitting ? (
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        ) : (
                            <ArrowLeftRight className='mr-2 h-4 w-4' />
                        )}
                        {t('webSpaces.transfer.submit')}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
