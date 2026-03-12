/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { Database, Loader2, RotateCw, Trash2, Settings2, HardDrive } from 'lucide-react';
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

interface Backup {
    volid: string;
    storage: string;
    format: string;
    size: number;
    ctime: number;
    notes?: string;
    vmid?: number;
}

interface BackupsSectionProps {
    instanceId: string | number;
}

function formatBytes(bytes: number): string {
    if (bytes >= 1_073_741_824) return (bytes / 1_073_741_824).toFixed(2) + ' GB';
    if (bytes >= 1_048_576) return (bytes / 1_048_576).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(0) + ' KB';
}

export function BackupsSection({ instanceId }: BackupsSectionProps) {
    const { t } = useTranslation();
    const id = String(instanceId);

    const [backups, setBackups] = useState<Backup[]>([]);
    const [backupLimit, setBackupLimit] = useState(5);
    const [storages, setStorages] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [restoring, setRestoring] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    // Create-backup form state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedStorage, setSelectedStorage] = useState('');
    const [compress, setCompress] = useState('zstd');

    // Limit editor
    const [editingLimit, setEditingLimit] = useState(false);
    const [limitInput, setLimitInput] = useState('5');
    const [savingLimit, setSavingLimit] = useState(false);

    // Delete confirmation
    const [confirmDelete, setConfirmDelete] = useState<Backup | null>(null);
    // Restore confirmation
    const [confirmRestore, setConfirmRestore] = useState<Backup | null>(null);

    const fetchBackups = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/admin/vm-instances/${id}/backups`);
            setBackups((data.data?.backups as Backup[]) ?? []);

            const lim = data.data?.backup_limit as number | undefined;
            if (lim !== undefined) {
                setBackupLimit(lim);
                setLimitInput(String(lim));
            }

            const stor = (data.data?.storages as string[] | undefined) ?? [];
            if (Array.isArray(stor) && stor.length > 0) {
                setStorages(stor);
                if (!selectedStorage) {
                    setSelectedStorage(stor[0]);
                }
            } else {
                const unique = [
                    ...new Set(((data.data?.backups as Backup[]) ?? []).map((b) => b.storage).filter(Boolean)),
                ];
                setStorages(unique);
                if (unique.length > 0 && !selectedStorage) {
                    setSelectedStorage(unique[0]);
                }
            }
        } catch {
            // silently ignore on background refetch
        } finally {
            setLoading(false);
        }
    }, [id, selectedStorage]);

    useEffect(() => {
        void fetchBackups();
    }, [fetchBackups]);

    // ── Create backup ─────────────────────────────────────────────────────

    const handleCreate = async () => {
        setCreating(true);
        try {
            const payload: Record<string, string> = { compress };
            if (selectedStorage) payload.storage = selectedStorage;

            const res = await axios.post(`/api/admin/vm-instances/${id}/backups`, payload);
            const backupId = res.data?.data?.backup_id as string | undefined;
            if (!backupId) {
                toast.error(t('admin.vmInstances.backups.create_failed') ?? 'Backup did not return a backup_id');
                setCreating(false);
                return;
            }

            toast.info(t('admin.vmInstances.backups.creating') ?? 'Backup in progress…');
            setShowCreateForm(false);

            const MAX_POLLS = 120;
            let polls = 0;
            const poll = async (): Promise<void> => {
                if (polls >= MAX_POLLS) {
                    toast.error(t('admin.vmInstances.backups.create_timeout') ?? 'Backup timed out');
                    setCreating(false);
                    return;
                }
                polls++;
                try {
                    const statusRes = await axios.get(`/api/admin/vm-instances/backup-status/${backupId}`);
                    const s = statusRes.data?.data;
                    if (s?.status === 'done') {
                        toast.success(t('admin.vmInstances.backups.create_success') ?? 'Backup completed!');
                        await fetchBackups();
                        setCreating(false);
                        return;
                    }
                    if (s?.status === 'failed') {
                        toast.error(s?.error ?? t('admin.vmInstances.backups.create_failed') ?? 'Backup failed');
                        setCreating(false);
                        return;
                    }
                } catch {
                    /* transient, keep polling */
                }
                setTimeout(() => {
                    void poll();
                }, 5000);
            };
            void poll();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
            setCreating(false);
        }
    };

    // ── Delete backup ─────────────────────────────────────────────────────

    const handleDelete = async (backup: Backup) => {
        setDeleting(backup.volid);
        try {
            await axios.delete(`/api/admin/vm-instances/${id}/backups`, {
                data: { volid: backup.volid, storage: backup.storage },
            });
            toast.success(t('admin.vmInstances.backups.delete_success') ?? 'Backup deleted');
            await fetchBackups();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setDeleting(null);
            setConfirmDelete(null);
        }
    };

    // ── Restore backup ────────────────────────────────────────────────────

    const handleRestore = async (backup: Backup) => {
        setRestoring(backup.volid);
        setConfirmRestore(null);
        try {
            const res = await axios.post(`/api/admin/vm-instances/${id}/backups/restore`, {
                volid: backup.volid,
                storage: backup.storage,
            });
            const restoreId = res.data?.data?.restore_id as string | undefined;
            if (!restoreId) {
                toast.error(t('admin.vmInstances.backups.restore_failed') ?? 'Restore did not return a restore_id');
                setRestoring(null);
                return;
            }

            toast.info(t('admin.vmInstances.backups.restoring') ?? 'Restore in progress…');

            const MAX_POLLS = 120;
            let polls = 0;
            const poll = async (): Promise<void> => {
                if (polls >= MAX_POLLS) {
                    toast.error(t('admin.vmInstances.backups.restore_timeout') ?? 'Restore timed out');
                    setRestoring(null);
                    return;
                }
                polls++;
                try {
                    const statusRes = await axios.get(`/api/admin/vm-instances/restore-status/${restoreId}`);
                    const s = statusRes.data?.data;
                    if (s?.status === 'active') {
                        toast.success(t('admin.vmInstances.backups.restore_success') ?? 'VM restored from backup!');
                        setRestoring(null);
                        return;
                    }
                    if (s?.status === 'failed') {
                        toast.error(s?.error ?? t('admin.vmInstances.backups.restore_failed') ?? 'Restore failed');
                        setRestoring(null);
                        return;
                    }
                } catch {
                    /* transient */
                }
                setTimeout(() => {
                    void poll();
                }, 5000);
            };
            void poll();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
            setRestoring(null);
        }
    };

    // ── Backup limit ──────────────────────────────────────────────────────

    const handleSaveLimit = async () => {
        const limit = parseInt(limitInput, 10);
        if (isNaN(limit) || limit < 0 || limit > 100) {
            toast.error(t('admin.vmInstances.backups.limit_invalid') ?? 'Limit must be 0–100');
            return;
        }
        setSavingLimit(true);
        try {
            await axios.patch(`/api/admin/vm-instances/${id}/backup-limit`, { limit });
            setBackupLimit(limit);
            setEditingLimit(false);
            toast.success(t('admin.vmInstances.backups.limit_saved') ?? 'Backup limit updated');
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setSavingLimit(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────

    return (
        <>
            <PageCard
                title={t('admin.vmInstances.backups.title') ?? 'Backups'}
                icon={Database}
                action={
                    <div className='flex items-center gap-2'>
                        {/* Backup limit badge + editor */}
                        <div className='flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-md px-2 py-1'>
                            <HardDrive className='h-3.5 w-3.5' />
                            {editingLimit ? (
                                <div className='flex items-center gap-1'>
                                    <Input
                                        type='number'
                                        min={0}
                                        max={100}
                                        value={limitInput}
                                        onChange={(e) => setLimitInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') void handleSaveLimit();
                                            if (e.key === 'Escape') setEditingLimit(false);
                                        }}
                                        autoFocus
                                        className='w-16 h-6 text-xs px-1'
                                    />
                                    <button
                                        className='text-xs text-primary hover:underline'
                                        onClick={() => void handleSaveLimit()}
                                        disabled={savingLimit}
                                    >
                                        {savingLimit ? '…' : (t('common.save') ?? 'Save')}
                                    </button>
                                    <button
                                        className='text-xs text-muted-foreground hover:underline'
                                        onClick={() => setEditingLimit(false)}
                                    >
                                        {t('common.cancel') ?? 'Cancel'}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <span>
                                        {backups.length}/{backupLimit}{' '}
                                        {t('admin.vmInstances.backups.limit_label') ?? 'backups'}
                                    </span>
                                    <button
                                        title={t('admin.vmInstances.backups.set_limit') ?? 'Set limit'}
                                        onClick={() => setEditingLimit(true)}
                                        className='ml-1 text-muted-foreground hover:text-foreground'
                                    >
                                        <Settings2 className='h-3 w-3' />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Create backup button */}
                        {!showCreateForm ? (
                            <Button
                                variant='outline'
                                disabled={creating || backups.length >= backupLimit}
                                onClick={() => setShowCreateForm(true)}
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className='h-4 w-4 animate-spin mr-2' />
                                        {t('admin.vmInstances.backups.creating') ?? 'Creating…'}
                                    </>
                                ) : (
                                    <>
                                        <Database className='h-4 w-4 mr-2' />
                                        {t('admin.vmInstances.backups.create') ?? 'Create Backup'}
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button variant='ghost' onClick={() => setShowCreateForm(false)}>
                                {t('common.cancel') ?? 'Cancel'}
                            </Button>
                        )}
                    </div>
                }
            >
                {/* Create backup form */}
                {showCreateForm && (
                    <div className='mb-4 rounded-lg border border-border bg-muted/20 p-4 space-y-3'>
                        <p className='text-sm font-medium'>
                            {t('admin.vmInstances.backups.create_form_title') ?? 'New Backup'}
                        </p>
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                            <div className='space-y-1'>
                                <label className='block text-xs text-muted-foreground'>
                                    {t('admin.vmInstances.backups.storage') ?? 'Storage'}
                                </label>
                                {storages.length > 0 ? (
                                    <HeadlessSelect
                                        value={selectedStorage || ''}
                                        onChange={(v) => setSelectedStorage(String(v))}
                                        options={storages.map((s) => ({ id: s, name: s }))}
                                        placeholder={
                                            t('admin.vmInstances.backups.storage_placeholder') ?? 'Select storage…'
                                        }
                                        buttonClassName='h-9 w-full'
                                    />
                                ) : (
                                    <Input
                                        type='text'
                                        className='w-full h-9'
                                        value={selectedStorage}
                                        onChange={(e) => setSelectedStorage(e.target.value)}
                                        placeholder='local'
                                    />
                                )}
                            </div>
                            <div className='space-y-1'>
                                <label className='block text-xs text-muted-foreground'>
                                    {t('admin.vmInstances.backups.compression') ?? 'Compression'}
                                </label>
                                <HeadlessSelect
                                    value={compress}
                                    onChange={(v) => setCompress(String(v))}
                                    options={[
                                        {
                                            id: 'zstd',
                                            name:
                                                t('admin.vmInstances.backups.compression_zstd') ?? 'zstd (recommended)',
                                        },
                                        { id: 'lzo', name: t('admin.vmInstances.backups.compression_lzo') ?? 'lzo' },
                                        { id: 'gzip', name: t('admin.vmInstances.backups.compression_gzip') ?? 'gzip' },
                                        { id: '0', name: t('admin.vmInstances.backups.compression_none') ?? 'None' },
                                    ]}
                                    buttonClassName='h-9 w-full'
                                />
                            </div>
                        </div>
                        <div className='flex justify-end'>
                            <Button size='sm' disabled={creating} onClick={() => void handleCreate()}>
                                {creating ? (
                                    <Loader2 className='h-4 w-4 animate-spin mr-2' />
                                ) : (
                                    <Database className='h-4 w-4 mr-2' />
                                )}
                                {t('admin.vmInstances.backups.create') ?? 'Create Backup'}
                            </Button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className='flex items-center justify-center py-10 text-muted-foreground gap-2'>
                        <Loader2 className='h-5 w-5 animate-spin' />
                        <span>{t('common.loading') ?? 'Loading…'}</span>
                    </div>
                ) : backups.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-10 text-muted-foreground gap-2'>
                        <Database className='h-8 w-8 opacity-30' />
                        <p className='text-sm'>{t('admin.vmInstances.backups.no_backups') ?? 'No backups yet'}</p>
                    </div>
                ) : (
                    <div className='overflow-x-auto'>
                        <table className='w-full text-sm'>
                            <thead>
                                <tr className='border-b border-border text-muted-foreground text-left'>
                                    <th className='pb-2 pr-4 font-medium'>
                                        {t('admin.vmInstances.backups.col_date') ?? 'Date'}
                                    </th>
                                    <th className='pb-2 pr-4 font-medium'>
                                        {t('admin.vmInstances.backups.col_size') ?? 'Size'}
                                    </th>
                                    <th className='pb-2 pr-4 font-medium'>
                                        {t('admin.vmInstances.backups.col_format') ?? 'Format'}
                                    </th>
                                    <th className='pb-2 pr-4 font-medium'>
                                        {t('admin.vmInstances.backups.col_storage') ?? 'Storage'}
                                    </th>
                                    <th className='pb-2 font-medium text-right'>{t('common.actions') ?? 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-border/50'>
                                {backups.map((backup) => {
                                    const isRestoring = restoring === backup.volid;
                                    const isDeleting = deleting === backup.volid;
                                    const date = new Date(backup.ctime * 1000);
                                    return (
                                        <tr key={backup.volid} className='group'>
                                            <td className='py-2.5 pr-4 font-mono text-xs'>{date.toLocaleString()}</td>
                                            <td className='py-2.5 pr-4 tabular-nums'>
                                                {formatBytes(backup.size ?? 0)}
                                            </td>
                                            <td className='py-2.5 pr-4 text-muted-foreground'>
                                                {backup.format ?? '—'}
                                            </td>
                                            <td className='py-2.5 pr-4 text-muted-foreground'>{backup.storage}</td>
                                            <td className='py-2.5 text-right'>
                                                <div className='flex items-center justify-end gap-2'>
                                                    <Button
                                                        size='sm'
                                                        variant='outline'
                                                        disabled={isRestoring || !!restoring}
                                                        onClick={() => setConfirmRestore(backup)}
                                                    >
                                                        {isRestoring ? (
                                                            <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                                        ) : (
                                                            <RotateCw className='h-3.5 w-3.5' />
                                                        )}
                                                        <span className='ml-1.5 hidden sm:inline'>
                                                            {isRestoring
                                                                ? (t('admin.vmInstances.backups.restoring') ??
                                                                  'Restoring…')
                                                                : (t('admin.vmInstances.backups.restore') ?? 'Restore')}
                                                        </span>
                                                    </Button>
                                                    <Button
                                                        size='sm'
                                                        variant='outline'
                                                        disabled={isDeleting || !!restoring}
                                                        onClick={() => setConfirmDelete(backup)}
                                                        className='text-destructive hover:text-destructive hover:border-destructive/50'
                                                    >
                                                        {isDeleting ? (
                                                            <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                                        ) : (
                                                            <Trash2 className='h-3.5 w-3.5' />
                                                        )}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </PageCard>

            {/* Delete confirmation dialog */}
            <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('admin.vmInstances.backups.delete_confirm_title') ?? 'Delete backup?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('admin.vmInstances.backups.delete_confirm_desc') ??
                                'This will permanently delete the backup file from storage. This cannot be undone.'}
                            {confirmDelete && (
                                <span className='block mt-2 font-mono text-xs break-all'>{confirmDelete.volid}</span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel') ?? 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => confirmDelete && void handleDelete(confirmDelete)}
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        >
                            {t('common.delete') ?? 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Restore confirmation dialog */}
            <AlertDialog open={!!confirmRestore} onOpenChange={(open) => !open && setConfirmRestore(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('admin.vmInstances.backups.restore_confirm_title') ?? 'Restore from backup?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('admin.vmInstances.backups.restore_confirm_desc') ??
                                'The VM will be stopped and overwritten with this backup. All current data will be replaced. The VM will start again after restore.'}
                            {confirmRestore && (
                                <span className='block mt-2 font-mono text-xs break-all'>{confirmRestore.volid}</span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel') ?? 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => confirmRestore && void handleRestore(confirmRestore)}
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        >
                            {t('admin.vmInstances.backups.restore') ?? 'Restore'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
