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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Calendar,
    Database,
    Download,
    FolderOpen,
    HardDrive,
    Info,
    Loader2,
    MoreVertical,
    Plus,
    RefreshCw,
    Search,
    Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatDateTimeInTz } from '@/lib/dateUtils';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { cn, formatFileSize } from '@/lib/utils';
import { filesApi } from '@/lib/files-api';
import { triggerSignedUrlDownload } from '@/lib/trigger-signed-download';
import type { FileObject } from '@/types/server';
import { DEFAULT_DB_DIRECTORY } from '@/components/server/backup/backup-payload';

import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function joinServerPath(directory: string, name: string): string {
    const root = directory.startsWith('/') ? directory : `/${directory}`;
    const trimmed = root.replace(/\/+$/, '') || '/';
    return trimmed === '/' ? `/${name}` : `${trimmed}/${name}`;
}

function isSqlDump(file: FileObject): boolean {
    if (!file.isFile) return false;
    const name = file.name.toLowerCase();
    return name.endsWith('.sql') || name.endsWith('.sql.gz') || name.endsWith('.sql.zst');
}

type Props = {
    uuidShort: string;
    directory?: string;
    canCreate: boolean;
    onCreate: () => void;
};

export function DatabaseDumpsPanel({ uuidShort, directory = DEFAULT_DB_DIRECTORY, canCreate, onCreate }: Props) {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);

    const canList = hasPermission('file.read');
    const canDownload = hasPermission('file.read-content');
    const canDelete = hasPermission('file.delete');

    const [dumps, setDumps] = useState<FileObject[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        description: string;
        action: () => Promise<void>;
    } | null>(null);

    const fetchDumps = useCallback(async () => {
        if (!uuidShort || !canList) {
            setDumps([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { contents } = await filesApi.getFiles(uuidShort, directory);
            const sqlFiles = contents.filter(isSqlDump).sort((a, b) => {
                const aTime = new Date(a.modified_at || a.modified || 0).getTime();
                const bTime = new Date(b.modified_at || b.modified || 0).getTime();
                return bTime - aTime;
            });
            setDumps(sqlFiles);
            setSelected([]);
        } catch {
            // Missing directory or empty folder is fine — show empty state
            setDumps([]);
            setSelected([]);
        } finally {
            setLoading(false);
        }
    }, [uuidShort, directory, canList]);

    useEffect(() => {
        if (!permissionsLoading) {
            fetchDumps();
        }
    }, [permissionsLoading, fetchDumps]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return dumps;
        return dumps.filter((f) => f.name.toLowerCase().includes(q));
    }, [dumps, searchQuery]);

    const allSelected = filtered.length > 0 && filtered.every((f) => selected.includes(f.name));

    const toggleOne = (name: string) => {
        setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
    };

    const toggleAll = () => {
        if (allSelected) {
            setSelected([]);
        } else {
            setSelected(filtered.map((f) => f.name));
        }
    };

    const openConfirm = (title: string, description: string, action: () => Promise<void>) => {
        setConfirmAction({ title, description, action });
        setConfirmOpen(true);
    };

    const handleDownload = async (file: FileObject) => {
        try {
            const url = await filesApi.getDownloadUrl(uuidShort, joinServerPath(directory, file.name));
            triggerSignedUrlDownload(url);
            toast.success(t('serverBackups.downloadSuccess'));
        } catch {
            toast.error(t('serverBackups.downloadFailed'));
        }
    };

    const handleDownloadSelected = async () => {
        if (selected.length === 0) return;
        setActionLoading(true);
        let ok = 0;
        try {
            for (const name of selected) {
                try {
                    const url = await filesApi.getDownloadUrl(uuidShort, joinServerPath(directory, name));
                    triggerSignedUrlDownload(url);
                    ok += 1;
                    // Brief gap so browsers don't coalesce downloads
                    await new Promise((r) => setTimeout(r, 250));
                } catch {
                    /* continue */
                }
            }
            if (ok > 0) {
                toast.success(t('serverBackups.dumpsDownloadSuccess', { count: String(ok) }));
            } else {
                toast.error(t('serverBackups.downloadFailed'));
            }
        } finally {
            setActionLoading(false);
        }
    };

    const deleteNames = async (names: string[]) => {
        if (names.length === 0) return;
        setActionLoading(true);
        try {
            await filesApi.deleteFiles(uuidShort, directory, names, true);
            toast.success(t('serverBackups.dumpsDeleteSuccess', { count: String(names.length) }));
            await fetchDumps();
        } catch {
            toast.error(t('serverBackups.dumpsDeleteFailed'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteOne = (file: FileObject) => {
        openConfirm(
            t('serverBackups.dumpsConfirmDeleteTitle'),
            t('serverBackups.dumpsConfirmDeleteDescription', { name: file.name }),
            async () => {
                await deleteNames([file.name]);
            },
        );
    };

    const handleDeleteSelected = () => {
        if (selected.length === 0) return;
        openConfirm(
            t('serverBackups.dumpsConfirmBulkDeleteTitle'),
            t('serverBackups.dumpsConfirmBulkDeleteDescription', { count: String(selected.length) }),
            async () => {
                await deleteNames(selected);
            },
        );
    };

    const handleDeleteAll = () => {
        if (dumps.length === 0) return;
        openConfirm(
            t('serverBackups.dumpsConfirmDeleteAllTitle'),
            t('serverBackups.dumpsConfirmDeleteAllDescription', { count: String(dumps.length) }),
            async () => {
                await deleteNames(dumps.map((d) => d.name));
            },
        );
    };

    if (permissionsLoading || (loading && dumps.length === 0 && canList)) {
        return (
            <div className='flex flex-col items-center justify-center py-20'>
                <Loader2 className='text-primary h-10 w-10 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 animate-pulse text-sm font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    if (!canList) {
        return (
            <EmptyState
                title={t('serverBackups.dumpsNoFilePermission')}
                description={t('serverBackups.dumpsNoFilePermissionDescription', { directory })}
                icon={Database}
            />
        );
    }

    return (
        <div className='space-y-6'>
            <div className='relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 backdrop-blur-xl'>
                <div className='flex items-start gap-4'>
                    <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/20'>
                        <Info className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
                    </div>
                    <div className='min-w-0 space-y-1'>
                        <h3 className='text-base font-bold text-emerald-700 dark:text-emerald-400'>
                            {t('serverBackups.dumpsInfoTitle')}
                        </h3>
                        <p className='text-sm leading-relaxed text-emerald-700/85 dark:text-emerald-400/85'>
                            {t('serverBackups.dumpsInfoDescription', { directory })}
                        </p>
                    </div>
                </div>
            </div>

            <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
                <div className='group relative flex-1'>
                    <Search className='text-muted-foreground/80 group-focus-within:text-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 transition-colors' />
                    <Input
                        placeholder={t('serverBackups.dumpsSearchPlaceholder')}
                        className='h-14 pl-12 text-base'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className='flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row'>
                    <Button
                        variant='glass'
                        size='default'
                        onClick={() => fetchDumps()}
                        disabled={loading || actionLoading}
                        aria-label={t('serverBackups.refresh')}
                    >
                        <RefreshCw className={cn('h-4 w-4 sm:mr-2', loading && 'animate-spin')} />
                        <span className='hidden sm:inline'>{t('serverBackups.refresh')}</span>
                    </Button>
                    {canDelete && dumps.length > 0 && (
                        <Button
                            variant='destructive'
                            size='default'
                            onClick={handleDeleteAll}
                            disabled={loading || actionLoading}
                        >
                            <Trash2 className='mr-2 h-4 w-4' />
                            {t('serverBackups.deleteAll')}
                        </Button>
                    )}
                </div>
            </div>

            {(canDelete || canDownload) && filtered.length > 0 && (
                <div className='border-border bg-card/50 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3'>
                    <div className='flex items-center gap-3'>
                        <Checkbox
                            checked={allSelected}
                            onCheckedChange={toggleAll}
                            aria-label={t('serverBackups.selectAll')}
                        />
                        <span className='text-sm font-medium'>
                            {selected.length > 0
                                ? t('serverBackups.selectedCount', { count: String(selected.length) })
                                : t('serverBackups.selectAll')}
                        </span>
                    </div>
                    {selected.length > 0 && (
                        <div className='flex flex-wrap gap-2'>
                            {canDownload && (
                                <Button
                                    variant='glass'
                                    size='sm'
                                    onClick={handleDownloadSelected}
                                    disabled={actionLoading}
                                >
                                    <Download className='mr-2 h-4 w-4' />
                                    {t('serverBackups.downloadSelected')} ({selected.length})
                                </Button>
                            )}
                            {canDelete && (
                                <Button
                                    variant='destructive'
                                    size='sm'
                                    onClick={handleDeleteSelected}
                                    disabled={actionLoading}
                                >
                                    <Trash2 className='mr-2 h-4 w-4' />
                                    {t('serverBackups.deleteSelected')} ({selected.length})
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {filtered.length === 0 ? (
                <EmptyState
                    title={t('serverBackups.dumpsEmpty')}
                    description={t('serverBackups.dumpsEmptyDescription', { directory })}
                    icon={Database}
                    action={
                        canCreate ? (
                            <Button size='default' onClick={onCreate} className='h-14 px-10 text-lg'>
                                <Plus className='mr-2 h-6 w-6' />
                                {t('serverBackups.createBackup')}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {filtered.map((file) => {
                        const isSelected = selected.includes(file.name);
                        const modified = file.modified_at || file.modified || '';
                        return (
                            <div key={file.name} className='flex items-stretch gap-3'>
                                {(canDelete || canDownload) && (
                                    <div className='flex shrink-0 items-center pl-1'>
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleOne(file.name)}
                                            aria-label={file.name}
                                        />
                                    </div>
                                )}
                                <ResourceCard
                                    className={cn(
                                        'min-w-0 flex-1 transition-all duration-300',
                                        isSelected && 'border-primary/40 bg-primary/5',
                                    )}
                                    icon={Database}
                                    iconWrapperClassName='bg-emerald-500/10 border-emerald-500/20'
                                    iconClassName='text-emerald-500'
                                    title={file.name}
                                    badges={
                                        <span className='rounded-full bg-emerald-500 px-3 py-1 text-[10px] leading-none font-black tracking-widest text-white uppercase'>
                                            SQL
                                        </span>
                                    }
                                    description={
                                        <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
                                            <div className='text-muted-foreground flex items-center gap-2'>
                                                <HardDrive className='h-4 w-4 opacity-50' />
                                                <span className='text-sm font-semibold'>
                                                    {formatFileSize(file.size || 0)}
                                                </span>
                                            </div>
                                            <div className='text-muted-foreground flex items-center gap-2'>
                                                <FolderOpen className='h-4 w-4 opacity-50' />
                                                <span className='text-sm font-semibold tracking-tight'>
                                                    {directory}
                                                </span>
                                            </div>
                                            {modified && (
                                                <div className='text-muted-foreground flex items-center gap-2'>
                                                    <Calendar className='h-4 w-4 opacity-50' />
                                                    <span className='text-sm font-semibold'>
                                                        {formatDateTimeInTz(modified, dateOpts)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    }
                                    actions={
                                        (canDownload || canDelete) && (
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
                                                            onClick={() => handleDownload(file)}
                                                            className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                        >
                                                            <Download className='h-4 w-4 text-blue-500' />
                                                            <span className='font-bold'>
                                                                {t('serverBackups.download')}
                                                            </span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canDelete && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeleteOne(file)}
                                                            className='flex cursor-pointer items-center gap-3 rounded-xl p-3 text-red-500 focus:bg-red-500/10 focus:text-red-500'
                                                        >
                                                            <Trash2 className='h-4 w-4' />
                                                            <span className='font-bold'>
                                                                {t('serverBackups.delete')}
                                                            </span>
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )
                                    }
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} className='max-w-lg'>
                <div className='space-y-6 p-2'>
                    <DialogHeader>
                        <DialogTitle className='text-xl font-bold'>{confirmAction?.title}</DialogTitle>
                        <DialogDescription className='text-sm opacity-70'>
                            {confirmAction?.description}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className='gap-2'>
                        <Button variant='glass' onClick={() => setConfirmOpen(false)} disabled={actionLoading}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant='destructive'
                            loading={actionLoading}
                            onClick={async () => {
                                if (!confirmAction) return;
                                try {
                                    await confirmAction.action();
                                    setConfirmOpen(false);
                                } catch {
                                    toast.error(t('serverBackups.failedToPerformAction'));
                                }
                            }}
                        >
                            {t('common.confirm')}
                        </Button>
                    </DialogFooter>
                </div>
            </Dialog>
        </div>
    );
}
