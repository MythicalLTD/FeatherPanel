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

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import axios from 'axios';
import { toast } from 'sonner';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { cn } from '@/lib/utils';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import {
    Sparkles,
    CloudDownload,
    RefreshCw,
    AlertCircle,
    ArrowLeft,
    Globe,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowRight,
    Settings,
    Info,
    BadgeCheck,
} from 'lucide-react';

interface OnlineSpell {
    identifier: string;
    name: string;
    description?: string;
    icon?: string | null;
    website?: string | null;
    author?: string | null;
    tags: string[];
    verified: boolean;
    downloads: number;
    latest_version?: {
        version: string;
    };
}

interface OnlinePagination {
    current_page: number;
    total_pages: number;
    total_records: number;
}

interface Realm {
    id: number;
    name: string;
}

export default function SpellsPage() {
    const { t } = useTranslation();
    const router = useRouter();

    const [onlineSpells, setOnlineSpells] = useState<OnlineSpell[]>([]);
    const [onlineLoading, setOnlineLoading] = useState(false);
    const [onlineError, setOnlineError] = useState<string | null>(null);
    const [onlinePagination, setOnlinePagination] = useState<OnlinePagination | null>(null);
    const [currentOnlinePage, setCurrentOnlinePage] = useState(1);
    const [onlineSearch, setOnlineSearch] = useState('');

    const [confirmInstallOpen, setConfirmInstallOpen] = useState(false);
    const [selectedSpell, setSelectedSpell] = useState<OnlineSpell | null>(null);
    const [selectedRealmId, setSelectedRealmId] = useState<string>('');
    const [installedSpellIds, setInstalledSpellIds] = useState<string[]>([]);
    const [installingId, setInstallingId] = useState<string | null>(null);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-feathercloud-spells');

    const [realms, setRealms] = useState<Realm[]>([]);
    const [realmsLoading, setRealmsLoading] = useState(false);
    const [realmsSearch, setRealmsSearch] = useState('');
    const [realmsPage, setRealmsPage] = useState(1);
    const [realmsPagination, setRealmsPagination] = useState<OnlinePagination | null>(null);

    const fetchRealms = useCallback(async (page = 1, search = '') => {
        setRealmsLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                per_page: '10',
            });
            if (search) params.set('q', search);

            const response = await axios.get(`/api/admin/realms?${params.toString()}`);
            setRealms(response.data?.data?.realms || []);
            setRealmsPagination(response.data?.data?.pagination || null);
        } catch (error) {
            console.error('Failed to fetch realms:', error);
        } finally {
            setRealmsLoading(false);
        }
    }, []);

    const fetchInstalledSpells = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/spells');
            const spells = response.data?.data?.spells || [];

            setInstalledSpellIds(spells.map((s: { name: string }) => s.name));
        } catch (error) {
            console.error('Failed to fetch installed spells:', error);
        }
    }, []);

    const fetchOnlineSpells = useCallback(
        async (page = currentOnlinePage, search = onlineSearch) => {
            setOnlineLoading(true);
            setOnlineError(null);

            const params = new URLSearchParams({
                page: String(page),
                per_page: '20',
            });

            if (search) params.set('q', search);

            try {
                const response = await axios.get(`/api/admin/spells/online/list?${params.toString()}`);
                setOnlineSpells(response.data?.data?.spells || []);
                setOnlinePagination(response.data?.data?.pagination || null);
            } catch (err: unknown) {
                const e = err as { response?: { data?: { message?: string } } };
                setOnlineError(e?.response?.data?.message || t('admin.marketplace.spells.loading_error'));
            } finally {
                setOnlineLoading(false);
            }
        },
        [currentOnlinePage, onlineSearch, t],
    );

    useEffect(() => {
        fetchWidgets();
        fetchOnlineSpells();
        fetchRealms(1, '');
        fetchInstalledSpells();
    }, [fetchOnlineSpells, fetchRealms, fetchInstalledSpells, fetchWidgets]);

    useEffect(() => {
        if (confirmInstallOpen) {
            fetchRealms(realmsPage, realmsSearch);
        }
    }, [realmsPage, realmsSearch, confirmInstallOpen, fetchRealms]);

    const openInstallDialog = (spell: OnlineSpell) => {
        setSelectedSpell(spell);
        setConfirmInstallOpen(true);
    };

    const handleInstall = async () => {
        if (!selectedSpell || !selectedRealmId) {
            toast.error(t('admin.marketplace.spells.select_realm_error'));
            return;
        }

        setInstallingId(selectedSpell.identifier);
        try {
            await axios.post('/api/admin/spells/online/install', {
                identifier: selectedSpell.identifier,
                realm_id: parseInt(selectedRealmId, 10),
            });
            toast.success(`Successfully installed ${selectedSpell.identifier}`);
            fetchInstalledSpells();
            setConfirmInstallOpen(false);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || t('admin.marketplace.spells.install_error'));
        } finally {
            setInstallingId(null);
        }
    };

    const renderPagination = () => {
        if (!onlinePagination || onlinePagination.total_pages <= 1) return null;

        return (
            <div className='flex items-center justify-center gap-2 mt-8'>
                <Button
                    variant='outline'
                    size='icon'
                    disabled={currentOnlinePage === 1}
                    onClick={() => setCurrentOnlinePage((p) => p - 1)}
                >
                    <ChevronLeft className='h-4 w-4' />
                </Button>
                <div className='flex items-center gap-2'>
                    <span className='text-sm font-medium'>
                        {currentOnlinePage} / {onlinePagination.total_pages}
                    </span>
                </div>
                <Button
                    variant='outline'
                    size='icon'
                    disabled={currentOnlinePage === onlinePagination.total_pages}
                    onClick={() => setCurrentOnlinePage((p) => p + 1)}
                >
                    <ChevronRight className='h-4 w-4' />
                </Button>
            </div>
        );
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-feathercloud-spells', 'top-of-page')} />

            <PageHeader
                title={t('admin.marketplace.spells.title')}
                description={t('admin.marketplace.spells.subtitle')}
                icon={Sparkles}
                actions={
                    <Button variant='outline' onClick={() => router.push('/admin/feathercloud/marketplace')}>
                        <ArrowLeft className='h-4 w-4 mr-2' />
                        {t('admin.marketplace.plugins.back')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-spells', 'after-header')} />

            <PageCard
                title={t('admin.marketplace.spells.online_banner.title')}
                icon={Sparkles}
                className='bg-linear-to-r from-indigo-600/10 via-purple-600/10 to-fuchsia-600/10 border-indigo-500/20'
                action={
                    <div className='flex items-center gap-3'>
                        <Button
                            variant='default'
                            size='sm'
                            onClick={() => window.open('https://cloud.mythical.systems', '_blank')}
                        >
                            {t('admin.marketplace.spells.online_banner.action')}
                            <ArrowRight className='h-4 w-4 ml-2' />
                        </Button>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => window.open('https://cloud.mythical.systems', '_blank')}
                        >
                            {t('admin.marketplace.spells.online_banner.learn_more')}
                        </Button>
                    </div>
                }
            >
                <div className='space-y-4'>
                    <p className='text-muted-foreground text-sm max-w-2xl leading-relaxed'>
                        {t('admin.marketplace.spells.online_banner.description')}
                    </p>
                    <div className='text-xs text-primary font-bold tracking-wide uppercase'>
                        {t('admin.marketplace.spells.online_banner.tip')}
                    </div>
                </div>
            </PageCard>

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-spells', 'before-content')} />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/50 backdrop-blur-md p-4 rounded-2xl border border-border shadow-sm'>
                <div className='relative flex-1 group'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.marketplace.spells.search_placeholder')}
                        className='pl-10 h-11'
                        value={onlineSearch}
                        onChange={(e) => setOnlineSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchOnlineSpells(1)}
                    />
                </div>
            </div>

            {onlineLoading ? (
                <EmptyState
                    title={t('admin.marketplace.spells.loading')}
                    description={t('admin.marketplace.spells.loading')}
                    icon={RefreshCw}
                />
            ) : onlineError ? (
                <EmptyState
                    title={t('admin.marketplace.spells.loading_error')}
                    description={onlineError}
                    icon={AlertCircle}
                    action={
                        <Button variant='outline' onClick={() => fetchOnlineSpells()}>
                            <RefreshCw className='h-4 w-4 mr-2' />
                            {t('admin.marketplace.plugins.try_again')}
                        </Button>
                    }
                />
            ) : onlineSpells.length === 0 ? (
                <EmptyState
                    title={t('admin.marketplace.plugins.no_results')}
                    description={t('admin.marketplace.spells.search_placeholder')}
                    icon={Settings}
                />
            ) : (
                <div className='grid grid-cols-1 gap-6'>
                    {onlineSpells.map((spell) => {
                        const IconComponent = ({ className }: { className?: string }) =>
                            spell.icon ? (
                                <div className={cn('relative', className)}>
                                    <Image
                                        src={spell.icon}
                                        alt={spell.name}
                                        fill
                                        className='object-cover rounded-lg'
                                        unoptimized
                                    />
                                </div>
                            ) : (
                                <Settings className={className} />
                            );

                        return (
                            <ResourceCard
                                key={spell.identifier}
                                icon={IconComponent}
                                title={spell.name}
                                subtitle={
                                    spell.author
                                        ? t('admin.marketplace.common.by_author', { author: spell.author })
                                        : undefined
                                }
                                badges={
                                    [
                                        installedSpellIds.includes(spell.name)
                                            ? {
                                                  label: t('admin.marketplace.plugins.installed'),
                                                  className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                                              }
                                            : null,
                                        spell.verified
                                            ? {
                                                  label: t('admin.marketplace.spells.grid.verified'),
                                                  className: 'bg-green-500/10 text-green-600 border-green-500/20',
                                              }
                                            : null,
                                        spell.latest_version?.version
                                            ? {
                                                  label: `v${spell.latest_version.version}`,
                                                  className: 'bg-primary/10 text-primary border-primary/20',
                                              }
                                            : null,
                                    ].filter(Boolean) as ResourceBadge[]
                                }
                                description={
                                    <div className='space-y-4'>
                                        <p className='text-sm text-muted-foreground line-clamp-3 leading-relaxed'>
                                            {spell.description || t('admin.marketplace.spells.grid.no_description')}
                                        </p>
                                        {!spell.verified && (
                                            <div className='text-[10px] text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 flex items-center gap-2'>
                                                <AlertCircle className='h-3 w-3 shrink-0' />
                                                <span>{t('admin.marketplace.spells.grid.unverified_warning')}</span>
                                            </div>
                                        )}
                                        <div className='flex items-center justify-between text-xs text-muted-foreground font-medium pt-2'>
                                            <div className='flex items-center gap-2'>
                                                <CloudDownload className='h-3.5 w-3.5' />
                                                <span>{spell.downloads.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                }
                                actions={
                                    <div className='flex items-center gap-2 w-full'>
                                        <Button
                                            variant='default'
                                            className='flex-1'
                                            disabled={installingId === spell.identifier}
                                            onClick={() => openInstallDialog(spell)}
                                        >
                                            {installingId === spell.identifier ? (
                                                <RefreshCw className='h-4 w-4 animate-spin mr-2' />
                                            ) : (
                                                <CloudDownload className='h-4 w-4 mr-2' />
                                            )}
                                            {t('admin.marketplace.spells.grid.install')}
                                        </Button>
                                        {spell.website && (
                                            <Button
                                                variant='outline'
                                                size='icon'
                                                onClick={() => window.open(spell.website as string, '_blank')}
                                            >
                                                <Globe className='h-4 w-4' />
                                            </Button>
                                        )}
                                    </div>
                                }
                            />
                        );
                    })}
                </div>
            )}

            {renderPagination()}

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10 pb-12'>
                <PageCard title={t('admin.marketplace.spells.help.repo_title')} icon={Globe}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.marketplace.spells.help.repo_desc')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.marketplace.spells.help.install_title')} icon={CloudDownload}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.marketplace.spells.help.install_desc')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.marketplace.spells.help.security_title')} icon={AlertCircle} variant='danger'>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.marketplace.spells.help.security_desc')}
                    </p>
                </PageCard>
            </div>

            <Sheet open={confirmInstallOpen} onOpenChange={setConfirmInstallOpen}>
                <div className='h-full flex flex-col'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.marketplace.spells.dialog.title')}</SheetTitle>
                        <SheetDescription>
                            {selectedSpell?.name} ({selectedSpell?.identifier})
                        </SheetDescription>
                    </SheetHeader>

                    <div className='flex-1 overflow-y-auto pr-2 -mr-2 space-y-6'>
                        {selectedSpell && !selectedSpell.verified && (
                            <div className='rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-4'>
                                <AlertCircle className='h-5 w-5 text-amber-600 shrink-0 mt-0.5' />
                                <div className='space-y-1'>
                                    <p className='text-sm font-bold text-amber-700'>
                                        {t('admin.marketplace.spells.dialog.unverified_warning')}
                                    </p>
                                    <p className='text-xs text-amber-700/80 leading-relaxed font-medium'>
                                        {t('admin.marketplace.spells.dialog.unverified_desc')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {installedSpellIds.includes(selectedSpell?.name || '') && (
                            <div className='rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 flex items-start gap-4'>
                                <Info className='h-5 w-5 text-blue-600 shrink-0 mt-0.5' />
                                <div className='space-y-1'>
                                    <p className='text-sm font-bold text-blue-700'>
                                        {t('admin.marketplace.spells.dialog.already_installed_title')}
                                    </p>
                                    <p className='text-xs text-blue-700/80 leading-relaxed font-medium'>
                                        {t('admin.marketplace.spells.dialog.already_installed_desc')}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className='space-y-6'>
                            <div className='space-y-2'>
                                <label className='text-sm font-semibold text-foreground flex items-center gap-2'>
                                    <Globe className='h-4 w-4 text-primary' />
                                    {t('admin.marketplace.spells.dialog.realm')}
                                </label>
                                <p className='text-xs text-muted-foreground'>
                                    {t('admin.marketplace.spells.dialog.realm_help')}
                                </p>
                            </div>

                            <div className='relative group'>
                                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                                <Input
                                    placeholder={t('common.search')}
                                    value={realmsSearch}
                                    onChange={(e) => {
                                        setRealmsSearch(e.target.value);
                                        setRealmsPage(1);
                                    }}
                                    className='pl-10 h-11'
                                />
                            </div>

                            <div className='space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar'>
                                {realmsLoading ? (
                                    <div className='flex items-center justify-center py-10'>
                                        <RefreshCw className='h-6 w-6 animate-spin text-primary' />
                                    </div>
                                ) : realms.length === 0 ? (
                                    <div className='text-center py-10 text-muted-foreground text-sm'>
                                        {t('common.no_results')}
                                    </div>
                                ) : (
                                    realms.map((realm) => (
                                        <div
                                            key={realm.id}
                                            onClick={() => setSelectedRealmId(String(realm.id))}
                                            className={cn(
                                                'p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group/realm',
                                                selectedRealmId === String(realm.id)
                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                    : 'border-border/50 hover:border-primary/50 bg-muted/30',
                                            )}
                                        >
                                            <span className='font-semibold text-sm'>{realm.name}</span>
                                            {selectedRealmId === String(realm.id) && (
                                                <BadgeCheck className='h-4 w-4 text-primary animate-in zoom-in-50 duration-200' />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {realmsPagination && realmsPagination.total_pages > 1 && (
                                <div className='flex items-center justify-between px-1'>
                                    <span className='text-xs text-muted-foreground font-medium'>
                                        {t('common.pagination.page', {
                                            current: String(realmsPage),
                                            total: String(realmsPagination.total_pages),
                                        })}
                                    </span>
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            variant='outline'
                                            size='icon'
                                            className='h-8 w-8'
                                            disabled={realmsPage === 1}
                                            onClick={() => setRealmsPage((p) => p - 1)}
                                        >
                                            <ChevronLeft className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='outline'
                                            size='icon'
                                            className='h-8 w-8'
                                            disabled={realmsPage === realmsPagination.total_pages}
                                            onClick={() => setRealmsPage((p) => p + 1)}
                                        >
                                            <ChevronRight className='h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <SheetFooter className='mt-8'>
                        <Button
                            variant='ghost'
                            className='flex-1 rounded-xl h-14 font-bold'
                            onClick={() => setConfirmInstallOpen(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            className='flex-2 rounded-xl h-14 font-bold shadow-lg shadow-primary/20'
                            disabled={!selectedRealmId || installingId !== null}
                            onClick={handleInstall}
                        >
                            {installingId ? (
                                <>
                                    <RefreshCw className='h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2' />
                                    {t('admin.marketplace.spells.dialog.installing')}
                                </>
                            ) : (
                                <>
                                    <CloudDownload className='h-4 w-4 mr-2' />
                                    {t('admin.marketplace.spells.dialog.install')}
                                </>
                            )}
                        </Button>
                    </SheetFooter>
                </div>
            </Sheet>

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-spells', 'bottom-of-page')} />
        </div>
    );
}
