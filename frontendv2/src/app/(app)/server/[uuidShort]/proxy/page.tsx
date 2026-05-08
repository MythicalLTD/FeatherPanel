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
import axios, { AxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { ArrowRightLeft, CheckCircle, Plus, Trash2, RefreshCw, Network, Globe, Info, Loader2 } from 'lucide-react';

import { Button } from '@/components/featherui/Button';
import { HeadlessModal } from '@/components/ui/headless-modal';
import { toast } from 'sonner';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { cn, isEnabled } from '@/lib/utils';
import type { Proxy, ProxiesResponse } from '@/types/server';
import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ResourceCard } from '@/components/featherui/ResourceCard';

export default function ServerProxyPage() {
    const { uuidShort } = useParams();
    const { t } = useTranslation();
    const { settings } = useSettings();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort as string);
    const router = useRouter();
    const pathname = usePathname();

    const [proxies, setProxies] = React.useState<Proxy[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [selectedProxy, setSelectedProxy] = React.useState<Proxy | null>(null);
    const [saving, setSaving] = React.useState(false);

    const { getWidgets, fetchWidgets } = usePluginWidgets('server-proxy');

    const canManage = hasPermission('proxy.manage');
    const canRead = hasPermission('proxy.read');
    const proxyEnabled = isEnabled(settings?.server_allow_user_made_proxy);
    const maxProxies = parseInt(settings?.server_proxy_max_per_server || '0', 10);
    const isMaxReached = proxies.length >= maxProxies && maxProxies > 0;
    const showHeaderCreateAction = canManage && proxies.length > 0;

    const fetchData = React.useCallback(async () => {
        if (!uuidShort || !proxyEnabled) return;
        setLoading(true);
        try {
            const { data } = await axios.get<ProxiesResponse>(`/api/user/servers/${uuidShort}/proxy`);

            if (data.success) {
                setProxies(data.data.proxies);
            }
        } catch (error) {
            console.error('Failed to fetch proxy data:', error);
            toast.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [uuidShort, proxyEnabled, t]);

    React.useEffect(() => {
        if (proxyEnabled && canRead) {
            fetchData();
            fetchWidgets();
        } else {
            setLoading(false);
        }
    }, [fetchData, fetchWidgets, proxyEnabled, canRead]);

    const handleDelete = async () => {
        if (!selectedProxy) return;
        setSaving(true);
        try {
            await axios.post(`/api/user/servers/${uuidShort}/proxy/delete`, { id: selectedProxy.id });
            toast.success(t('serverProxy.deleted'));
            setIsDeleteOpen(false);
            fetchData();
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || 'Failed to delete proxy');
        } finally {
            setSaving(false);
            setSelectedProxy(null);
        }
    };

    const promptDelete = (proxy: Proxy) => {
        setSelectedProxy(proxy);
        setIsDeleteOpen(true);
    };

    if (permissionsLoading) return null;

    if (!canRead) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <EmptyState
                    title={t('common.accessDenied')}
                    description={t('common.noPermission')}
                    icon={Globe}
                    action={
                        <Button variant='secondary' onClick={() => window.history.back()}>
                            {t('common.goBack')}
                        </Button>
                    }
                />
            </div>
        );
    }

    if (!proxyEnabled) {
        return (
            <EmptyState
                title={t('serverProxy.featureDisabled')}
                description={t('serverProxy.featureDisabledDescription')}
                icon={ArrowRightLeft}
                action={
                    <Button variant='secondary' onClick={() => window.history.back()}>
                        {t('common.goBack')}
                    </Button>
                }
            />
        );
    }

    if (loading && proxies.length === 0) {
        return (
            <div key={pathname} className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 animate-pulse font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <div key={pathname} className='space-y-8 pb-12'>
            <WidgetRenderer widgets={getWidgets('server-proxy', 'top-of-page')} />

            <PageHeader
                title={t('serverProxy.title')}
                description={
                    <>
                        {t('serverProxy.description')}
                        <span className='ml-2 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-sm font-bold'>
                            {proxies.length} / {maxProxies > 0 ? maxProxies : '∞'}
                        </span>
                    </>
                }
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        {showHeaderCreateAction && (
                            <Button
                                size='default'
                                onClick={() => router.push(`/server/${uuidShort}/proxy/new`)}
                                disabled={isMaxReached || loading}
                                className='order-1 w-full sm:order-2 sm:w-auto'
                            >
                                <Plus className='mr-2 h-5 w-5' />
                                {t('serverProxy.createProxy')}
                            </Button>
                        )}
                        <Button
                            variant='glass'
                            size='default'
                            onClick={fetchData}
                            disabled={loading}
                            className='order-2 sm:order-1'
                            aria-label={t('serverProxy.refresh')}
                        >
                            <RefreshCw className={cn('h-5 w-5 sm:mr-2', loading && 'animate-spin')} />
                            <span className='hidden sm:inline'>{t('serverProxy.refresh')}</span>
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-proxy', 'after-header')} />

            <div className='animate-in slide-in-from-top relative overflow-hidden rounded-3xl border border-blue-500/20 bg-blue-500/10 p-6 backdrop-blur-xl duration-500'>
                <div className='relative z-10 flex items-start gap-5'>
                    <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/20'>
                        <Info className='h-6 w-6 text-blue-500' />
                    </div>
                    <div className='space-y-1'>
                        <h3 className='text-lg leading-none font-bold tracking-tight text-blue-500 uppercase'>
                            {t('serverProxy.infoTitle')}
                        </h3>
                        <p className='text-sm leading-relaxed font-medium text-blue-500/80'>
                            {t('serverProxy.infoDescription')}
                        </p>
                    </div>
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('server-proxy', 'before-proxies-list')} />

            {proxies.length === 0 ? (
                <EmptyState
                    title={t('serverProxy.noProxiesTitle')}
                    description={t('serverProxy.noProxiesDescription')}
                    icon={ArrowRightLeft}
                    action={
                        canManage ? (
                            <Button
                                size='default'
                                onClick={() => router.push(`/server/${uuidShort}/proxy/new`)}
                                disabled={isMaxReached}
                            >
                                <Plus className='mr-2 h-6 w-6' />
                                {t('serverProxy.createProxy')}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {proxies.map((proxy) => (
                        <ResourceCard
                            key={proxy.id}
                            icon={proxy.ssl ? CheckCircle : ArrowRightLeft}
                            iconWrapperClassName={
                                proxy.ssl
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                    : 'bg-white/5 border-white/10 text-muted-foreground'
                            }
                            title={proxy.domain}
                            description={
                                <div className='flex flex-col gap-1'>
                                    <div className='text-muted-foreground flex items-center gap-2'>
                                        <Network className='h-3 w-3 opacity-50' />
                                        <span className='text-foreground/70 text-xs font-bold'>{proxy.ip}</span>
                                    </div>
                                    <div className='text-muted-foreground flex items-center gap-2'>
                                        <Globe className='h-3 w-3 opacity-50' />
                                        <span className='text-xs font-medium'>
                                            {proxy.use_lets_encrypt
                                                ? t('serverProxy.letsEncrypt')
                                                : t('serverProxy.customCert')}
                                        </span>
                                    </div>
                                </div>
                            }
                            badges={[
                                {
                                    label: `:${proxy.port}`,
                                    className: 'bg-background/50 border border-border/40 opacity-80',
                                },
                                ...(proxy.ssl
                                    ? [
                                          {
                                              label: t('serverProxy.sslEnabled'),
                                              className:
                                                  'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
                                          },
                                      ]
                                    : []),
                            ]}
                            actions={
                                canManage && (
                                    <div className='flex items-center gap-3'>
                                        <Button
                                            variant='destructive'
                                            onClick={() => promptDelete(proxy)}
                                            className='h-10 w-10 rounded-xl p-0'
                                        >
                                            <Trash2 className='h-5 w-5 stroke-2' />
                                        </Button>
                                    </div>
                                )
                            }
                        />
                    ))}
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('server-proxy', 'after-proxies-list')} />
            <WidgetRenderer widgets={getWidgets('server-proxy', 'bottom-of-page')} />

            <HeadlessModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title={t('serverProxy.deleteModalTitle')}
                description={t('serverProxy.deleteModalDescription', { domain: selectedProxy?.domain || '' })}
            >
                <div className='mt-6 flex justify-end gap-2'>
                    <Button variant='ghost' onClick={() => setIsDeleteOpen(false)} disabled={saving}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleDelete} variant='destructive' disabled={saving}>
                        {saving ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                        {saving ? t('serverProxy.deleting') : t('serverProxy.deleteProxy')}
                    </Button>
                </div>
            </HeadlessModal>
        </div>
    );
}
