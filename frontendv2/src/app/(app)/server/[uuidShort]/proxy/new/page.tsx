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
import axios, { AxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    ArrowRightLeft,
    CheckCircle,
    XCircle,
    Server,
    Mail,
    Globe,
    ShieldCheck,
    Info,
    Settings2,
    Loader2,
} from 'lucide-react';

import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/ui/textarea';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { toast } from 'sonner';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { cn, isEnabled } from '@/lib/utils';
import type { AllocationItem, AllocationsResponse, ProxyCreateRequest, DnsVerifyResponse } from '@/types/server';
import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';

export default function CreateProxyPage() {
    const { uuidShort } = useParams() as { uuidShort: string };
    const router = useRouter();
    const { t } = useTranslation();
    const { settings, loading: settingsLoading } = useSettings();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);

    const canManage = hasPermission('proxy.manage');
    const proxyEnabled = isEnabled(settings?.server_allow_user_made_proxy);

    const [allocations, setAllocations] = React.useState<AllocationItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [verifyingDns, setVerifyingDns] = React.useState(false);
    const [dnsVerified, setDnsVerified] = React.useState(false);
    const [dnsError, setDnsError] = React.useState<string | null>(null);
    const [targetIp, setTargetIp] = React.useState<string | null>(null);

    const { getWidgets, fetchWidgets } = usePluginWidgets('server-proxy-new');

    const [formData, setFormData] = React.useState<ProxyCreateRequest>({
        domain: '',
        port: '',
        ssl: false,
        use_lets_encrypt: false,
        client_email: '',
        ssl_cert: '',
        ssl_key: '',
    });

    const fetchData = React.useCallback(async () => {
        if (!uuidShort || !proxyEnabled) return;
        setLoading(true);
        try {
            const { data } = await axios.get<AllocationsResponse>(`/api/user/servers/${uuidShort}/allocations`);
            if (data.success) {
                const allocs = data.data.allocations || [];
                setAllocations(allocs);
                if (allocs.length > 0 && !formData.port) {
                    setFormData((prev) => ({ ...prev, port: String(allocs[0].port) }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error(t('common.error'));
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uuidShort, proxyEnabled, formData.port]);

    React.useEffect(() => {
        if (proxyEnabled && canManage) {
            fetchData();
            fetchWidgets();
        } else {
            setLoading(false);
        }
    }, [fetchData, fetchWidgets, proxyEnabled, canManage]);

    const handleVerifyDns = async () => {
        if (!formData.domain || !formData.port) return;
        setVerifyingDns(true);
        setDnsError(null);
        try {
            const { data } = await axios.post<DnsVerifyResponse>(`/api/user/servers/${uuidShort}/proxy/verify-dns`, {
                domain: formData.domain,
                port: formData.port,
            });

            if (data.success && data.data) {
                setDnsVerified(data.data.verified);
                setTargetIp(data.data.expected_ip || null);

                if (data.data.verified) {
                    toast.success(data.data.message || t('serverProxy.dnsVerifiedSuccess'));
                } else {
                    setDnsError(data.data.message || t('serverProxy.verificationFailed'));
                }
            } else {
                setDnsVerified(false);
                setDnsError(data.message || t('serverProxy.verificationFailed'));
            }
        } catch (error) {
            setDnsVerified(false);
            const axiosError = error as AxiosError<{ message: string }>;
            setDnsError(axiosError.response?.data?.message || t('serverProxy.failedToVerify'));
        } finally {
            setVerifyingDns(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.domain || !formData.port) {
            toast.error(t('serverProxy.domainRequired'));
            return;
        }
        if (!dnsVerified) {
            toast.error(t('serverProxy.verifyFirst'));
            return;
        }

        setSaving(true);
        try {
            await axios.post(`/api/user/servers/${uuidShort}/proxy/create`, formData);
            toast.success(t('serverProxy.created'));
            router.push(`/server/${uuidShort}/proxy`);
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            const msg = axiosError.response?.data?.message || t('serverProxy.createFailed');
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (permissionsLoading || settingsLoading || loading) return null;

    if (!canManage) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <EmptyState
                    title={t('common.accessDenied')}
                    description={t('common.noPermission')}
                    icon={ArrowRightLeft}
                    action={
                        <Button variant='secondary' onClick={() => router.back()}>
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
                    <Button variant='secondary' onClick={() => router.back()}>
                        {t('common.goBack')}
                    </Button>
                }
            />
        );
    }

    return (
        <div className='mx-auto max-w-6xl space-y-8 pb-16'>
            <WidgetRenderer widgets={getWidgets('server-proxy-new', 'top-of-page')} />

            <PageHeader
                title={t('serverProxy.createProxy')}
                description={t('serverProxy.createModalDescription')}
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        <Button variant='glass' size='default' onClick={() => router.back()} disabled={saving}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            size='default'
                            onClick={handleCreate}
                            disabled={saving || !dnsVerified}
                            className='w-full sm:w-auto'
                        >
                            {saving ? (
                                <>
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    {t('common.saving')}
                                </>
                            ) : (
                                <>
                                    <ArrowRightLeft className='mr-2 h-4 w-4' />
                                    {t('serverProxy.createProxy')}
                                </>
                            )}
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-proxy-new', 'after-header')} />

            <div className='grid grid-cols-1 gap-8 lg:grid-cols-12'>
                <div className='space-y-8 lg:col-span-8'>
                    <div className='bg-card/50 border-border/50 space-y-6 rounded-3xl border p-8 backdrop-blur-3xl'>
                        <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                            <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                                <Globe className='text-primary h-5 w-5' />
                            </div>
                            <div className='space-y-0.5'>
                                <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                    {t('serverProxy.domain')} & {t('serverProxy.targetPort')}
                                </h2>
                                <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                    {t('serverProxy.configuration')}
                                </p>
                            </div>
                        </div>

                        <div className='space-y-6'>
                            <div className='space-y-2.5'>
                                <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                    {t('serverProxy.domain')} <span className='text-primary'>*</span>
                                </label>
                                <Input
                                    required
                                    value={formData.domain}
                                    onChange={(e) => {
                                        setFormData({ ...formData, domain: e.target.value });
                                        setDnsVerified(false);
                                    }}
                                    placeholder='play.example.com'
                                    disabled={saving}
                                    className='bg-secondary/50 border-border/10 focus:border-primary/50 h-12 rounded-xl text-sm font-extrabold transition-all'
                                />
                                <p className='text-muted-foreground ml-1 text-xs'>
                                    {t('serverProxy.domainDescription')}
                                </p>
                            </div>

                            <div className='space-y-2.5'>
                                <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                    {t('serverProxy.targetPort')} <span className='text-primary'>*</span>
                                </label>
                                <HeadlessSelect
                                    value={formData.port}
                                    onChange={(val) => {
                                        setFormData({ ...formData, port: String(val) });
                                        setDnsVerified(false);
                                    }}
                                    options={allocations.map((a) => ({
                                        id: String(a.port),
                                        name: `${a.ip}:${a.port} ${a.is_primary ? t('serverProxy.primary') : ''}`,
                                    }))}
                                    placeholder={t('serverProxy.selectPort')}
                                    disabled={saving}
                                    buttonClassName='h-12 bg-secondary/50 border-border/10 focus:border-primary/50 rounded-xl text-sm font-extrabold transition-all'
                                />
                            </div>

                            <div className='border-primary/20 bg-primary/5 space-y-4 rounded-2xl border p-5'>
                                <div className='flex items-start gap-4'>
                                    <div className='bg-primary/20 border-primary/30 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border'>
                                        <Info className='text-primary h-4 w-4' />
                                    </div>
                                    <div className='space-y-1'>
                                        <h4 className='text-primary text-sm font-bold tracking-wide uppercase'>
                                            {t('serverProxy.verifyDns')}
                                        </h4>
                                        <p className='text-muted-foreground text-xs leading-relaxed'>
                                            {t('serverProxy.pointDomain', { domain: formData.domain || 'domain' })}
                                        </p>
                                    </div>
                                </div>

                                {targetIp && (
                                    <div className='bg-background/50 border-primary/30 mx-1 flex items-center gap-2 rounded-xl border border-dashed p-3 text-xs'>
                                        <Server className='text-primary h-3 w-3 opacity-50' />
                                        <span className='text-primary/80 font-bold'>{t('serverProxy.aRecord')}</span>
                                        <span className='text-foreground bg-secondary/50 rounded px-2 py-0.5 font-mono font-bold'>
                                            {targetIp}
                                        </span>
                                    </div>
                                )}

                                <div className='flex flex-col gap-2'>
                                    <Button
                                        onClick={handleVerifyDns}
                                        disabled={
                                            !formData.domain || !formData.port || verifyingDns || dnsVerified || saving
                                        }
                                        size='sm'
                                        className={cn(
                                            'h-10 w-full rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all',
                                            dnsVerified
                                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                : 'bg-primary hover:bg-primary/90',
                                        )}
                                    >
                                        {verifyingDns ? (
                                            <>
                                                <Loader2 className='mr-2 h-3 w-3 animate-spin' />
                                                {t('serverProxy.verifying')}
                                            </>
                                        ) : dnsVerified ? (
                                            <>
                                                <CheckCircle className='mr-2 h-3 w-3' />
                                                {t('serverProxy.verified')}
                                            </>
                                        ) : (
                                            t('serverProxy.verifyDns')
                                        )}
                                    </Button>

                                    {dnsError && (
                                        <div className='animate-in slide-in-from-top-2 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-400'>
                                            <XCircle className='h-4 w-4 shrink-0' />
                                            <p className='text-xs font-bold'>{dnsError}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='bg-card/50 border-border/50 space-y-6 rounded-3xl border p-8 backdrop-blur-3xl'>
                        <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                            <div className='flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10'>
                                <ShieldCheck className='h-5 w-5 text-emerald-500' />
                            </div>
                            <div className='space-y-0.5'>
                                <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                    {t('serverProxy.enableSsl')}
                                </h2>
                                <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                    {t('serverProxy.secureWithHttps')}
                                </p>
                            </div>
                            <div className='ml-auto'>
                                <Button
                                    size='sm'
                                    variant={formData.ssl ? 'default' : 'secondary'}
                                    onClick={() => setFormData({ ...formData, ssl: !formData.ssl })}
                                    className={cn(
                                        'rounded-lg font-bold',
                                        formData.ssl && 'bg-emerald-600 text-white hover:bg-emerald-700',
                                    )}
                                    disabled={saving}
                                >
                                    {formData.ssl ? t('serverProxy.on') : t('serverProxy.off')}
                                </Button>
                            </div>
                        </div>

                        {formData.ssl && (
                            <div className='animate-in fade-in slide-in-from-top-4 space-y-6 duration-500'>
                                <div className='bg-secondary/30 border-border/20 flex items-center justify-between rounded-2xl border p-4'>
                                    <div className='space-y-0.5'>
                                        <h4 className='text-foreground text-sm font-bold'>
                                            {t('serverProxy.letsEncrypt')}
                                        </h4>
                                        <p className='text-muted-foreground text-[10px] font-medium tracking-wide uppercase'>
                                            {t('serverProxy.autoGenerate')}
                                        </p>
                                    </div>
                                    <Button
                                        size='sm'
                                        variant={formData.use_lets_encrypt ? 'default' : 'secondary'}
                                        onClick={() =>
                                            setFormData({ ...formData, use_lets_encrypt: !formData.use_lets_encrypt })
                                        }
                                        disabled={saving}
                                        className={cn(
                                            'rounded-lg font-bold',
                                            formData.use_lets_encrypt && 'bg-blue-600 text-white hover:bg-blue-700',
                                        )}
                                    >
                                        {formData.use_lets_encrypt ? t('serverProxy.on') : t('serverProxy.off')}
                                    </Button>
                                </div>

                                {formData.use_lets_encrypt ? (
                                    <div className='space-y-2.5'>
                                        <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                            {t('serverProxy.email')} <span className='text-primary'>*</span>
                                        </label>
                                        <div className='group relative'>
                                            <div className='text-muted-foreground/50 group-focus-within:text-primary absolute top-1/2 left-4 z-10 -translate-y-1/2 transition-colors'>
                                                <Mail className='h-4 w-4' />
                                            </div>
                                            <Input
                                                type='email'
                                                value={formData.client_email || ''}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, client_email: e.target.value })
                                                }
                                                placeholder='admin@example.com'
                                                className='bg-secondary/50 border-border/10 focus:border-primary/50 h-12 rounded-xl pl-11 text-sm font-extrabold transition-all'
                                                disabled={saving}
                                                required
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                                        <div className='space-y-2.5'>
                                            <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                                {t('serverProxy.certificate')}
                                            </label>
                                            <Textarea
                                                value={formData.ssl_cert || ''}
                                                onChange={(e) => setFormData({ ...formData, ssl_cert: e.target.value })}
                                                disabled={saving}
                                                className='bg-secondary/50 border-border/10 focus:border-primary/50 min-h-[150px] rounded-xl font-mono text-xs leading-relaxed'
                                                placeholder='-----BEGIN CERTIFICATE-----...'
                                            />
                                        </div>
                                        <div className='space-y-2.5'>
                                            <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                                {t('serverProxy.privateKey')}
                                            </label>
                                            <Textarea
                                                value={formData.ssl_key || ''}
                                                onChange={(e) => setFormData({ ...formData, ssl_key: e.target.value })}
                                                disabled={saving}
                                                className='bg-secondary/50 border-border/10 focus:border-primary/50 min-h-[150px] rounded-xl font-mono text-xs leading-relaxed'
                                                placeholder='-----BEGIN PRIVATE KEY-----...'
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className='space-y-8 lg:col-span-4'>
                    <div className='group relative space-y-4 overflow-hidden rounded-3xl border border-blue-500/10 bg-blue-500/5 p-8 backdrop-blur-3xl'>
                        <div className='pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 bg-blue-500/10 blur-2xl transition-transform duration-1000 group-hover:scale-150' />
                        <div className='relative z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10'>
                            <Info className='h-5 w-5 text-blue-500' />
                        </div>
                        <div className='relative z-10 space-y-2'>
                            <h3 className='text-lg leading-none font-black tracking-tight text-blue-500 uppercase italic'>
                                {t('serverProxy.infoTitle')}
                            </h3>
                            <p className='text-[11px] leading-relaxed font-bold text-blue-500/70 italic'>
                                {t('serverProxy.infoDescription')}
                            </p>
                        </div>
                    </div>

                    <div className='bg-card/50 border-border/50 relative space-y-6 overflow-hidden rounded-3xl border p-8 backdrop-blur-3xl'>
                        <div className='border-border/10 relative z-10 flex items-center gap-4 border-b pb-6'>
                            <div className='bg-secondary/50 border-border/10 flex h-10 w-10 items-center justify-center rounded-xl border'>
                                <Settings2 className='text-muted-foreground h-5 w-5' />
                            </div>
                            <div className='space-y-0.5'>
                                <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                    {t('serverProxy.helpfulTips')}
                                </h2>
                                <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase italic opacity-50'>
                                    {t('serverProxy.guide')}
                                </p>
                            </div>
                        </div>
                        <ul className='relative z-10 space-y-4'>
                            <li className='text-muted-foreground flex gap-3 text-xs'>
                                <span className='bg-primary mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full' />
                                <span>{t('serverProxy.tipDns')}</span>
                            </li>
                            <li className='text-muted-foreground flex gap-3 text-xs'>
                                <span className='bg-primary mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full' />
                                <span>{t('serverProxy.tipPorts')}</span>
                            </li>
                            <li className='text-muted-foreground flex gap-3 text-xs'>
                                <span className='bg-primary mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full' />
                                <span>{t('serverProxy.tipSsl')}</span>
                            </li>
                        </ul>
                    </div>

                    <div className='pt-2 md:hidden'>
                        <Button size='default' onClick={handleCreate} disabled={saving || !dnsVerified}>
                            {saving ? (
                                <>
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    {t('common.saving')}
                                </>
                            ) : (
                                <>
                                    <ArrowRightLeft className='mr-2 h-4 w-4' />
                                    {t('serverProxy.createProxy')}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('server-proxy-new', 'bottom-of-page')} />
        </div>
    );
}
