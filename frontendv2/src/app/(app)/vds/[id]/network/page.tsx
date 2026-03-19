/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
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
import axios from 'axios';
import { useVmInstance } from '@/contexts/VmInstanceContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Globe, Loader2, Lock, Network, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssignedIp {
    id: number;
    vm_ip_id: number;
    network_key: string;
    bridge: string | null;
    interface_name: string | null;
    is_primary: number | boolean;
    sort_order: number;
    ip: string;
    cidr: number | null;
    gateway: string | null;
}

interface NetworkingResponse {
    assigned_ips: AssignedIp[];
    nameserver: string | null;
    searchdomain: string | null;
    vm_type: 'qemu' | 'lxc';
    primary_ip: string | null;
}

export default function VdsNetworkingPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { t } = useTranslation();
    const { instance, loading: instanceLoading, hasPermission, refreshInstance } = useVmInstance();

    const [networking, setNetworking] = React.useState<NetworkingResponse | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [dnsNameserver, setDnsNameserver] = React.useState('');
    const [dnsSearchDomain, setDnsSearchDomain] = React.useState('');

    const canSettings = hasPermission('settings');

    const fetchNetworking = React.useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${id}/networking`);
            if (data?.success) {
                const payload = data.data as NetworkingResponse;
                setNetworking(payload);
                setDnsNameserver(payload.nameserver ?? '');
                setDnsSearchDomain(payload.searchdomain ?? '');
            }
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, [id]);

    React.useEffect(() => {
        if (!instanceLoading && instance) {
            void fetchNetworking();
        }
    }, [instanceLoading, instance, fetchNetworking]);

    const handleApplyDns = async () => {
        if (!canSettings) return;
        setSaving(true);
        try {
            await axios.patch(`/api/user/vm-instances/${id}/network-dns`, {
                nameserver: dnsNameserver.trim() || undefined,
                searchdomain: networking?.vm_type === 'lxc' ? dnsSearchDomain.trim() || undefined : undefined,
            });
            toast.success(t('vds.networking.dns.apply_success') ?? 'DNS updated.');
            await refreshInstance();
            await fetchNetworking();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg || (t('vds.networking.dns.apply_failed') ?? 'Failed to update DNS.'));
        } finally {
            setSaving(false);
        }
    };

    if (instanceLoading) {
        return (
            <div className='flex items-center justify-center min-h-[60vh]'>
                <div className='flex flex-col items-center gap-4'>
                    <Loader2 className='h-10 w-10 animate-spin text-primary' />
                    <p className='text-muted-foreground font-medium animate-pulse'>
                        {t('vds.networking.loading') ?? 'Loading networking…'}
                    </p>
                </div>
            </div>
        );
    }

    if (!instance) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center space-y-6'>
                <div className='h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center'>
                    <Lock className='h-10 w-10 text-red-400' />
                </div>
                <div>
                    <h2 className='text-2xl font-black'>{t('vds.console.not_found_title')}</h2>
                    <p className='text-muted-foreground mt-2'>{t('vds.console.not_found_description')}</p>
                </div>
                <Button variant='outline' onClick={() => router.push('/dashboard')}>
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <div className='space-y-8 pb-12'>
            <PageHeader
                title={t('vds.networking.title') ?? 'Networking'}
                description={t('vds.networking.description') ?? 'View assigned IPs, interfaces, and DNS settings.'}
                actions={
                    <Button variant='glass' size='sm' onClick={fetchNetworking} disabled={loading}>
                        <RefreshCw className={cn('h-4 w-4 mr-1.5', loading && 'animate-spin')} />
                        {t('navigation.items.refresh') || 'Refresh'}
                    </Button>
                }
            />

            <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
                <Card className='xl:col-span-2 border-border/20 bg-card/30 backdrop-blur-sm'>
                    <CardHeader>
                        <CardTitle className='text-sm font-black uppercase tracking-widest flex items-center gap-2'>
                            <Network className='h-4 w-4 text-primary' />
                            {t('vds.networking.assigned_ips.title') ?? 'Assigned IPs'}
                        </CardTitle>
                        <CardDescription className='text-muted-foreground'>
                            {t('vds.networking.assigned_ips.description') ??
                                'These addresses are currently attached to your VDS instance.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        {loading && !networking ? (
                            <div className='flex items-center gap-2 text-muted-foreground'>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                {t('vds.networking.loading') ?? 'Loading networking…'}
                            </div>
                        ) : networking?.assigned_ips?.length ? (
                            networking.assigned_ips.map((ip) => (
                                <div
                                    key={`${ip.network_key}-${ip.vm_ip_id}`}
                                    className='rounded-2xl border border-border/30 bg-muted/20 p-4 space-y-3'
                                >
                                    <div className='flex flex-wrap items-center gap-2 justify-between'>
                                        <div className='flex items-center gap-2'>
                                            <span className='text-sm font-black uppercase tracking-widest text-primary/80'>
                                                {ip.network_key}
                                            </span>
                                            {Boolean(ip.is_primary) && (
                                                <span className='inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-400'>
                                                    <ShieldCheck className='h-3 w-3' />
                                                    {t('vds.networking.assigned_ips.primary_badge') ?? 'Primary'}
                                                </span>
                                            )}
                                        </div>
                                        <span className='text-xs text-muted-foreground font-mono'>
                                            {ip.interface_name ?? (networking.vm_type === 'lxc' ? 'eth0' : 'virtio')}
                                        </span>
                                    </div>
                                    <div className='text-xl font-black font-mono break-all'>{ip.ip}</div>
                                    <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm'>
                                        <div className='rounded-xl border border-border/20 bg-background/30 px-3 py-2'>
                                            <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                                                {t('vds.networking.assigned_ips.cidr') ?? 'CIDR'}
                                            </div>
                                            <div className='font-mono mt-1'>{ip.cidr ?? '—'}</div>
                                        </div>
                                        <div className='rounded-xl border border-border/20 bg-background/30 px-3 py-2'>
                                            <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                                                {t('vds.networking.assigned_ips.gateway') ?? 'Gateway'}
                                            </div>
                                            <div className='font-mono mt-1'>{ip.gateway || '—'}</div>
                                        </div>
                                        <div className='rounded-xl border border-border/20 bg-background/30 px-3 py-2'>
                                            <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                                                {t('vds.networking.assigned_ips.bridge') ?? 'Bridge'}
                                            </div>
                                            <div className='font-mono mt-1'>{ip.bridge || 'vmbr0'}</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className='rounded-2xl border border-dashed border-border/40 bg-muted/10 p-6 text-sm text-muted-foreground'>
                                {t('vds.networking.assigned_ips.empty') ?? 'No assigned IPs were found for this VDS.'}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className='border-border/20 bg-card/30 backdrop-blur-sm'>
                    <CardHeader>
                        <CardTitle className='text-sm font-black uppercase tracking-widest flex items-center gap-2'>
                            <Globe className='h-4 w-4 text-primary' />
                            {t('vds.networking.dns.title') ?? 'DNS'}
                        </CardTitle>
                        <CardDescription className='text-muted-foreground'>
                            {t('vds.networking.dns.description') ??
                                'Nameserver and search domain settings for this instance.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <div className='space-y-2'>
                            <div className='text-xs font-semibold text-muted-foreground'>
                                {t('vds.networking.dns.nameserver_label') ?? 'Nameserver'}
                            </div>
                            <Input
                                value={dnsNameserver}
                                onChange={(e) => setDnsNameserver(e.target.value)}
                                disabled={!canSettings}
                                placeholder={t('vds.networking.dns.nameserver_placeholder') ?? '1.1.1.1 8.8.8.8'}
                                className='bg-muted/30'
                            />
                        </div>

                        {networking?.vm_type === 'lxc' && (
                            <div className='space-y-2'>
                                <div className='text-xs font-semibold text-muted-foreground'>
                                    {t('vds.networking.dns.searchdomain_label') ?? 'Search domain'}
                                </div>
                                <Input
                                    value={dnsSearchDomain}
                                    onChange={(e) => setDnsSearchDomain(e.target.value)}
                                    disabled={!canSettings}
                                    placeholder={t('vds.networking.dns.searchdomain_placeholder') ?? 'example.com'}
                                    className='bg-muted/30'
                                />
                            </div>
                        )}

                        <div className='rounded-2xl border border-border/20 bg-muted/10 px-4 py-3 space-y-2'>
                            <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                                {t('vds.networking.primary_ip_label') ?? 'Primary IP'}
                            </div>
                            <div className='font-mono text-sm'>{networking?.primary_ip ?? '—'}</div>
                        </div>

                        {canSettings ? (
                            <div className='flex justify-end pt-2'>
                                <Button variant='glass' disabled={saving} onClick={handleApplyDns}>
                                    {saving && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
                                    {t('vds.networking.dns.apply_button') ?? 'Apply'}
                                </Button>
                            </div>
                        ) : (
                            <div className='rounded-2xl border border-border/20 bg-muted/10 px-4 py-3 text-sm text-muted-foreground'>
                                {t('vds.networking.dns.readonly_notice') ??
                                    'You can view DNS settings here, but you do not have permission to change them.'}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className='border-border/20 bg-card/20 backdrop-blur-sm'>
                <CardHeader>
                    <CardTitle className='text-sm font-black uppercase tracking-widest flex items-center gap-2'>
                        <Server className='h-4 w-4 text-primary' />
                        {t('vds.networking.notes.title') ?? 'How It Works'}
                    </CardTitle>
                </CardHeader>
                <CardContent className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground'>
                    <div className='rounded-2xl border border-border/20 bg-muted/10 p-4'>
                        <div className='font-semibold text-foreground mb-1'>QEMU / KVM</div>
                        <p>
                            {t('vds.networking.notes.qemu') ??
                                'Additional IPs are provisioned as extra virtual NICs with matching cloud-init ipconfig entries.'}
                        </p>
                    </div>
                    <div className='rounded-2xl border border-border/20 bg-muted/10 p-4'>
                        <div className='font-semibold text-foreground mb-1'>LXC</div>
                        <p>
                            {t('vds.networking.notes.lxc') ??
                                'Additional IPs are provisioned as extra container network interfaces such as net1, net2, and so on.'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
