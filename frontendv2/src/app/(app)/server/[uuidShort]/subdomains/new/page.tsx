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
                <div className='h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6'>
                    <Lock className='h-10 w-10 text-red-500' />
                </div>
                <h1 className='text-2xl font-black uppercase tracking-tight'>{t('common.accessDenied')}</h1>
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
            <div className='flex flex-col items-center justify-center py-24 text-center space-y-8 bg-card/40 backdrop-blur-3xl rounded-[3rem] border border-border/5 '>
                <div className='relative'>
                    <div className='absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150' />
                    <div className='relative h-32 w-32 rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 rotate-3'>
                        <Globe className='h-16 w-16 text-primary' />
                    </div>
                </div>
                <div className='max-w-md space-y-3 px-4'>
                    <h2 className='text-3xl font-black uppercase tracking-tight'>
                        {t('serverSubdomains.noDomainsAvailable')}
                    </h2>
                </div>
                <Button
                    variant='outline'
                    size='default'
                    className='mt-8 rounded-2xl h-14 px-10'
                    onClick={() => router.back()}
                >
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <div className='max-w-6xl mx-auto space-y-8 pb-16 '>
            <WidgetRenderer widgets={getWidgets('server-subdomains-new', 'top-of-page')} />
            <PageHeader
                title={t('serverSubdomains.createButton')}
                description={t('serverSubdomains.newSubdomainDescription')}
                actions={
                    <div className='flex items-center gap-3'>
                        <Button variant='ghost' size='default' onClick={() => router.back()} disabled={saving}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            size='default'
                            variant='default'
                            onClick={handleCreate}
                            disabled={saving || limitReached}
                            loading={saving}
                        >
                            {saving ? (
                                t('common.saving')
                            ) : (
                                <>
                                    <Plus className='h-4 w-4 mr-2' />
                                    {t('serverSubdomains.createButton')}
                                </>
                            )}
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-subdomains-new', 'after-header')} />

            <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
                <div className='lg:col-span-8 space-y-8'>
                    {limitReached && (
                        <div className='rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 flex items-start gap-4'>
                            <div className='h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0 border border-yellow-500/30'>
                                <Info className='h-5 w-5 text-yellow-500' />
                            </div>
                            <div className='space-y-1'>
                                <h4 className='text-sm font-bold text-yellow-500 uppercase tracking-wide'>
                                    {t('serverSubdomains.limitReached')}
                                </h4>
                                <p className='text-xs text-yellow-500/70 leading-relaxed font-medium'>
                                    {t('serverSubdomains.limitReachedDescription', {
                                        limit: String(overview?.max_allowed),
                                    })}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className='bg-card/50 backdrop-blur-3xl border border-border/50 rounded-3xl p-8 space-y-6 shadow-sm'>
                        <div className='flex items-center gap-4 border-b border-border/10 pb-6'>
                            <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                                <Globe className='h-5 w-5 text-primary' />
                            </div>
                            <div className='space-y-0.5'>
                                <h2 className='text-xl font-black uppercase tracking-tight italic'>
                                    {t('serverSubdomains.configuration')}
                                </h2>
                                <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                    Setup
                                </p>
                            </div>
                        </div>

                        <div className='space-y-6'>
                            <div className='space-y-2.5'>
                                <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
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
                                <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                    {t('serverSubdomains.subdomainLabel')} <span className='text-primary'>*</span>
                                </label>
                                <Input
                                    value={formData.subdomain}
                                    onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                                    placeholder={t('serverSubdomains.subdomainPlaceholder')}
                                    disabled={saving}
                                    className='h-12 bg-secondary/50 border-border/10 focus:border-primary/50 rounded-xl text-sm font-extrabold transition-all'
                                />
                                <p className='text-xs text-muted-foreground ml-1'>
                                    {t('serverSubdomains.subdomainHint')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='lg:col-span-4 space-y-8'>
                    <div className='bg-blue-500/5 border border-blue-500/10 backdrop-blur-3xl rounded-3xl p-8 space-y-4 shadow-sm relative overflow-hidden group'>
                        <div className='absolute -bottom-6 -right-6 w-24 h-24 bg-blue-500/10 blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-1000' />
                        <div className='h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 relative z-10'>
                            <Info className='h-5 w-5 text-blue-500' />
                        </div>
                        <div className='space-y-2 relative z-10'>
                            <h3 className='text-lg font-black uppercase tracking-tight text-blue-500 leading-none italic'>
                                {t('serverSubdomains.helpfulTips')}
                            </h3>
                            <p className='text-blue-500/70 font-bold text-[11px] leading-relaxed italic'>
                                {t('serverSubdomains.noSubdomainsDescription')}
                            </p>
                        </div>
                    </div>

                    <div className='bg-card/50 backdrop-blur-3xl border border-border/50 rounded-3xl p-8 space-y-6 shadow-sm relative overflow-hidden'>
                        <div className='flex items-center gap-4 border-b border-border/10 pb-6 relative z-10'>
                            <div className='h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center border border-border/10'>
                                <Settings2 className='h-5 w-5 text-muted-foreground' />
                            </div>
                            <div className='space-y-0.5'>
                                <h2 className='text-xl font-black uppercase tracking-tight italic'>
                                    {t('serverSubdomains.guide')}
                                </h2>
                                <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50 italic'>
                                    Info
                                </p>
                            </div>
                        </div>
                        <ul className='space-y-4 relative z-10'>
                            <li className='flex gap-3 text-xs text-muted-foreground'>
                                <span className='h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0' />
                                <span>
                                    Subdomains allow you to give your server a custom address, like{' '}
                                    <code>play.example.com</code>.
                                </span>
                            </li>
                            <li className='flex gap-3 text-xs text-muted-foreground'>
                                <span className='h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0' />
                                <span>You can create multiple subdomains for different purposes.</span>
                            </li>
                        </ul>
                    </div>

                    <div className='md:hidden pt-2'>
                        <Button
                            size='default'
                            variant='default'
                            onClick={handleCreate}
                            disabled={saving || limitReached}
                            loading={saving}
                            className='w-full h-12 text-[10px]'
                        >
                            {saving ? (
                                t('common.saving')
                            ) : (
                                <>
                                    <Plus className='h-4 w-4 mr-2' />
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
