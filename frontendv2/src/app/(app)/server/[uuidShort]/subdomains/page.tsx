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
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { Globe, Plus, Trash2, RefreshCw, AlertTriangle, Lock, Loader2 } from 'lucide-react';

import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Button } from '@/components/featherui/Button';
import { HeadlessModal } from '@/components/ui/headless-modal';
import { toast } from 'sonner';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { cn, formatDate } from '@/lib/utils';
import type { SubdomainOverview, SubdomainEntry } from '@/types/server';

export default function ServerSubdomainsPage() {
    const { uuidShort } = useParams() as { uuidShort: string };
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation();
    const { loading: settingsLoading } = useSettings();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);
    const { getWidgets } = usePluginWidgets('server-subdomains');

    // Using generic manage permission or control.start as fallback
    const canManage = hasPermission('subdomains.manage') || hasPermission('control.start');
    const canDelete = hasPermission('subdomains.delete') || canManage;

    // State
    const [overview, setOverview] = React.useState<SubdomainOverview | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [subdomains, setSubdomains] = React.useState<SubdomainEntry[]>([]);

    // Delete Modal State
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [selectedSubdomain, setSelectedSubdomain] = React.useState<SubdomainEntry | null>(null);
    const [deleting, setDeleting] = React.useState(false);

    // Fetch Data
    const fetchData = React.useCallback(async () => {
        if (!uuidShort) return;
        setLoading(true);
        try {
            const { data } = await axios.get<{ data: { overview: SubdomainOverview; subdomains: SubdomainEntry[] } }>(
                `/api/user/servers/${uuidShort}/subdomains`,
            );
            if (data?.data?.overview) {
                setOverview(data.data.overview);
                if (data.data.overview.subdomains) {
                    setSubdomains(data.data.overview.subdomains);
                }
            }
        } catch (error) {
            console.error('Failed to fetch subdomains:', error);
            toast.error(t('serverSubdomains.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [uuidShort, t]);

    React.useEffect(() => {
        if (canManage) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [fetchData, canManage]);

    const handleDelete = async () => {
        if (!selectedSubdomain) return;
        setDeleting(true);
        try {
            await axios.delete(`/api/user/servers/${uuidShort}/subdomains/${selectedSubdomain.uuid}`);
            toast.success(t('serverSubdomains.deleted'));
            setIsDeleteOpen(false);
            fetchData();
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            const msg = axiosError.response?.data?.message || t('serverSubdomains.deleteFailed');
            toast.error(msg);
        } finally {
            setDeleting(false);
        }
    };

    if (permissionsLoading || settingsLoading) return null;

    if (loading && subdomains.length === 0) {
        return (
            <div key={pathname} className='flex flex-col items-center justify-center py-24 '>
                <Loader2 className='h-12 w-12 animate-spin text-primary opacity-50' />
                <p className='mt-4 text-muted-foreground font-medium animate-pulse'>{t('common.loading')}</p>
            </div>
        );
    }

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

    const limitReached = (overview?.current_total ?? 0) >= (overview?.max_allowed ?? 0);

    return (
        <div key={pathname} className='space-y-8 pb-12 '>
            <WidgetRenderer widgets={getWidgets('server-subdomains', 'top-of-page')} />
            {/* Header Section */}
            <PageHeader
                title={t('serverSubdomains.title')}
                description={t('serverSubdomains.description')}
                actions={
                    <div className='flex items-center gap-3'>
                        <Button variant='glass' size='default' onClick={fetchData} disabled={loading}>
                            <RefreshCw className={cn('h-5 w-5 mr-2', loading && 'animate-spin')} />
                            {t('common.refresh')}
                        </Button>

                        <Button
                            size='default'
                            variant='default'
                            onClick={() => router.push(`/server/${uuidShort}/subdomains/new`)}
                            disabled={limitReached || loading}
                        >
                            <Plus className='h-5 w-5 mr-2' />
                            {t('serverSubdomains.createButton')}
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-subdomains', 'after-header')} />

            {/* Limit Warning */}
            {limitReached && (
                <div className='relative overflow-hidden p-6 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-xl animate-in slide-in-from-top duration-500 shadow-sm'>
                    <div className='relative z-10 flex items-start gap-5'>
                        <div className='h-12 w-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30 shrink-0'>
                            <AlertTriangle className='h-6 w-6 text-yellow-500' />
                        </div>
                        <div className='space-y-1'>
                            <h3 className='text-lg font-bold text-yellow-500 leading-none uppercase tracking-tight'>
                                {t('serverSubdomains.limitReached')}
                            </h3>
                            <p className='text-sm text-yellow-500/80 leading-relaxed font-medium'>
                                {t('serverSubdomains.limitReachedDescription', {
                                    limit: String(overview?.max_allowed),
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('server-subdomains', 'before-subdomains-list')} />

            {/* List */}
            {subdomains.length === 0 ? (
                <EmptyState
                    title={t('serverSubdomains.noSubdomains')}
                    description={t('serverSubdomains.noSubdomainsDescription')}
                    icon={Globe}
                    action={
                        <Button
                            size='default'
                            variant='default'
                            onClick={() => router.push(`/server/${uuidShort}/subdomains/new`)}
                            disabled={limitReached}
                        >
                            <Plus className='h-6 w-6 mr-2' />
                            {t('serverSubdomains.createButton')}
                        </Button>
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {subdomains.map((sub) => (
                        <ResourceCard
                            key={sub.uuid}
                            icon={Globe}
                            iconWrapperClassName='bg-blue-500/10 border-blue-500/20 text-blue-500'
                            title={sub.subdomain + '.' + sub.domain}
                            description={
                                <div className='flex flex-col gap-1'>
                                    <span className='text-xs font-medium text-muted-foreground'>{sub.record_type}</span>
                                </div>
                            }
                            badges={[
                                ...(sub.port
                                    ? [
                                          {
                                              label: `Port ${sub.port}`,
                                              className:
                                                  'bg-background/50 border border-border/40 text-muted-foreground',
                                          },
                                      ]
                                    : []),
                                {
                                    label: formatDate(sub.created_at),
                                    className: 'bg-background/50 border border-border/40 text-muted-foreground',
                                },
                            ]}
                            actions={
                                canDelete && (
                                    <div className='flex items-center gap-3'>
                                        <Button
                                            size='sm'
                                            variant='destructive'
                                            className='h-8 w-8 p-0'
                                            onClick={() => {
                                                setSelectedSubdomain(sub);
                                                setIsDeleteOpen(true);
                                            }}
                                        >
                                            <Trash2 className='h-3.5 w-3.5' />
                                        </Button>
                                    </div>
                                )
                            }
                        />
                    ))}
                </div>
            )}
            <WidgetRenderer widgets={getWidgets('server-subdomains', 'after-subdomains-list')} />

            {/* Delete Modal */}
            <HeadlessModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title={t('serverSubdomains.deleteTitle')}
                description={t('serverSubdomains.deleteDescription', {
                    subdomain: selectedSubdomain ? `${selectedSubdomain.subdomain}.${selectedSubdomain.domain}` : '',
                })}
            >
                <div className='flex justify-end gap-2 pt-4'>
                    <Button variant='outline' onClick={() => setIsDeleteOpen(false)} disabled={deleting}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant='destructive' onClick={handleDelete} disabled={deleting}>
                        {deleting ? (
                            <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                        ) : (
                            <Trash2 className='mr-2 h-4 w-4' />
                        )}
                        {t('common.delete')}
                    </Button>
                </div>
            </HeadlessModal>
            <WidgetRenderer widgets={getWidgets('server-subdomains', 'bottom-of-page')} />
        </div>
    );
}
