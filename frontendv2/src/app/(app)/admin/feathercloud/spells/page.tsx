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
import { EmptyState } from '@/components/featherui/EmptyState';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
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
    Info,
    BadgeCheck,
    Star,
    Download,
    Loader2,
    Trash2,
} from 'lucide-react';
import { StarDisplay, StarRatingInput } from '@/app/(app)/admin/feathercloud/products/_shared';

interface OnlineSpell {
    id?: string | number | null;
    identifier: string;
    name: string;
    description?: string;
    icon?: string | null;
    website?: string | null;
    author?: string | null;
    tags: string[];
    verified: boolean;
    downloads: number;
    average_rating?: number | null;
    review_count?: number | null;
    channel?: string | null;
    category?: string | null;
    latest_version?: {
        version: string;
    };
}

interface EggReview {
    id?: string | number;
    rating?: number;
    comment?: string;
    createdAt?: string;
    created_at?: string;
    user?: { id?: number | string; name?: string; username?: string };
}

function mythicCloudErrorMessage(err: unknown, fallback: string): string {
    if (!axios.isAxiosError(err)) return fallback;
    const code = String(err.response?.data?.error_code || '');
    const message = err.response?.data?.message || fallback;
    switch (code) {
        case 'PANEL_DOWNLOADS_DISABLED':
            return 'This product does not allow MythicalCloud panel downloads.';
        case 'ACCESS_DENIED':
            return 'Access denied for this Mythic marketplace action.';
        case 'INVALID_USER_UUID':
        case 'MEMBER_UUID_REQUIRED':
            return 'Your panel user is not mapped to a Mythic team member. Re-link Cloud Connections with a matching email.';
        default:
            return message;
    }
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
    const [channel, setChannel] = useState<string>('');
    const [sort, setSort] = useState<string>('downloads');
    const [reviewsOpen, setReviewsOpen] = useState(false);
    const [reviewSpell, setReviewSpell] = useState<OnlineSpell | null>(null);
    const [eggReviews, setEggReviews] = useState<EggReview[]>([]);
    const [reviewsMeta, setReviewsMeta] = useState<{ averageRating?: number; reviewCount?: number } | null>(null);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [savingReview, setSavingReview] = useState(false);
    const [downloadingEggId, setDownloadingEggId] = useState<string | null>(null);

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
            if (channel) params.set('channel', channel);
            if (sort) params.set('sort', sort);

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
        [onlineSearch, channel, sort, t],
    );

    const eggIdFor = (spell: OnlineSpell): string => String(spell.id ?? spell.identifier);

    const openReviews = async (spell: OnlineSpell) => {
        setReviewSpell(spell);
        setReviewsOpen(true);
        setReviewsLoading(true);
        setEggReviews([]);
        setReviewsMeta(null);
        setReviewComment('');
        setReviewRating(5);
        try {
            const id = eggIdFor(spell);
            const response = await axios.get(`/api/admin/cloud/data/eggs/${encodeURIComponent(id)}/reviews`);
            // Panel wraps Mythic eggs host payload: { data: Review[], meta: { averageRating, reviewCount } }
            const payload = response.data?.data;
            const list = Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload)
                  ? payload
                  : Array.isArray(payload?.reviews)
                    ? payload.reviews
                    : [];
            setEggReviews(list);
            const meta = payload?.meta ?? {};
            const average = Number(meta.averageRating);
            const reviewCount = Number(meta.reviewCount);
            setReviewsMeta({
                averageRating: Number.isFinite(average) ? average : undefined,
                reviewCount: Number.isFinite(reviewCount) ? reviewCount : undefined,
            });
        } catch (err) {
            toast.error(mythicCloudErrorMessage(err, 'Failed to load reviews'));
        } finally {
            setReviewsLoading(false);
        }
    };

    const submitEggReview = async () => {
        if (!reviewSpell) return;
        setSavingReview(true);
        try {
            await axios.post(`/api/admin/cloud/data/eggs/${encodeURIComponent(eggIdFor(reviewSpell))}/reviews`, {
                rating: reviewRating,
                comment: reviewComment.trim() || undefined,
            });
            toast.success('Review saved');
            await openReviews(reviewSpell);
        } catch (err) {
            toast.error(mythicCloudErrorMessage(err, 'Failed to save review'));
        } finally {
            setSavingReview(false);
        }
    };

    const deleteEggReview = async () => {
        if (!reviewSpell) return;
        setSavingReview(true);
        try {
            await axios.delete(`/api/admin/cloud/data/eggs/${encodeURIComponent(eggIdFor(reviewSpell))}/reviews`);
            toast.success('Review deleted');
            await openReviews(reviewSpell);
        } catch (err) {
            toast.error(mythicCloudErrorMessage(err, 'Failed to delete review'));
        } finally {
            setSavingReview(false);
        }
    };

    const downloadEggJson = async (spell: OnlineSpell) => {
        const id = eggIdFor(spell);
        setDownloadingEggId(id);
        try {
            const response = await axios.get(`/api/admin/cloud/data/eggs/${encodeURIComponent(id)}/download`, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `egg-${id}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success('Egg JSON downloaded');
        } catch (err) {
            toast.error(mythicCloudErrorMessage(err, 'Download failed'));
        } finally {
            setDownloadingEggId(null);
        }
    };

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
                    <div className='flex flex-wrap gap-2'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => router.push('/admin/feathercloud/marketplace')}
                        >
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('admin.marketplace.plugins.back')}
                        </Button>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => void fetchOnlineSpells(1, 'replace')}
                            disabled={onlineLoading}
                        >
                            <RefreshCw className={cn('mr-2 h-4 w-4', onlineLoading && 'animate-spin')} />
                            Refresh
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-spells', 'after-header')} />
            <WidgetRenderer widgets={getWidgets('admin-feathercloud-spells', 'before-content')} />

            <div className='grid gap-3 sm:grid-cols-3'>
                <div className='bg-card/60 rounded-2xl px-4 py-3'>
                    <p className='text-muted-foreground text-xs'>Shown</p>
                    <p className='mt-1 text-sm font-medium'>{onlineSpells.length}</p>
                </div>
                <div className='bg-card/60 rounded-2xl px-4 py-3'>
                    <p className='text-muted-foreground text-xs'>Catalog</p>
                    <p className='mt-1 text-sm font-medium'>{onlinePagination?.total_records ?? '—'}</p>
                </div>
                <div className='bg-card/60 rounded-2xl px-4 py-3'>
                    <p className='text-muted-foreground text-xs'>Installed matches</p>
                    <p className='mt-1 text-sm font-medium'>
                        {onlineSpells.filter((spell) => installedSpellIds.includes(spell.name)).length}
                    </p>
                </div>
            </div>

            <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
                <div className='relative min-w-0 flex-1'>
                    <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                    <Input
                        id='feathercloud-spells-search'
                        placeholder={t('admin.marketplace.spells.search_placeholder')}
                        className='pl-9'
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
                <div className='flex flex-wrap gap-2'>
                    <select
                        className='border-border bg-background h-9 rounded-md border px-3 text-sm'
                        value={channel}
                        onChange={(e) => setChannel(e.target.value)}
                        aria-label='Channel'
                    >
                        <option value=''>All channels</option>
                        <option value='mythicalsystems'>Mythic</option>
                        <option value='pterodactyl'>Pterodactyl</option>
                    </select>
                    <select
                        className='border-border bg-background h-9 rounded-md border px-3 text-sm'
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        aria-label='Sort'
                    >
                        <option value='downloads'>Downloads</option>
                        <option value='rating'>Rating</option>
                        <option value='reviews'>Reviews</option>
                        <option value='newest'>Newest</option>
                        <option value='name'>Name</option>
                    </select>
                    <Button size='sm' onClick={() => runSpellsSearch()} disabled={onlineLoading}>
                        <Search className='mr-2 h-4 w-4' />
                        {t('admin.marketplace.spells.search_button')}
                    </Button>
                </div>
            </div>

            {onlineLoading && onlineSpells.length === 0 ? (
                <div className='text-muted-foreground flex items-center gap-2 py-16 text-sm'>
                    <RefreshCw className='h-4 w-4 animate-spin' /> {t('admin.marketplace.spells.loading')}
                </div>
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
                    icon={Sparkles}
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
                <>
                    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                        {onlineSpells.map((spell) => {
                            const installed = installedSpellIds.includes(spell.name);
                            const busy = installingId === spell.identifier;
                            const avg = Number(spell.average_rating || 0);
                            const reviewCount = Number(spell.review_count || 0);

                            return (
                                <article
                                    key={spell.identifier}
                                    className={cn(
                                        'bg-card/80 ring-border/40 flex flex-col overflow-hidden rounded-2xl shadow-sm ring-1 transition',
                                        'hover:bg-card hover:shadow-md',
                                    )}
                                >
                                    <div className='flex flex-1 flex-col space-y-3 p-4'>
                                        <div className='flex items-start gap-3'>
                                            <div className='bg-muted relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl'>
                                                {spell.icon ? (
                                                    <Image
                                                        src={spell.icon}
                                                        alt=''
                                                        fill
                                                        className='object-cover'
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <Sparkles className='text-muted-foreground h-5 w-5' />
                                                )}
                                            </div>
                                            <div className='min-w-0 flex-1'>
                                                <h3 className='truncate text-sm font-semibold'>{spell.name}</h3>
                                                <p className='text-muted-foreground truncate font-mono text-[11px]'>
                                                    {spell.identifier}
                                                </p>
                                            </div>
                                            <div className='flex shrink-0 flex-col items-end gap-1'>
                                                {installed ? (
                                                    <span className='rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400'>
                                                        {t('admin.marketplace.plugins.installed')}
                                                    </span>
                                                ) : null}
                                                {spell.verified ? (
                                                    <span className='rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400'>
                                                        Verified
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>

                                        <p className='text-muted-foreground line-clamp-2 text-xs leading-relaxed break-words'>
                                            {spell.description || t('admin.marketplace.spells.grid.no_description')}
                                        </p>

                                        <div className='text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-[11px]'>
                                            {spell.author ? (
                                                <span>
                                                    {t('admin.marketplace.common.by_author', {
                                                        author: spell.author,
                                                    })}
                                                </span>
                                            ) : null}
                                            {spell.latest_version?.version ? (
                                                <span>v{spell.latest_version.version}</span>
                                            ) : null}
                                            <span className='inline-flex items-center gap-1'>
                                                <CloudDownload className='h-3 w-3' />
                                                {Number(spell.downloads || 0).toLocaleString()}
                                            </span>
                                            <span className='inline-flex items-center gap-1.5'>
                                                <StarDisplay rating={avg} />
                                                <span>
                                                    {avg > 0 ? avg.toFixed(1) : 'No ratings'}
                                                    {reviewCount > 0 ? ` · ${reviewCount}` : ''}
                                                </span>
                                            </span>
                                            {spell.channel ? <span className='capitalize'>{spell.channel}</span> : null}
                                        </div>

                                        {!spell.verified ? (
                                            <p className='text-[11px] text-amber-700 dark:text-amber-400'>
                                                {t('admin.marketplace.spells.grid.external_source')}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className='flex items-center gap-2 px-4 pb-4'>
                                        <Button
                                            size='sm'
                                            className='flex-1'
                                            disabled={busy}
                                            onClick={() => openInstallDialog(spell)}
                                        >
                                            {busy ? (
                                                <RefreshCw className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                                            ) : (
                                                <CloudDownload className='mr-1.5 h-3.5 w-3.5' />
                                            )}
                                            {t('admin.marketplace.spells.grid.install')}
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            title='Download egg JSON'
                                            disabled={downloadingEggId === eggIdFor(spell)}
                                            onClick={() => void downloadEggJson(spell)}
                                        >
                                            {downloadingEggId === eggIdFor(spell) ? (
                                                <RefreshCw className='h-3.5 w-3.5 animate-spin' />
                                            ) : (
                                                <Download className='h-3.5 w-3.5' />
                                            )}
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            title='Reviews'
                                            onClick={() => void openReviews(spell)}
                                        >
                                            <Star className='h-3.5 w-3.5' />
                                        </Button>
                                        {spell.website ? (
                                            <Button
                                                size='sm'
                                                variant='outline'
                                                onClick={() => window.open(spell.website as string, '_blank')}
                                            >
                                                <Globe className='h-3.5 w-3.5' />
                                            </Button>
                                        ) : null}
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {hasMoreToLoad ? (
                        <div className='flex flex-col items-center gap-2 pt-2'>
                            <Button
                                type='button'
                                variant='outline'
                                loading={loadingMore}
                                disabled={onlineLoading || loadingMore}
                                onClick={loadMoreOnlineSpells}
                            >
                                <CloudDownload className='mr-2 h-4 w-4' />
                                {t('admin.marketplace.spells.load_more')}
                            </Button>
                            {onlinePagination ? (
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.marketplace.spells.load_more_hint', {
                                        page: String(onlinePagination.current_page ?? currentOnlinePage),
                                        pages: String(onlinePagination.total_pages ?? 1),
                                    })}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </>
            )}

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

            <Sheet open={reviewsOpen} onOpenChange={setReviewsOpen}>
                <div className='flex h-full flex-col'>
                    <SheetHeader>
                        <SheetTitle className='flex items-center gap-2'>
                            <Star className='h-4 w-4 fill-amber-400 text-amber-400' />
                            Reviews
                        </SheetTitle>
                        <SheetDescription>
                            {reviewSpell?.name}
                            {reviewSpell ? (
                                <span className='text-muted-foreground ml-1 font-mono text-xs'>
                                    ({eggIdFor(reviewSpell)})
                                </span>
                            ) : null}
                        </SheetDescription>
                    </SheetHeader>

                    <div className='-mr-2 flex-1 space-y-6 overflow-y-auto pr-2'>
                        {(reviewsMeta?.averageRating != null || (reviewsMeta?.reviewCount ?? 0) > 0) && (
                            <div className='bg-muted/25 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3'>
                                <StarDisplay rating={Number(reviewsMeta?.averageRating || 0)} size='md' />
                                <div className='min-w-0'>
                                    <p className='text-sm font-medium'>
                                        {Number(reviewsMeta?.averageRating || 0) > 0
                                            ? Number(reviewsMeta?.averageRating).toFixed(1)
                                            : '—'}{' '}
                                        <span className='text-muted-foreground font-normal'>
                                            · {reviewsMeta?.reviewCount ?? 0} review
                                            {(reviewsMeta?.reviewCount ?? 0) === 1 ? '' : 's'}
                                        </span>
                                    </p>
                                    <p className='text-muted-foreground text-xs'>Community rating on Mythic</p>
                                </div>
                            </div>
                        )}

                        <div className='bg-muted/25 space-y-4 rounded-2xl p-4 sm:p-5'>
                            <div>
                                <p className='text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase'>
                                    Your rating
                                </p>
                                <StarRatingInput
                                    value={reviewRating}
                                    onChange={setReviewRating}
                                    disabled={savingReview}
                                />
                            </div>
                            <div>
                                <p className='text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase'>
                                    Comment
                                </p>
                                <Textarea
                                    rows={3}
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder='Share your experience (5–1000 characters)'
                                    disabled={savingReview}
                                />
                            </div>
                            <div className='flex flex-wrap gap-2'>
                                <Button onClick={() => void submitEggReview()} disabled={savingReview}>
                                    {savingReview ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                                    Save review
                                </Button>
                                <Button
                                    variant='outline'
                                    onClick={() => void deleteEggReview()}
                                    disabled={savingReview}
                                >
                                    <Trash2 className='mr-2 h-4 w-4' />
                                    Delete mine
                                </Button>
                            </div>
                        </div>

                        {reviewsLoading ? (
                            <div className='text-muted-foreground flex items-center gap-2 py-6 text-sm'>
                                <Loader2 className='h-4 w-4 animate-spin' /> Loading reviews…
                            </div>
                        ) : eggReviews.length === 0 ? (
                            <p className='text-muted-foreground text-sm'>No reviews yet. Be the first.</p>
                        ) : (
                            <ul className='space-y-3'>
                                {eggReviews.map((r) => {
                                    const when = r.created_at || r.createdAt;
                                    return (
                                        <li key={String(r.id)} className='bg-muted/20 rounded-xl px-4 py-3 text-sm'>
                                            <div className='flex flex-wrap items-center gap-2'>
                                                <StarDisplay rating={Number(r.rating || 0)} />
                                                <span className='font-medium'>
                                                    {r.user?.username || r.user?.name || 'User'}
                                                </span>
                                                {when ? (
                                                    <span className='text-muted-foreground text-xs'>{when}</span>
                                                ) : null}
                                            </div>
                                            {r.comment ? (
                                                <p className='text-muted-foreground mt-2'>{r.comment}</p>
                                            ) : null}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <SheetFooter className='mt-6'>
                        <Button variant='ghost' onClick={() => setReviewsOpen(false)}>
                            Close
                        </Button>
                    </SheetFooter>
                </div>
            </Sheet>

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-spells', 'bottom-of-page')} />
        </div>
    );
}
