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
    CheckSquare,
    Download,
    Info,
    Loader2,
    Package,
    RefreshCw,
    Search,
    Square,
    Star,
    Store,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';
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
                    setCredentialsError(
                        err.response?.data?.message || t('admin.marketplace.plugins.credentials_error'),
                    );
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
                <PageCard
                    title={t('admin.marketplace.plugins.not_linked.title')}
                    description={credentialsError}
                    icon={Package}
                >
                    <Button onClick={() => router.push('/admin/cloud-management')}>
                        {t('admin.marketplace.plugins.not_linked.action')}
                    </Button>
                </PageCard>
            ) : (
                <>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                        <div className='relative min-w-0 flex-1'>
                            <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('admin.marketplace.plugins.search_placeholder')}
                                className='pl-9'
                            />
                        </div>
                        <div className='flex gap-2'>
                            {(['all', 'free', 'paid'] as const).map((key) => (
                                <Button
                                    key={key}
                                    size='sm'
                                    variant={priceFilter === key ? 'default' : 'outline'}
                                    onClick={() => setPriceFilter(key)}
                                >
                                    {priceFilterLabel(key)}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className='flex flex-wrap items-center justify-between gap-3'>
                        <p className='text-muted-foreground text-sm'>
                            <span className='text-foreground font-medium'>{filtered.length}</span>
                            {' / '}
                            <span className='text-foreground font-medium'>{catalog.length}</span>{' '}
                            {t('admin.marketplace.plugins.catalog_suffix')}
                            {updatesAvailable > 0 ? (
                                <>
                                    {' · '}
                                    <span className='font-medium text-amber-600 dark:text-amber-400'>
                                        {t(
                                            updatesAvailable === 1
                                                ? 'admin.marketplace.plugins.updates_available_one'
                                                : 'admin.marketplace.plugins.updates_available_other',
                                            { count: String(updatesAvailable) },
                                        )}
                                    </span>
                                </>
                            ) : null}
                        </p>
                        <div className='flex flex-wrap gap-2'>
                            <Button
                                size='sm'
                                variant='outline'
                                onClick={() => setSelected(new Set(actionableSlugs))}
                                disabled={actionableSlugs.length === 0}
                            >
                                <CheckSquare className='mr-2 h-4 w-4' />
                                {t('admin.marketplace.plugins.select_actionable')}
                            </Button>
                            <Button
                                size='sm'
                                variant='outline'
                                onClick={() => setSelected(new Set())}
                                disabled={!selected.size}
                            >
                                <Square className='mr-2 h-4 w-4' />
                                {t('admin.marketplace.plugins.clear_selection')}
                            </Button>
                            <Button
                                size='sm'
                                onClick={() => void installSelected()}
                                disabled={bulkInstalling || !selected.size}
                            >
                                {bulkInstalling ? (
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                ) : (
                                    <Download className='mr-2 h-4 w-4' />
                                )}
                                {t('admin.marketplace.plugins.apply_selected', { count: String(selected.size) })}
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                            <Loader2 className='h-4 w-4 animate-spin' />{' '}
                            {t('admin.marketplace.plugins.loading_catalog')}
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
                        <div className='grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
                            {filtered.map((item) => {
                                const p = item.product!;
                                const slug = productSlug(p);
                                const identifier = pluginIdentifier(p);
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

                                return (
                                    <article
                                        key={slug}
                                        className={cn(
                                            'bg-card/80 group overflow-hidden rounded-2xl shadow-sm ring-1 ring-transparent transition',
                                            'hover:bg-card hover:shadow-md',
                                            checked ? 'ring-primary/50' : 'ring-border/40',
                                        )}
                                    >
                                        <button
                                            type='button'
                                            className='block w-full text-left'
                                            onClick={() => goDetail(slug)}
                                        >
                                            <div className='bg-muted relative aspect-[16/9] overflow-hidden'>
                                                {banner ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={banner}
                                                        alt=''
                                                        className='h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]'
                                                    />
                                                ) : (
                                                    <div className='flex h-full items-center justify-center'>
                                                        <Package className='text-muted-foreground h-8 w-8' />
                                                    </div>
                                                )}
                                                <span
                                                    className={cn(
                                                        'absolute top-2.5 right-2.5 rounded-md px-2 py-0.5 text-[11px] font-semibold shadow-sm',
                                                        isFree
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-background/90 text-foreground backdrop-blur-sm',
                                                    )}
                                                >
                                                    {priceLabel}
                                                </span>
                                            </div>
                                            <div className='space-y-2.5 p-4'>
                                                <div className='flex items-start gap-2.5'>
                                                    {p.icon_url ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={p.icon_url}
                                                            alt=''
                                                            className='h-9 w-9 shrink-0 rounded-lg object-cover'
                                                        />
                                                    ) : null}
                                                    <div className='min-w-0'>
                                                        <h3 className='truncate text-sm font-semibold'>{p.name}</h3>
                                                        {identifier ? (
                                                            <p className='text-muted-foreground truncate font-mono text-[11px]'>
                                                                {identifier}
                                                            </p>
                                                        ) : null}
                                                        <p className='text-muted-foreground line-clamp-2 text-xs'>
                                                            {p.tagline}
                                                        </p>
                                                        {installed && local?.version ? (
                                                            <p className='text-muted-foreground mt-1 text-[11px]'>
                                                                {latest
                                                                    ? t(
                                                                          'admin.marketplace.plugins.labels.versions_line',
                                                                          {
                                                                              installed: local.version,
                                                                              store: latest,
                                                                          },
                                                                      )
                                                                    : t(
                                                                          'admin.marketplace.plugins.labels.installed_version',
                                                                          {
                                                                              version: local.version,
                                                                          },
                                                                      )}
                                                            </p>
                                                        ) : latest ? (
                                                            <p className='text-muted-foreground mt-1 text-[11px]'>
                                                                {t('admin.marketplace.plugins.labels.latest_version', {
                                                                    version: latest,
                                                                })}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className='flex items-center justify-between gap-2'>
                                                    <div className='text-muted-foreground flex min-w-0 items-center gap-2 text-[11px]'>
                                                        {p.seller?.profile_photo_url ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={p.seller.profile_photo_url}
                                                                alt=''
                                                                className='h-4 w-4 rounded-full'
                                                            />
                                                        ) : null}
                                                        <span className='truncate'>
                                                            {t('admin.marketplace.plugins.labels.by_author', {
                                                                author:
                                                                    p.seller?.name ||
                                                                    t(
                                                                        'admin.marketplace.plugins.labels.default_seller',
                                                                    ),
                                                            })}
                                                        </span>
                                                    </div>
                                                    <div className='flex shrink-0 items-center gap-1'>
                                                        {updateAvailable ? (
                                                            <span className='rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400'>
                                                                {t('admin.marketplace.plugins.labels.update')}
                                                            </span>
                                                        ) : installed ? (
                                                            <span className='rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400'>
                                                                {t('admin.marketplace.plugins.labels.installed')}
                                                            </span>
                                                        ) : null}
                                                        {item.owned ? (
                                                            <span className='rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400'>
                                                                {t('admin.marketplace.plugins.labels.owned')}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className='flex items-center gap-1.5 text-[11px]'>
                                                    <StarDisplay
                                                        rating={avg}
                                                        ariaLabel={t('admin.marketplace.plugins.detail.rating_stars', {
                                                            value: String(avg),
                                                        })}
                                                    />
                                                    <span className='text-muted-foreground'>
                                                        {avg > 0
                                                            ? avg.toFixed(1)
                                                            : t('admin.marketplace.plugins.labels.no_ratings')}
                                                        {reviewCount > 0 ? ` · ${reviewCount}` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                        <div className='flex items-center gap-2 px-4 pb-3.5'>
                                            <Checkbox
                                                checked={checked}
                                                disabled={!actionable || busy}
                                                onCheckedChange={(v) =>
                                                    setSelected((prev) => {
                                                        const next = new Set(prev);
                                                        if (v) next.add(slug);
                                                        else next.delete(slug);
                                                        return next;
                                                    })
                                                }
                                            />
                                            <Button
                                                size='sm'
                                                variant='outline'
                                                className='flex-1'
                                                onClick={() => goDetail(slug)}
                                            >
                                                <Info className='mr-1 h-3.5 w-3.5' />
                                                {t('admin.marketplace.plugins.labels.info')}
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='outline'
                                                onClick={() => goDetail(slug, 'reviews')}
                                                title={t('admin.marketplace.plugins.labels.reviews')}
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
                                                disabled={!actionable || busy}
                                                onClick={() => void installOrUpdate(slug)}
                                                title={
                                                    updateAvailable
                                                        ? t('admin.marketplace.plugins.actions.update_to', {
                                                              version: latest,
                                                          })
                                                        : installed
                                                          ? t('admin.marketplace.plugins.actions.already_up_to_date')
                                                          : t('admin.marketplace.plugins.actions.install')
                                                }
                                            >
                                                {installingSlug === slug ? (
                                                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                                ) : updateAvailable ? (
                                                    <RefreshCw className='h-3.5 w-3.5' />
                                                ) : (
                                                    <Download className='h-3.5 w-3.5' />
                                                )}
                                            </Button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
