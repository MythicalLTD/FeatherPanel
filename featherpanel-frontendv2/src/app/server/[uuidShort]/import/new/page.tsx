/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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

    // Widgets
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
                // Using standard query param pattern if needed, or just redirect
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
        <div className='space-y-8 pb-16 '>
            <WidgetRenderer widgets={getWidgets('server-import-new', 'top-of-page')} />
            {/* Header */}
            <PageHeader
                title={t('serverImport.createImport')}
                description={t('serverImport.drawerDescription')}
                actions={
                    <div className='flex items-center gap-3'>
                        <Button
                            variant='glass'
                            onClick={() => router.push(`/server/${uuidShort}/import`)}
                            disabled={saving}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleStartImport} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                                    {t('common.saving')}
                                </>
                            ) : (
                                <>
                                    <Zap className='h-4 w-4 mr-2' />
                                    {t('serverImport.createImport')}
                                </>
                            )}
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-import-new', 'after-header')} />

            <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
                {/* Left Side: Forms */}
                <div className='lg:col-span-8 space-y-8'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                        {/* Connection Section */}
                        <div className='bg-card/50 backdrop-blur-3xl border border-border/50 rounded-3xl p-8 space-y-6 shadow-sm'>
                            <div className='flex items-center gap-4 border-b border-border/10 pb-6'>
                                <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                                    <Globe className='h-5 w-5 text-primary' />
                                </div>
                                <div className='space-y-0.5'>
                                    <h2 className='text-xl font-black uppercase tracking-tight italic'>
                                        {t('serverImport.connection')}
                                    </h2>
                                    <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                        {t('serverImport.typeHelp')}
                                    </p>
                                </div>
                            </div>

                            <div className='space-y-6'>
                                <div className='space-y-2.5'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
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
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
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
                                        <p className='text-[9px] font-black text-red-500 ml-1 uppercase tracking-widest'>
                                            {errors.host}
                                        </p>
                                    )}
                                </div>

                                <div className='space-y-2.5'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
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
                                        <p className='text-[9px] font-black text-red-500 ml-1 uppercase tracking-widest'>
                                            {errors.port}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Authentication Section */}
                        <div className='bg-card/50 backdrop-blur-3xl border border-border/50 rounded-3xl p-8 space-y-6 shadow-sm'>
                            <div className='flex items-center gap-4 border-b border-border/10 pb-6'>
                                <div className='h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20'>
                                    <User className='h-5 w-5 text-blue-500' />
                                </div>
                                <div className='space-y-0.5'>
                                    <h2 className='text-xl font-black uppercase tracking-tight italic'>
                                        {t('serverImport.authentication')}
                                    </h2>
                                    <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                        {t('serverImport.credentialsHelp')}
                                    </p>
                                </div>
                            </div>

                            <div className='space-y-6'>
                                <div className='space-y-2.5'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
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
                                        <p className='text-[9px] font-black text-red-500 ml-1 uppercase tracking-widest'>
                                            {errors.user}
                                        </p>
                                    )}
                                </div>

                                <div className='space-y-2.5'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
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
                                        <p className='text-[9px] font-black text-red-500 ml-1 uppercase tracking-widest'>
                                            {errors.password}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Paths Section */}
                    <div className='bg-card/50 backdrop-blur-3xl border border-border/50 rounded-3xl p-8 space-y-8 shadow-sm relative overflow-hidden'>
                        <div className='absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[80px] pointer-events-none' />
                        <div className='flex items-center gap-5 border-b border-border/10 pb-8'>
                            <div className='h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20'>
                                <FolderUp className='h-6 w-6 text-emerald-500' />
                            </div>
                            <div className='space-y-1'>
                                <h2 className='text-2xl font-black uppercase tracking-tight italic leading-none'>
                                    {t('serverImport.paths')}
                                </h2>
                                <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50 italic'>
                                    {t('serverImport.pathsHelp')}
                                </p>
                            </div>
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                            <div className='space-y-3'>
                                <div className='flex items-center gap-2.5 ml-1'>
                                    <div className='w-1.5 h-1.5 rounded-full bg-emerald-500/50' />
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground'>
                                        {t('serverImport.sourceLocation')}
                                    </label>
                                </div>
                                <div className='relative group'>
                                    <div className='absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/40 group-focus-within:text-emerald-500 transition-colors z-10'>
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
                                    <p className='text-[9px] font-black text-red-500 ml-2 uppercase tracking-widest'>
                                        {errors.sourceLocation}
                                    </p>
                                )}
                            </div>

                            <div className='space-y-3'>
                                <div className='flex items-center gap-2.5 ml-1'>
                                    <div className='w-1.5 h-1.5 rounded-full bg-primary/50' />
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground'>
                                        {t('serverImport.destinationLocation')}
                                    </label>
                                </div>
                                <div className='relative group'>
                                    <div className='absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors z-10'>
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
                                    <p className='text-[9px] font-black text-red-500 ml-2 uppercase tracking-widest'>
                                        {errors.destinationLocation}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Options & Actions */}
                <div className='lg:col-span-4 space-y-8'>
                    {/* Options Panel */}
                    <div className='bg-card/50 backdrop-blur-3xl border border-border/50 rounded-3xl p-8 space-y-6 shadow-sm relative overflow-hidden group'>
                        <div className='absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-2xl pointer-events-none group-hover:bg-primary/10 transition-all duration-700' />
                        <div className='flex items-center gap-4 border-b border-border/10 pb-6 relative z-10'>
                            <div className='h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center border border-border/10'>
                                <Settings2 className='h-5 w-5 text-muted-foreground' />
                            </div>
                            <div className='space-y-0.5'>
                                <h2 className='text-xl font-black uppercase tracking-tight italic'>
                                    {t('serverImport.options')}
                                </h2>
                                <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50 italic'>
                                    Configuration
                                </p>
                            </div>
                        </div>

                        <div className='space-y-4 relative z-10'>
                            {/* Wipe Destination Toggle */}
                            <div
                                onClick={() => !saving && setForm((prev) => ({ ...prev, wipe: !prev.wipe }))}
                                className={cn(
                                    'p-5 rounded-2xl border transition-all duration-500 cursor-pointer group/opt relative overflow-hidden',
                                    form.wipe
                                        ? 'bg-primary/10 border-primary/40'
                                        : 'bg-secondary/30 border-border/20 hover:border-border/40',
                                )}
                            >
                                <div className='flex items-center justify-between gap-4'>
                                    <div className='space-y-0.5'>
                                        <p
                                            className={cn(
                                                'font-black text-xs uppercase tracking-wider transition-colors',
                                                form.wipe ? 'text-primary' : 'text-muted-foreground',
                                            )}
                                        >
                                            {t('serverImport.wipe')}
                                        </p>
                                        <p className='text-[9px] font-bold text-muted-foreground leading-relaxed italic opacity-70 pr-4'>
                                            {t('serverImport.wipeHelp')}
                                        </p>
                                    </div>
                                    <div
                                        className={cn(
                                            'w-10 h-5 rounded-full transition-all duration-500 relative shrink-0',
                                            form.wipe
                                                ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]'
                                                : 'bg-muted',
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'absolute top-1 w-3 h-3 rounded-full bg-background transition-all duration-500 shadow-md',
                                                form.wipe ? 'left-6' : 'left-1',
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Wipe All Toggle (Danger) */}
                            <div
                                onClick={() =>
                                    !saving && setForm((prev) => ({ ...prev, wipeAllFiles: !prev.wipeAllFiles }))
                                }
                                className={cn(
                                    'p-5 rounded-2xl border transition-all duration-500 cursor-pointer group/opt relative overflow-hidden',
                                    form.wipeAllFiles
                                        ? 'bg-red-500/10 border-red-500/40'
                                        : 'bg-secondary/30 border-border/20 hover:border-red-500/20',
                                )}
                            >
                                <div className='flex items-center justify-between gap-4'>
                                    <div className='space-y-0.5'>
                                        <p
                                            className={cn(
                                                'font-black text-xs uppercase tracking-wider transition-colors',
                                                form.wipeAllFiles ? 'text-red-500' : 'text-muted-foreground',
                                            )}
                                        >
                                            {t('serverImport.wipeAllFiles')}
                                        </p>
                                        <p className='text-[9px] font-bold text-muted-foreground leading-relaxed italic opacity-70 pr-4'>
                                            {t('serverImport.wipeAllFilesHelp')}
                                        </p>
                                    </div>
                                    <div
                                        className={cn(
                                            'w-10 h-5 rounded-full transition-all duration-500 relative shrink-0',
                                            form.wipeAllFiles
                                                ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                                                : 'bg-muted',
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'absolute top-1 w-3 h-3 rounded-full bg-background transition-all duration-500 shadow-md',
                                                form.wipeAllFiles ? 'left-6' : 'left-1',
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Caution Alert */}
                        {form.wipeAllFiles && (
                            <div className='mt-4 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 animate-in zoom-in-95 duration-500 relative z-10'>
                                <div className='flex gap-3'>
                                    <div className='h-8 w-8 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30'>
                                        <AlertTriangle className='h-4 w-4 text-red-500' />
                                    </div>
                                    <div className='space-y-0.5'>
                                        <h4 className='text-red-500 font-black text-[10px] uppercase tracking-widest'>
                                            {t('common.warning')}
                                        </h4>
                                        <p className='text-red-500/80 text-[9px] font-extrabold italic leading-relaxed'>
                                            {t('serverImport.wipeAllFilesWarning')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Information Summary */}
                    <div className='bg-blue-500/5 border border-blue-500/10 backdrop-blur-3xl rounded-3xl p-8 space-y-4 shadow-sm relative overflow-hidden group'>
                        <div className='absolute -bottom-6 -right-6 w-24 h-24 bg-blue-500/10 blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-1000' />
                        <div className='h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 relative z-10'>
                            <ShieldAlert className='h-5 w-5 text-blue-500' />
                        </div>
                        <div className='space-y-2 relative z-10'>
                            <h3 className='text-lg font-black uppercase tracking-tight text-blue-500 leading-none italic'>
                                {t('serverImport.infoTitle')}
                            </h3>
                            <p className='text-blue-500/70 font-bold text-[11px] leading-relaxed italic'>
                                {t('serverImport.infoDescription')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Background Effect */}
            <div className='fixed inset-0 bg-linear-to-br from-primary/5 via-transparent to-blue-500/5 pointer-events-none -z-10' />
            <WidgetRenderer widgets={getWidgets('server-import-new', 'bottom-of-page')} />
        </div>
    );
}
