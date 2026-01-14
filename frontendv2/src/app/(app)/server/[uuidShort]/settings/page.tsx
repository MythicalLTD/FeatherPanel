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
    AlertTriangle,
    Loader2,
    Lock,
    Link as LinkIcon,
} from 'lucide-react';

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

    // Config
    const canDeleteServer = isEnabled(settings?.server_allow_user_server_deletion || 'false');

    // Permissions
    const canRename = hasPermission('settings.rename');
    const canReinstall = hasPermission('settings.reinstall');
    const canViewSftp = true; // Usually basic server read, but assuming true if on this page for now, or check 'server.read'

    // State
    const [server, setServer] = React.useState<ServerWithSftp | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [reinstalling, setReinstalling] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);

    // Form State
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');

    // Dialog State
    const [showReinstallDialog, setShowReinstallDialog] = React.useState(false);
    const [confirmReinstallText, setConfirmReinstallText] = React.useState('');
    const [wipeFilesOnReinstall, setWipeFilesOnReinstall] = React.useState(false);

    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [deleteStep, setDeleteStep] = React.useState(1);
    const [confirmIrreversible, setConfirmIrreversible] = React.useState(false);
    const [mathQuestion, setMathQuestion] = React.useState({ num1: 0, num2: 0 });
    const [mathAnswer, setMathAnswer] = React.useState('');
    const [confirmServerName, setConfirmServerName] = React.useState('');

    // Math Logic
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

    // Fetch Data
    const fetchData = React.useCallback(async () => {
        if (!uuidShort) return;
        setLoading(true);
        try {
            const { data } = await axios.get<ServerResponse>(`/api/user/servers/${uuidShort}`);
            if (data.success) {
                setServer(data.data);
                setName(data.data.name);
                setDescription(data.data.description || '');
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

    // Actions
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
                // Update local state to match saved
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
                toast.success(t('serverSettings.reinstallSuccess')); // Add translation key if missing or use generic
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

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success(t('common.copied'));
    };

    const hasChanges = server?.name !== name || (server?.description || '') !== description;

    if (permissionsLoading || settingsLoading) return null;

    if (loading && !server) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='h-12 w-12 animate-spin text-primary opacity-50' />
                <p className='mt-4 text-muted-foreground font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    // Permission Gate
    if (!canRename && !canReinstall && !canViewSftp) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center space-y-8 bg-card/40 backdrop-blur-3xl rounded-[3rem] border border-border/5'>
                <div className='relative'>
                    <div className='absolute inset-0 bg-red-500/20 blur-3xl rounded-full scale-150' />
                    <div className='relative h-32 w-32 rounded-3xl bg-red-500/10 flex items-center justify-center border-2 border-red-500/20 rotate-3'>
                        <Lock className='h-16 w-16 text-red-500' />
                    </div>
                </div>
                <div className='max-w-md space-y-3 px-4'>
                    <h2 className='text-3xl font-black uppercase tracking-tight'>{t('serverSettings.accessDenied')}</h2>
                </div>
                <Button
                    variant='outline'
                    size='default'
                    className='mt-8 rounded-2xl h-14 px-10'
                    onClick={() => router.push(`/server/${uuidShort}`)}
                >
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <div key={pathname} className='max-w-6xl mx-auto space-y-8 pb-16 font-sans'>
            <WidgetRenderer widgets={getWidgets('server-settings', 'top-of-page')} />
            <PageHeader title={t('serverSettings.title')} description={t('serverSettings.description')} />
            <WidgetRenderer widgets={getWidgets('server-settings', 'after-header')} />

            <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
                {/* Left Side: Settings & SFTP */}
                <div className='lg:col-span-8 space-y-8'>
                    {/* Server Information */}
                    <PageCard
                        title={t('serverSettings.serverInformation')}
                        description={t('serverSettings.serverInformationDescription')}
                        icon={ServerIcon}
                    >
                        <div className='space-y-4'>
                            <div className='space-y-2'>
                                <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1'>
                                    {t('serverSettings.serverName')}
                                </Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={!canRename || saving}
                                    className='h-12 bg-secondary/50 border-border/10 focus:border-primary/50 font-medium text-base rounded-xl'
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1'>
                                    {t('serverSettings.serverDescription')}
                                </Label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={!canRename || saving}
                                    className='h-12 bg-secondary/50 border-border/10 focus:border-primary/50 font-medium text-base rounded-xl'
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
                                            <Loader2 className='h-4 w-4 animate-spin mr-2' />
                                        ) : (
                                            <Save className='h-4 w-4 mr-2' />
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
                                        className='h-10 px-4 rounded-xl border-white/10 bg-transparent hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all'
                                    >
                                        <RotateCcw className='h-4 w-4 mr-2' />
                                        {t('serverSettings.reset')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </PageCard>
                    <WidgetRenderer widgets={getWidgets('server-settings', 'after-server-info')} />

                    {/* SFTP Details */}
                    <PageCard
                        title={t('serverSettings.sftpDetails')}
                        description={t('serverSettings.sftpDetailsDescription')}
                        icon={FolderOpen}
                    >
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                            {/* Host */}
                            <div className='space-y-2'>
                                <Label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1'>
                                    <ServerIcon className='h-3 w-3' />
                                    {t('serverSettings.sftpHost')}
                                </Label>
                                <div className='flex items-center gap-2 p-1 pl-4 pr-1 bg-secondary/50 border border-border/10 rounded-xl hover:border-blue-500/30 transition-colors group/input'>
                                    <code className='text-xs font-mono flex-1 truncate text-foreground/80'>
                                        {server?.sftp?.host ? `sftp://${server.sftp.host}` : t('common.nA')}
                                    </code>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-8 w-8 p-0 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-blue-400'
                                        onClick={() =>
                                            copyToClipboard(server?.sftp?.host ? `sftp://${server.sftp.host}` : '')
                                        }
                                    >
                                        <Copy className='h-3.5 w-3.5' />
                                    </Button>
                                </div>
                            </div>
                            {/* Port */}
                            <div className='space-y-2'>
                                <Label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1'>
                                    <Hash className='h-3 w-3' />
                                    {t('serverSettings.sftpPort')}
                                </Label>
                                <div className='flex items-center gap-2 p-1 pl-4 pr-1 bg-secondary/50 border border-border/10 rounded-xl hover:border-blue-500/30 transition-colors group/input'>
                                    <code className='text-xs font-mono flex-1 truncate text-foreground/80'>
                                        {server?.sftp?.port || t('common.nA')}
                                    </code>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-8 w-8 p-0 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-blue-400'
                                        onClick={() => copyToClipboard(server?.sftp?.port?.toString() || '')}
                                    >
                                        <Copy className='h-3.5 w-3.5' />
                                    </Button>
                                </div>
                            </div>
                            {/* Username */}
                            <div className='space-y-2'>
                                <Label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1'>
                                    <User className='h-3 w-3' />
                                    {t('serverSettings.sftpUsername')}
                                </Label>
                                <div className='flex items-center gap-2 p-1 pl-4 pr-1 bg-secondary/50 border border-border/10 rounded-xl hover:border-blue-500/30 transition-colors group/input'>
                                    <code className='text-xs font-mono flex-1 truncate text-foreground/80'>
                                        {server?.sftp?.username || t('common.nA')}
                                    </code>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-8 w-8 p-0 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-blue-400'
                                        onClick={() => copyToClipboard(server?.sftp?.username || '')}
                                    >
                                        <Copy className='h-3.5 w-3.5' />
                                    </Button>
                                </div>
                            </div>
                            {/* Password */}
                            <div className='space-y-2'>
                                <Label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1'>
                                    <KeyRound className='h-3 w-3' />
                                    {t('serverSettings.sftpPassword')}
                                </Label>
                                <div className='flex items-center gap-2 px-4 h-[42px] bg-secondary/50 border border-border/10 border-dashed rounded-xl'>
                                    <span className='text-xs text-muted-foreground/60 italic'>
                                        {t('serverSettings.sftpPasswordPlaceholder')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Full SFTP URL */}
                        <div className='space-y-2 pt-6'>
                            <Label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1'>
                                <LinkIcon className='h-3 w-3' />
                                {t('serverSettings.sftpUrl')}
                            </Label>
                            <div className='flex items-center gap-2 p-1 pl-4 pr-1 bg-white/5 border border-white/5 rounded-xl hover:border-blue-500/30 transition-colors group/input'>
                                <code className='text-xs font-mono flex-1 truncate text-foreground/80'>
                                    {server?.sftp?.url || t('common.nA')}
                                </code>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='h-8 w-8 p-0 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-blue-400'
                                    onClick={() => copyToClipboard(server?.sftp?.url || '')}
                                >
                                    <Copy className='h-3.5 w-3.5' />
                                </Button>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='h-8 w-8 p-0 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-blue-400'
                                    onClick={() => {
                                        if (server?.sftp?.url) {
                                            window.open(server.sftp.url, '_blank');
                                        }
                                    }}
                                >
                                    <ExternalLink className='h-3.5 w-3.5' />
                                </Button>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className='mt-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl shadow-sm'>
                            <div className='flex items-start gap-3'>
                                <Info className='h-5 w-5 text-blue-500 mt-0.5 shrink-0' />
                                <div className='space-y-2'>
                                    <h4 className='text-sm font-bold text-blue-500 uppercase tracking-wide'>
                                        {t('serverSettings.sftpInfoTitle')}
                                    </h4>
                                    <p className='text-xs text-muted-foreground leading-relaxed'>
                                        {t('serverSettings.sftpInfoDescription')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </PageCard>
                    <WidgetRenderer widgets={getWidgets('server-settings', 'after-sftp-details')} />
                </div>

                {/* Right Side: Danger Zone */}
                <div className='lg:col-span-4 space-y-8'>
                    {/* Reinstall */}
                    {canReinstall && (
                        <>
                            <PageCard title={t('serverSettings.reinstallServer')} icon={Settings} variant='warning'>
                                <p className='text-xs text-orange-200/60 font-medium leading-relaxed'>
                                    {t('serverSettings.reinstallWarning')}
                                </p>

                                <Button
                                    variant='destructive'
                                    className='w-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/20 hover:border-orange-500/50 font-black uppercase tracking-widest mt-4 text-xs h-12 rounded-xl'
                                    onClick={() => setShowReinstallDialog(true)}
                                >
                                    {t('serverSettings.reinstallServer')}
                                </Button>
                            </PageCard>
                            <WidgetRenderer widgets={getWidgets('server-settings', 'after-server-actions')} />
                        </>
                    )}

                    {/* Delete */}
                    {canDeleteServer && (
                        <PageCard title={t('serverSettings.deleteServer')} icon={AlertTriangle} variant='danger'>
                            <p className='text-xs text-red-200/60 font-medium leading-relaxed'>
                                {t('serverSettings.deleteServerDescription')}
                            </p>

                            <Button
                                variant='destructive'
                                className='w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/50 font-black uppercase tracking-widest mt-4 text-xs h-12 rounded-xl'
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

            {/* Reinstall Dialog */}
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
                            <p className='text-xs text-muted-foreground'>
                                {t('serverSettings.typeReinstallToConfirm')}
                            </p>
                        </div>
                        <div className='flex items-center gap-2 p-4 border border-orange-500/20 bg-orange-500/5 rounded-xl'>
                            <input
                                type='checkbox'
                                id='wipeFiles'
                                checked={wipeFilesOnReinstall}
                                onChange={(e) => setWipeFilesOnReinstall(e.target.checked)}
                                className='w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-orange-500'
                            />
                            <Label htmlFor='wipeFiles' className='cursor-pointer text-orange-200 text-sm'>
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
                            {reinstalling && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
                            {t('serverSettings.reinstallServer')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog - Multi Step */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle className='text-red-500 flex items-center gap-2'>
                            <AlertTriangle className='h-5 w-5' />
                            {t('serverSettings.deleteServer')} (Step {deleteStep}/4)
                        </DialogTitle>
                    </DialogHeader>

                    <div className='py-4'>
                        {deleteStep === 1 && (
                            <div className='space-y-4'>
                                <div className='p-4 border border-red-500/20 bg-red-500/5 rounded-xl text-sm text-red-200 space-y-2'>
                                    <p className='font-bold'>{t('serverSettings.deleteServerStep1Title')}</p>
                                    <p>{t('serverSettings.deleteServerStep1Description')}</p>
                                </div>
                            </div>
                        )}

                        {deleteStep === 2 && (
                            <div className='space-y-4'>
                                <p className='text-sm text-muted-foreground'>
                                    {t('serverSettings.deleteServerStep2Description')}
                                </p>
                                <div className='flex items-center gap-2'>
                                    <input
                                        type='checkbox'
                                        id='confirmIrreversible'
                                        checked={confirmIrreversible}
                                        onChange={(e) => setConfirmIrreversible(e.target.checked)}
                                        className='w-4 h-4 rounded border-white/20 bg-white/5'
                                    />
                                    <Label htmlFor='confirmIrreversible' className='cursor-pointer'>
                                        {t('serverSettings.deleteServerStep2Confirm')}
                                    </Label>
                                </div>
                            </div>
                        )}

                        {deleteStep === 3 && (
                            <div className='space-y-4'>
                                <p className='text-sm text-muted-foreground'>
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
                                <p className='text-sm text-muted-foreground'>
                                    {t('serverSettings.deleteServerStep4Description')}
                                </p>
                                <div className='space-y-2'>
                                    <p className='text-xs font-mono p-2 bg-white/5 rounded border border-white/10'>
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
                                {deleting && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
                                {t('serverSettings.deleteServerConfirm')}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
