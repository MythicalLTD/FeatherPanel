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
import { useParams } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Plus, RotateCcw, Trash2, Download, Upload } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { useWebSpacePermissions } from '@/hooks/useWebSpacePermissions';
import { WebSpaceSubuserPermissions } from '@/lib/webspace-permissions';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';

interface BackupRow {
    uuid: string;
    bytes?: number;
    created_at?: string;
    checksum?: string;
}

export default function WebSpaceBackupsPage() {
    const params = useParams();
    const uuidShort = String(params.uuidShort || '');
    const { t } = useTranslation();
    const { hasPermission } = useWebSpacePermissions(uuidShort);
    const canCreate = hasPermission(WebSpaceSubuserPermissions['backup.create']);
    const canDelete = hasPermission(WebSpaceSubuserPermissions['backup.delete']);
    const canRestore = hasPermission(WebSpaceSubuserPermissions['backup.restore']);
    const canDownload = hasPermission(WebSpaceSubuserPermissions['backup.download']);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [backups, setBackups] = useState<BackupRow[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const na = t('common.not_available');

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/backups`);
            const list = (data.data?.backups || []) as BackupRow[];
            setBackups(Array.isArray(list) ? list : []);
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.backups.loadFailed')
                    : t('webSpaces.backups.loadFailed'),
            );
        } finally {
            setLoading(false);
        }
    }, [uuidShort, t]);

    const pollJob = useCallback(
        async (jobId: string) => {
            for (let i = 0; i < 120; i++) {
                await new Promise((r) => setTimeout(r, 2000));
                try {
                    const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/backups/jobs/${jobId}`);
                    const phase = data?.data?.phase;
                    if (phase === 'completed') {
                        toast.success(t('webSpaces.backups.jobCompleted'));
                        await load();
                        return;
                    }
                    if (phase === 'failed') {
                        toast.error(data?.data?.message || t('webSpaces.backups.jobFailed'));
                        return;
                    }
                } catch {
                    /* retry */
                }
            }
            toast.error(t('webSpaces.backups.jobTimedOut'));
        },
        [uuidShort, load, t],
    );

    useEffect(() => {
        void load();
    }, [load]);

    const createBackup = async () => {
        setBusy('create');
        try {
            const { data, status } = await axios.post(`/api/user/webspaces/${uuidShort}/backup`, { async: true });
            const jobId = data?.data?.job_id;
            if ((status === 202 || jobId) && jobId) {
                toast.success(t('webSpaces.backups.started'));
                await pollJob(String(jobId));
            } else {
                toast.success(t('webSpaces.backups.created'));
                await load();
            }
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.backups.failed')
                    : t('webSpaces.backups.failed'),
            );
        } finally {
            setBusy(null);
        }
    };

    const restore = async (backupUuid: string) => {
        if (!confirm(t('webSpaces.backups.restoreConfirm'))) return;
        setBusy(backupUuid);
        try {
            const { data, status } = await axios.post(
                `/api/user/webspaces/${uuidShort}/backups/${backupUuid}/restore`,
                { async: true },
            );
            const jobId = data?.data?.job_id;
            if ((status === 202 || jobId) && jobId) {
                toast.success(t('webSpaces.backups.restoreStarted'));
                await pollJob(String(jobId));
            } else {
                toast.success(t('webSpaces.backups.restored'));
            }
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.backups.restoreFailed')
                    : t('webSpaces.backups.restoreFailed'),
            );
        } finally {
            setBusy(null);
        }
    };

    const remove = async (backupUuid: string) => {
        if (!confirm(t('webSpaces.backups.deleteConfirm'))) return;
        setBusy(backupUuid);
        try {
            await axios.delete(`/api/user/webspaces/${uuidShort}/backups/${backupUuid}`);
            toast.success(t('webSpaces.backups.deleted'));
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.backups.deleteFailed')
                    : t('webSpaces.backups.deleteFailed'),
            );
        } finally {
            setBusy(null);
        }
    };

    const download = (backupUuid: string) => {
        window.open(`/api/user/webspaces/${uuidShort}/backups/${backupUuid}/download`, '_blank');
    };

    const importBackup = async (file: File) => {
        setBusy('import');
        try {
            const formData = new FormData();
            formData.append('archive', file);
            await axios.post(`/api/user/webspaces/${uuidShort}/backups/import`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(t('webSpaces.backups.imported'));
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.backups.importFailed')
                    : t('webSpaces.backups.importFailed'),
            );
        } finally {
            setBusy(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <WebSpacePageWidgets pageId='webspace-backups'>
            <div className='space-y-4'>
                <PageHeader
                    title={t('webSpaces.backups.title')}
                    description={t('webSpaces.backups.description')}
                    actions={
                        <div className='flex gap-2'>
                            <input
                                ref={fileInputRef}
                                type='file'
                                accept='.tar.gz,.tgz,application/gzip'
                                className='hidden'
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void importBackup(file);
                                }}
                            />
                            {canCreate && (
                                <Button
                                    variant='outline'
                                    disabled={busy === 'import'}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className='mr-2 h-4 w-4' />
                                    {t('webSpaces.backups.import')}
                                </Button>
                            )}
                            {canCreate && (
                                <Button onClick={() => void createBackup()} disabled={busy === 'create'}>
                                    <Plus className='mr-2 h-4 w-4' />
                                    {t('webSpaces.backups.create')}
                                </Button>
                            )}
                        </div>
                    }
                />
                {(busy === 'create' || (busy && busy !== 'import')) && busy !== null && (
                    <p className='text-muted-foreground text-sm'>{t('webSpaces.backups.jobInProgress')}</p>
                )}
                {loading ? (
                    <TableSkeleton count={3} />
                ) : backups.length === 0 ? (
                    <p className='text-muted-foreground text-sm'>{t('webSpaces.backups.empty')}</p>
                ) : (
                    <ul className='divide-border divide-y rounded-xl border'>
                        {backups.map((b) => (
                            <li key={b.uuid} className='flex flex-wrap items-center justify-between gap-3 px-4 py-3'>
                                <div>
                                    <p className='font-mono text-sm'>{b.uuid}</p>
                                    <p className='text-muted-foreground text-xs'>
                                        {b.bytes != null ? `${Math.round(b.bytes / 1024)} KB` : na}
                                        {b.created_at ? ` · ${b.created_at}` : ''}
                                    </p>
                                </div>
                                <div className='flex gap-2'>
                                    {canDownload && (
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            disabled={busy === b.uuid}
                                            onClick={() => download(b.uuid)}
                                        >
                                            <Download className='mr-1 h-3.5 w-3.5' />
                                            {t('webSpaces.backups.download')}
                                        </Button>
                                    )}
                                    {canRestore && (
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            disabled={busy === b.uuid}
                                            onClick={() => void restore(b.uuid)}
                                        >
                                            <RotateCcw className='mr-1 h-3.5 w-3.5' />
                                            {t('webSpaces.backups.restore')}
                                        </Button>
                                    )}
                                    {canDelete && (
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            disabled={busy === b.uuid}
                                            onClick={() => void remove(b.uuid)}
                                        >
                                            <Trash2 className='mr-1 h-3.5 w-3.5' />
                                            {t('common.delete')}
                                        </Button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </WebSpacePageWidgets>
    );
}
