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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    ArrowLeft,
    CheckCircle2,
    CheckSquare,
    Link2,
    Download,
    Info,
    Loader2,
    Package,
    RefreshCw,
    Search,
    Star,
    Store,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/featherui/PageHeader';
import { StatusDot } from '@/components/featherui/DataTable';
import { TipCard, TipGrid } from '@/components/featherui/TipCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import {
    FEATHERPANEL_CATEGORY_SLUG,
    type InstalledPluginInfo,
    type StoreItem,
    StarDisplay,
    bannerUrl,
    canInstallItem,
    downloadAndInstall,
    extractInstalledPlugins,
    extractStoreItems,
    formatPrice,
    hasPluginUpdate,
    isFeatherPanelPlugin,
    isPluginInstalled,
    isProductFree,
    mythicCloudErrorMessage,
    parseBlobError,
    pluginIdentifier,
    productSlug,
    resolveInstallVersion,
    resolveInstalledPlugin,
    storeLatestVersion,
} from './_shared';

export default function MythicProductsPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<StoreItem[]>([]);
    const [installedPlugins, setInstalledPlugins] = useState<Map<string, InstalledPluginInfo>>(new Map());
    const [credentialsError, setCredentialsError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [bulkInstalling, setBulkInstalling] = useState(false);
    const [installingSlug, setInstallingSlug] = useState<string | null>(null);

    const loadInstalledPlugins = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/plugins');
            setInstalledPlugins(extractInstalledPlugins(response.data?.data?.plugins));
        } catch {
            setInstalledPlugins(new Map());
        }
    }, []);

    const loadStore = useCallback(async () => {
        setLoading(true);
        setCredentialsError(null);
        try {
            const [storeResponse] = await Promise.all([
                axios.get('/api/admin/cloud/data/store', {
                    params: {
                        page: 1,
                        limit: 100,
                        category: FEATHERPANEL_CATEGORY_SLUG,
                        type: 'product',
                    },
                }),
                loadInstalledPlugins(),
            ]);
            setItems(extractStoreItems(storeResponse.data?.data));
            setSelected(new Set());
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const code = err.response?.data?.error_code;
                if (code === 'CLOUD_CREDENTIALS_NOT_CONFIGURED' || err.response?.status === 503) {
                    setCredentialsError(getApiErrorMessage(err, t, 'admin.marketplace.plugins.credentials_error'));
                    return;
                }
            }
            toast.error(mythicCloudErrorMessage(err, t('admin.marketplace.plugins.loading_error'), t));
        } finally {
            setLoading(false);
        }
    }, [loadInstalledPlugins, t]);

    useEffect(() => {
        void loadStore();
    }, [loadStore]);

    const catalog = useMemo(() => {
        const seen = new Set<string>();
        const list: StoreItem[] = [];
        for (const item of items) {
            if (item.kind === 'bundle') continue;
            if (!isFeatherPanelPlugin(item.product)) continue;
            const slug = productSlug(item.product);
            if (!slug || seen.has(slug)) continue;
            seen.add(slug);
            list.push(item);
        }
        return list;
    }, [items]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return catalog.filter((item) => {
            const p = item.product;
            if (!p) return false;
            const free = isProductFree(p);
            if (priceFilter === 'free' && !free) return false;
            if (priceFilter === 'paid' && free) return false;
            if (!q) return true;
            return `${p.name || ''} ${p.tagline || ''} ${productSlug(p)} ${pluginIdentifier(p)} ${p.seller?.name || ''}`
                .toLowerCase()
                .includes(q);
        });
    }, [catalog, search, priceFilter]);

    const actionableSlugs = useMemo(
        () =>
            filtered
                .filter((item) => {
                    if (!canInstallItem(item)) return false;
                    const installed = isPluginInstalled(item.product, installedPlugins);
                    if (!installed) return true;
                    return hasPluginUpdate(item.product, installedPlugins);
                })
                .map((i) => productSlug(i.product)),
        [filtered, installedPlugins],
    );

    const updatesAvailable = useMemo(
        () => filtered.filter((item) => canInstallItem(item) && hasPluginUpdate(item.product, installedPlugins)).length,
        [filtered, installedPlugins],
    );

    const goDetail = (slug: string, tab?: string) => {
        const q = tab && tab !== 'overview' ? `?tab=${tab}` : '';
        router.push(`/admin/feathercloud/products/${encodeURIComponent(slug)}${q}`);
    };

    const installOrUpdate = async (slug: string) => {
        const item = catalog.find((i) => productSlug(i.product) === slug);
        if (!item || !canInstallItem(item)) {
            toast.error(t('admin.marketplace.plugins.toasts.cannot_install'));
            return;
        }
        const updating = hasPluginUpdate(item.product, installedPlugins);
        const installed = isPluginInstalled(item.product, installedPlugins);
        if (installed && !updating) {
            toast.info(t('admin.marketplace.plugins.toasts.already_up_to_date'));
            return;
        }
        setInstallingSlug(slug);
        try {
            const version = await resolveInstallVersion(slug, item);
            if (!version) {
                toast.error(t('admin.marketplace.plugins.toasts.no_release'));
                return;
            }
            await downloadAndInstall(slug, version);
            toast.success(
                updating
                    ? t('admin.marketplace.plugins.toasts.updated', {
                          name: item.product?.name || slug,
                          version,
                      })
                    : t('admin.marketplace.plugins.toasts.installed', {
                          name: item.product?.name || slug,
                      }),
            );
            await loadInstalledPlugins();
        } catch (err) {
            toast.error(
                await parseBlobError(
                    err,
                    updating
                        ? t('admin.marketplace.plugins.toasts.update_failed')
                        : t('admin.marketplace.plugins.toasts.install_failed'),
                    t,
                ),
            );
        } finally {
            setInstallingSlug(null);
        }
    };

    const installSelected = async () => {
        const slugs = [...selected].filter((s) => actionableSlugs.includes(s));
        if (slugs.length === 0) {
            toast.error(t('admin.marketplace.plugins.toasts.select_actionable'));
            return;
        }
        setBulkInstalling(true);
        let installedCount = 0;
        let updatedCount = 0;
        let fail = 0;
        for (const slug of slugs) {
            try {
                const item = catalog.find((i) => productSlug(i.product) === slug);
                const version = await resolveInstallVersion(slug, item);
                if (!version) {
                    fail += 1;
                    continue;
                }
                const wasUpdate = hasPluginUpdate(item?.product, installedPlugins);
                await downloadAndInstall(slug, version);
                if (wasUpdate) updatedCount += 1;
                else installedCount += 1;
            } catch {
                fail += 1;
            }
        }
        setBulkInstalling(false);
        setSelected(new Set());
        await loadInstalledPlugins();
        if (installedCount) {
            toast.success(
                t(
                    installedCount === 1
                        ? 'admin.marketplace.plugins.toasts.bulk_installed_one'
                        : 'admin.marketplace.plugins.toasts.bulk_installed_other',
                    { count: String(installedCount) },
                ),
            );
        }
        if (updatedCount) {
            toast.success(
                t(
                    updatedCount === 1
                        ? 'admin.marketplace.plugins.toasts.bulk_updated_one'
                        : 'admin.marketplace.plugins.toasts.bulk_updated_other',
                    { count: String(updatedCount) },
                ),
            );
        }
        if (fail) {
            toast.error(
                t(
                    fail === 1
                        ? 'admin.marketplace.plugins.toasts.bulk_failed_one'
                        : 'admin.marketplace.plugins.toasts.bulk_failed_other',
                    { count: String(fail) },
                ),
            );
        }
    };

    const priceFilterLabel = (key: 'all' | 'free' | 'paid') => {
        if (key === 'all') return t('admin.marketplace.plugins.filters.all');
        if (key === 'free') return t('admin.marketplace.plugins.filters.free');
        return t('admin.marketplace.plugins.filters.paid');
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.marketplace.plugins.title')}
                description={t('admin.marketplace.plugins.subtitle')}
                icon={Store}
                actions={
                    <div className='flex flex-wrap gap-2'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => router.push('/admin/feathercloud/marketplace')}
                        >
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('admin.marketplace.plugins.marketplace')}
                        </Button>
                        <Button variant='outline' size='sm' onClick={() => void loadStore()} disabled={loading}>
                            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                            {t('admin.marketplace.plugins.refresh')}
                        </Button>
                    </div>
                }
            />

            {credentialsError ? (
                <section className='fp-surface flex flex-col items-center gap-4 rounded-2xl border px-6 py-12 text-center'>
                    <div className='fp-icon-tile flex h-12 w-12 items-center justify-center rounded-xl'>
                        <Link2 className='h-6 w-6' />
                    </div>
                    <div className='max-w-md space-y-1'>
                        <h2 className='text-lg font-semibold'>{t('admin.marketplace.plugins.not_linked.title')}</h2>
                        <p className='text-muted-foreground text-sm'>{credentialsError}</p>
                    </div>
                    <Button onClick={() => router.push('/admin/cloud-management')}>
                        {t('admin.marketplace.plugins.not_linked.action')}
                    </Button>
                </section>
            ) : (
                <>
                    <div className='fp-surface flex flex-col gap-2 rounded-xl border p-2 lg:flex-row lg:items-center'>
                        <div className='relative min-w-0 flex-1'>
                            <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('admin.marketplace.plugins.search_placeholder')}
                                className='border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0'
                            />
                        </div>
                        <div className='flex flex-wrap items-center gap-2 px-1'>
                            <div className='fp-surface-inset inline-flex rounded-lg border p-0.5'>
                                {(['all', 'free', 'paid'] as const).map((key) => (
                                    <button
                                        key={key}
                                        type='button'
                                        onClick={() => setPriceFilter(key)}
                                        className={cn(
                                            'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                                            priceFilter === key
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {priceFilterLabel(key)}
                                    </button>
                                ))}
                            </div>
                            <span className='text-muted-foreground px-1 text-xs whitespace-nowrap'>
                                {t('admin.marketplace.plugins.count_of', {
                                    shown: String(filtered.length),
                                    total: String(catalog.length),
                                })}
                            </span>
                            {updatesAvailable > 0 ? (
                                <StatusDot tone='warning'>
                                    {t(
                                        updatesAvailable === 1
                                            ? 'admin.marketplace.plugins.updates_available_one'
                                            : 'admin.marketplace.plugins.updates_available_other',
                                        { count: String(updatesAvailable) },
                                    )}
                                </StatusDot>
                            ) : null}
                            <Button
                                size='sm'
                                variant='ghost'
                                onClick={() => setSelected(new Set(actionableSlugs))}
                                disabled={actionableSlugs.length === 0}
                            >
                                <CheckSquare className='mr-2 h-4 w-4' />
                                {t('admin.marketplace.plugins.select_actionable')}
                            </Button>
                        </div>
                    </div>

                    {selected.size > 0 ? (
                        <div className='fp-surface border-primary/30 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5'>
                            <p className='text-sm'>
                                {t('admin.marketplace.plugins.selected_count', { count: String(selected.size) })}
                            </p>
                            <div className='flex gap-2'>
                                <Button size='sm' variant='ghost' onClick={() => setSelected(new Set())}>
                                    {t('admin.marketplace.plugins.clear_selection')}
                                </Button>
                                <Button size='sm' onClick={() => void installSelected()} disabled={bulkInstalling}>
                                    {bulkInstalling ? (
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    ) : (
                                        <Download className='mr-2 h-4 w-4' />
                                    )}
                                    {t('admin.marketplace.plugins.apply_selected', { count: String(selected.size) })}
                                </Button>
                            </div>
                        </div>
                    ) : null}

                    {loading ? (
                        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' aria-busy='true'>
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className='fp-surface h-80 animate-pulse rounded-2xl border' />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <EmptyState
                            title={t('admin.marketplace.plugins.empty.title')}
                            description={
                                catalog.length === 0
                                    ? t('admin.marketplace.plugins.empty.no_products')
                                    : t('admin.marketplace.plugins.empty.no_match')
                            }
                            icon={Store}
                        />
                    ) : (
                        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
                            {filtered.map((item) => {
                                const p = item.product!;
                                const slug = productSlug(p);
                                const banner = bannerUrl(p);
                                const installable = canInstallItem(item);
                                const local = resolveInstalledPlugin(p, installedPlugins);
                                const installed = local !== null;
                                const updateAvailable = hasPluginUpdate(p, installedPlugins);
                                const latest = storeLatestVersion(p);
                                const actionable = installable && (!installed || updateAvailable);
                                const busy = installingSlug === slug || bulkInstalling;
                                const priceLabel = formatPrice(p, {
                                    free: t('admin.marketplace.plugins.labels.free'),
                                    empty: t('admin.marketplace.plugins.labels.empty_price'),
                                });
                                const isFree = isProductFree(p);
                                const checked = selected.has(slug);
                                const avg = Number(p.average_rating || 0);
                                const reviewCount = Number(p.review_count || 0);
                                const initial = (p.name || slug || '?').trim().charAt(0).toUpperCase();

                                return (
                                    <article
                                        key={slug}
                                        className={cn(
                                            'fp-surface group flex flex-col overflow-hidden rounded-2xl border transition-colors',
                                            'hover:border-primary/30',
                                            checked && 'border-primary/50',
                                        )}
                                    >
                                        <div className='relative'>
                                            <button
                                                type='button'
                                                className='block w-full text-left'
                                                onClick={() => goDetail(slug)}
                                                aria-label={p.name}
                                            >
                                                <div className='fp-surface-inset relative aspect-[16/9] overflow-hidden border-b'>
                                                    {banner ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={banner}
                                                            alt=''
                                                            className='h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]'
                                                        />
                                                    ) : (
                                                        <div className='from-primary/10 flex h-full items-center justify-center bg-linear-to-br to-transparent'>
                                                            <span className='text-primary/70 text-4xl font-semibold'>
                                                                {initial}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                            <span
                                                className={cn(
                                                    'absolute top-2.5 right-2.5 rounded-md border px-2 py-0.5 text-xs font-medium backdrop-blur-md',
                                                    isFree
                                                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                                                        : 'border-white/10 bg-black/50 text-white',
                                                )}
                                            >
                                                {priceLabel}
                                            </span>
                                            {actionable ? (
                                                <div className='absolute top-2.5 left-2.5 rounded-md border border-white/10 bg-black/50 p-1 backdrop-blur-md'>
                                                    <Checkbox
                                                        checked={checked}
                                                        disabled={busy}
                                                        aria-label={t('admin.marketplace.plugins.select_one')}
                                                        onCheckedChange={(v) =>
                                                            setSelected((prev) => {
                                                                const next = new Set(prev);
                                                                if (v) next.add(slug);
                                                                else next.delete(slug);
                                                                return next;
                                                            })
                                                        }
                                                    />
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className='flex flex-1 flex-col gap-3 p-4'>
                                            <div className='flex items-start gap-3'>
                                                {p.icon_url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={p.icon_url}
                                                        alt=''
                                                        className='h-10 w-10 shrink-0 rounded-lg object-cover'
                                                    />
                                                ) : (
                                                    <div className='fp-icon-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
                                                        <Package className='h-5 w-5' />
                                                    </div>
                                                )}
                                                <div className='min-w-0'>
                                                    <h3 className='truncate font-semibold'>{p.name}</h3>
                                                    <p className='text-muted-foreground truncate text-xs'>
                                                        {t('admin.marketplace.plugins.labels.by_author', {
                                                            author:
                                                                p.seller?.name ||
                                                                t('admin.marketplace.plugins.labels.default_seller'),
                                                        })}
                                                    </p>
                                                </div>
                                            </div>

                                            <p className='text-muted-foreground line-clamp-2 min-h-10 text-sm'>
                                                {p.tagline}
                                            </p>

                                            <div className='mt-auto flex flex-wrap items-center justify-between gap-2 text-xs'>
                                                <span className='inline-flex items-center gap-1.5'>
                                                    <StarDisplay
                                                        rating={avg}
                                                        ariaLabel={t('admin.marketplace.plugins.detail.rating_stars', {
                                                            value: String(avg),
                                                        })}
                                                    />
                                                    <span className='text-muted-foreground'>
                                                        {avg > 0
                                                            ? `${avg.toFixed(1)}${reviewCount > 0 ? ` (${reviewCount})` : ''}`
                                                            : t('admin.marketplace.plugins.labels.no_ratings')}
                                                    </span>
                                                </span>
                                                {installed && local?.version ? (
                                                    <span className='text-muted-foreground font-mono'>
                                                        v{local.version}
                                                        {updateAvailable && latest ? ` > v${latest}` : ''}
                                                    </span>
                                                ) : latest ? (
                                                    <span className='text-muted-foreground font-mono'>v{latest}</span>
                                                ) : null}
                                            </div>

                                            <div className='flex flex-wrap gap-x-3 gap-y-1'>
                                                {updateAvailable ? (
                                                    <StatusDot tone='warning'>
                                                        {t('admin.marketplace.plugins.labels.update')}
                                                    </StatusDot>
                                                ) : installed ? (
                                                    <StatusDot tone='success'>
                                                        {t('admin.marketplace.plugins.labels.installed')}
                                                    </StatusDot>
                                                ) : (
                                                    <StatusDot tone='muted'>
                                                        {t('admin.marketplace.plugins.labels.not_installed')}
                                                    </StatusDot>
                                                )}
                                                {item.owned ? (
                                                    <StatusDot tone='success'>
                                                        {t('admin.marketplace.plugins.labels.owned')}
                                                    </StatusDot>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className='flex items-center gap-2 border-t px-4 py-3'>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                className='flex-1'
                                                onClick={() => goDetail(slug)}
                                            >
                                                <Info className='mr-1.5 h-3.5 w-3.5' />
                                                {t('admin.marketplace.plugins.labels.info')}
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                onClick={() => goDetail(slug, 'reviews')}
                                                title={t('admin.marketplace.plugins.labels.reviews')}
                                                aria-label={t('admin.marketplace.plugins.labels.reviews')}
                                            >
                                                <Star
                                                    className={cn(
                                                        'h-3.5 w-3.5',
                                                        avg > 0
                                                            ? 'fill-amber-400 text-amber-400'
                                                            : 'text-muted-foreground',
                                                    )}
                                                />
                                            </Button>
                                            <Button
                                                size='sm'
                                                className='flex-1'
                                                variant={actionable ? 'default' : 'outline'}
                                                disabled={!actionable || busy}
                                                onClick={() => void installOrUpdate(slug)}
                                            >
                                                {installingSlug === slug ? (
                                                    <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                                                ) : updateAvailable ? (
                                                    <RefreshCw className='mr-1.5 h-3.5 w-3.5' />
                                                ) : installed ? (
                                                    <CheckCircle2 className='mr-1.5 h-3.5 w-3.5' />
                                                ) : (
                                                    <Download className='mr-1.5 h-3.5 w-3.5' />
                                                )}
                                                {updateAvailable
                                                    ? t('admin.marketplace.plugins.actions.update')
                                                    : installed
                                                      ? t('admin.marketplace.plugins.labels.installed')
                                                      : t('admin.marketplace.plugins.actions.install')}
                                            </Button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    <TipGrid>
                        <TipCard title={t('admin.marketplace.plugins.tips.install_title')}>
                            <p>{t('admin.marketplace.plugins.tips.install_body')}</p>
                        </TipCard>
                        <TipCard title={t('admin.marketplace.plugins.tips.updates_title')}>
                            <p>{t('admin.marketplace.plugins.tips.updates_body')}</p>
                        </TipCard>
                        <TipCard title={t('admin.marketplace.plugins.tips.trust_title')} variant='warning'>
                            <p>{t('admin.marketplace.plugins.tips.trust_body')}</p>
                        </TipCard>
                    </TipGrid>
                </>
            )}
        </div>
    );
}
