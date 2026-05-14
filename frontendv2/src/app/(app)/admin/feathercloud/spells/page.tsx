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
import { Textarea } from '@/components/featherui/Textarea';
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
    Package,
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
    has_next?: boolean;
    has_prev?: boolean;
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
    const [loadingMore, setLoadingMore] = useState(false);

    const [confirmInstallOpen, setConfirmInstallOpen] = useState(false);
    const [selectedSpell, setSelectedSpell] = useState<OnlineSpell | null>(null);
    const [selectedRealmId, setSelectedRealmId] = useState<string>('');
    const [realmInstallMode, setRealmInstallMode] = useState<'existing' | 'new'>('existing');
    const [newRealmName, setNewRealmName] = useState('');
    const [newRealmDescription, setNewRealmDescription] = useState('');
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
            const response = await axios.get('/api/admin/realms', {
                params: {
                    page,
                    limit: 10,
                    ...(search ? { search } : {}),
                },
            });
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
        async (page: number, mode: 'replace' | 'append' = 'replace') => {
            if (mode === 'append') {
                setLoadingMore(true);
            } else {
                setOnlineLoading(true);
            }
            setOnlineError(null);

            const params = new URLSearchParams({
                page: String(page),
                per_page: '20',
            });

            const q = onlineSearch.trim();
            if (q) params.set('q', q);

            try {
                const response = await axios.get(`/api/admin/spells/online/list?${params.toString()}`);
                const spells: OnlineSpell[] = response.data?.data?.spells || [];
                const pagination = response.data?.data?.pagination || null;

                if (mode === 'append') {
                    setOnlineSpells((prev) => {
                        const seen = new Set(prev.map((s) => s.identifier));
                        const merged = [...prev];
                        for (const s of spells) {
                            if (!seen.has(s.identifier)) {
                                seen.add(s.identifier);
                                merged.push(s);
                            }
                        }
                        return merged;
                    });
                } else {
                    setOnlineSpells(spells);
                }
                setOnlinePagination(pagination);
                setCurrentOnlinePage(page);
            } catch (err: unknown) {
                const e = err as { response?: { data?: { message?: string } } };
                setOnlineError(e?.response?.data?.message || t('admin.marketplace.spells.loading_error'));
            } finally {
                if (mode === 'append') {
                    setLoadingMore(false);
                } else {
                    setOnlineLoading(false);
                }
            }
        },
        [onlineSearch, t],
    );

    const loadMoreOnlineSpells = useCallback(() => {
        if (loadingMore || onlineLoading) return;
        void fetchOnlineSpells(currentOnlinePage + 1, 'append');
    }, [currentOnlinePage, fetchOnlineSpells, loadingMore, onlineLoading]);

    const hasMoreToLoad =
        onlineSpells.length > 0 &&
        (onlinePagination?.has_next === true || currentOnlinePage < (onlinePagination?.total_pages ?? 1));

    const runSpellsSearch = useCallback(() => {
        void fetchOnlineSpells(1, 'replace');
    }, [fetchOnlineSpells]);

    useEffect(() => {
        fetchWidgets();
        void fetchOnlineSpells(1, 'replace');
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
        setRealmInstallMode('existing');
        setSelectedRealmId('');
        setNewRealmName('');
        setNewRealmDescription('');
        setRealmsPage(1);
        setRealmsSearch('');
        setConfirmInstallOpen(true);
    };

    const handleInstall = async () => {
        if (!selectedSpell) return;

        if (realmInstallMode === 'existing' && !selectedRealmId) {
            toast.error(t('admin.marketplace.spells.select_realm_error'));
            return;
        }

        const trimmedNewName = newRealmName.trim();
        if (realmInstallMode === 'new' && trimmedNewName.length < 2) {
            toast.error(t('admin.marketplace.spells.dialog.new_realm_name_error'));
            return;
        }

        setInstallingId(selectedSpell.identifier);
        try {
            let realmId: number;
            if (realmInstallMode === 'new') {
                const createRes = await axios.put('/api/admin/realms', {
                    name: trimmedNewName,
                    description: newRealmDescription.trim() || undefined,
                });
                const created = createRes.data?.data?.realm as { id?: number } | undefined;
                if (!created?.id) {
                    toast.error(t('admin.marketplace.spells.dialog.create_realm_failed'));
                    return;
                }
                realmId = created.id;
                void fetchRealms(1, '');
            } else {
                realmId = parseInt(selectedRealmId, 10);
            }

            await axios.post('/api/admin/spells/online/install', {
                identifier: selectedSpell.identifier,
                realm_id: realmId,
            });
            toast.success(t('admin.marketplace.spells.install_success', { identifier: selectedSpell.identifier }));
            fetchInstalledSpells();
            setConfirmInstallOpen(false);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || t('admin.marketplace.spells.install_error'));
        } finally {
            setInstallingId(null);
        }
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
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        {t('admin.marketplace.plugins.back')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-spells', 'after-header')} />

            <PageCard
                title={t('admin.marketplace.spells.pterodactyl_banner.title')}
                icon={Sparkles}
                className='border-indigo-500/20 bg-linear-to-r from-indigo-600/10 via-purple-600/10 to-fuchsia-600/10'
                action={
                    <Button
                        variant='default'
                        size='sm'
                        onClick={() => window.open('https://eggs.pterodactyl.io/', '_blank')}
                    >
                        {t('admin.marketplace.spells.pterodactyl_banner.view_github')}
                        <ArrowRight className='ml-2 h-4 w-4' />
                    </Button>
                }
            >
                <div className='space-y-4'>
                    <p className='text-muted-foreground max-w-2xl text-sm leading-relaxed'>
                        {t('admin.marketplace.spells.pterodactyl_banner.description')}
                    </p>
                    <div className='text-primary text-xs font-bold tracking-wide uppercase'>
                        {t('admin.marketplace.spells.pterodactyl_banner.powered_by')}
                    </div>
                </div>
            </PageCard>

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-spells', 'before-content')} />

            <PageCard title={t('admin.marketplace.spells.search_section_title')} icon={Search}>
                <div className='space-y-4'>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.marketplace.spells.search_helper')}
                    </p>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-stretch'>
                        <div className='group relative min-w-0 flex-1'>
                            <Search className='text-muted-foreground group-focus-within:text-primary pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                            <Input
                                id='feathercloud-spells-search'
                                placeholder={t('admin.marketplace.spells.search_placeholder')}
                                className='h-11 pl-10'
                                value={onlineSearch}
                                onChange={(e) => setOnlineSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        runSpellsSearch();
                                    }
                                }}
                                autoComplete='off'
                            />
                        </div>
                        <Button
                            type='button'
                            variant='default'
                            className='h-11 shrink-0 px-6 sm:min-w-[120px]'
                            onClick={() => runSpellsSearch()}
                        >
                            <Search className='mr-2 h-4 w-4' />
                            {t('admin.marketplace.spells.search_button')}
                        </Button>
                    </div>
                </div>
            </PageCard>

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
                        <Button variant='outline' onClick={() => void fetchOnlineSpells(1, 'replace')}>
                            <RefreshCw className='mr-2 h-4 w-4' />
                            {t('admin.marketplace.plugins.try_again')}
                        </Button>
                    }
                />
            ) : onlineSpells.length === 0 ? (
                <EmptyState
                    title={t('admin.marketplace.plugins.no_results')}
                    description={t('admin.marketplace.spells.search_placeholder')}
                    icon={Settings}
                    action={
                        <Button
                            variant='outline'
                            onClick={() => {
                                setOnlineSearch('');
                                void fetchOnlineSpells(1, 'replace');
                            }}
                        >
                            {t('admin.marketplace.plugins.clear_search')}
                        </Button>
                    }
                />
            ) : (
                <PageCard
                    id='spells-online-list'
                    title={t('admin.marketplace.spells.online_list_heading')}
                    icon={Package}
                    action={
                        onlinePagination && onlinePagination.total_records > 0 ? (
                            <p className='text-muted-foreground max-w-40 truncate text-right text-[10px] font-semibold tracking-wide sm:max-w-none sm:text-xs'>
                                {t('admin.marketplace.spells.online_list_count', {
                                    shown: String(onlineSpells.length),
                                    total: String(onlinePagination.total_records),
                                })}
                            </p>
                        ) : undefined
                    }
                >
                    <div className='grid grid-cols-1 gap-6'>
                        {onlineSpells.map((spell) => {
                            const IconComponent = ({ className }: { className?: string }) =>
                                spell.icon ? (
                                    <div className={cn('relative', className)}>
                                        <Image
                                            src={spell.icon}
                                            alt={spell.name}
                                            fill
                                            className='rounded-lg object-cover'
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
                                                      label: t('admin.marketplace.spells.grid.pterodactyl_verified'),
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
                                            <p className='text-muted-foreground line-clamp-3 text-sm leading-relaxed'>
                                                {spell.description || t('admin.marketplace.spells.grid.no_description')}
                                            </p>
                                            {!spell.verified && (
                                                <div className='flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-[10px] text-amber-700'>
                                                    <AlertCircle className='h-3 w-3 shrink-0' />
                                                    <span>{t('admin.marketplace.spells.grid.external_source')}</span>
                                                </div>
                                            )}
                                            <div className='text-muted-foreground flex items-center justify-between pt-2 text-xs font-medium'>
                                                <div className='flex items-center gap-2'>
                                                    <CloudDownload className='h-3.5 w-3.5' />
                                                    <span>{spell.downloads.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    }
                                    actions={
                                        <div className='flex w-full items-center gap-2'>
                                            <Button
                                                variant='default'
                                                className='flex-1'
                                                disabled={installingId === spell.identifier}
                                                onClick={() => openInstallDialog(spell)}
                                            >
                                                {installingId === spell.identifier ? (
                                                    <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                                ) : (
                                                    <CloudDownload className='mr-2 h-4 w-4' />
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
                    {hasMoreToLoad && (
                        <div className='border-border flex flex-col items-center gap-2 border-t pt-4'>
                            <Button
                                type='button'
                                variant='outline'
                                className='h-11 min-w-[220px] px-6'
                                loading={loadingMore}
                                disabled={onlineLoading || loadingMore}
                                onClick={loadMoreOnlineSpells}
                            >
                                <CloudDownload className='mr-2 h-4 w-4' />
                                {t('admin.marketplace.spells.load_more')}
                            </Button>
                            {onlinePagination && (
                                <p className='text-muted-foreground text-center text-xs'>
                                    {t('admin.marketplace.spells.load_more_hint', {
                                        page: String(onlinePagination.current_page ?? currentOnlinePage),
                                        pages: String(onlinePagination.total_pages ?? 1),
                                    })}
                                </p>
                            )}
                        </div>
                    )}
                </PageCard>
            )}

            <div className='grid grid-cols-1 gap-6 pt-10 pb-12 md:grid-cols-2 lg:grid-cols-3'>
                <PageCard title={t('admin.marketplace.spells.help.official_repo_title')} icon={Globe}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.marketplace.spells.help.official_repo_desc')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.marketplace.spells.help.easy_install_title')} icon={CloudDownload}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.marketplace.spells.help.easy_install_desc')}
                    </p>
                </PageCard>
                <PageCard
                    title={t('admin.marketplace.spells.help.community_title')}
                    icon={BadgeCheck}
                    variant='default'
                >
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.marketplace.spells.help.community_desc')}
                    </p>
                </PageCard>
            </div>

            <Sheet open={confirmInstallOpen} onOpenChange={setConfirmInstallOpen}>
                <div className='flex h-full flex-col'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.marketplace.spells.dialog.title')}</SheetTitle>
                        <SheetDescription>
                            {selectedSpell?.name} ({selectedSpell?.identifier})
                        </SheetDescription>
                    </SheetHeader>

                    <div className='-mr-2 flex-1 space-y-6 overflow-y-auto pr-2'>
                        {selectedSpell && !selectedSpell.verified && (
                            <div className='flex items-start gap-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5'>
                                <Info className='mt-0.5 h-5 w-5 shrink-0 text-blue-600' />
                                <div className='space-y-1'>
                                    <p className='text-sm font-bold text-blue-700'>
                                        {t('admin.marketplace.spells.dialog.community_egg_title')}
                                    </p>
                                    <p className='text-xs leading-relaxed font-medium text-blue-700/80'>
                                        {t('admin.marketplace.spells.dialog.community_egg_desc')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {installedSpellIds.includes(selectedSpell?.name || '') && (
                            <div className='flex items-start gap-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5'>
                                <Info className='mt-0.5 h-5 w-5 shrink-0 text-blue-600' />
                                <div className='space-y-1'>
                                    <p className='text-sm font-bold text-blue-700'>
                                        {t('admin.marketplace.spells.dialog.already_installed_title')}
                                    </p>
                                    <p className='text-xs leading-relaxed font-medium text-blue-700/80'>
                                        {t('admin.marketplace.spells.dialog.already_installed_desc')}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className='space-y-6'>
                            <div className='space-y-2'>
                                <label className='text-foreground flex items-center gap-2 text-sm font-semibold'>
                                    <Globe className='text-primary h-4 w-4' />
                                    {t('admin.marketplace.spells.dialog.realm')}
                                </label>
                                <p className='text-muted-foreground text-xs'>
                                    {realmInstallMode === 'existing'
                                        ? t('admin.marketplace.spells.dialog.realm_help')
                                        : t('admin.marketplace.spells.dialog.new_realm_help')}
                                </p>
                            </div>

                            <div className='flex flex-col gap-2 sm:flex-row'>
                                <Button
                                    type='button'
                                    variant={realmInstallMode === 'existing' ? 'default' : 'outline'}
                                    className='h-11 flex-1 rounded-xl font-semibold'
                                    onClick={() => {
                                        setRealmInstallMode('existing');
                                    }}
                                >
                                    {t('admin.marketplace.spells.dialog.realm_mode_existing')}
                                </Button>
                                <Button
                                    type='button'
                                    variant={realmInstallMode === 'new' ? 'default' : 'outline'}
                                    className='h-11 flex-1 rounded-xl font-semibold'
                                    onClick={() => {
                                        setRealmInstallMode('new');
                                        setSelectedRealmId('');
                                        setNewRealmName((selectedSpell?.name ?? '').slice(0, 255));
                                    }}
                                >
                                    {t('admin.marketplace.spells.dialog.realm_mode_new')}
                                </Button>
                            </div>

                            {realmInstallMode === 'new' ? (
                                <div className='space-y-4'>
                                    <div className='space-y-2'>
                                        <label className='text-muted-foreground text-xs font-bold tracking-wide uppercase'>
                                            {t('admin.marketplace.spells.dialog.new_realm_name')}
                                        </label>
                                        <Input
                                            value={newRealmName}
                                            onChange={(e) => setNewRealmName(e.target.value)}
                                            placeholder={t(
                                                'admin.marketplace.spells.dialog.new_realm_name_placeholder',
                                            )}
                                            className='h-11 rounded-xl'
                                            maxLength={255}
                                        />
                                    </div>
                                    <div className='space-y-2'>
                                        <label className='text-muted-foreground text-xs font-bold tracking-wide uppercase'>
                                            {t('admin.marketplace.spells.dialog.new_realm_description')}
                                        </label>
                                        <Textarea
                                            value={newRealmDescription}
                                            onChange={(e) => setNewRealmDescription(e.target.value)}
                                            className='min-h-[88px] resize-y rounded-xl'
                                            maxLength={65535}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className='group relative'>
                                        <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                                        <Input
                                            placeholder={t('common.search')}
                                            value={realmsSearch}
                                            onChange={(e) => {
                                                setRealmsSearch(e.target.value);
                                                setRealmsPage(1);
                                            }}
                                            className='h-11 pl-10'
                                        />
                                    </div>

                                    {realmsPagination && realmsPagination.total_pages > 1 && (
                                        <div className='border-border bg-muted/30 flex items-center justify-between gap-2 rounded-lg border px-3 py-2'>
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                disabled={realmsPage === 1}
                                                onClick={() => setRealmsPage((p) => p - 1)}
                                                className='h-8 gap-1'
                                            >
                                                <ChevronLeft className='h-3 w-3' />
                                                {t('common.previous')}
                                            </Button>
                                            <span className='text-xs font-medium'>
                                                {realmsPage} / {realmsPagination.total_pages}
                                            </span>
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                disabled={realmsPage === realmsPagination.total_pages}
                                                onClick={() => setRealmsPage((p) => p + 1)}
                                                className='h-8 gap-1'
                                            >
                                                {t('common.next')}
                                                <ChevronRight className='h-3 w-3' />
                                            </Button>
                                        </div>
                                    )}

                                    <div className='custom-scrollbar max-h-[300px] space-y-2 overflow-y-auto pr-2'>
                                        {realmsLoading ? (
                                            <div className='flex items-center justify-center py-10'>
                                                <RefreshCw className='text-primary h-6 w-6 animate-spin' />
                                            </div>
                                        ) : realms.length === 0 ? (
                                            <div className='text-muted-foreground space-y-3 py-10 text-center text-sm'>
                                                <p>{t('common.no_results')}</p>
                                                <Button
                                                    type='button'
                                                    variant='outline'
                                                    size='sm'
                                                    className='rounded-lg'
                                                    onClick={() => {
                                                        setRealmInstallMode('new');
                                                        setSelectedRealmId('');
                                                        setNewRealmName((selectedSpell?.name ?? '').slice(0, 255));
                                                    }}
                                                >
                                                    {t('admin.marketplace.spells.dialog.realm_mode_new')}
                                                </Button>
                                            </div>
                                        ) : (
                                            realms.map((realm) => (
                                                <div
                                                    key={realm.id}
                                                    onClick={() => setSelectedRealmId(String(realm.id))}
                                                    className={cn(
                                                        'group/realm flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all',
                                                        selectedRealmId === String(realm.id)
                                                            ? 'border-primary bg-primary/5 ring-primary ring-1'
                                                            : 'border-border/50 hover:border-primary/50 bg-muted/30',
                                                    )}
                                                >
                                                    <span className='text-sm font-semibold'>{realm.name}</span>
                                                    {selectedRealmId === String(realm.id) && (
                                                        <BadgeCheck className='text-primary animate-in zoom-in-50 h-4 w-4 duration-200' />
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {realmsPagination && realmsPagination.total_pages > 1 && (
                                        <div className='flex items-center justify-between px-1'>
                                            <span className='text-muted-foreground text-xs font-medium'>
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
                                </>
                            )}
                        </div>
                    </div>

                    <SheetFooter className='mt-8'>
                        <Button
                            variant='ghost'
                            className='h-14 flex-1 rounded-xl font-bold'
                            onClick={() => setConfirmInstallOpen(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            className='h-14 flex-2 rounded-xl font-bold'
                            disabled={
                                installingId !== null ||
                                (realmInstallMode === 'existing' && !selectedRealmId) ||
                                (realmInstallMode === 'new' && newRealmName.trim().length < 2)
                            }
                            onClick={handleInstall}
                        >
                            {installingId ? (
                                <>
                                    <RefreshCw className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white' />
                                    {t('admin.marketplace.spells.dialog.installing')}
                                </>
                            ) : (
                                <>
                                    <CloudDownload className='mr-2 h-4 w-4' />
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
