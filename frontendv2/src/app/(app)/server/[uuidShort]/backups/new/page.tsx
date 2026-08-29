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

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { Archive, Plus, Lock, FileX, HardDrive, Database, Check, Layers } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { FormSection } from '@/components/featherui/FormSection';
import { Label } from '@/components/ui/label';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { safeBack } from '@/lib/safe-back';
import { cn } from '@/lib/utils';
import { formatBackupLimitLabel, isBackupLimitDisabled } from '@/lib/server-utils';
import type { Database as ServerDatabase, Server } from '@/types/server';
import { BackupTaskFields } from '@/components/server/backup/BackupTaskFields';
import {
    buildBackupPayload,
    emptyBackupFields,
    DEFAULT_DB_DIRECTORY,
    type BackupFields,
    type BackupKind,
} from '@/components/server/backup/backup-payload';

export default function CreateBackupPage() {
    const { uuidShort } = useParams() as { uuidShort: string };
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);
    const canCreate = hasPermission('backup.create');

    const [saving, setSaving] = React.useState(false);
    const [server, setServer] = React.useState<Server | null>(null);
    const [backupCountTotal, setBackupCountTotal] = React.useState(0);
    const [databases, setDatabases] = React.useState<ServerDatabase[]>([]);
    const kindParam = searchParams.get('kind');
    const initialKind: BackupKind = kindParam === 'database' ? 'database' : kindParam === 'full' ? 'full' : 'files';
    const [kind, setKind] = React.useState<BackupKind>(initialKind);
    const [backupName, setBackupName] = React.useState('');
    const [ignoredFiles, setIgnoredFiles] = React.useState<string[]>([]);
    const [newIgnorePattern, setNewIgnorePattern] = React.useState('');
    const [advancedFields, setAdvancedFields] = React.useState<BackupFields>(() => ({
        ...emptyBackupFields(),
        kind: initialKind === 'files' ? 'database' : initialKind,
    }));

    const { getWidgets, fetchWidgets } = usePluginWidgets('server-backups-new');

    const backupsDisabled = server ? isBackupLimitDisabled(server.backup_limit) : false;
    const fifoRolling = Boolean(server?.fifo_rolling_enabled);
    const atFileLimit =
        !!server && !backupsDisabled && server.backup_limit > 0 && backupCountTotal >= server.backup_limit;
    const filesBlocked = backupsDisabled || (atFileLimit && !fifoRolling);

    React.useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    React.useEffect(() => {
        const load = async () => {
            try {
                const [serverRes, databasesRes, backupsRes] = await Promise.all([
                    axios.get<{ success: boolean; data: Server }>(`/api/user/servers/${uuidShort}`),
                    axios.get<{ success: boolean; data: { data: ServerDatabase[] } }>(
                        `/api/user/servers/${uuidShort}/databases`,
                        { params: { page: 1, per_page: 100 } },
                    ),
                    axios.get<{ success: boolean; data: { pagination?: { total?: number } } }>(
                        `/api/user/servers/${uuidShort}/backups`,
                        { params: { page: 1, per_page: 1 } },
                    ),
                ]);
                if (serverRes.data?.success) {
                    setServer(serverRes.data.data);
                }
                if (databasesRes.data?.success) {
                    setDatabases(databasesRes.data.data.data || []);
                }
                const total = backupsRes.data?.data?.pagination?.total;
                if (typeof total === 'number') {
                    setBackupCountTotal(total);
                }
            } catch (error) {
                console.error('Failed to load backup create context:', error);
            }
        };
        load();
        setBackupName(generateBackupName());
    }, [uuidShort]);

    const generateBackupName = () => {
        const now = new Date();
        const formatted = now.toISOString().replace(/T/, '-').replace(/\..+/, '').replace(/:/g, '-');
        return `backup-${formatted}-${Math.random().toString(36).substring(2, 7)}`;
    };

    const addIgnorePattern = () => {
        const pattern = newIgnorePattern.trim();
        if (!pattern || ignoredFiles.includes(pattern)) return;
        setIgnoredFiles((prev) => [...prev, pattern]);
        setNewIgnorePattern('');
    };

    const removeIgnorePattern = (pattern: string) => {
        setIgnoredFiles((prev) => prev.filter((p) => p !== pattern));
    };

    const handleCreate = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setSaving(true);
        try {
            if (kind === 'files') {
                if (filesBlocked) {
                    toast.error(
                        backupsDisabled ? t('serverBackups.noBackupsNoLimit') : t('serverBackups.backupLimitReached'),
                    );
                    return;
                }
                if (!backupName.trim()) {
                    toast.error(t('serverBackups.namePlaceholder'));
                    return;
                }
                const pending = newIgnorePattern.trim();
                const patterns = pending && !ignoredFiles.includes(pending) ? [...ignoredFiles, pending] : ignoredFiles;
                const { data } = await axios.post(`/api/user/servers/${uuidShort}/backups`, {
                    name: backupName.trim(),
                    ignore: JSON.stringify(patterns),
                });
                if (data?.success) {
                    toast.success(t('serverBackups.createSuccess'));
                    router.push(`/server/${uuidShort}/backups`);
                } else {
                    toast.error(data?.message || t('serverBackups.createFailed'));
                }
                return;
            }

            if (kind === 'full') {
                if (filesBlocked) {
                    toast.error(
                        backupsDisabled ? t('serverBackups.noBackupsNoLimit') : t('serverBackups.backupLimitReached'),
                    );
                    return;
                }
                if (!backupName.trim()) {
                    toast.error(t('serverBackups.namePlaceholder'));
                    return;
                }
                const built = buildBackupPayload({ ...advancedFields, kind: 'full' });
                if (!built) {
                    toast.error(t('serverTasks.selectAtLeastOneDatabase'));
                    return;
                }
                const parsed = JSON.parse(built) as {
                    ignored_files?: string;
                    databases: 'all' | number[];
                    directory: string;
                    include_metadata: boolean;
                    include_encrypted: boolean;
                    include_activities: boolean;
                };
                const { data } = await axios.post(`/api/user/servers/${uuidShort}/backups`, {
                    type: 'full',
                    name: backupName.trim(),
                    ignore: parsed.ignored_files || '',
                    databases: parsed.databases,
                    include_metadata: parsed.include_metadata,
                    include_encrypted: parsed.include_encrypted,
                    include_activities: parsed.include_activities,
                });
                if (data?.success) {
                    toast.success(t('serverBackups.fullBackupSuccess'));
                    if (Array.isArray(data.data?.dump_errors) && data.data.dump_errors.length > 0) {
                        toast.error(data.data.dump_errors[0]);
                    }
                    router.push(`/server/${uuidShort}/backups`);
                } else {
                    toast.error(data?.message || t('serverBackups.fullBackupFailed'));
                }
                return;
            }

            const built = buildBackupPayload({ ...advancedFields, kind: 'database' });
            if (!built) {
                toast.error(t('serverTasks.selectAtLeastOneDatabase'));
                return;
            }
            const parsed = JSON.parse(built) as { databases: 'all' | number[] };
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/backups/databases`, {
                databases: parsed.databases,
            });
            if (data?.success) {
                const count = data.data?.backed_up?.length ?? 0;
                toast.success(
                    t('serverBackups.databaseBackupSuccess', {
                        count: String(count),
                        directory: DEFAULT_DB_DIRECTORY,
                    }),
                );
                if (Array.isArray(data.data?.errors) && data.data.errors.length > 0) {
                    toast.error(data.data.errors[0]);
                }
                router.push(`/server/${uuidShort}/backups?tab=databases`);
            } else {
                toast.error(data?.message || t('serverBackups.databaseBackupFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message?: string }>;
            toast.error(
                axiosError.response?.data?.message ||
                    (kind === 'files'
                        ? t('serverBackups.createFailed')
                        : kind === 'full'
                          ? t('serverBackups.fullBackupFailed')
                          : t('serverBackups.databaseBackupFailed')),
            );
        } finally {
            setSaving(false);
        }
    };

    if (permissionsLoading) return null;

    if (!canCreate) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <div className='mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10'>
                    <Lock className='h-10 w-10 text-red-500' />
                </div>
                <h1 className='text-2xl font-black tracking-tight uppercase'>{t('common.accessDenied')}</h1>
                <p className='text-muted-foreground mt-2'>{t('common.noPermission')}</p>
                <Button variant='outline' className='mt-8' onClick={() => safeBack(router)}>
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <div className='mx-auto max-w-4xl space-y-8 pb-16'>
            <WidgetRenderer widgets={getWidgets('server-backups-new', 'top-of-page')} />
            <PageHeader
                title={t('serverBackups.createBackup')}
                description={t('serverBackups.createBackupDescription')}
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        <Button
                            variant='glass'
                            size='default'
                            onClick={() => safeBack(router)}
                            disabled={saving}
                            className='order-2 sm:order-1'
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            size='default'
                            variant='default'
                            onClick={() => handleCreate()}
                            disabled={saving || ((kind === 'files' || kind === 'full') && filesBlocked)}
                            loading={saving}
                            className='order-1 w-full sm:order-2 sm:w-auto'
                        >
                            <Plus className='mr-2 h-4 w-4' />
                            {t('serverBackups.create')}
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-backups-new', 'after-header')} />

            <form onSubmit={handleCreate} className='space-y-8'>
                <FormSection>
                    <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                        <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                            <Archive className='text-primary h-5 w-5' />
                        </div>
                        <div className='space-y-0.5'>
                            <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                {t('serverTasks.backupType')}
                            </h2>
                            <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                {t('serverTasks.backupTypeHelp')}
                            </p>
                        </div>
                    </div>

                    <div className='grid gap-4 sm:grid-cols-3'>
                        {(
                            [
                                {
                                    id: 'files' as const,
                                    icon: HardDrive,
                                    title: t('serverTasks.backupTypeFiles'),
                                    help: t('serverBackups.fileBackupTypeHelp'),
                                },
                                {
                                    id: 'database' as const,
                                    icon: Database,
                                    title: t('serverTasks.backupTypeDatabases'),
                                    help: t('serverBackups.databaseBackupTypeHelp'),
                                },
                                {
                                    id: 'full' as const,
                                    icon: Layers,
                                    title: t('serverTasks.backupTypeFull'),
                                    help: t('serverBackups.fullBackupTypeHelp'),
                                },
                            ] as const
                        ).map((option) => {
                            const selected = kind === option.id;
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.id}
                                    type='button'
                                    disabled={saving}
                                    onClick={() => {
                                        setKind(option.id);
                                        if (option.id === 'database' || option.id === 'full') {
                                            setAdvancedFields((prev) => ({ ...prev, kind: option.id }));
                                        }
                                    }}
                                    className={cn(
                                        'relative flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all',
                                        selected
                                            ? 'border-primary/50 bg-primary/10 shadow-primary/20 shadow-[0_0_0_1px]'
                                            : 'border-border/50 hover:border-border bg-black/10 hover:bg-black/20',
                                        saving && 'pointer-events-none opacity-60',
                                    )}
                                >
                                    <div className='flex w-full items-start justify-between gap-3'>
                                        <div
                                            className={cn(
                                                'flex h-11 w-11 items-center justify-center rounded-xl border',
                                                selected
                                                    ? 'border-primary/30 bg-primary/15 text-primary'
                                                    : 'border-border/40 bg-card/60 text-muted-foreground',
                                            )}
                                        >
                                            <Icon className='h-5 w-5' />
                                        </div>
                                        <span
                                            className={cn(
                                                'flex h-6 w-6 items-center justify-center rounded-full border transition-colors',
                                                selected
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border/60',
                                            )}
                                        >
                                            {selected && <Check className='h-3.5 w-3.5' />}
                                        </span>
                                    </div>
                                    <div className='space-y-1'>
                                        <p className='text-sm font-black tracking-wide uppercase'>{option.title}</p>
                                        <p className='text-muted-foreground text-xs leading-relaxed'>{option.help}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {server && (
                        <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                            {kind === 'files' ? (
                                <HardDrive className='h-3.5 w-3.5' />
                            ) : kind === 'full' ? (
                                <Layers className='h-3.5 w-3.5' />
                            ) : (
                                <Database className='h-3.5 w-3.5' />
                            )}
                            <span>
                                {kind === 'files'
                                    ? t('serverBackups.fileBackupHint', {
                                          limit: formatBackupLimitLabel(server.backup_limit, t('common.disabled')),
                                      })
                                    : kind === 'full'
                                      ? t('serverBackups.fullBackupHint', {
                                            limit: formatBackupLimitLabel(server.backup_limit, t('common.disabled')),
                                        })
                                      : t('serverBackups.databaseBackupHint')}
                            </span>
                        </div>
                    )}
                </FormSection>

                {(kind === 'files' || kind === 'full') && (
                    <FormSection>
                        <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                            <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                                <HardDrive className='text-primary h-5 w-5' />
                            </div>
                            <div className='space-y-0.5'>
                                <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                    {kind === 'full'
                                        ? t('serverTasks.backupTypeFull')
                                        : t('serverTasks.backupTypeFiles')}
                                </h2>
                                <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                    Configuration
                                </p>
                            </div>
                        </div>

                        {filesBlocked && (
                            <p className='rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-500'>
                                {backupsDisabled
                                    ? t('serverBackups.noBackupsNoLimit')
                                    : t('serverBackups.backupLimitReachedDescription', {
                                          limit: String(server?.backup_limit ?? 0),
                                      })}
                            </p>
                        )}

                        <div className='space-y-2.5'>
                            <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                {t('serverBackups.name')} <span className='text-primary'>*</span>
                            </Label>
                            <Input
                                value={backupName}
                                onChange={(e) => setBackupName(e.target.value)}
                                placeholder={t('serverBackups.namePlaceholder')}
                                required
                                disabled={saving || filesBlocked}
                            />
                        </div>

                        {kind === 'files' && (
                            <div className='space-y-3'>
                                <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                    {t('serverBackups.ignoreFiles')}
                                </Label>
                                <div className='flex gap-2'>
                                    <Input
                                        value={newIgnorePattern}
                                        onChange={(e) => setNewIgnorePattern(e.target.value)}
                                        placeholder={t('serverBackups.ignoreFilesPlaceholder')}
                                        disabled={saving || filesBlocked}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIgnorePattern())}
                                    />
                                    <Button
                                        type='button'
                                        variant='glass'
                                        className='h-10 px-4'
                                        onClick={addIgnorePattern}
                                        disabled={saving || filesBlocked}
                                    >
                                        <Plus className='h-4 w-4' />
                                    </Button>
                                </div>
                                <p className='text-muted-foreground ml-1 text-xs'>
                                    {t('serverBackups.ignoreFilesHelp')}
                                </p>
                                {ignoredFiles.length > 0 && (
                                    <div className='space-y-2 pt-1'>
                                        <div className='text-muted-foreground ml-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase'>
                                            <FileX className='h-3 w-3' />
                                            {t('serverBackups.ignoreFilesList')}
                                        </div>
                                        <div className='flex flex-wrap gap-2 rounded-xl border border-white/5 bg-black/20 p-3'>
                                            {ignoredFiles.map((pattern) => (
                                                <span
                                                    key={pattern}
                                                    className='flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 py-1.5 pr-2 pl-3 font-mono text-[10px] text-red-500'
                                                >
                                                    {pattern}
                                                    <button
                                                        type='button'
                                                        onClick={() => removeIgnorePattern(pattern)}
                                                        className='rounded-sm p-0.5 transition-colors hover:bg-red-500/10'
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </FormSection>
                )}

                {(kind === 'database' || kind === 'full') && (
                    <FormSection>
                        <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                            <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                                <Database className='text-primary h-5 w-5' />
                            </div>
                            <div className='space-y-0.5'>
                                <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                    {kind === 'full'
                                        ? t('serverTasks.fullMetadataSection')
                                        : t('serverTasks.backupTypeDatabases')}
                                </h2>
                                <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                    Configuration
                                </p>
                            </div>
                        </div>
                        <BackupTaskFields
                            fields={advancedFields}
                            setFields={setAdvancedFields}
                            databases={databases}
                            disabled={saving || (kind === 'full' && filesBlocked)}
                            lockKind={kind === 'full' ? 'full' : 'database'}
                        />
                    </FormSection>
                )}
            </form>
            <WidgetRenderer widgets={getWidgets('server-backups-new', 'bottom-of-page')} />
        </div>
    );
}
