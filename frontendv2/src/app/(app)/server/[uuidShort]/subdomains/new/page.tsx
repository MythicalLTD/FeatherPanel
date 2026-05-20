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
import { Globe, Lock, Settings2, Info, Plus } from 'lucide-react';

import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { toast } from 'sonner';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import type { SubdomainCreateRequest, SubdomainOverview } from '@/types/server';

export default function CreateSubdomainPage() {
    const { uuidShort } = useParams() as { uuidShort: string };
    const router = useRouter();
    const { t } = useTranslation();
    const { loading: settingsLoading } = useSettings();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);
    const { getWidgets } = usePluginWidgets('server-subdomains-new');

    const canManage = hasPermission('subdomains.manage') || hasPermission('control.start');

    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [overview, setOverview] = React.useState<SubdomainOverview | null>(null);

    const [formData, setFormData] = React.useState<SubdomainCreateRequest>({
        domain_uuid: '',
        subdomain: '',
    });

    const fetchData = React.useCallback(async () => {
        if (!uuidShort) return;
        setLoading(true);
        try {
            const { data } = await axios.get<{ data: { overview: SubdomainOverview } }>(
                `/api/user/servers/${uuidShort}/subdomains`,
            );
            if (data?.data?.overview) {
                setOverview(data.data.overview);

                if (data.data.overview.domains && data.data.overview.domains.length > 0 && !formData.domain_uuid) {
                    setFormData((prev) => ({ ...prev, domain_uuid: data.data.overview.domains[0].uuid }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, [uuidShort, formData.domain_uuid]);

    React.useEffect(() => {
        if (canManage) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [fetchData, canManage]);

    const handleCreate = async () => {
        if (!formData.domain_uuid || !formData.subdomain.trim()) {
            toast.error(t('serverSubdomains.subdomainRequired'));
            return;
        }

        if (overview && overview.current_total >= overview.max_allowed) {
            toast.error(t('serverSubdomains.limitReached'));
            return;
        }

        setSaving(true);
        try {
            await axios.put(`/api/user/servers/${uuidShort}/subdomains`, {
                domain_uuid: formData.domain_uuid,
                subdomain: formData.subdomain.trim(),
            });
            toast.success(t('serverSubdomains.created'));
            router.push(`/server/${uuidShort}/subdomains`);
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            const msg = axiosError.response?.data?.message || t('serverSubdomains.createFailed');
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (permissionsLoading || settingsLoading || loading) return null;

    if (!canManage) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <div className='mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10'>
                    <Lock className='h-10 w-10 text-red-500' />
                </div>
                <h1 className='text-2xl font-black tracking-tight uppercase'>{t('common.accessDenied')}</h1>
                <p className='text-muted-foreground mt-2'>{t('common.noPermission')}</p>
                <Button variant='outline' className='mt-8' onClick={() => router.back()}>
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    const availableDomains = overview?.domains || [];
    const limitReached = (overview?.current_total ?? 0) >= (overview?.max_allowed ?? 0);

    if (availableDomains.length === 0 && !loading) {
        return (
            <div className='bg-card/40 border-border/5 flex flex-col items-center justify-center space-y-8 rounded-[3rem] border py-24 text-center backdrop-blur-3xl'>
                <div className='relative'>
                    <div className='bg-primary/20 absolute inset-0 scale-150 rounded-full blur-3xl' />
                    <div className='bg-primary/10 border-primary/20 relative flex h-32 w-32 rotate-3 items-center justify-center rounded-3xl border-2'>
                        <Globe className='text-primary h-16 w-16' />
                    </div>
                </div>
                <div className='max-w-md space-y-3 px-4'>
                    <h2 className='text-3xl font-black tracking-tight uppercase'>
                        {t('serverSubdomains.noDomainsAvailable')}
                    </h2>
                </div>
                <Button
                    variant='outline'
                    size='default'
                    className='mt-8 h-14 rounded-2xl px-10'
                    onClick={() => router.back()}
                >
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <div className='mx-auto max-w-6xl space-y-8 pb-16'>
            <WidgetRenderer widgets={getWidgets('server-subdomains-new', 'top-of-page')} />
            <PageHeader
                title={t('serverSubdomains.createButton')}
                description={t('serverSubdomains.newSubdomainDescription')}
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        <Button
                            variant='ghost'
                            size='default'
                            onClick={() => router.back()}
                            disabled={saving}
                            className='order-2 sm:order-1'
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            size='default'
                            variant='default'
                            onClick={handleCreate}
                            disabled={saving || limitReached}
                            loading={saving}
                            className='order-1 w-full sm:order-2 sm:w-auto'
                        >
                            {saving ? (
                                t('common.saving')
                            ) : (
                                <>
                                    <Plus className='mr-2 h-4 w-4' />
                                    {t('serverSubdomains.createButton')}
                                </>
                            )}
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-subdomains-new', 'after-header')} />

            <div className='grid grid-cols-1 gap-8 lg:grid-cols-12'>
                <div className='space-y-8 lg:col-span-8'>
                    {limitReached && (
                        <div className='flex items-start gap-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5'>
                            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-500/30 bg-yellow-500/20'>
                                <Info className='h-5 w-5 text-yellow-500' />
                            </div>
                            <div className='space-y-1'>
                                <h4 className='text-sm font-bold tracking-wide text-yellow-500 uppercase'>
                                    {t('serverSubdomains.limitReached')}
                                </h4>
                                <p className='text-xs leading-relaxed font-medium text-yellow-500/70'>
                                    {t('serverSubdomains.limitReachedDescription', {
                                        limit: String(overview?.max_allowed),
                                    })}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className='bg-card/50 border-border/50 space-y-6 rounded-3xl border p-8 backdrop-blur-3xl'>
                        <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                            <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                                <Globe className='text-primary h-5 w-5' />
                            </div>
                            <div className='space-y-0.5'>
                                <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                    {t('serverSubdomains.configuration')}
                                </h2>
                                <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                    Setup
                                </p>
                            </div>
                        </div>

                        <div className='space-y-6'>
                            <div className='space-y-2.5'>
                                <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                    {t('serverSubdomains.domainLabel')} <span className='text-primary'>*</span>
                                </label>
                                <HeadlessSelect
                                    value={formData.domain_uuid}
                                    onChange={(val) => {
                                        setFormData({ ...formData, domain_uuid: String(val) });
                                    }}
                                    options={availableDomains.map((d) => ({
                                        id: d.uuid,
                                        name: d.domain,
                                    }))}
                                    placeholder={t('serverSubdomains.domainPlaceholder')}
                                    disabled={saving}
                                    buttonClassName='h-12 bg-secondary/50 border-border/10 focus:border-primary/50 rounded-xl text-sm font-extrabold transition-all'
                                />
                            </div>

                            <div className='space-y-2.5'>
                                <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                    {t('serverSubdomains.subdomainLabel')} <span className='text-primary'>*</span>
                                </label>
                                <Input
                                    value={formData.subdomain}
                                    onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                                    placeholder={t('serverSubdomains.subdomainPlaceholder')}
                                    disabled={saving}
                                    className='bg-secondary/50 border-border/10 focus:border-primary/50 h-12 rounded-xl text-sm font-extrabold transition-all'
                                />
                                <p className='text-muted-foreground ml-1 text-xs'>
                                    {t('serverSubdomains.subdomainHint')}
                                </p>
                            </div>
                        </div>
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
                                {t('serverSubdomains.helpfulTips')}
                            </h3>
                            <p className='text-[11px] leading-relaxed font-bold text-blue-500/70 italic'>
                                {t('serverSubdomains.noSubdomainsDescription')}
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
                                    {t('serverSubdomains.guide')}
                                </h2>
                                <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase italic opacity-50'>
                                    Info
                                </p>
                            </div>
                        </div>
                        <ul className='relative z-10 space-y-4'>
                            <li className='text-muted-foreground flex gap-3 text-xs'>
                                <span className='bg-primary mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full' />
                                <span>
                                    {t('serverSubdomains.guide_custom_address')} <code>play.example.com</code>.
                                </span>
                            </li>
                            <li className='text-muted-foreground flex gap-3 text-xs'>
                                <span className='bg-primary mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full' />
                                <span>{t('serverSubdomains.guide_multiple')}</span>
                            </li>
                        </ul>
                    </div>

                    <div className='pt-2 md:hidden'>
                        <Button
                            size='default'
                            variant='default'
                            onClick={handleCreate}
                            disabled={saving || limitReached}
                            loading={saving}
                            className='h-12 w-full text-[10px]'
                        >
                            {saving ? (
                                t('common.saving')
                            ) : (
                                <>
                                    <Plus className='mr-2 h-4 w-4' />
                                    {t('serverSubdomains.createButton')}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('server-subdomains-new', 'bottom-of-page')} />
        </div>
    );
}
