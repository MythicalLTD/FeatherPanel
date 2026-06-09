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
    Trash2,
    Loader2,
    Archive,
    RefreshCw,
    Search,
    ChevronLeft,
    ChevronRight,
    HardDrive,
    Database,
    Calendar,
    Lock,
    Unlock,
    RotateCcw,
    Download,
    AlertTriangle,
    Info,
    MoreVertical,
    FileX,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatDateTimeInTz } from '@/lib/dateUtils';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { cn, formatMib } from '@/lib/utils';

import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Checkbox } from '@/components/ui/checkbox';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { Dialog, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { BackupItem, BackupsResponse, Server } from '@/types/server';

export default function ServerBackupsPage() {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const params = useParams();
    const router = useRouter();
    const uuidShort = params.uuidShort as string;

    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);
    const canRead = hasPermission('backup.read');
    const canCreate = hasPermission('backup.create');
    const canRestore = hasPermission('backup.restore');
    const canDownload = hasPermission('backup.download');
    const canDelete = hasPermission('backup.delete');

    const [backups, setBackups] = useState<BackupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [server, setServer] = useState<Server | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        current_page: 1,
        total: 0,
        last_page: 1,
        per_page: 20,
    });

    const { fetchWidgets, getWidgets } = usePluginWidgets('server-backups');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    const [creating, setCreating] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const [newBackupName, setNewBackupName] = useState('');
    const [ignoredFiles, setIgnoredFiles] = useState<string[]>([]);
    const [newIgnorePattern, setNewIgnorePattern] = useState('');

    const [backupToRestore, setBackupToRestore] = useState<BackupItem | null>(null);
    const [truncateDirectory, setTruncateDirectory] = useState(false);

    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        description: string;
        action: () => Promise<void>;
        variant?: 'default' | 'destructive';
    } | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchBackups = useCallback(
        async (targetPage = page) => {
            if (!uuidShort) return;

            try {
                setLoading(true);
                const [backupsRes, serverRes] = await Promise.all([
                    axios.get<BackupsResponse>(`/api/user/servers/${uuidShort}/backups`, {
                        params: {
                            page: targetPage,
                            search: debouncedSearch || undefined,
                        },
                    }),
                    axios.get<{ success: boolean; data: Server }>(`/api/user/servers/${uuidShort}`),
                ]);

                if (backupsRes.data.success) {
                    setBackups(backupsRes.data.data.data);
                    const p = backupsRes.data.data.pagination;
                    setPagination({
                        current_page: p.current_page,
                        total: p.total,
                        last_page: p.last_page,
                        per_page: p.per_page,
                    });
                }

                if (serverRes.data.success) {
                    setServer(serverRes.data.data);
                }
            } catch (error) {
                console.error('Error fetching backups:', error);
                toast.error(t('serverBackups.failedToFetch'));
            } finally {
                setLoading(false);
            }
        },
        [uuidShort, debouncedSearch, page, t],
    );

    useEffect(() => {
        if (!permissionsLoading && !canRead) {
            toast.error(t('serverBackups.noBackupPermission'));
            router.push(`/server/${uuidShort}`);
            return;
        }

        if (canRead) {
            fetchBackups();
        }
    }, [canRead, permissionsLoading, fetchBackups, uuidShort, router, t]);

    useEffect(() => {
        const hasCreating = backups.some((b) => !b.completed_at && !b.is_successful);
        if (hasCreating) {
            const interval = setInterval(() => {
                fetchBackups();
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [backups, fetchBackups]);

    const generateBackupName = () => {
        const now = new Date();
        const formatted = now.toISOString().replace(/T/, '-').replace(/\..+/, '').replace(/:/g, '-');
        return `backup-${formatted}-${Math.random().toString(36).substring(2, 7)}`;
    };

    const handleCreateBackup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBackupName.trim()) return;

        try {
            setCreating(true);
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/backups`, {
                name: newBackupName,
                ignore: JSON.stringify(ignoredFiles),
            });

            if (data.success) {
                toast.success(t('serverBackups.createSuccess'));
                setCreateDialogOpen(false);
                fetchBackups(1);
            } else {
                toast.error(data.message || t('serverBackups.createFailed'));
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            toast.error(t('serverBackups.createFailed'));
        } finally {
            setCreating(false);
        }
    };

    const handleRestoreBackup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!backupToRestore) return;

        try {
            setRestoring(true);
            const { data } = await axios.post(
                `/api/user/servers/${uuidShort}/backups/${backupToRestore.uuid}/restore`,
                {
                    truncate_directory: truncateDirectory,
                },
            );

            if (data.success) {
                toast.success(t('serverBackups.restoreSuccess'));
                setRestoreDialogOpen(false);
            } else {
                toast.error(data.message || t('serverBackups.restoreFailed'));
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.data?.error === 'BACKUP_LOCKED') {
                toast.error(t('serverBackups.restoreLockedError'));
            } else {
                toast.error(t('serverBackups.restoreFailed'));
            }
        } finally {
            setRestoring(false);
        }
    };

    const handleDeleteBackup = (backup: BackupItem) => {
        setConfirmAction({
            title: t('serverBackups.confirmDeleteTitle'),
            description: t('serverBackups.deleteConfirm'),
            variant: 'destructive',
            action: async () => {
                const { data } = await axios.delete(`/api/user/servers/${uuidShort}/backups/${backup.uuid}`);
                if (data.success) {
                    toast.success(t('serverBackups.deleteSuccess'));
                    fetchBackups();
                } else {
                    toast.error(data.message || t('serverBackups.deleteFailed'));
                }
            },
        });
        setConfirmDialogOpen(true);
    };

    const handleLockBackup = (backup: BackupItem, lock: boolean) => {
        setConfirmAction({
            title: lock ? t('serverBackups.confirmLockTitle') : t('serverBackups.confirmUnlockTitle'),
            description: lock ? t('serverBackups.lockConfirm') : t('serverBackups.unlockConfirm'),
            action: async () => {
                const endpoint = lock ? 'lock' : 'unlock';
                const { data } = await axios.post(`/api/user/servers/${uuidShort}/backups/${backup.uuid}/${endpoint}`);
                if (data.success) {
                    toast.success(lock ? t('serverBackups.lockSuccess') : t('serverBackups.unlockSuccess'));
                    fetchBackups();
                } else {
                    toast.error(data.message || t('serverBackups.failedToPerformAction'));
                }
            },
        });
        setConfirmDialogOpen(true);
    };

    const handleDownloadBackup = async (backup: BackupItem) => {
        try {
            const { data } = await axios.get(`/api/user/servers/${uuidShort}/backups/${backup.uuid}/download`);
            if (data.success) {
                window.open(data.data.download_url, '_blank');
                toast.success(t('serverBackups.downloadSuccess'));
            } else {
                toast.error(data.message || t('serverBackups.downloadFailed'));
            }
        } catch {
            toast.error(t('serverBackups.downloadFailed'));
        }
    };

    const addIgnorePattern = () => {
        if (newIgnorePattern.trim() && !ignoredFiles.includes(newIgnorePattern.trim())) {
            setIgnoredFiles([...ignoredFiles, newIgnorePattern.trim()]);
            setNewIgnorePattern('');
        }
    };

    const removeIgnorePattern = (pattern: string) => {
        setIgnoredFiles(ignoredFiles.filter((p) => p !== pattern));
    };

    if (loading && backups.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 animate-pulse font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    const backupCountTotal = pagination.total;
    const fifoRolling = Boolean(server?.fifo_rolling_enabled);
    const limitReached = server && server.backup_limit > 0 && backupCountTotal >= server.backup_limit && !fifoRolling;
    const showHeaderCreateAction = canCreate && backups.length > 0;

    return (
        <div className='space-y-8 pb-12'>
            <PageHeader
                title={t('serverBackups.title')}
                description={
                    <div className='flex items-center gap-3'>
                        <span>{t('serverBackups.description')}</span>
                        {server && (
                            <span className='bg-primary/5 text-primary border-primary/20 rounded-full border px-3 py-1 text-[10px] font-black tracking-widest uppercase'>
                                {backupCountTotal} / {server.backup_limit === 0 ? '∞' : server.backup_limit}
                                {fifoRolling ? ' · FIFO' : ''}
                            </span>
                        )}
                    </div>
                }
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        {showHeaderCreateAction && (
                            <Button
                                size='default'
                                disabled={limitReached || loading}
                                onClick={() => {
                                    setNewBackupName(generateBackupName());
                                    setIgnoredFiles([]);
                                    setCreateDialogOpen(true);
                                }}
                                className='order-1 w-full transition-all active:scale-95 sm:order-2 sm:w-auto'
                            >
                                <Plus className='mr-2 h-5 w-5' />
                                {t('serverBackups.createBackup')}
                            </Button>
                        )}
                        <Button
                            variant='glass'
                            size='default'
                            onClick={() => fetchBackups()}
                            disabled={loading}
                            className='order-2 sm:order-1'
                            aria-label={t('serverBackups.refresh')}
                        >
                            <RefreshCw className={cn('h-5 w-5 sm:mr-2', loading && 'animate-spin')} />
                            <span className='hidden sm:inline'>{t('serverBackups.refresh')}</span>
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('server-backups', 'backup-header')} />

            {server && fifoRolling && server.backup_limit > 0 && (
                <div className='animate-in slide-in-from-top relative overflow-hidden rounded-3xl border border-sky-500/20 bg-sky-500/10 p-6 backdrop-blur-xl duration-500'>
                    <div className='relative z-10 flex items-start gap-5'>
                        <div className='flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/20'>
                            <Info className='h-6 w-6 text-sky-500' />
                        </div>
                        <div className='space-y-1'>
                            <h3 className='text-lg leading-none font-bold text-sky-600 dark:text-sky-400'>
                                {t('serverBackups.fifoRollingTitle')}
                            </h3>
                            <p className='text-sm leading-relaxed font-medium text-sky-600/85 dark:text-sky-400/85'>
                                {t('serverBackups.fifoRollingDescription', {
                                    limit: String(server.backup_limit),
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {limitReached && (
                <div className='animate-in slide-in-from-top relative overflow-hidden rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6 backdrop-blur-xl duration-500'>
                    <div className='relative z-10 flex items-start gap-5'>
                        <div className='flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-500/30 bg-yellow-500/20'>
                            <AlertTriangle className='h-6 w-6 text-yellow-500' />
                        </div>
                        <div className='space-y-1'>
                            <h3 className='text-lg leading-none font-bold text-yellow-500'>
                                {t('serverBackups.backupLimitReached')}
                            </h3>
                            <p className='text-sm leading-relaxed font-medium text-yellow-500/80'>
                                {t('serverBackups.backupLimitReachedDescription', {
                                    limit: String(server?.backup_limit || 0),
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className='space-y-6'>
                <div className='flex items-center gap-4'>
                    <div className='group relative flex-1'>
                        <Search className='text-muted-foreground/80 group-focus-within:text-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 transition-colors' />
                        <Input
                            placeholder={t('serverBackups.searchPlaceholder')}
                            className='h-14 pl-12 text-base'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {pagination.total > pagination.per_page && (
                    <div className='border-border bg-card/50 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                        <Button
                            variant='glass'
                            size='sm'
                            disabled={pagination.current_page === 1 || loading}
                            onClick={() => fetchBackups(pagination.current_page - 1)}
                            className='gap-1.5'
                        >
                            <ChevronLeft className='h-4 w-4' />
                            {t('common.previous')}
                        </Button>
                        <span className='text-sm font-medium'>
                            {pagination.current_page} / {pagination.last_page}
                        </span>
                        <Button
                            variant='glass'
                            size='sm'
                            disabled={pagination.current_page === pagination.last_page || loading}
                            onClick={() => fetchBackups(pagination.current_page + 1)}
                            className='gap-1.5'
                        >
                            {t('common.next')}
                            <ChevronRight className='h-4 w-4' />
                        </Button>
                    </div>
                )}

                {backups.length === 0 ? (
                    <EmptyState
                        title={t('serverBackups.noBackups')}
                        description={
                            server?.backup_limit === 0
                                ? t('serverBackups.noBackupsNoLimit')
                                : t('serverBackups.noBackupsDescription')
                        }
                        icon={Archive}
                        action={
                            canCreate && server ? (
                                <Button
                                    size='default'
                                    onClick={() => {
                                        setNewBackupName(generateBackupName());
                                        setIgnoredFiles([]);
                                        setCreateDialogOpen(true);
                                    }}
                                    className='h-14 px-10 text-lg'
                                >
                                    <Plus className='mr-2 h-6 w-6' />
                                    {t('serverBackups.createBackup')}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className='grid grid-cols-1 gap-4'>
                        {backups.map((backup) => (
                            <ResourceCard
                                key={backup.id}
                                className={cn(
                                    !backup.completed_at && !backup.is_successful && 'animate-pulse border-blue-500/20',
                                    'transition-all duration-300',
                                )}
                                icon={Archive}
                                iconWrapperClassName={cn(
                                    !backup.completed_at && !backup.is_successful
                                        ? 'bg-blue-500/10 border-blue-500/20'
                                        : backup.is_successful
                                          ? 'bg-emerald-500/10 border-emerald-500/20'
                                          : 'bg-red-500/10 border-red-500/20',
                                )}
                                iconClassName={cn(
                                    !backup.completed_at && !backup.is_successful
                                        ? 'text-blue-500'
                                        : backup.is_successful
                                          ? 'text-emerald-500'
                                          : 'text-red-500',
                                )}
                                title={backup.name}
                                badges={
                                    <>
                                        <span
                                            className={cn(
                                                'rounded-full px-3 py-1 text-[10px] leading-none font-black tracking-widest uppercase',
                                                !backup.completed_at && !backup.is_successful
                                                    ? 'animate-pulse bg-blue-500 text-white'
                                                    : backup.is_successful
                                                      ? 'bg-emerald-500 text-white'
                                                      : 'bg-red-500 text-white',
                                            )}
                                        >
                                            {!backup.completed_at && !backup.is_successful
                                                ? t('serverBackups.statusCreating')
                                                : backup.is_successful
                                                  ? t('serverBackups.statusSuccessful')
                                                  : t('serverBackups.statusFailed')}
                                        </span>
                                        {backup.is_locked === 1 && (
                                            <span className='flex items-center gap-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-[10px] leading-none font-black tracking-widest text-yellow-500 uppercase'>
                                                <Lock className='h-3 w-3' />
                                                {t('serverBackups.statusLocked')}
                                            </span>
                                        )}
                                    </>
                                }
                                description={
                                    <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
                                        <div className='text-muted-foreground flex items-center gap-2'>
                                            <HardDrive className='h-4 w-4 opacity-50' />
                                            <span className='text-sm font-semibold'>
                                                {formatMib(backup.bytes / 1024 / 1024)}
                                            </span>
                                        </div>
                                        <div className='text-muted-foreground flex items-center gap-2'>
                                            <Database className='h-4 w-4 opacity-50' />
                                            <span className='text-sm font-semibold tracking-tight uppercase'>
                                                {backup.disk}
                                            </span>
                                        </div>
                                        <div className='text-muted-foreground flex items-center gap-2'>
                                            <Calendar className='h-4 w-4 opacity-50' />
                                            <span className='text-sm font-semibold'>
                                                {formatDateTimeInTz(backup.created_at, dateOpts)}
                                            </span>
                                        </div>
                                    </div>
                                }
                                actions={
                                    (canRestore || canDownload || canDelete) && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger className='group-hover:bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl transition-colors outline-none'>
                                                <MoreVertical className='text-muted-foreground group-hover:text-primary h-6 w-6 transition-colors' />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align='end'
                                                className='bg-card/90 border-border/40 w-56 rounded-2xl p-2 backdrop-blur-xl'
                                            >
                                                {canRestore && backup.is_successful === 1 && (
                                                    <DropdownMenuItem
                                                        disabled={backup.is_locked === 1}
                                                        onClick={() => {
                                                            setBackupToRestore(backup);
                                                            setRestoreDialogOpen(true);
                                                        }}
                                                        className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                    >
                                                        <RotateCcw className='h-4 w-4 text-emerald-500' />
                                                        <span className='font-bold'>{t('serverBackups.restore')}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {canDownload && backup.is_successful === 1 && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleDownloadBackup(backup)}
                                                        className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                    >
                                                        <Download className='h-4 w-4 text-blue-500' />
                                                        <span className='font-bold'>{t('serverBackups.download')}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {canDelete && (
                                                    <DropdownMenuItem
                                                        disabled={backup.is_locked === 1}
                                                        onClick={() => handleDeleteBackup(backup)}
                                                        className='flex cursor-pointer items-center gap-3 rounded-xl p-3 text-red-500 focus:bg-red-500/10 focus:text-red-500'
                                                    >
                                                        <Trash2 className='h-4 w-4' />
                                                        <span className='font-bold'>{t('serverBackups.delete')}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator className='bg-border/40 my-1' />
                                                <DropdownMenuItem
                                                    onClick={() => handleLockBackup(backup, backup.is_locked === 0)}
                                                    className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                >
                                                    {backup.is_locked === 1 ? (
                                                        <>
                                                            <Unlock className='h-4 w-4 text-yellow-500' />
                                                            <span className='font-bold'>
                                                                {t('serverBackups.unlock')}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Lock className='h-4 w-4 text-yellow-500' />
                                                            <span className='font-bold'>{t('serverBackups.lock')}</span>
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )
                                }
                            />
                        ))}
                    </div>
                )}

                {pagination.total > pagination.per_page && (
                    <div className='border-border/40 flex items-center justify-between border-t px-6 py-8'>
                        <p className='text-sm font-bold tracking-widest uppercase opacity-40'>
                            {t('serverActivities.pagination.showing', {
                                from: String((pagination.current_page - 1) * pagination.per_page + 1),
                                to: String(Math.min(pagination.current_page * pagination.per_page, pagination.total)),
                                total: String(pagination.total),
                            })}
                        </p>
                        <div className='flex items-center gap-3'>
                            <Button
                                variant='glass'
                                size='sm'
                                disabled={pagination.current_page === 1 || loading}
                                onClick={() => {
                                    setPage((p) => p - 1);
                                    fetchBackups(pagination.current_page - 1);
                                }}
                                className='h-10 w-10 rounded-xl p-0'
                            >
                                <ChevronLeft className='h-5 w-5' />
                            </Button>
                            <span className='bg-primary/5 text-primary border-primary/20 flex h-10 min-w-12 items-center justify-center rounded-xl border px-4 text-sm font-black'>
                                {pagination.current_page} / {pagination.last_page}
                            </span>
                            <Button
                                variant='glass'
                                size='sm'
                                disabled={pagination.current_page === pagination.last_page || loading}
                                onClick={() => {
                                    setPage((p) => p + 1);
                                    fetchBackups(pagination.current_page + 1);
                                }}
                                className='h-10 w-10 rounded-xl p-0'
                            >
                                <ChevronRight className='h-5 w-5' />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <WidgetRenderer widgets={getWidgets('server-backups', 'backup-bottom')} />

            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} className='max-w-xl'>
                <div className='space-y-6 p-2'>
                    <DialogHeader>
                        <div className='flex items-center gap-4'>
                            <div className='bg-primary/10 border-primary/20 flex h-12 w-12 items-center justify-center rounded-xl border'>
                                <Plus className='text-primary h-6 w-6' />
                            </div>
                            <div className='space-y-0.5'>
                                <DialogTitle className='text-xl leading-none font-bold'>
                                    {t('serverBackups.createBackup')}
                                </DialogTitle>
                                <DialogDescription className='text-sm opacity-70'>
                                    {t('serverBackups.createBackupDescription')}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleCreateBackup} className='space-y-6'>
                        <div className='space-y-4'>
                            <div className='space-y-2 px-1'>
                                <label className='ml-1 text-[10px] font-bold tracking-widest uppercase opacity-40'>
                                    {t('serverBackups.name')}
                                </label>
                                <Input
                                    value={newBackupName}
                                    onChange={(e) => setNewBackupName(e.target.value)}
                                    placeholder={t('serverBackups.namePlaceholder')}
                                    required
                                    className='focus:border-primary/50 h-12 rounded-xl border-white/5 bg-black/20 transition-all'
                                />
                            </div>

                            <div className='space-y-3 px-1'>
                                <label className='ml-1 text-[10px] font-bold tracking-widest uppercase opacity-40'>
                                    {t('serverBackups.ignoreFiles')}
                                </label>
                                <div className='flex gap-2'>
                                    <Input
                                        value={newIgnorePattern}
                                        onChange={(e) => setNewIgnorePattern(e.target.value)}
                                        placeholder={t('serverBackups.ignoreFilesPlaceholder')}
                                        className='focus:border-primary/50 h-12 rounded-xl border-white/5 bg-black/20 transition-all'
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIgnorePattern())}
                                    />
                                    <Button
                                        type='button'
                                        variant='glass'
                                        className='bg-background/50 hover:bg-background border-border/40 h-12 rounded-xl px-5'
                                        onClick={addIgnorePattern}
                                    >
                                        <Plus className='h-5 w-5' />
                                    </Button>
                                </div>
                                <p className='text-muted-foreground px-1 text-[10px] leading-relaxed italic'>
                                    {t('serverBackups.ignoreFilesHelp')}
                                </p>

                                {ignoredFiles.length > 0 && (
                                    <div className='space-y-2 px-1 pt-2'>
                                        <div className='ml-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase opacity-40'>
                                            <FileX className='h-3 w-3' />
                                            {t('serverBackups.ignoreFilesList')}
                                        </div>
                                        <div className='flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-xl border border-white/5 bg-black/20 p-2'>
                                            {ignoredFiles.map((pattern, i) => (
                                                <span
                                                    key={i}
                                                    className='flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 py-1.5 pr-2 pl-3 font-mono text-[10px] text-red-500'
                                                >
                                                    {pattern}
                                                    <button
                                                        type='button'
                                                        onClick={() => removeIgnorePattern(pattern)}
                                                        className='rounded-sm p-0.5 transition-colors hover:bg-red-500/10'
                                                    >
                                                        <Trash2 className='h-3 w-3' />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className='border-border/40 mt-4 border-t px-1 pt-6'>
                            <Button
                                type='button'
                                variant='ghost'
                                className='h-12 flex-1 rounded-xl font-bold'
                                onClick={() => setCreateDialogOpen(false)}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button type='submit' disabled={creating} className='h-12 flex-1 rounded-xl font-bold'>
                                {creating ? <Loader2 className='h-5 w-5 animate-spin' /> : t('serverBackups.create')}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </Dialog>

            <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)} className='max-w-xl'>
                <div className='space-y-6 p-2'>
                    <DialogHeader>
                        <div className='flex items-center gap-4'>
                            <div className='flex h-12 w-12 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10'>
                                <RotateCcw className='h-6 w-6 text-orange-500' />
                            </div>
                            <div className='space-y-0.5'>
                                <DialogTitle className='text-xl leading-none font-bold'>
                                    {t('serverBackups.confirmRestoreTitle')}
                                </DialogTitle>
                                <DialogDescription className='text-sm opacity-70'>
                                    {t('serverBackups.restoreBackupDescription')}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className='mx-1 space-y-3 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 backdrop-blur-sm'>
                        <div className='flex items-center gap-3 text-orange-500'>
                            <AlertTriangle className='h-5 w-5' />
                            <h4 className='text-[10px] leading-none font-black tracking-widest uppercase'>
                                {t('serverBackups.caution')}
                            </h4>
                        </div>
                        <p className='text-sm leading-relaxed font-medium text-orange-700/80 dark:text-orange-500/80'>
                            {t('serverBackups.truncateDirectoryHelp')}
                        </p>
                    </div>

                    <form onSubmit={handleRestoreBackup} className='space-y-6'>
                        <div
                            className='group mx-1 flex cursor-pointer items-center gap-4 rounded-3xl border border-white/5 bg-black/20 p-5 transition-all hover:bg-black/30'
                            onClick={() => setTruncateDirectory(!truncateDirectory)}
                        >
                            <Checkbox
                                id='truncate-directory'
                                checked={truncateDirectory}
                                onCheckedChange={(checked) => setTruncateDirectory(checked === true)}
                                className='h-6 w-6'
                            />
                            <div className='space-y-0.5'>
                                <label
                                    htmlFor='truncate-directory'
                                    className='group-hover:text-primary block cursor-pointer text-sm leading-tight font-bold transition-colors'
                                >
                                    {t('serverBackups.truncateDirectory')}
                                </label>
                                <p className='text-[10px] font-bold tracking-tighter uppercase opacity-40'>
                                    {t('serverBackups.truncateDirectoryDescription')}
                                </p>
                            </div>
                        </div>

                        <DialogFooter className='border-border/40 mt-4 border-t px-1 pt-6'>
                            <Button
                                type='button'
                                variant='ghost'
                                className='h-12 flex-1 rounded-xl font-bold'
                                onClick={() => setRestoreDialogOpen(false)}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type='submit'
                                disabled={restoring}
                                variant='destructive'
                                className='h-12 flex-1 rounded-xl font-bold'
                            >
                                {restoring ? (
                                    <Loader2 className='h-5 w-5 animate-spin' />
                                ) : (
                                    t('serverBackups.confirmRestore')
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </Dialog>

            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} className='max-w-lg'>
                <div className='space-y-6 p-2'>
                    <DialogHeader>
                        <div className='flex items-center gap-4'>
                            <div
                                className={cn(
                                    'flex h-12 w-12 items-center justify-center rounded-xl border',
                                    confirmAction?.variant === 'destructive'
                                        ? 'border-red-500/20 bg-red-500/10'
                                        : 'bg-primary/10 border-primary/20',
                                )}
                            >
                                {confirmAction?.variant === 'destructive' ? (
                                    <Trash2 className='h-6 w-6 text-red-500' />
                                ) : (
                                    <Info className='text-primary h-6 w-6' />
                                )}
                            </div>
                            <div className='space-y-0.5'>
                                <DialogTitle className='text-xl leading-none font-bold'>
                                    {confirmAction?.title}
                                </DialogTitle>
                                <DialogDescription className='text-sm opacity-70'>
                                    {confirmAction?.description}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <DialogFooter className='border-border/40 mt-4 border-t px-1 pt-6'>
                        <Button
                            variant='ghost'
                            className='h-12 flex-1 rounded-xl font-bold'
                            onClick={() => setConfirmDialogOpen(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant={confirmAction?.variant === 'destructive' ? 'destructive' : 'default'}
                            className='h-12 flex-1 rounded-xl font-bold'
                            onClick={async () => {
                                setActionLoading(true);
                                try {
                                    await confirmAction?.action();
                                    setConfirmDialogOpen(false);
                                } finally {
                                    setActionLoading(false);
                                }
                            }}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className='h-5 w-5 animate-spin' /> : t('common.confirm')}
                        </Button>
                    </DialogFooter>
                </div>
            </Dialog>
        </div>
    );
}
