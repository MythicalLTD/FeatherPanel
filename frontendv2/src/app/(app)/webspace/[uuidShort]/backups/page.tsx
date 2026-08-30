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
import {
    Plus,
    RotateCcw,
    Trash2,
    Download,
    Upload,
    Archive,
    Loader2,
    MoreVertical,
    HardDrive,
    Calendar,
    FolderOpen,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWebSpacePermissions } from '@/hooks/useWebSpacePermissions';
import { WebSpaceSubuserPermissions } from '@/lib/webspace-permissions';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { formatFileSize } from '@/lib/utils';

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
    const [selectBackup, setSelectBackup] = useState<string | null>(null);
    const [browseDir, setBrowseDir] = useState('/');
    const [browseFiles, setBrowseFiles] = useState<{ name: string; directory?: boolean; file?: boolean }[]>([]);
    const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
    const [browseLoading, setBrowseLoading] = useState(false);
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

    const restore = async (backupUuid: string, paths?: string[]) => {
        if (paths && paths.length === 0) {
            toast.error(t('webSpaces.backups.selectFiles'));
            return;
        }
        if (!paths && !confirm(t('webSpaces.backups.restoreConfirm'))) return;
        setBusy(backupUuid);
        try {
            const payload: Record<string, unknown> = { async: true };
            if (paths && paths.length > 0) payload.paths = paths;
            const { data, status } = await axios.post(
                `/api/user/webspaces/${uuidShort}/backups/${backupUuid}/restore`,
                payload,
            );
            const jobId = data?.data?.job_id;
            if ((status === 202 || jobId) && jobId) {
                toast.success(t('webSpaces.backups.restoreStarted'));
                setSelectBackup(null);
                await pollJob(String(jobId));
            } else {
                toast.success(t('webSpaces.backups.restored'));
                setSelectBackup(null);
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

    const openSelective = async (backupUuid: string) => {
        setSelectBackup(backupUuid);
        setBrowseDir('/');
        setSelectedPaths([]);
        await loadBackupFiles(backupUuid, '/');
    };

    const loadBackupFiles = async (backupUuid: string, directory: string) => {
        setBrowseLoading(true);
        try {
            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/backups/${backupUuid}/files`, {
                params: { directory },
            });
            const files = (data.data?.files || []) as { name: string; directory?: boolean; file?: boolean }[];
            setBrowseDir((data.data?.directory as string) || directory);
            setBrowseFiles(Array.isArray(files) ? files : []);
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.backups.browseFailed')
                    : t('webSpaces.backups.browseFailed'),
            );
        } finally {
            setBrowseLoading(false);
        }
    };

    const joinPath = (dir: string, name: string) => {
        const base = dir.replace(/\/+$/, '');
        return `${base === '' || base === '/' ? '' : base}/${name}`.replace(/^\//, '');
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
            <div className='space-y-8 pb-12'>
                <PageHeader
                    title={t('webSpaces.backups.title')}
                    description={t('webSpaces.backups.description')}
                    actions={
                        <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
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
                            {canCreate && backups.length > 0 && (
                                <Button
                                    variant='glass'
                                    disabled={busy === 'import'}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className='mr-2 h-4 w-4' />
                                    {t('webSpaces.backups.import')}
                                </Button>
                            )}
                            {canCreate && backups.length > 0 && (
                                <Button onClick={() => void createBackup()} disabled={busy === 'create'}>
                                    <Plus className='mr-2 h-5 w-5' />
                                    {t('webSpaces.backups.create')}
                                </Button>
                            )}
                        </div>
                    }
                />
                {busy && (
                    <p className='text-muted-foreground flex items-center gap-2 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        {t('webSpaces.backups.jobInProgress')}
                    </p>
                )}
                {loading ? (
                    <div className='flex flex-col items-center justify-center py-24'>
                        <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                        <p className='text-muted-foreground mt-4 font-medium'>{t('common.loading')}</p>
                    </div>
                ) : backups.length === 0 ? (
                    <EmptyState
                        title={t('webSpaces.backups.empty')}
                        description={t('webSpaces.backups.description')}
                        icon={Archive}
                        action={
                            canCreate ? (
                                <div className='flex flex-wrap justify-center gap-3'>
                                    <Button
                                        variant='glass'
                                        disabled={busy === 'import'}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className='mr-2 h-4 w-4' />
                                        {t('webSpaces.backups.import')}
                                    </Button>
                                    <Button
                                        size='default'
                                        onClick={() => void createBackup()}
                                        disabled={busy === 'create'}
                                        className='h-14 px-10 text-lg'
                                    >
                                        <Plus className='mr-2 h-6 w-6' />
                                        {t('webSpaces.backups.create')}
                                    </Button>
                                </div>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className='grid grid-cols-1 gap-4'>
                        {backups.map((b) => (
                            <ResourceCard
                                key={b.uuid}
                                icon={Archive}
                                title={b.uuid}
                                titleClassName='font-mono text-base'
                                description={
                                    <>
                                        <div className='text-muted-foreground flex items-center gap-2'>
                                            <HardDrive className='h-4 w-4 opacity-50' />
                                            <span className='text-sm font-semibold'>
                                                {b.bytes != null ? formatFileSize(b.bytes) : na}
                                            </span>
                                        </div>
                                        {b.created_at && (
                                            <div className='text-muted-foreground flex items-center gap-2'>
                                                <Calendar className='h-4 w-4 opacity-50' />
                                                <span className='text-sm font-semibold'>{b.created_at}</span>
                                            </div>
                                        )}
                                    </>
                                }
                                actions={
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className='group-hover:bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl transition-colors outline-none'>
                                            <MoreVertical className='text-muted-foreground group-hover:text-primary h-6 w-6 transition-colors' />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align='end'
                                            className='bg-card/90 border-border/40 w-56 rounded-2xl p-2 backdrop-blur-xl'
                                        >
                                            {canDownload && (
                                                <DropdownMenuItem
                                                    onClick={() => download(b.uuid)}
                                                    disabled={busy === b.uuid}
                                                    className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                >
                                                    <Download className='h-4 w-4 text-emerald-500' />
                                                    <span className='font-bold'>{t('webSpaces.backups.download')}</span>
                                                </DropdownMenuItem>
                                            )}
                                            {canRestore && (
                                                <DropdownMenuItem
                                                    onClick={() => void restore(b.uuid)}
                                                    disabled={busy === b.uuid}
                                                    className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                >
                                                    <RotateCcw className='h-4 w-4 text-sky-500' />
                                                    <span className='font-bold'>{t('webSpaces.backups.restore')}</span>
                                                </DropdownMenuItem>
                                            )}
                                            {canRestore && (
                                                <DropdownMenuItem
                                                    onClick={() => void openSelective(b.uuid)}
                                                    disabled={busy === b.uuid}
                                                    className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                >
                                                    <FolderOpen className='h-4 w-4 text-sky-500' />
                                                    <span className='font-bold'>
                                                        {t('webSpaces.backups.restoreSelected')}
                                                    </span>
                                                </DropdownMenuItem>
                                            )}
                                            {canDelete && (
                                                <>
                                                    <DropdownMenuSeparator className='bg-border/40 my-1' />
                                                    <DropdownMenuItem
                                                        onClick={() => void remove(b.uuid)}
                                                        disabled={busy === b.uuid}
                                                        className='text-destructive focus:text-destructive focus:bg-destructive/10 flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                    >
                                                        <Trash2 className='h-4 w-4' />
                                                        <span className='font-bold'>{t('common.delete')}</span>
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                }
                            />
                        ))}
                    </div>
                )}
                {selectBackup && (
                    <div className='border-border/50 bg-card/50 space-y-3 rounded-xl border p-4'>
                        <div className='flex items-center justify-between gap-2'>
                            <p className='text-sm font-medium'>{t('webSpaces.backups.restoreSelected')}</p>
                            <Button variant='outline' size='sm' onClick={() => setSelectBackup(null)}>
                                {t('common.cancel')}
                            </Button>
                        </div>
                        <p className='text-muted-foreground font-mono text-xs'>{browseDir}</p>
                        {browseDir !== '/' && (
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                    const parent =
                                        browseDir.replace(/\/+$/, '').split('/').slice(0, -1).join('/') || '/';
                                    void loadBackupFiles(selectBackup, parent);
                                }}
                            >
                                ..
                            </Button>
                        )}
                        {browseLoading ? (
                            <Loader2 className='h-5 w-5 animate-spin' />
                        ) : (
                            <ul className='max-h-64 space-y-1 overflow-auto text-sm'>
                                {browseFiles.map((f) => {
                                    const path = joinPath(browseDir, f.name);
                                    const checked = selectedPaths.includes(path);
                                    return (
                                        <li key={path} className='flex items-center gap-2'>
                                            <input
                                                type='checkbox'
                                                checked={checked}
                                                onChange={() =>
                                                    setSelectedPaths((prev) =>
                                                        checked ? prev.filter((p) => p !== path) : [...prev, path],
                                                    )
                                                }
                                            />
                                            {f.directory ? (
                                                <button
                                                    type='button'
                                                    className='text-primary underline'
                                                    onClick={() => void loadBackupFiles(selectBackup, '/' + path)}
                                                >
                                                    {f.name}/
                                                </button>
                                            ) : (
                                                <span className='font-mono'>{f.name}</span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        <p className='text-muted-foreground text-xs'>
                            {t('webSpaces.backups.selectedCount', { n: String(selectedPaths.length) })}
                        </p>
                        <Button
                            loading={busy === selectBackup}
                            onClick={() => void restore(selectBackup, selectedPaths)}
                        >
                            {t('webSpaces.backups.restoreSelected')}
                        </Button>
                    </div>
                )}
            </div>
        </WebSpacePageWidgets>
    );
}
