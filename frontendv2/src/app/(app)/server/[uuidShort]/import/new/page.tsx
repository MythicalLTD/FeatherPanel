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
import { useParams, useRouter } from 'next/navigation';
import {
    Upload,
    Globe,
    User,
    FolderUp,
    FolderDown,
    AlertTriangle,
    ShieldAlert,
    Loader2,
    Settings2,
    Zap,
} from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { toast } from 'sonner';
import axios from 'axios';
import { cn, isEnabled } from '@/lib/utils';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';

export default function CreateServerImportPage() {
    const { uuidShort } = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const { settings, loading: settingsLoading } = useSettings();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort as string);
    const canManage = hasPermission('settings.import') || hasPermission('file.create');

    const [saving, setSaving] = React.useState(false);
    const [form, setForm] = React.useState({
        type: 'sftp' as 'sftp' | 'ftp',
        host: '',
        port: '22',
        user: '',
        password: '',
        sourceLocation: '/',
        destinationLocation: '/',
        wipe: false,
        wipeAllFiles: false,
    });

    const { getWidgets, fetchWidgets } = usePluginWidgets('server-import-new');

    const [errors, setErrors] = React.useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!form.host.trim()) newErrors.host = t('serverImport.validation.hostRequired');
        if (!form.port.trim()) {
            newErrors.port = t('serverImport.validation.portRequired');
        } else {
            const p = parseInt(form.port);
            if (isNaN(p) || p < 1 || p > 65535) newErrors.port = t('serverImport.validation.portInvalid');
        }
        if (!form.user.trim()) newErrors.user = t('serverImport.validation.userRequired');
        if (!form.password.trim()) newErrors.password = t('serverImport.validation.passwordRequired');
        if (!form.sourceLocation.trim()) newErrors.sourceLocation = t('serverImport.validation.sourceLocationRequired');
        if (!form.sourceLocation.startsWith('/'))
            newErrors.sourceLocation = t('serverImport.validation.sourceLocationInvalid');
        if (!form.destinationLocation.trim())
            newErrors.destinationLocation = t('serverImport.validation.destinationLocationRequired');

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleStartImport = async () => {
        if (!validateForm()) {
            toast.error(t('common.pleaseFixErrors'));
            return;
        }

        try {
            setSaving(true);

            if (form.wipeAllFiles) {
                await axios.post(`/api/user/servers/${uuidShort}/power/kill`);
                await axios.post(`/api/user/servers/${uuidShort}/wipe-all-files`);
            }

            const { data } = await axios.post(`/api/user/servers/${uuidShort}/import`, {
                hote: form.host.trim(),
                port: parseInt(form.port),
                user: form.user.trim(),
                password: form.password.trim(),
                srclocation: form.sourceLocation.trim(),
                dstlocation: form.destinationLocation.trim(),
                type: form.type,
                wipe: form.wipe,
            });

            if (data.success) {
                toast.success(t('serverImport.importStarted'));

                router.push(`/server/${uuidShort}/import?success=true`);
            } else {
                toast.error(data.message || t('serverImport.importFailed'));
            }
        } catch (error) {
            console.error('Import failed:', error);
            toast.error(t('serverImport.importFailed'));
        } finally {
            setSaving(false);
        }
    };

    React.useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const isImportEnabled = isEnabled(settings?.server_allow_user_made_import);

    if (permissionsLoading || settingsLoading) return null;
    if (!canManage) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <EmptyState
                    title={t('common.accessDenied')}
                    description={t('common.noPermission')}
                    icon={Upload}
                    action={
                        <Button variant='secondary' onClick={() => window.history.back()}>
                            {t('common.goBack')}
                        </Button>
                    }
                />
            </div>
        );
    }

    if (!isImportEnabled) {
        return (
            <EmptyState
                title={t('serverImport.featureDisabled')}
                description={t('serverImport.featureDisabledDescription')}
                icon={Upload}
                action={
                    <Button variant='secondary' onClick={() => window.history.back()}>
                        {t('common.goBack')}
                    </Button>
                }
            />
        );
    }

    return (
        <div className='space-y-8 pb-16'>
            <WidgetRenderer widgets={getWidgets('server-import-new', 'top-of-page')} />

            <PageHeader
                title={t('serverImport.createImport')}
                description={t('serverImport.drawerDescription')}
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        <Button
                            variant='glass'
                            onClick={() => router.push(`/server/${uuidShort}/import`)}
                            disabled={saving}
                            className='order-2 sm:order-1'
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleStartImport}
                            disabled={saving}
                            className='order-1 w-full sm:order-2 sm:w-auto'
                        >
                            {saving ? (
                                <>
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    {t('common.saving')}
                                </>
                            ) : (
                                <>
                                    <Zap className='mr-2 h-4 w-4' />
                                    {t('serverImport.createImport')}
                                </>
                            )}
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-import-new', 'after-header')} />

            <div className='grid grid-cols-1 gap-8 lg:grid-cols-12'>
                <div className='space-y-8 lg:col-span-8'>
                    <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
                        <div className='bg-card/50 border-border/50 space-y-6 rounded-3xl border p-8 backdrop-blur-3xl'>
                            <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                                <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                                    <Globe className='text-primary h-5 w-5' />
                                </div>
                                <div className='space-y-0.5'>
                                    <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                        {t('serverImport.connection')}
                                    </h2>
                                    <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                        {t('serverImport.typeHelp')}
                                    </p>
                                </div>
                            </div>

                            <div className='space-y-6'>
                                <div className='space-y-2.5'>
                                    <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                        {t('serverImport.type')}
                                    </label>
                                    <HeadlessSelect
                                        value={form.type}
                                        onChange={(val: string | number) => {
                                            setForm((prev) => ({
                                                ...prev,
                                                type: val as 'sftp' | 'ftp',
                                                port: val === 'sftp' ? '22' : '21',
                                            }));
                                        }}
                                        options={[
                                            { id: 'sftp', name: 'SFTP (Secure / SSH)' },
                                            { id: 'ftp', name: 'FTP (Standard)' },
                                        ]}
                                        disabled={saving}
                                        buttonClassName='h-12 bg-secondary/50 border-border/10 focus:border-primary/50 rounded-xl text-sm font-extrabold transition-all w-full'
                                    />
                                </div>

                                <div className='space-y-2.5'>
                                    <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                        {t('serverImport.host')} <span className='text-primary'>*</span>
                                    </label>
                                    <Input
                                        value={form.host}
                                        onChange={(e) => setForm((prev) => ({ ...prev, host: e.target.value }))}
                                        placeholder='example.com'
                                        disabled={saving}
                                        className={cn(errors.host && 'border-red-500/50 bg-red-500/5')}
                                    />
                                    {errors.host && (
                                        <p className='ml-1 text-[9px] font-black tracking-widest text-red-500 uppercase'>
                                            {errors.host}
                                        </p>
                                    )}
                                </div>

                                <div className='space-y-2.5'>
                                    <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                        {t('serverImport.port')} <span className='text-primary'>*</span>
                                    </label>
                                    <Input
                                        type='number'
                                        value={form.port}
                                        onChange={(e) => setForm((prev) => ({ ...prev, port: e.target.value }))}
                                        disabled={saving}
                                        className={cn(errors.port && 'border-red-500/50 bg-red-500/5')}
                                    />
                                    {errors.port && (
                                        <p className='ml-1 text-[9px] font-black tracking-widest text-red-500 uppercase'>
                                            {errors.port}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className='bg-card/50 border-border/50 space-y-6 rounded-3xl border p-8 backdrop-blur-3xl'>
                            <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                                <div className='flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10'>
                                    <User className='h-5 w-5 text-blue-500' />
                                </div>
                                <div className='space-y-0.5'>
                                    <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                        {t('serverImport.authentication')}
                                    </h2>
                                    <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                        {t('serverImport.credentialsHelp')}
                                    </p>
                                </div>
                            </div>

                            <div className='space-y-6'>
                                <div className='space-y-2.5'>
                                    <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                        {t('serverImport.user')} <span className='text-primary'>*</span>
                                    </label>
                                    <Input
                                        value={form.user}
                                        onChange={(e) => setForm((prev) => ({ ...prev, user: e.target.value }))}
                                        placeholder='sftp_user'
                                        disabled={saving}
                                        className={cn(errors.user && 'border-red-500/50 bg-red-500/5')}
                                    />
                                    {errors.user && (
                                        <p className='ml-1 text-[9px] font-black tracking-widest text-red-500 uppercase'>
                                            {errors.user}
                                        </p>
                                    )}
                                </div>

                                <div className='space-y-2.5'>
                                    <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                        {t('serverImport.password')} <span className='text-primary'>*</span>
                                    </label>
                                    <Input
                                        type='password'
                                        value={form.password}
                                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                                        placeholder='••••••••'
                                        disabled={saving}
                                        className={cn(errors.password && 'border-red-500/50 bg-red-500/5')}
                                    />
                                    {errors.password && (
                                        <p className='ml-1 text-[9px] font-black tracking-widest text-red-500 uppercase'>
                                            {errors.password}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='bg-card/50 border-border/50 relative space-y-8 overflow-hidden rounded-3xl border p-8 backdrop-blur-3xl'>
                        <div className='pointer-events-none absolute top-0 right-0 h-48 w-48 bg-emerald-500/5 blur-[80px]' />
                        <div className='border-border/10 flex items-center gap-5 border-b pb-8'>
                            <div className='flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10'>
                                <FolderUp className='h-6 w-6 text-emerald-500' />
                            </div>
                            <div className='space-y-1'>
                                <h2 className='text-2xl leading-none font-black tracking-tight uppercase italic'>
                                    {t('serverImport.paths')}
                                </h2>
                                <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase italic opacity-50'>
                                    {t('serverImport.pathsHelp')}
                                </p>
                            </div>
                        </div>

                        <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
                            <div className='space-y-3'>
                                <div className='ml-1 flex items-center gap-2.5'>
                                    <div className='h-1.5 w-1.5 rounded-full bg-emerald-500/50' />
                                    <label className='text-muted-foreground text-[9px] font-black tracking-[0.2em] uppercase'>
                                        {t('serverImport.sourceLocation')}
                                    </label>
                                </div>
                                <div className='group relative'>
                                    <div className='absolute top-1/2 left-4 z-10 -translate-y-1/2 text-emerald-500/40 transition-colors group-focus-within:text-emerald-500'>
                                        <FolderUp className='h-4 w-4' />
                                    </div>
                                    <Input
                                        value={form.sourceLocation}
                                        onChange={(e) =>
                                            setForm((prev) => ({ ...prev, sourceLocation: e.target.value }))
                                        }
                                        placeholder='/path/to/files'
                                        disabled={saving}
                                        className={cn(
                                            'pl-12',
                                            errors.sourceLocation && 'border-red-500/50 bg-red-500/5',
                                        )}
                                    />
                                </div>
                                {errors.sourceLocation && (
                                    <p className='ml-2 text-[9px] font-black tracking-widest text-red-500 uppercase'>
                                        {errors.sourceLocation}
                                    </p>
                                )}
                            </div>

                            <div className='space-y-3'>
                                <div className='ml-1 flex items-center gap-2.5'>
                                    <div className='bg-primary/50 h-1.5 w-1.5 rounded-full' />
                                    <label className='text-muted-foreground text-[9px] font-black tracking-[0.2em] uppercase'>
                                        {t('serverImport.destinationLocation')}
                                    </label>
                                </div>
                                <div className='group relative'>
                                    <div className='text-primary/40 group-focus-within:text-primary absolute top-1/2 left-4 z-10 -translate-y-1/2 transition-colors'>
                                        <FolderDown className='h-4 w-4' />
                                    </div>
                                    <Input
                                        value={form.destinationLocation}
                                        onChange={(e) =>
                                            setForm((prev) => ({ ...prev, destinationLocation: e.target.value }))
                                        }
                                        placeholder='/'
                                        disabled={saving}
                                        className={cn(
                                            'pl-12',
                                            errors.destinationLocation && 'border-red-500/50 bg-red-500/5',
                                        )}
                                    />
                                </div>
                                {errors.destinationLocation && (
                                    <p className='ml-2 text-[9px] font-black tracking-widest text-red-500 uppercase'>
                                        {errors.destinationLocation}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className='space-y-8 lg:col-span-4'>
                    <div className='bg-card/50 border-border/50 group relative space-y-6 overflow-hidden rounded-3xl border p-8 backdrop-blur-3xl'>
                        <div className='bg-primary/5 group-hover:bg-primary/10 pointer-events-none absolute top-0 right-0 h-32 w-32 blur-2xl transition-all duration-700' />
                        <div className='border-border/10 relative z-10 flex items-center gap-4 border-b pb-6'>
                            <div className='bg-secondary/50 border-border/10 flex h-10 w-10 items-center justify-center rounded-xl border'>
                                <Settings2 className='text-muted-foreground h-5 w-5' />
                            </div>
                            <div className='space-y-0.5'>
                                <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                    {t('serverImport.options')}
                                </h2>
                                <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase italic opacity-50'>
                                    Configuration
                                </p>
                            </div>
                        </div>

                        <div className='relative z-10 space-y-4'>
                            <div
                                onClick={() => !saving && setForm((prev) => ({ ...prev, wipe: !prev.wipe }))}
                                className={cn(
                                    'group/opt relative cursor-pointer overflow-hidden rounded-2xl border p-5 transition-all duration-500',
                                    form.wipe
                                        ? 'bg-primary/10 border-primary/40'
                                        : 'bg-secondary/30 border-border/20 hover:border-border/40',
                                )}
                            >
                                <div className='flex items-center justify-between gap-4'>
                                    <div className='space-y-0.5'>
                                        <p
                                            className={cn(
                                                'text-xs font-black tracking-wider uppercase transition-colors',
                                                form.wipe ? 'text-primary' : 'text-muted-foreground',
                                            )}
                                        >
                                            {t('serverImport.wipe')}
                                        </p>
                                        <p className='text-muted-foreground pr-4 text-[9px] leading-relaxed font-bold italic opacity-70'>
                                            {t('serverImport.wipeHelp')}
                                        </p>
                                    </div>
                                    <div
                                        className={cn(
                                            'relative h-5 w-10 shrink-0 rounded-full transition-all duration-500',
                                            form.wipe ? 'bg-primary' : 'bg-muted',
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'bg-background absolute top-1 h-3 w-3 rounded-full transition-all duration-500',
                                                form.wipe ? 'left-6' : 'left-1',
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div
                                onClick={() =>
                                    !saving && setForm((prev) => ({ ...prev, wipeAllFiles: !prev.wipeAllFiles }))
                                }
                                className={cn(
                                    'group/opt relative cursor-pointer overflow-hidden rounded-2xl border p-5 transition-all duration-500',
                                    form.wipeAllFiles
                                        ? 'border-red-500/40 bg-red-500/10'
                                        : 'bg-secondary/30 border-border/20 hover:border-red-500/20',
                                )}
                            >
                                <div className='flex items-center justify-between gap-4'>
                                    <div className='space-y-0.5'>
                                        <p
                                            className={cn(
                                                'text-xs font-black tracking-wider uppercase transition-colors',
                                                form.wipeAllFiles ? 'text-red-500' : 'text-muted-foreground',
                                            )}
                                        >
                                            {t('serverImport.wipeAllFiles')}
                                        </p>
                                        <p className='text-muted-foreground pr-4 text-[9px] leading-relaxed font-bold italic opacity-70'>
                                            {t('serverImport.wipeAllFilesHelp')}
                                        </p>
                                    </div>
                                    <div
                                        className={cn(
                                            'relative h-5 w-10 shrink-0 rounded-full transition-all duration-500',
                                            form.wipeAllFiles ? 'bg-red-500' : 'bg-muted',
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'bg-background absolute top-1 h-3 w-3 rounded-full transition-all duration-500',
                                                form.wipeAllFiles ? 'left-6' : 'left-1',
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {form.wipeAllFiles && (
                            <div className='animate-in zoom-in-95 relative z-10 mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 duration-500'>
                                <div className='flex gap-3'>
                                    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/20'>
                                        <AlertTriangle className='h-4 w-4 text-red-500' />
                                    </div>
                                    <div className='space-y-0.5'>
                                        <h4 className='text-[10px] font-black tracking-widest text-red-500 uppercase'>
                                            {t('common.warning')}
                                        </h4>
                                        <p className='text-[9px] leading-relaxed font-extrabold text-red-500/80 italic'>
                                            {t('serverImport.wipeAllFilesWarning')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className='group relative space-y-4 overflow-hidden rounded-3xl border border-blue-500/10 bg-blue-500/5 p-8 backdrop-blur-3xl'>
                        <div className='pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 bg-blue-500/10 blur-2xl transition-transform duration-1000 group-hover:scale-150' />
                        <div className='relative z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10'>
                            <ShieldAlert className='h-5 w-5 text-blue-500' />
                        </div>
                        <div className='relative z-10 space-y-2'>
                            <h3 className='text-lg leading-none font-black tracking-tight text-blue-500 uppercase italic'>
                                {t('serverImport.infoTitle')}
                            </h3>
                            <p className='text-[11px] leading-relaxed font-bold text-blue-500/70 italic'>
                                {t('serverImport.infoDescription')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className='from-primary/5 pointer-events-none fixed inset-0 -z-10 bg-linear-to-br via-transparent to-blue-500/5' />
            <WidgetRenderer widgets={getWidgets('server-import-new', 'bottom-of-page')} />
        </div>
    );
}
