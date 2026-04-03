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

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import {
    Plus,
    Loader2,
    Archive,
    RefreshCw,
    Search,
    HardDrive,
    Calendar,
    AlertTriangle,
    RotateCcw,
    Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useVmInstance } from '@/contexts/VmInstanceContext';
import { cn, formatMib } from '@/lib/utils';

import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

type VmBackup = {
    id: number;
    vm_instance_id: number;
    vmid: number;
    storage: string;
    volid: string;
    size_bytes: number;
    ctime: number;
    format?: string | null;
    status?: string;
};

type ListBackupsResponse = {
    success: boolean;
    data: {
        backups: VmBackup[];
        backup_limit: number;
        storages: string[];
        fifo_rolling_enabled?: boolean;
        panel_backup_retention_mode?: string;
        effective_backup_retention_mode?: string;
    };
    message?: string;
};

export default function VdsBackupsPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { t } = useTranslation();
    const { instance, loading: instanceLoading } = useVmInstance();
    const { fetchWidgets, getWidgets } = usePluginWidgets('vds-backups');

    const [backups, setBackups] = useState<VmBackup[]>([]);
    const [backupLimit, setBackupLimit] = useState<number>(0);
    const [fifoRolling, setFifoRolling] = useState(false);
    const [, setStorages] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [search, setSearch] = useState('');

    const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
    const [selectedForDelete, setSelectedForDelete] = useState<VmBackup | null>(null);
    const [selectedForRestore, setSelectedForRestore] = useState<VmBackup | null>(null);

    const fetchBackups = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const { data } = await axios.get<ListBackupsResponse>(`/api/user/vm-instances/${id}/backups`);
            if (!data.success) {
                toast.error(data.message || 'Failed to fetch backups');
                return;
            }
            setBackups(data.data.backups || []);
            setBackupLimit(data.data.backup_limit ?? 0);
            setFifoRolling(Boolean(data.data.fifo_rolling_enabled));
            setStorages(data.data.storages || []);
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (!instanceLoading && !instance) {
            router.push('/dashboard');
            return;
        }
        if (!instanceLoading) {
            fetchBackups();
        }
    }, [instanceLoading, instance, fetchBackups, router]);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        // Auto-refresh if any backup is pending or recently created
        const hasPending = backups.some((b) => b.status === 'pending' || b.status === 'running');
        const hasRecent = backups.some((b) => {
            const created = b.ctime ? b.ctime * 1000 : 0;
            return created > Date.now() - 120_000;
        });

        if (!hasPending && !hasRecent) return;

        const interval = setInterval(() => {
            fetchBackups();
        }, 5000);
        return () => clearInterval(interval);
    }, [backups, fetchBackups]);

    const limitReached = backupLimit > 0 && backups.length >= backupLimit && !fifoRolling;

    const handleCreateBackup = async () => {
        if (limitReached) {
            toast.error(
                t('serverBackups.backupLimitReachedDescription', {
                    limit: String(backupLimit),
                }),
            );
            return;
        }
        setCreating(true);
        try {
            const { data } = await axios.post(`/api/user/vm-instances/${id}/backups`, {
                // Storage is enforced server-side from the VDS node default.
            });
            if (!data.success) {
                toast.error(data.message || 'Failed to start backup');
                return;
            }
            toast.success('Backup started. This may take a few minutes.');
            setConfirmCreateOpen(false);
            fetchBackups();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteBackup = async () => {
        if (!selectedForDelete) return;
        setDeleting(true);
        try {
            const { data } = await axios.delete(`/api/user/vm-instances/${id}/backups`, {
                data: {
                    volid: selectedForDelete.volid,
                    storage: selectedForDelete.storage,
                },
            });
            if (!data.success) {
                toast.error(data.message || 'Failed to delete backup');
                return;
            }
            toast.success('Backup deleted');
            setConfirmDeleteOpen(false);
            setSelectedForDelete(null);
            fetchBackups();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setDeleting(false);
        }
    };

    const handleRestoreBackup = async () => {
        if (!selectedForRestore) return;
        setRestoring(true);
        try {
            const { data } = await axios.post(`/api/user/vm-instances/${id}/backups/restore`, {
                volid: selectedForRestore.volid,
                storage: selectedForRestore.storage,
            });
            if (!data.success) {
                toast.error(data.message || 'Failed to start restore');
                return;
            }
            const restoreId = data.data?.restore_id;
            toast.success('Restore started. This may take several minutes.');
            setConfirmRestoreOpen(false);
            setSelectedForRestore(null);

            // Poll restore status
            if (restoreId) {
                pollRestoreStatus(restoreId);
            }
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setRestoring(false);
        }
    };

    const pollRestoreStatus = async (restoreId: string) => {
        const maxAttempts = 120; // 10 minutes max
        let attempts = 0;

        const poll = async () => {
            if (attempts >= maxAttempts) {
                toast.error('Restore is taking longer than expected. Please check manually.');
                return;
            }

            try {
                const { data } = await axios.get(`/api/user/vm-instances/restore-status/${restoreId}`);
                if (!data.success) return;

                const status = data.data?.status;
                if (status === 'active') {
                    toast.success('Restore completed successfully!');
                    fetchBackups();
                    return;
                } else if (status === 'failed') {
                    toast.error(data.data?.error || 'Restore failed');
                    return;
                }

                // Still restoring, poll again
                attempts++;
                setTimeout(poll, 5000);
            } catch (err) {
                console.error('Error polling restore status:', err);
            }
        };

        poll();
    };

    const filteredBackups = backups.filter((b) =>
        search.trim()
            ? b.volid.toLowerCase().includes(search.toLowerCase()) ||
              b.storage.toLowerCase().includes(search.toLowerCase())
            : true,
    );

    if (instanceLoading || (loading && backups.length === 0)) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='h-12 w-12 animate-spin text-primary opacity-50' />
                <p className='mt-4 text-muted-foreground font-medium animate-pulse'>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <div className='space-y-8 pb-12'>
            <WidgetRenderer widgets={getWidgets('vds-backups', 'top-of-page')} />

            <PageHeader
                title={t('serverBackups.title') || 'Backups'}
                description={
                    <div className='flex items-center gap-3'>
                        <span>
                            {t('serverBackups.description') || 'Manage filesystem backups for this VDS instance.'}
                        </span>
                        <span className='px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary border border-primary/20'>
                            {backups.length} / {backupLimit === 0 ? '∞' : backupLimit}
                            {fifoRolling ? ' · FIFO' : ''}
                        </span>
                    </div>
                }
                actions={
                    <div className='flex items-center gap-3'>
                        <Button variant='glass' size='default' onClick={fetchBackups} disabled={loading}>
                            <RefreshCw className={cn('h-5 w-5 mr-2', loading && 'animate-spin')} />
                            {t('serverBackups.refresh') || 'Refresh'}
                        </Button>
                        <Button
                            size='default'
                            disabled={limitReached || loading}
                            onClick={() => setConfirmCreateOpen(true)}
                            className='active:scale-95 transition-all'
                        >
                            <Plus className='h-5 w-5 mr-2' />
                            {t('serverBackups.createBackup') || 'Create backup'}
                        </Button>
                    </div>
                }
            />

            {fifoRolling && backupLimit > 0 && (
                <div className='relative overflow-hidden p-6 rounded-3xl bg-sky-500/10 border border-sky-500/20 backdrop-blur-xl'>
                    <div className='relative z-10 flex items-start gap-5'>
                        <div className='h-12 w-12 rounded-2xl bg-sky-500/20 flex items-center justify-center border border-sky-500/30'>
                            <Info className='h-6 w-6 text-sky-500' />
                        </div>
                        <div className='space-y-1'>
                            <h3 className='text-lg font-bold text-sky-600 dark:text-sky-400 leading-none'>
                                {t('serverBackups.fifoRollingTitle')}
                            </h3>
                            <p className='text-sm text-sky-600/85 dark:text-sky-400/85 leading-relaxed font-medium'>
                                {t('serverBackups.fifoRollingDescription', { limit: String(backupLimit) })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {limitReached && (
                <div className='relative overflow-hidden p-6 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-xl'>
                    <div className='relative z-10 flex items-start gap-5'>
                        <div className='h-12 w-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30'>
                            <AlertTriangle className='h-6 w-6 text-yellow-500' />
                        </div>
                        <div className='space-y-1'>
                            <h3 className='text-lg font-bold text-yellow-500 leading-none'>
                                {t('serverBackups.backupLimitReached') || 'Backup limit reached'}
                            </h3>
                            <p className='text-sm text-yellow-500/80 leading-relaxed font-medium'>
                                {t('serverBackups.backupLimitReachedDescription', {
                                    limit: String(backupLimit),
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className='space-y-6'>
                <div className='flex items-center gap-4'>
                    <div className='relative flex-1 group'>
                        <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/80 group-focus-within:text-foreground transition-colors' />
                        <Input
                            placeholder={t('serverBackups.searchPlaceholder') || 'Search backups…'}
                            className='pl-12 h-14 text-base'
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {filteredBackups.length === 0 ? (
                    <EmptyState
                        title={t('serverBackups.noBackups') || 'No backups yet'}
                        description={
                            backupLimit === 0
                                ? t('serverBackups.noBackupsNoLimit') || 'Backups are disabled for this instance.'
                                : t('serverBackups.noBackupsDescription') ||
                                  'Create your first backup to protect this VDS instance.'
                        }
                        icon={Archive}
                        action={
                            !limitReached ? (
                                <Button
                                    size='default'
                                    onClick={() => setConfirmCreateOpen(true)}
                                    className='h-14 px-10 text-lg'
                                    disabled={loading}
                                >
                                    <Plus className='h-6 w-6 mr-2' />
                                    {t('serverBackups.createBackup') || 'Create backup'}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className='grid grid-cols-1 gap-4'>
                        {filteredBackups.map((backup) => {
                            const isPending = backup.status === 'pending' || backup.status === 'running';
                            const isFailed = backup.status === 'failed';

                            return (
                                <ResourceCard
                                    key={backup.id}
                                    icon={Archive}
                                    iconWrapperClassName={cn(
                                        isPending && 'bg-blue-500/10 border-blue-500/20 text-blue-500',
                                        isFailed && 'bg-red-500/10 border-red-500/20 text-red-500',
                                        !isPending && !isFailed && 'bg-primary/10 border-primary/20 text-primary',
                                    )}
                                    title={backup.volid || `Backup #${backup.id}`}
                                    description={
                                        <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
                                            {isPending ? (
                                                <div className='flex items-center gap-2 text-blue-500'>
                                                    <Loader2 className='h-4 w-4 animate-spin' />
                                                    <span className='text-sm font-semibold'>
                                                        {t('serverBackups.creating') ||
                                                            'Creating backup, please wait...'}
                                                    </span>
                                                </div>
                                            ) : isFailed ? (
                                                <div className='flex items-center gap-2 text-red-500'>
                                                    <AlertTriangle className='h-4 w-4' />
                                                    <span className='text-sm font-semibold'>
                                                        {t('serverBackups.failed') || 'Backup failed'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className='flex items-center gap-2 text-muted-foreground'>
                                                        <HardDrive className='h-4 w-4 opacity-50' />
                                                        <span className='text-sm font-semibold'>
                                                            {formatMib(backup.size_bytes / 1024 / 1024)}
                                                        </span>
                                                    </div>
                                                    <div className='flex items-center gap-2 text-muted-foreground'>
                                                        <Calendar className='h-4 w-4 opacity-50' />
                                                        <span className='text-sm font-semibold'>
                                                            {backup.ctime
                                                                ? new Date(backup.ctime * 1000).toLocaleString()
                                                                : '—'}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    }
                                    badges={
                                        <div className='flex items-center gap-2'>
                                            {backup.storage && (
                                                <span className='px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none bg-background/50 border border-border/40'>
                                                    {backup.storage}
                                                </span>
                                            )}
                                            {isPending && (
                                                <span className='px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse'>
                                                    {t('serverBackups.inProgress') || 'IN PROGRESS'}
                                                </span>
                                            )}
                                            {isFailed && (
                                                <span className='px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none bg-red-500/10 text-red-500 border border-red-500/20'>
                                                    {t('serverBackups.failed') || 'FAILED'}
                                                </span>
                                            )}
                                        </div>
                                    }
                                    actions={
                                        isPending ? (
                                            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                                                <Loader2 className='h-4 w-4 animate-spin' />
                                                <span>{t('serverBackups.pleaseWait') || 'Please wait...'}</span>
                                            </div>
                                        ) : (
                                            <div className='flex items-center gap-2'>
                                                {!isFailed && (
                                                    <Button
                                                        variant='outline'
                                                        size='sm'
                                                        className='h-9 px-4 rounded-xl'
                                                        onClick={() => {
                                                            setSelectedForRestore(backup);
                                                            setConfirmRestoreOpen(true);
                                                        }}
                                                    >
                                                        <RotateCcw className='h-3.5 w-3.5 mr-1.5' />
                                                        {t('serverBackups.restore') || 'Restore'}
                                                    </Button>
                                                )}
                                                <Button
                                                    variant='destructive'
                                                    size='sm'
                                                    className='h-9 px-4 rounded-xl'
                                                    onClick={() => {
                                                        setSelectedForDelete(backup);
                                                        setConfirmDeleteOpen(true);
                                                    }}
                                                >
                                                    <AlertTriangle className='h-3.5 w-3.5 mr-1.5' />
                                                    {t('serverBackups.delete') || 'Delete'}
                                                </Button>
                                            </div>
                                        )
                                    }
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create backup confirm dialog */}
            <Dialog open={confirmCreateOpen} onOpenChange={setConfirmCreateOpen}>
                <div className='space-y-6 p-4'>
                    <DialogHeader>
                        <DialogTitle>{t('serverBackups.createBackup') || 'Create backup'}</DialogTitle>
                        <DialogDescription>
                            {t('serverBackups.createBackupDescription') ||
                                'This will create a new Proxmox backup for this VDS instance.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className='flex gap-3 justify-end'>
                        <Button
                            variant='outline'
                            onClick={() => setConfirmCreateOpen(false)}
                            disabled={creating}
                            className='rounded-xl'
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant='destructive'
                            onClick={handleCreateBackup}
                            disabled={creating}
                            className='rounded-xl'
                        >
                            {creating ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : null}
                            {t('serverBackups.create') || 'Create'}
                        </Button>
                    </DialogFooter>
                </div>
            </Dialog>

            {/* Delete backup confirm dialog */}
            <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                <div className='space-y-6 p-4'>
                    <DialogHeader>
                        <DialogTitle>{t('serverBackups.confirmDeleteTitle') || 'Delete backup?'}</DialogTitle>
                        <DialogDescription>
                            {t('serverBackups.deleteConfirm') ||
                                'This will permanently delete this backup from storage.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className='flex gap-3 justify-end'>
                        <Button
                            variant='outline'
                            onClick={() => setConfirmDeleteOpen(false)}
                            disabled={deleting}
                            className='rounded-xl'
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant='destructive'
                            onClick={handleDeleteBackup}
                            disabled={deleting}
                            className='rounded-xl'
                        >
                            {deleting ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : null}
                            {t('serverBackups.delete') || 'Delete'}
                        </Button>
                    </DialogFooter>
                </div>
            </Dialog>

            {/* Restore backup confirm dialog */}
            <Dialog open={confirmRestoreOpen} onOpenChange={setConfirmRestoreOpen}>
                <div className='space-y-6 p-4'>
                    <DialogHeader>
                        <DialogTitle>{t('serverBackups.confirmRestoreTitle') || 'Restore from backup?'}</DialogTitle>
                        <DialogDescription>
                            <div className='space-y-3'>
                                <p className='text-yellow-500 font-semibold flex items-center gap-2'>
                                    <AlertTriangle className='h-4 w-4' />
                                    {t('serverBackups.restoreWarning') ||
                                        'Warning: This will overwrite all current data!'}
                                </p>
                                <p>
                                    {t('serverBackups.restoreConfirm') ||
                                        'The VM will be stopped and restored to the state of this backup. All current data will be replaced. This action cannot be undone.'}
                                </p>
                                {selectedForRestore && (
                                    <div className='mt-4 p-3 rounded-lg bg-muted/50 border border-border/50'>
                                        <p className='text-sm font-mono text-muted-foreground'>
                                            {selectedForRestore.volid}
                                        </p>
                                        <p className='text-xs text-muted-foreground mt-1'>
                                            {selectedForRestore.ctime
                                                ? new Date(selectedForRestore.ctime * 1000).toLocaleString()
                                                : '—'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className='flex gap-3 justify-end'>
                        <Button
                            variant='outline'
                            onClick={() => setConfirmRestoreOpen(false)}
                            disabled={restoring}
                            className='rounded-xl'
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant='destructive'
                            onClick={handleRestoreBackup}
                            disabled={restoring}
                            className='rounded-xl'
                        >
                            {restoring ? (
                                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                            ) : (
                                <RotateCcw className='h-4 w-4 mr-2' />
                            )}
                            {t('serverBackups.restore') || 'Restore'}
                        </Button>
                    </DialogFooter>
                </div>
            </Dialog>

            <WidgetRenderer widgets={getWidgets('vds-backups', 'bottom-of-page')} />
        </div>
    );
}
