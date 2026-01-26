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
import { useParams, usePathname } from 'next/navigation';
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
import { Switch } from '@/components/ui/switch';
import { Download, Info, Loader2, Copy, ExternalLink, Save, AlertCircle, CheckCircle2, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { cn, isEnabled } from '@/lib/utils';

interface FastDlConfig {
    enabled: boolean;
    directory: string | null;
    url: string | null;
}

interface FastDlResponse {
    success: boolean;
    data: FastDlConfig;
    error_message?: string;
}

export default function ServerFastDlPage() {
    const params = useParams();
    const pathname = usePathname();
    const uuidShort = params.uuidShort as string;
    const { t } = useTranslation();
    const { settings, loading: settingsLoading } = useSettings();

    // Permissions
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);
    const canRead = hasPermission('settings.reinstall');
    const canManage = hasPermission('settings.reinstall');

    // Feature Flag
    const fastDlEnabled = isEnabled(settings?.server_allow_user_made_fastdl);

    // State
    const [config, setConfig] = React.useState<FastDlConfig | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [enabling, setEnabling] = React.useState(false);
    const [disabling, setDisabling] = React.useState(false);

    // Form State
    const [directory, setDirectory] = React.useState('');
    const [enabled, setEnabled] = React.useState(false);

    // Widgets
    const { getWidgets, fetchWidgets } = usePluginWidgets('server-fastdl');

    const fetchData = React.useCallback(async () => {
        if (!uuidShort || !fastDlEnabled || !canRead) return;

        setLoading(true);
        try {
            const { data } = await axios.get<FastDlResponse>(`/api/user/servers/${uuidShort}/fastdl`);

            if (data.success) {
                setConfig(data.data);
                setEnabled(data.data.enabled);
                setDirectory(data.data.directory || '');
            }
        } catch (error) {
            const axiosError = error as AxiosError<FastDlResponse>;
            if (axiosError.response?.status === 404 || axiosError.response?.status === 403) {
                // FastDL not configured yet or disabled
                setConfig({ enabled: false, directory: null, url: null });
                setEnabled(false);
                setDirectory('');
            } else {
                console.error('Failed to fetch FastDL data:', error);
                toast.error(axiosError.response?.data?.error_message || t('serverFastDl.fetchError'));
            }
        } finally {
            setLoading(false);
        }
    }, [uuidShort, fastDlEnabled, canRead, t]);

    React.useEffect(() => {
        if (!settingsLoading && !permissionsLoading) {
            if (fastDlEnabled && canRead) {
                fetchData();
                fetchWidgets();
            } else {
                setLoading(false);
            }
        }
    }, [settingsLoading, permissionsLoading, fastDlEnabled, canRead, fetchData, fetchWidgets]);

    const handleEnable = async () => {
        if (!canManage) return;

        setEnabling(true);
        try {
            const { data } = await axios.post<FastDlResponse>(`/api/user/servers/${uuidShort}/fastdl/enable`, {
                directory: directory || undefined,
            });

            if (data.success) {
                setConfig(data.data);
                setEnabled(data.data.enabled);
                setDirectory(data.data.directory || '');
                toast.success(t('serverFastDl.enableSuccess'));
                fetchData(); // Refresh to get updated URL
            }
        } catch (error) {
            const axiosError = error as AxiosError<FastDlResponse>;
            console.error('Failed to enable FastDL:', error);
            toast.error(axiosError.response?.data?.error_message || t('serverFastDl.enableError'));
        } finally {
            setEnabling(false);
        }
    };

    const handleDisable = async () => {
        if (!canManage) return;

        setDisabling(true);
        try {
            const { data } = await axios.post<FastDlResponse>(`/api/user/servers/${uuidShort}/fastdl/disable`);

            if (data.success) {
                setConfig(data.data);
                setEnabled(data.data.enabled);
                toast.success(t('serverFastDl.disableSuccess'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<FastDlResponse>;
            console.error('Failed to disable FastDL:', error);
            toast.error(axiosError.response?.data?.error_message || t('serverFastDl.disableError'));
        } finally {
            setDisabling(false);
        }
    };

    const handleUpdate = async () => {
        if (!canManage) return;

        setSaving(true);
        try {
            const { data } = await axios.put<FastDlResponse>(`/api/user/servers/${uuidShort}/fastdl`, {
                enabled,
                directory: directory || null,
            });

            if (data.success) {
                setConfig(data.data);
                setEnabled(data.data.enabled);
                setDirectory(data.data.directory || '');
                toast.success(t('serverFastDl.updateSuccess'));
                fetchData(); // Refresh to get updated URL
            }
        } catch (error) {
            const axiosError = error as AxiosError<FastDlResponse>;
            console.error('Failed to update FastDL:', error);
            toast.error(axiosError.response?.data?.error_message || t('serverFastDl.updateError'));
        } finally {
            setSaving(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success(t('common.copied'));
    };

    const hasChanges = config
        ? config.enabled !== enabled || (config.directory || '') !== directory
        : enabled || directory !== '';

    if (permissionsLoading || settingsLoading) return null;

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
        <div key={pathname} className='space-y-8 pb-12'>
            <WidgetRenderer widgets={getWidgets('server-fastdl', 'top-of-page')} />
            <PageHeader title={t('serverFastDl.title')} description={t('serverFastDl.description')} />
            <WidgetRenderer widgets={getWidgets('server-fastdl', 'after-header')} />

            <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
                <div className='lg:col-span-8 space-y-8'>
                    <PageCard
                        title={t('serverFastDl.status')}
                        description={t('serverFastDl.statusDescription')}
                        icon={Download}
                    >
                        <div className='space-y-6'>
                            <div className='flex items-center justify-between p-4 bg-secondary/50 border border-border/10 rounded-xl'>
                                <div className='flex items-center gap-3'>
                                    {enabled ? (
                                        <CheckCircle2 className='h-5 w-5 text-green-500' />
                                    ) : (
                                        <AlertCircle className='h-5 w-5 text-muted-foreground' />
                                    )}
                                    <div>
                                        <p className='font-semibold'>{t('serverFastDl.fastDlStatus')}</p>
                                        <p className='text-sm text-muted-foreground'>
                                            {enabled ? t('serverFastDl.enabled') : t('serverFastDl.disabled')}
                                        </p>
                                    </div>
                                </div>
                                {canManage && (
                                    <Switch
                                        checked={enabled}
                                        onCheckedChange={setEnabled}
                                        disabled={saving || enabling || disabling}
                                    />
                                )}
                            </div>

                            {enabled && config?.url && (
                                <div className='space-y-2'>
                                    <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1'>
                                        {t('serverFastDl.fastDlUrl')}
                                    </Label>
                                    <div className='flex items-center gap-2 p-1 pl-4 pr-1 bg-white/5 border border-white/5 rounded-xl hover:border-blue-500/30 transition-colors group/input'>
                                        <code className='text-xs font-mono flex-1 truncate text-foreground/80'>
                                            {config.url}
                                        </code>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            className='h-8 w-8 p-0 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-blue-400'
                                            onClick={() => copyToClipboard(config.url || '')}
                                        >
                                            <Copy className='h-3.5 w-3.5' />
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            className='h-8 w-8 p-0 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-blue-400'
                                            onClick={() => {
                                                if (config.url) {
                                                    window.open(config.url, '_blank');
                                                }
                                            }}
                                        >
                                            <ExternalLink className='h-3.5 w-3.5' />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </PageCard>
                    <WidgetRenderer widgets={getWidgets('server-fastdl', 'after-status')} />

                    {canManage && (
                        <>
                            <PageCard
                                title={t('serverFastDl.configuration')}
                                description={t('serverFastDl.configurationDescription')}
                                icon={Globe}
                            >
                                <div className='space-y-4'>
                                    <div className='space-y-2'>
                                        <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1'>
                                            {t('serverFastDl.directory')}
                                        </Label>
                                        <Input
                                            value={directory}
                                            onChange={(e) => setDirectory(e.target.value)}
                                            disabled={saving || enabling || disabling}
                                            placeholder={t('serverFastDl.directoryPlaceholder')}
                                            className='h-12 bg-secondary/50 border-border/10 focus:border-primary/50 font-medium text-base rounded-xl'
                                        />
                                        <p className='text-xs text-muted-foreground'>
                                            {t('serverFastDl.directoryHelp')}
                                        </p>
                                    </div>

                                    <div className='flex gap-3 pt-2'>
                                        <Button
                                            onClick={handleUpdate}
                                            disabled={saving || enabling || disabling || !hasChanges}
                                            variant='default'
                                            size='sm'
                                        >
                                            {saving ? (
                                                <Loader2 className='h-4 w-4 animate-spin mr-2' />
                                            ) : (
                                                <Save className='h-4 w-4 mr-2' />
                                            )}
                                            {t('serverFastDl.saveChanges')}
                                        </Button>
                                        {!enabled && (
                                            <Button
                                                onClick={handleEnable}
                                                disabled={enabling || disabling || saving}
                                                variant='default'
                                                size='sm'
                                            >
                                                {enabling ? (
                                                    <Loader2 className='h-4 w-4 animate-spin mr-2' />
                                                ) : (
                                                    <CheckCircle2 className='h-4 w-4 mr-2' />
                                                )}
                                                {t('serverFastDl.enableFastDl')}
                                            </Button>
                                        )}
                                        {enabled && (
                                            <Button
                                                onClick={handleDisable}
                                                disabled={disabling || enabling || saving}
                                                variant='destructive'
                                                size='sm'
                                            >
                                                {disabling ? (
                                                    <Loader2 className='h-4 w-4 animate-spin mr-2' />
                                                ) : (
                                                    <AlertCircle className='h-4 w-4 mr-2' />
                                                )}
                                                {t('serverFastDl.disableFastDl')}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </PageCard>
                            <WidgetRenderer widgets={getWidgets('server-fastdl', 'after-configuration')} />
                        </>
                    )}

                    <div className='p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl shadow-sm'>
                        <div className='flex items-start gap-3'>
                            <Info className='h-5 w-5 text-blue-500 mt-0.5 shrink-0' />
                            <div className='space-y-2'>
                                <h4 className='text-sm font-bold text-blue-500 uppercase tracking-wide'>
                                    {t('serverFastDl.infoTitle')}
                                </h4>
                                <p className='text-xs text-muted-foreground leading-relaxed'>
                                    {t('serverFastDl.infoDescription')}
                                </p>
                            </div>
                        </div>
                    </div>
                    <WidgetRenderer widgets={getWidgets('server-fastdl', 'after-info')} />
                </div>

                <div className='lg:col-span-4 space-y-8'>
                    <PageCard title={t('serverFastDl.quickActions')} icon={Download} variant='default'>
                        <div className='space-y-4'>
                            <p className='text-xs text-muted-foreground leading-relaxed'>
                                {t('serverFastDl.quickActionsDescription')}
                            </p>
                            {enabled && config?.url && (
                                <div className='space-y-2'>
                                    <Button
                                        variant='outline'
                                        className='w-full'
                                        onClick={() => copyToClipboard(config.url || '')}
                                    >
                                        <Copy className='h-4 w-4 mr-2' />
                                        {t('serverFastDl.copyUrl')}
                                    </Button>
                                    <Button
                                        variant='outline'
                                        className='w-full'
                                        onClick={() => {
                                            if (config.url) {
                                                window.open(config.url, '_blank');
                                            }
                                        }}
                                    >
                                        <ExternalLink className='h-4 w-4 mr-2' />
                                        {t('serverFastDl.openUrl')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </PageCard>
                    <WidgetRenderer widgets={getWidgets('server-fastdl', 'after-quick-actions')} />
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('server-fastdl', 'bottom-of-page')} />
        </div>
    );
}
