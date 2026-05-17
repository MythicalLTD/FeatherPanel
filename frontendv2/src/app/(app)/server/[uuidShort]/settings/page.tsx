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
import { useParams, useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import {
    Save,
    Server as ServerIcon,
    RotateCcw,
    FolderOpen,
    Copy,
    ExternalLink,
    Hash,
    User,
    KeyRound,
    Info,
    Settings,
    Archive,
    AlertTriangle,
    Loader2,
    Lock,
    Link as LinkIcon,
} from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import type { Server } from '@/types/server';
import { isEnabled } from '@/lib/utils';

interface SftpDetails {
    host: string;
    port: number;
    username: string;
    url: string;
}

interface ServerWithSftp extends Server {
    sftp: SftpDetails;
}

interface ServerResponse {
    success: boolean;
    data: ServerWithSftp;
}

export default function ServerSettingsPage() {
    const { uuidShort } = useParams() as { uuidShort: string };
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation();
    const { loading: settingsLoading, settings } = useSettings();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);
    const { getWidgets } = usePluginWidgets('server-settings');

    const canDeleteServer = isEnabled(settings?.server_allow_user_server_deletion || 'false');

    const canRename = hasPermission('settings.rename');
    const canReinstall = hasPermission('settings.reinstall');
    const canViewSftp = true;

    const [server, setServer] = React.useState<ServerWithSftp | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [reinstalling, setReinstalling] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);

    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [backupRetentionMode, setBackupRetentionMode] = React.useState<'inherit' | 'hard_limit' | 'fifo_rolling'>(
        'inherit',
    );
    const [savingBackupPolicy, setSavingBackupPolicy] = React.useState(false);

    const [showReinstallDialog, setShowReinstallDialog] = React.useState(false);
    const [confirmReinstallText, setConfirmReinstallText] = React.useState('');
    const [wipeFilesOnReinstall, setWipeFilesOnReinstall] = React.useState(false);

    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [deleteStep, setDeleteStep] = React.useState(1);
    const [confirmIrreversible, setConfirmIrreversible] = React.useState(false);
    const [mathQuestion, setMathQuestion] = React.useState({ num1: 0, num2: 0 });
    const [mathAnswer, setMathAnswer] = React.useState('');
    const [confirmServerName, setConfirmServerName] = React.useState('');

    const generateMathQuestion = React.useCallback(() => {
        setMathQuestion({
            num1: Math.floor(Math.random() * 10) + 1,
            num2: Math.floor(Math.random() * 10) + 1,
        });
    }, []);

    const isMathCorrect = React.useMemo(() => {
        return parseInt(mathAnswer) === mathQuestion.num1 + mathQuestion.num2;
    }, [mathAnswer, mathQuestion]);

    const isServerNameCorrect = React.useMemo(() => {
        return confirmServerName === server?.name;
    }, [confirmServerName, server]);

    const fetchData = React.useCallback(async () => {
        if (!uuidShort) return;
        setLoading(true);
        try {
            const { data } = await axios.get<ServerResponse>(`/api/user/servers/${uuidShort}`);
            if (data.success) {
                setServer(data.data);
                setName(data.data.name);
                setDescription(data.data.description || '');
                const br = data.data.backup_retention_mode;
                setBackupRetentionMode(br === 'fifo_rolling' || br === 'hard_limit' ? br : 'inherit');
            }
        } catch (error) {
            console.error(error);
            toast.error(t('serverSettings.errorTitle'));
        } finally {
            setLoading(false);
        }
    }, [uuidShort, t]);

    React.useEffect(() => {
        if (!permissionsLoading && !settingsLoading) {
            fetchData();
        }
    }, [permissionsLoading, settingsLoading, fetchData]);

    const handleSave = async () => {
        if (!canRename) return;
        setSaving(true);
        try {
            const { data } = await axios.put(`/api/user/servers/${uuidShort}`, {
                name,
                description,
            });
            if (data.success) {
                toast.success(t('serverSettings.saveSuccess'));

                if (server) {
                    setServer({ ...server, name, description });
                }
            }
        } catch (error) {
            console.error(error);
            toast.error(t('serverSettings.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const handleReinstall = async () => {
        if (!canReinstall) return;
        setReinstalling(true);
        try {
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/reinstall`, {
                wipe_files: wipeFilesOnReinstall,
            });
            if (data.success) {
                toast.success(t('serverSettings.reinstallSuccess'));
                setShowReinstallDialog(false);
            }
        } catch (error) {
            console.error(error);
            toast.error(t('serverSettings.reinstallError'));
        } finally {
            setReinstalling(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await axios.delete(`/api/user/servers/${uuidShort}`);
            toast.success(t('serverSettings.serverDeleted'));
            router.push('/dashboard');
        } catch (error) {
            console.error(error);
            toast.error(t('serverSettings.deleteError'));
            setDeleting(false);
        }
    };

    const hasChanges = server?.name !== name || (server?.description || '') !== description;
    const canEditBackupPolicy =
        Boolean(server && !server.is_subuser) && isEnabled(settings?.server_allow_user_backup_policy_edit ?? 'true');
    const hasBackupPolicyChanges =
        server &&
        (server.backup_retention_mode === 'fifo_rolling' || server.backup_retention_mode === 'hard_limit'
            ? server.backup_retention_mode
            : 'inherit') !== backupRetentionMode;

    const handleSaveBackupPolicy = async () => {
        if (!canEditBackupPolicy || !server) return;
        setSavingBackupPolicy(true);
        try {
            const { data } = await axios.put(`/api/user/servers/${uuidShort}`, {
                backup_retention_mode: backupRetentionMode === 'inherit' ? null : backupRetentionMode,
            });
            if (data.success) {
                toast.success(t('serverSettings.backupPolicySaveSuccess'));
                await fetchData();
            }
        } catch (error) {
            console.error(error);
            const msg = axios.isAxiosError(error)
                ? (error.response?.data as { message?: string } | undefined)?.message
                : undefined;
            toast.error(msg || t('serverSettings.backupPolicySaveError'));
        } finally {
            setSavingBackupPolicy(false);
        }
    };
    const resolvedSftpHost = server?.node?.sftp_subdomain || server?.sftp?.host || '';
    const resolvedSftpPort = server?.sftp?.port;
    const resolvedSftpUsername = server?.sftp?.username || '';
    const resolvedSftpUrl =
        resolvedSftpUsername && resolvedSftpHost && resolvedSftpPort
            ? `sftp://${resolvedSftpUsername}@${resolvedSftpHost}:${resolvedSftpPort}`
            : server?.sftp?.url || '';

    if (permissionsLoading || settingsLoading) return null;

    if (loading && !server) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    if (!canRename && !canReinstall && !canViewSftp) {
        return (
            <div className='bg-card/40 border-border/5 flex flex-col items-center justify-center space-y-8 rounded-[3rem] border py-24 text-center backdrop-blur-3xl'>
                <div className='relative'>
                    <div className='absolute inset-0 scale-150 rounded-full bg-red-500/20 blur-3xl' />
                    <div className='relative flex h-32 w-32 rotate-3 items-center justify-center rounded-3xl border-2 border-red-500/20 bg-red-500/10'>
                        <Lock className='h-16 w-16 text-red-500' />
                    </div>
                </div>
                <div className='max-w-md space-y-3 px-4'>
                    <h2 className='text-3xl font-black tracking-tight uppercase'>{t('serverSettings.accessDenied')}</h2>
                </div>
                <Button
                    variant='outline'
                    size='default'
                    className='mt-8 h-14 rounded-2xl px-10'
                    onClick={() => router.push(`/server/${uuidShort}`)}
                >
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <div key={pathname} className='mx-auto max-w-6xl space-y-8 pb-16 font-sans'>
            <WidgetRenderer widgets={getWidgets('server-settings', 'top-of-page')} />
            <PageHeader title={t('serverSettings.title')} description={t('serverSettings.description')} />
            <WidgetRenderer widgets={getWidgets('server-settings', 'after-header')} />

            <div className='grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-12'>
                <div className='min-w-0 space-y-8 lg:col-span-8'>
                    <PageCard
                        title={t('serverSettings.serverInformation')}
                        description={t('serverSettings.serverInformationDescription')}
                        icon={ServerIcon}
                    >
                        <div className='space-y-4'>
                            <div className='space-y-2'>
                                <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                    {t('serverSettings.serverName')}
                                </Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={!canRename || saving}
                                    className='bg-secondary/50 border-border/10 focus:border-primary/50 h-12 rounded-xl text-base font-medium'
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                    {t('serverSettings.serverDescription')}
                                </Label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={!canRename || saving}
                                    className='bg-secondary/50 border-border/10 focus:border-primary/50 h-12 rounded-xl text-base font-medium'
                                />
                            </div>

                            {canRename && (
                                <div className='flex gap-3 pt-2'>
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving || !hasChanges}
                                        variant='default'
                                        size='sm'
                                    >
                                        {saving ? (
                                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        ) : (
                                            <Save className='mr-2 h-4 w-4' />
                                        )}
                                        {t('serverSettings.saveChanges')}
                                    </Button>
                                    <Button
                                        variant='outline'
                                        onClick={() => {
                                            setName(server?.name || '');
                                            setDescription(server?.description || '');
                                        }}
                                        disabled={saving || !hasChanges}
                                        className='text-muted-foreground hover:text-foreground h-10 rounded-xl border-white/10 bg-transparent px-4 transition-all hover:bg-white/5'
                                    >
                                        <RotateCcw className='mr-2 h-4 w-4' />
                                        {t('serverSettings.reset')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </PageCard>

                    {canEditBackupPolicy && (
                        <PageCard
                            title={t('serverSettings.backupPolicyTitle')}
                            description={t('serverSettings.backupPolicyDescription')}
                            icon={Archive}
                        >
                            <div className='grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2'>
                                <div className='min-w-0 space-y-2'>
                                    <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                        {t('serverSettings.backupLimitReadOnlyLabel')}
                                    </Label>
                                    <div className='border-border/10 bg-muted/40 flex h-12 items-center rounded-xl border px-4 text-sm font-medium'>
                                        {server?.backup_limit === 0 ? '∞' : String(server?.backup_limit ?? '—')}
                                    </div>
                                    <p className='text-muted-foreground ml-1 text-xs break-words'>
                                        {t('serverSettings.backupLimitReadOnlyHelp')}
                                    </p>
                                </div>
                                <div className='min-w-0 space-y-2'>
                                    <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                        {t('admin.servers.form.backup_retention_mode')}
                                    </Label>
                                    <select
                                        className='border-border/10 bg-secondary/50 h-12 w-full rounded-xl border px-3 text-sm'
                                        value={backupRetentionMode}
                                        onChange={(e) =>
                                            setBackupRetentionMode(
                                                e.target.value as 'inherit' | 'hard_limit' | 'fifo_rolling',
                                            )
                                        }
                                        disabled={savingBackupPolicy}
                                    >
                                        <option value='inherit'>
                                            {t('admin.servers.form.backup_retention_inherit')}
                                        </option>
                                        <option value='hard_limit'>
                                            {t('admin.servers.form.backup_retention_hard_limit')}
                                        </option>
                                        <option value='fifo_rolling'>
                                            {t('admin.servers.form.backup_retention_fifo')}
                                        </option>
                                    </select>
                                    <p className='text-muted-foreground ml-1 text-xs break-words'>
                                        {t('admin.servers.form.backup_retention_mode_help')}
                                    </p>
                                </div>
                            </div>
                            {server?.fifo_rolling_enabled && server.backup_limit > 0 && (
                                <p className='mt-4 flex min-w-0 items-start gap-2 text-sm break-words text-sky-600 dark:text-sky-400'>
                                    <Info className='mt-0.5 h-4 w-4 shrink-0' />
                                    <span className='min-w-0 flex-1'>
                                        {t('serverBackups.fifoRollingDescription', {
                                            limit: String(server.backup_limit),
                                        })}
                                    </span>
                                </p>
                            )}
                            <div className='flex gap-3 pt-4'>
                                <Button
                                    onClick={handleSaveBackupPolicy}
                                    disabled={savingBackupPolicy || !hasBackupPolicyChanges}
                                    size='sm'
                                >
                                    {savingBackupPolicy ? (
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    ) : (
                                        <Save className='mr-2 h-4 w-4' />
                                    )}
                                    {t('serverSettings.backupPolicySave')}
                                </Button>
                            </div>
                        </PageCard>
                    )}

                    <WidgetRenderer widgets={getWidgets('server-settings', 'after-server-info')} />

                    <PageCard
                        title={t('serverSettings.sftpDetails')}
                        description={t('serverSettings.sftpDetailsDescription')}
                        icon={FolderOpen}
                    >
                        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                            <div className='space-y-2'>
                                <Label className='text-muted-foreground ml-1 flex items-center gap-2 text-[10px] font-black tracking-widest uppercase'>
                                    <ServerIcon className='h-3 w-3' />
                                    {t('serverSettings.sftpHost')}
                                </Label>
                                <div className='bg-secondary/50 border-border/10 group/input flex items-center gap-2 rounded-xl border p-1 pr-1 pl-4 transition-colors hover:border-blue-500/30'>
                                    <code className='text-foreground/80 flex-1 truncate font-mono text-xs'>
                                        {resolvedSftpHost ? `sftp://${resolvedSftpHost}` : t('common.nA')}
                                    </code>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='text-muted-foreground h-8 w-8 rounded-lg p-0 hover:bg-white/10 hover:text-blue-400'
                                        onClick={() =>
                                            copyToClipboard(resolvedSftpHost ? `sftp://${resolvedSftpHost}` : '')
                                        }
                                    >
                                        <Copy className='h-3.5 w-3.5' />
                                    </Button>
                                </div>
                            </div>

                            <div className='space-y-2'>
                                <Label className='text-muted-foreground ml-1 flex items-center gap-2 text-[10px] font-black tracking-widest uppercase'>
                                    <Hash className='h-3 w-3' />
                                    {t('serverSettings.sftpPort')}
                                </Label>
                                <div className='bg-secondary/50 border-border/10 group/input flex items-center gap-2 rounded-xl border p-1 pr-1 pl-4 transition-colors hover:border-blue-500/30'>
                                    <code className='text-foreground/80 flex-1 truncate font-mono text-xs'>
                                        {server?.sftp?.port || t('common.nA')}
                                    </code>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='text-muted-foreground h-8 w-8 rounded-lg p-0 hover:bg-white/10 hover:text-blue-400'
                                        onClick={() => copyToClipboard(server?.sftp?.port?.toString() || '')}
                                    >
                                        <Copy className='h-3.5 w-3.5' />
                                    </Button>
                                </div>
                            </div>

                            <div className='space-y-2'>
                                <Label className='text-muted-foreground ml-1 flex items-center gap-2 text-[10px] font-black tracking-widest uppercase'>
                                    <User className='h-3 w-3' />
                                    {t('serverSettings.sftpUsername')}
                                </Label>
                                <div className='bg-secondary/50 border-border/10 group/input flex items-center gap-2 rounded-xl border p-1 pr-1 pl-4 transition-colors hover:border-blue-500/30'>
                                    <code className='text-foreground/80 flex-1 truncate font-mono text-xs'>
                                        {server?.sftp?.username || t('common.nA')}
                                    </code>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='text-muted-foreground h-8 w-8 rounded-lg p-0 hover:bg-white/10 hover:text-blue-400'
                                        onClick={() => copyToClipboard(server?.sftp?.username || '')}
                                    >
                                        <Copy className='h-3.5 w-3.5' />
                                    </Button>
                                </div>
                            </div>

                            <div className='space-y-2'>
                                <Label className='text-muted-foreground ml-1 flex items-center gap-2 text-[10px] font-black tracking-widest uppercase'>
                                    <KeyRound className='h-3 w-3' />
                                    {t('serverSettings.sftpPassword')}
                                </Label>
                                <div className='bg-secondary/50 border-border/10 flex h-10.5 items-center gap-2 rounded-xl border border-dashed px-4'>
                                    <span className='text-muted-foreground/60 text-xs italic'>
                                        {t('serverSettings.sftpPasswordPlaceholder')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className='space-y-2 pt-6'>
                            <Label className='text-muted-foreground ml-1 flex items-center gap-2 text-[10px] font-black tracking-widest uppercase'>
                                <LinkIcon className='h-3 w-3' />
                                {t('serverSettings.sftpUrl')}
                            </Label>
                            <div className='group/input flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 p-1 pr-1 pl-4 transition-colors hover:border-blue-500/30'>
                                <code className='text-foreground/80 flex-1 truncate font-mono text-xs'>
                                    {resolvedSftpUrl || t('common.nA')}
                                </code>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='text-muted-foreground h-8 w-8 rounded-lg p-0 hover:bg-white/10 hover:text-blue-400'
                                    onClick={() => copyToClipboard(resolvedSftpUrl || '')}
                                >
                                    <Copy className='h-3.5 w-3.5' />
                                </Button>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='text-muted-foreground h-8 w-8 rounded-lg p-0 hover:bg-white/10 hover:text-blue-400'
                                    onClick={() => {
                                        if (resolvedSftpUrl) {
                                            window.open(resolvedSftpUrl, '_blank');
                                        }
                                    }}
                                >
                                    <ExternalLink className='h-3.5 w-3.5' />
                                </Button>
                            </div>
                        </div>

                        <div className='mt-6 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4'>
                            <div className='flex items-start gap-3'>
                                <Info className='mt-0.5 h-5 w-5 shrink-0 text-blue-500' />
                                <div className='space-y-2'>
                                    <h4 className='text-sm font-bold tracking-wide text-blue-500 uppercase'>
                                        {t('serverSettings.sftpInfoTitle')}
                                    </h4>
                                    <p className='text-muted-foreground text-xs leading-relaxed'>
                                        {t('serverSettings.sftpInfoDescription')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </PageCard>
                    <WidgetRenderer widgets={getWidgets('server-settings', 'after-sftp-details')} />
                </div>

                <div className='min-w-0 space-y-8 lg:col-span-4'>
                    {canReinstall && (
                        <>
                            <PageCard title={t('serverSettings.reinstallServer')} icon={Settings} variant='warning'>
                                <p className='text-xs leading-relaxed font-medium text-orange-200/60'>
                                    {t('serverSettings.reinstallWarning')}
                                </p>

                                <Button
                                    variant='destructive'
                                    className='mt-4 h-12 w-full rounded-xl border border-orange-500/20 bg-orange-500/10 text-xs font-black tracking-widest text-orange-500 uppercase hover:border-orange-500/50 hover:bg-orange-500/20'
                                    onClick={() => setShowReinstallDialog(true)}
                                >
                                    {t('serverSettings.reinstallServer')}
                                </Button>
                            </PageCard>
                            <WidgetRenderer widgets={getWidgets('server-settings', 'after-server-actions')} />
                        </>
                    )}

                    {canDeleteServer && (
                        <PageCard title={t('serverSettings.deleteServer')} icon={AlertTriangle} variant='danger'>
                            <p className='text-xs leading-relaxed font-medium text-red-200/60'>
                                {t('serverSettings.deleteServerDescription')}
                            </p>

                            <Button
                                variant='destructive'
                                className='mt-4 h-12 w-full rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-black tracking-widest text-red-500 uppercase hover:border-red-500/50 hover:bg-red-500/20'
                                onClick={() => {
                                    setShowDeleteDialog(true);
                                    setDeleteStep(1);
                                    setConfirmIrreversible(false);
                                    setMathAnswer('');
                                    setConfirmServerName('');
                                    generateMathQuestion();
                                }}
                            >
                                {t('serverSettings.deleteServer')}
                            </Button>
                        </PageCard>
                    )}
                    <WidgetRenderer widgets={getWidgets('server-settings', 'after-delete-server')} />
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('server-settings', 'bottom-of-page')} />

            <Dialog open={showReinstallDialog} onOpenChange={setShowReinstallDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('serverSettings.confirmReinstall')}</DialogTitle>
                        <DialogDescription>{t('serverSettings.reinstallConfirmation')}</DialogDescription>
                    </DialogHeader>
                    <div className='space-y-4 py-4'>
                        <div className='space-y-2'>
                            <Label>{t('serverSettings.confirmText')}</Label>
                            <Input
                                value={confirmReinstallText}
                                onChange={(e) => setConfirmReinstallText(e.target.value)}
                                placeholder={t('serverSettings.confirmTextPlaceholder')}
                                className='font-mono text-sm uppercase'
                            />
                            <p className='text-muted-foreground text-xs'>
                                {t('serverSettings.typeReinstallToConfirm')}
                            </p>
                        </div>
                        <div className='flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4'>
                            <input
                                type='checkbox'
                                id='wipeFiles'
                                checked={wipeFilesOnReinstall}
                                onChange={(e) => setWipeFilesOnReinstall(e.target.checked)}
                                className='h-4 w-4 rounded border-white/20 bg-white/5 checked:bg-orange-500'
                            />
                            <Label htmlFor='wipeFiles' className='cursor-pointer text-sm text-orange-200'>
                                {t('serverSettings.wipeFiles')}
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant='ghost' onClick={() => setShowReinstallDialog(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant='destructive'
                            disabled={confirmReinstallText !== 'REINSTALL' || reinstalling}
                            onClick={handleReinstall}
                        >
                            {reinstalling && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                            {t('serverSettings.reinstallServer')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle className='flex items-center gap-2 text-red-500'>
                            <AlertTriangle className='h-5 w-5' />
                            {t('serverSettings.deleteServer')} (Step {deleteStep}/4)
                        </DialogTitle>
                    </DialogHeader>

                    <div className='py-4'>
                        {deleteStep === 1 && (
                            <div className='space-y-4'>
                                <div className='space-y-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200'>
                                    <p className='font-bold'>{t('serverSettings.deleteServerStep1Title')}</p>
                                    <p>{t('serverSettings.deleteServerStep1Description')}</p>
                                </div>
                            </div>
                        )}

                        {deleteStep === 2 && (
                            <div className='space-y-4'>
                                <p className='text-muted-foreground text-sm'>
                                    {t('serverSettings.deleteServerStep2Description')}
                                </p>
                                <div className='flex items-center gap-2'>
                                    <input
                                        type='checkbox'
                                        id='confirmIrreversible'
                                        checked={confirmIrreversible}
                                        onChange={(e) => setConfirmIrreversible(e.target.checked)}
                                        className='h-4 w-4 rounded border-white/20 bg-white/5'
                                    />
                                    <Label htmlFor='confirmIrreversible' className='cursor-pointer'>
                                        {t('serverSettings.deleteServerStep2Confirm')}
                                    </Label>
                                </div>
                            </div>
                        )}

                        {deleteStep === 3 && (
                            <div className='space-y-4'>
                                <p className='text-muted-foreground text-sm'>
                                    {t('serverSettings.deleteServerStep3Description')}
                                </p>
                                <div className='space-y-2'>
                                    <Label>
                                        {t('serverSettings.deleteServerStep3Question', {
                                            num1: String(mathQuestion.num1),
                                            num2: String(mathQuestion.num2),
                                        })}
                                    </Label>
                                    <Input
                                        type='number'
                                        value={mathAnswer}
                                        onChange={(e) => setMathAnswer(e.target.value)}
                                        placeholder='Answer'
                                    />
                                </div>
                            </div>
                        )}

                        {deleteStep === 4 && (
                            <div className='space-y-4'>
                                <p className='text-muted-foreground text-sm'>
                                    {t('serverSettings.deleteServerStep4Description')}
                                </p>
                                <div className='space-y-2'>
                                    <p className='rounded border border-white/10 bg-white/5 p-2 font-mono text-xs'>
                                        {server?.name}
                                    </p>
                                    <Input
                                        value={confirmServerName}
                                        onChange={(e) => setConfirmServerName(e.target.value)}
                                        placeholder={t('serverSettings.deleteServerStep4Placeholder')}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className='gap-2 sm:gap-0'>
                        <Button variant='ghost' onClick={() => setShowDeleteDialog(false)}>
                            {t('common.cancel')}
                        </Button>
                        <div className='flex-1' />
                        {deleteStep > 1 && (
                            <Button variant='outline' onClick={() => setDeleteStep((prev) => prev - 1)}>
                                {t('serverSettings.deleteServerBack')}
                            </Button>
                        )}
                        {deleteStep < 4 ? (
                            <Button
                                onClick={() => setDeleteStep((prev) => prev + 1)}
                                disabled={
                                    (deleteStep === 2 && !confirmIrreversible) || (deleteStep === 3 && !isMathCorrect)
                                }
                            >
                                {t('serverSettings.deleteServerNext')}
                            </Button>
                        ) : (
                            <Button
                                variant='destructive'
                                onClick={handleDelete}
                                disabled={!isServerNameCorrect || deleting}
                            >
                                {deleting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                                {t('serverSettings.deleteServerConfirm')}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
