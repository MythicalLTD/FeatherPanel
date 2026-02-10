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
import { useParams } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { Button } from '@/components/featherui/Button';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Loader2, Copy, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { isEnabled } from '@/lib/utils';
import { copyToClipboard } from '@/lib/utils';

interface FastDlConfig {
    enabled: boolean;
    directory: string;
    url?: string;
    command?: string;
}

interface FastDlResponse {
    success: boolean;
    data?: FastDlConfig;
    error_message?: string;
}

export default function ServerFastDlPage() {
    const params = useParams();
    const uuidShort = params.uuidShort as string;
    const { t } = useTranslation();
    const { settings, loading: settingsLoading } = useSettings();

    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);
    const canRead = hasPermission('settings.reinstall');
    const canManage = hasPermission('settings.reinstall');

    const fastDlEnabled = isEnabled(settings?.server_allow_user_made_fastdl);

    const [config, setConfig] = React.useState<FastDlConfig | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [copied, setCopied] = React.useState(false);
    const [customDirectory, setCustomDirectory] = React.useState('fastdl');

    const { getWidgets, fetchWidgets } = usePluginWidgets('server-fastdl');

    const loadStatus = React.useCallback(async () => {
        if (!uuidShort || !fastDlEnabled || !canRead) return;

        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get<FastDlResponse>(`/api/user/servers/${uuidShort}/fastdl`);

            if (data.success && data.data) {
                setConfig(data.data);
                setCustomDirectory(data.data.directory || 'fastdl');
            } else {
                setError(data.error_message || t('serverFastDl.fetchError'));
            }
        } catch (err) {
            const axiosError = err as AxiosError<FastDlResponse>;
            if (axiosError.response?.status === 404 || axiosError.response?.status === 403) {
                setConfig({ enabled: false, directory: 'fastdl', url: undefined, command: undefined });
                setCustomDirectory('fastdl');
            } else {
                console.error('Failed to fetch FastDL data:', err);
                setError(axiosError.response?.data?.error_message || t('serverFastDl.fetchError'));
            }
        } finally {
            setLoading(false);
        }
    }, [uuidShort, fastDlEnabled, canRead, t]);

    React.useEffect(() => {
        if (!settingsLoading && !permissionsLoading) {
            if (fastDlEnabled && canRead) {
                loadStatus();
                fetchWidgets();
            } else {
                setLoading(false);
            }
        }
    }, [settingsLoading, permissionsLoading, fastDlEnabled, canRead, loadStatus, fetchWidgets]);

    const handleEnable = async () => {
        if (!canManage) return;

        setSaving(true);
        setError(null);
        try {
            const directory = customDirectory.trim() || undefined;
            const { data } = await axios.post<FastDlResponse>(`/api/user/servers/${uuidShort}/fastdl/enable`, {
                directory: directory || undefined,
            });

            if (data.success && data.data) {
                setConfig(data.data);
                setCustomDirectory(data.data.directory || 'fastdl');
                toast.success(t('serverFastDl.enableSuccess'));
                await loadStatus();
            } else {
                const message = data.error_message || t('serverFastDl.enableError');
                setError(message);
                toast.error(message);
            }
        } catch (err) {
            const axiosError = err as AxiosError<FastDlResponse>;
            console.error('Failed to enable FastDL:', err);
            const message = axiosError.response?.data?.error_message || t('serverFastDl.enableError');
            setError(message);
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const handleDisable = async () => {
        if (!canManage) return;

        setSaving(true);
        setError(null);
        try {
            const { data } = await axios.post<FastDlResponse>(`/api/user/servers/${uuidShort}/fastdl/disable`);

            if (data.success && data.data) {
                setConfig(data.data);
                toast.success(t('serverFastDl.disableSuccess'));
                await loadStatus();
            } else {
                const message = data.error_message || t('serverFastDl.disableError');
                setError(message);
                toast.error(message);
            }
        } catch (err) {
            const axiosError = err as AxiosError<FastDlResponse>;
            console.error('Failed to disable FastDL:', err);
            const message = axiosError.response?.data?.error_message || t('serverFastDl.disableError');
            setError(message);
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const copyCommand = async () => {
        if (!config?.command) return;

        try {
            copyToClipboard(config.command);
            setCopied(true);
            toast.success(t('serverFastDl.commandCopied'));
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error(t('serverFastDl.copyError'));
        }
    };

    if (permissionsLoading || settingsLoading) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <div className='relative'>
                    <div className='absolute inset-0 animate-ping opacity-20'>
                        <div className='w-16 h-16 rounded-full bg-primary/20' />
                    </div>
                    <div className='relative p-4 rounded-full bg-primary/10'>
                        <Loader2 className='h-8 w-8 animate-spin text-primary' />
                    </div>
                </div>
                <span className='mt-4 text-muted-foreground animate-pulse'>{t('common.loading')}...</span>
            </div>
        );
    }

    if (!canRead) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <EmptyState
                    title={t('common.accessDenied')}
                    description={t('common.noPermission')}
                    icon={Download}
                    action={
                        <Button variant='secondary' onClick={() => window.history.back()}>
                            {t('common.goBack')}
                        </Button>
                    }
                />
            </div>
        );
    }

    if (!fastDlEnabled) {
        return (
            <EmptyState
                title={t('serverFastDl.featureDisabled')}
                description={t('serverFastDl.featureDisabledDescription')}
                icon={Download}
                action={
                    <Button variant='secondary' onClick={() => window.history.back()}>
                        {t('common.goBack')}
                    </Button>
                }
            />
        );
    }

    if (loading && !config) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <div className='relative'>
                    <div className='absolute inset-0 animate-ping opacity-20'>
                        <div className='w-16 h-16 rounded-full bg-primary/20' />
                    </div>
                    <div className='relative p-4 rounded-full bg-primary/10'>
                        <Loader2 className='h-8 w-8 animate-spin text-primary' />
                    </div>
                </div>
                <span className='mt-4 text-muted-foreground animate-pulse'>{t('common.loading')}...</span>
            </div>
        );
    }

    return (
        <div className='space-y-8 pb-12'>
            <WidgetRenderer widgets={getWidgets('server-fastdl', 'top-of-page')} />
            <PageHeader title={t('serverFastDl.title')} description={t('serverFastDl.description')} />
            <WidgetRenderer widgets={getWidgets('server-fastdl', 'after-header')} />

            <PageCard title={t('serverFastDl.configuration')} description={t('serverFastDl.configurationDescription')} icon={Download}>
                <div className='space-y-6'>
                    {error && (
                        <div className='p-4 bg-destructive/10 border border-destructive/20 rounded-xl'>
                            <div className='flex items-center gap-2'>
                                <AlertCircle className='h-5 w-5 text-destructive' />
                                <p className='text-sm text-destructive font-medium'>{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Status Display */}
                    <div>
                        <div className='flex items-center justify-between mb-4'>
                            <span className='text-sm font-medium text-foreground'>{t('serverFastDl.status')}</span>
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    config?.enabled
                                        ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                                        : 'bg-gray-500/10 text-gray-600 border border-gray-500/20'
                                }`}
                            >
                                {config?.enabled ? t('serverFastDl.enabled') : t('serverFastDl.disabled')}
                            </span>
                        </div>

                        {config?.enabled && (
                            <div className='mt-6 space-y-4'>
                                <div>
                                    <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block'>
                                        {t('serverFastDl.directory')}
                                    </Label>
                                    <div className='text-sm text-foreground bg-secondary/50 p-3 rounded-lg border border-border/50 font-mono'>
                                        /{config.directory}
                                    </div>
                                </div>

                                {config.url && (
                                    <div>
                                        <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block'>
                                            {t('serverFastDl.fastDlUrl')}
                                        </Label>
                                        <div className='text-sm text-foreground bg-secondary/50 p-3 rounded-lg border border-border/50 break-all'>
                                            {config.url}
                                        </div>
                                    </div>
                                )}

                                {config.command && (
                                    <div>
                                        <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block'>
                                            {t('serverFastDl.gameServerCommand')}
                                        </Label>
                                        <div className='flex items-center gap-2'>
                                            <code className='flex-1 text-sm bg-gray-900 text-green-400 p-3 rounded-lg font-mono break-all border border-border/50'>
                                                {config.command}
                                            </code>
                                            <Button
                                                variant='outline'
                                                size='icon'
                                                onClick={copyCommand}
                                                className='shrink-0'
                                                title={t('serverFastDl.copyCommand')}
                                            >
                                                {copied ? (
                                                    <CheckCircle2 className='h-4 w-4 text-green-500' />
                                                ) : (
                                                    <Copy className='h-4 w-4' />
                                                )}
                                            </Button>
                                        </div>
                                        <p className='mt-2 text-xs text-muted-foreground'>
                                            {t('serverFastDl.commandHelp')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    {!config?.enabled ? (
                        <div className='space-y-4 pt-4 border-t border-border/50'>
                            <div>
                                <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block'>
                                    {t('serverFastDl.directory')} ({t('common.optional')})
                                </Label>
                                <Input
                                    type='text'
                                    value={customDirectory}
                                    onChange={(e) => setCustomDirectory(e.target.value)}
                                    placeholder='fastdl'
                                    disabled={saving}
                                    className='h-12 bg-secondary/50 border-border/50 focus:border-primary/50 font-medium text-base rounded-xl'
                                />
                                <p className='mt-2 text-xs text-muted-foreground'>
                                    {t('serverFastDl.directoryHelp')}
                                </p>
                            </div>
                            <Button onClick={handleEnable} disabled={saving} className='w-full' variant='default'>
                                {saving ? (
                                    <>
                                        <Loader2 className='h-4 w-4 animate-spin mr-2' />
                                        {t('serverFastDl.enabling')}
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className='h-4 w-4 mr-2' />
                                        {t('serverFastDl.enableFastDl')}
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className='pt-4 border-t border-border/50'>
                            <Button onClick={handleDisable} disabled={saving} className='w-full' variant='destructive'>
                                {saving ? (
                                    <>
                                        <Loader2 className='h-4 w-4 animate-spin mr-2' />
                                        {t('serverFastDl.disabling')}
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className='h-4 w-4 mr-2' />
                                        {t('serverFastDl.disableFastDl')}
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className='mt-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl'>
                        <div className='flex items-start gap-3'>
                            <Info className='h-5 w-5 text-blue-500 mt-0.5 shrink-0' />
                            <div className='space-y-2'>
                                <h4 className='text-sm font-semibold text-blue-500 uppercase tracking-wide'>
                                    {t('serverFastDl.howItWorks')}
                                </h4>
                                <ul className='text-xs text-muted-foreground space-y-1 list-disc list-inside'>
                                    <li>{t('serverFastDl.step1')}</li>
                                    <li>{t('serverFastDl.step2')}</li>
                                    <li>{t('serverFastDl.step3')}</li>
                                    <li>{t('serverFastDl.step4')}</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </PageCard>

            <WidgetRenderer widgets={getWidgets('server-fastdl', 'bottom-of-page')} />
        </div>
    );
}
