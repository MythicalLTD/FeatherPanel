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

import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Download, Loader2, MessageCircle, Package, RefreshCw, Star } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Textarea } from '@/components/featherui/Textarea';
import { cn } from '@/lib/utils';
import {
    type DetailMeta,
    type DetailTab,
    type InstalledPluginInfo,
    type StoreItem,
    MarkdownBody,
    StarDisplay,
    StarRatingInput,
    bannerUrl,
    canInstallItem,
    downloadAndInstall,
    extractInstalledPlugins,
    formatPrice,
    hasPluginUpdate,
    mythicCloudErrorMessage,
    parseBlobError,
    pluginIdentifier,
    resolveInstallVersion,
    resolveInstalledPlugin,
    storeLatestVersion,
} from '../_shared';

export default function ProductDetailPage() {
    const routeParams = useParams();
    const slug = decodeURIComponent(String(routeParams.slug || ''));
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialTab = ((): DetailTab => {
        const t = searchParams.get('tab');
        if (t === 'versions' || t === 'reviews' || t === 'questions') return t;
        return 'overview';
    })();
    const [tab, setTab] = useState<DetailTab>(initialTab);
    const [item, setItem] = useState<StoreItem | null>(null);
    const [meta, setMeta] = useState<DetailMeta | null>(null);
    const [installedPlugins, setInstalledPlugins] = useState<Map<string, InstalledPluginInfo>>(new Map());
    const [loading, setLoading] = useState(true);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [questionBody, setQuestionBody] = useState('');
    const [savingReview, setSavingReview] = useState(false);
    const [savingQuestion, setSavingQuestion] = useState(false);
    const [installing, setInstalling] = useState(false);

    const loadInstalledPlugins = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/plugins');
            setInstalledPlugins(extractInstalledPlugins(response.data?.data?.plugins));
        } catch {
            setInstalledPlugins(new Map());
        }
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [response] = await Promise.all([
                axios.get(`/api/admin/cloud/data/store/products/${encodeURIComponent(slug)}`),
                loadInstalledPlugins(),
            ]);
            const payload = response.data?.data as StoreItem & { meta?: DetailMeta };
            if (payload?.product) {
                setItem({
                    kind: payload.kind || 'product',
                    owned: payload.owned,
                    can_download: payload.can_download,
                    product: payload.product,
                });
                setMeta(payload.meta || null);
            } else {
                setItem(null);
            }
        } catch (err) {
            toast.error(mythicCloudErrorMessage(err, 'Failed to load product details'));
            setItem(null);
        } finally {
            setLoading(false);
        }
    }, [slug, loadInstalledPlugins]);

    useEffect(() => {
        void load();
    }, [load]);

    const product = item?.product;
    const identifier = pluginIdentifier(product);
    const local = resolveInstalledPlugin(product, installedPlugins);
    const installed = local !== null;
    const updateAvailable = hasPluginUpdate(product, installedPlugins);
    const latest = storeLatestVersion(product);
    const versions = product?.versions ?? (product?.latest_version ? [product.latest_version] : []);
    const reviews = product?.reviews ?? [];
    const questions = product?.questions ?? [];
    const avg = Number(meta?.average_rating ?? product?.average_rating ?? 0);
    const reviewCount = meta?.review_count ?? product?.review_count ?? reviews.length;

    const install = async () => {
        if (!item || !canInstallItem(item)) {
            toast.error('This product cannot be installed from the panel.');
            return;
        }
        if (installed && !updateAvailable) {
            toast.info('This plugin is already up to date.');
            return;
        }
        setInstalling(true);
        try {
            const version = await resolveInstallVersion(slug, item);
            if (!version) {
                toast.error('No downloadable release found.');
                return;
            }
            await downloadAndInstall(slug, version);
            toast.success(
                updateAvailable
                    ? `Updated ${product?.name || slug} to v${version}`
                    : `Installed ${product?.name || slug}`,
            );
            await loadInstalledPlugins();
        } catch (err) {
            toast.error(await parseBlobError(err, updateAvailable ? 'Update failed' : 'Install failed'));
        } finally {
            setInstalling(false);
        }
    };

    const submitReview = async () => {
        if (comment.trim().length < 5) {
            toast.error('Comment is required (5–1000 characters)');
            return;
        }
        setSavingReview(true);
        try {
            await axios.post(`/api/admin/cloud/data/store/products/${encodeURIComponent(slug)}/reviews`, {
                rating,
                comment: comment.trim(),
            });
            toast.success('Review saved');
            setComment('');
            setTab('reviews');
            await load();
        } catch (err) {
            toast.error(mythicCloudErrorMessage(err, 'Failed to save review'));
        } finally {
            setSavingReview(false);
        }
    };

    const submitQuestion = async () => {
        if (!questionBody.trim()) {
            toast.error('Enter a question');
            return;
        }
        setSavingQuestion(true);
        try {
            await axios.post(`/api/admin/cloud/data/store/products/${encodeURIComponent(slug)}/questions`, {
                body: questionBody.trim(),
            });
            toast.success('Question submitted');
            setQuestionBody('');
            setTab('questions');
            await load();
        } catch (err) {
            toast.error(mythicCloudErrorMessage(err, 'Failed to submit question'));
        } finally {
            setSavingQuestion(false);
        }
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={product?.name || 'Plugin'}
                description={product?.tagline || 'Mythic marketplace plugin details'}
                icon={Package}
                actions={
                    <div className='flex flex-wrap gap-2'>
                        <Button variant='outline' size='sm' onClick={() => router.push('/admin/feathercloud/products')}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            Back to plugins
                        </Button>
                        <Button
                            size='sm'
                            disabled={
                                !item ||
                                !canInstallItem(item) ||
                                installing ||
                                loading ||
                                (installed && !updateAvailable)
                            }
                            onClick={() => void install()}
                        >
                            {installing ? (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            ) : updateAvailable ? (
                                <RefreshCw className='mr-2 h-4 w-4' />
                            ) : (
                                <Download className='mr-2 h-4 w-4' />
                            )}
                            {updateAvailable ? `Update to v${latest}` : installed ? 'Installed' : 'Install'}
                        </Button>
                    </div>
                }
            />

            {loading && !product ? (
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                    <Loader2 className='h-4 w-4 animate-spin' /> Loading product…
                </div>
            ) : !product ? (
                <div className='bg-muted/40 rounded-2xl px-6 py-16 text-center'>
                    <Package className='text-muted-foreground mx-auto mb-3 h-10 w-10' />
                    <p className='font-medium'>Product not found</p>
                    <p className='text-muted-foreground mt-1 text-sm'>
                        This plugin could not be loaded from the Mythic store.
                    </p>
                    <Button
                        className='mt-4'
                        variant='outline'
                        onClick={() => router.push('/admin/feathercloud/products')}
                    >
                        Return to catalog
                    </Button>
                </div>
            ) : (
                <>
                    <section className='bg-muted/30 overflow-hidden rounded-2xl'>
                        <div className='relative h-48 sm:h-64'>
                            {bannerUrl(product) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={bannerUrl(product)!} alt='' className='h-full w-full object-cover' />
                            ) : (
                                <div className='from-muted to-muted/40 flex h-full items-center justify-center bg-linear-to-br' />
                            )}
                            <div className='from-background via-background/55 absolute inset-0 bg-linear-to-t to-transparent' />
                            <div className='absolute right-5 bottom-5 left-5 flex flex-wrap items-end gap-4'>
                                {product.icon_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={product.icon_url}
                                        alt=''
                                        className='ring-background h-16 w-16 rounded-2xl object-cover shadow-lg ring-2'
                                    />
                                ) : null}
                                <div className='min-w-0 flex-1 space-y-1'>
                                    <h1 className='truncate text-2xl font-semibold tracking-tight'>{product.name}</h1>
                                    {identifier ? (
                                        <p className='text-muted-foreground font-mono text-sm'>{identifier}</p>
                                    ) : null}
                                    <div className='text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm'>
                                        <span className='text-foreground font-medium'>{formatPrice(product)}</span>
                                        {latest ? <span>Store v{latest}</span> : null}
                                        {local?.version ? <span>Installed v{local.version}</span> : null}
                                        {updateAvailable ? (
                                            <span className='rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400'>
                                                Update available
                                            </span>
                                        ) : installed ? (
                                            <span className='rounded-md bg-blue-500/15 px-1.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400'>
                                                Installed
                                            </span>
                                        ) : null}
                                        {item?.owned ? (
                                            <span className='rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400'>
                                                Owned
                                            </span>
                                        ) : null}
                                        <span className='inline-flex items-center gap-1.5'>
                                            <StarDisplay rating={avg} />
                                            <span>
                                                {avg > 0 ? avg.toFixed(1) : '—'} ({reviewCount})
                                            </span>
                                        </span>
                                        {product.seller?.name ? <span>by {product.seller.name}</span> : null}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='flex gap-1 overflow-x-auto px-3 pt-3 sm:px-5'>
                            {[
                                {
                                    key: 'overview' as const,
                                    label: 'Overview',
                                    count: null as number | null,
                                    withStar: false,
                                },
                                {
                                    key: 'versions' as const,
                                    label: 'Versions',
                                    count: meta?.versions_count ?? versions.length,
                                    withStar: false,
                                },
                                {
                                    key: 'reviews' as const,
                                    label: 'Reviews',
                                    count: reviewCount,
                                    withStar: true,
                                },
                                {
                                    key: 'questions' as const,
                                    label: 'Q&A',
                                    count: meta?.question_count ?? questions.length,
                                    withStar: false,
                                },
                            ].map(({ key, label, count, withStar }) => (
                                <button
                                    key={key}
                                    type='button'
                                    onClick={() => setTab(key)}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                                        tab === key
                                            ? 'border-primary text-foreground'
                                            : 'text-muted-foreground hover:text-foreground border-transparent',
                                    )}
                                >
                                    {withStar ? <Star className='h-3.5 w-3.5 fill-amber-400 text-amber-400' /> : null}
                                    {label}
                                    {count != null ? (
                                        <span className='text-muted-foreground text-xs'>({count})</span>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className='min-h-[280px]'>
                        {loading ? (
                            <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                                <Loader2 className='h-4 w-4 animate-spin' /> Refreshing…
                            </div>
                        ) : tab === 'overview' ? (
                            <div className='space-y-6'>
                                {product.tagline ? (
                                    <p className='text-muted-foreground text-base'>{product.tagline}</p>
                                ) : null}
                                <MarkdownBody content={String(product.description || '')} />
                                {(product.gallery_urls?.length ?? 0) > 1 ? (
                                    <div className='flex gap-3 overflow-x-auto pb-1'>
                                        {product.gallery_urls!.map((url) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                key={url}
                                                src={url}
                                                alt=''
                                                className='h-36 w-56 shrink-0 rounded-xl object-cover'
                                            />
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ) : tab === 'versions' ? (
                            <div className='space-y-4'>
                                {versions.length === 0 ? (
                                    <p className='text-muted-foreground text-sm'>
                                        No version history loaded yet. Install still uses the latest release when
                                        available.
                                    </p>
                                ) : (
                                    versions.map((ver) => (
                                        <div
                                            key={String(ver.id || ver.version)}
                                            className='bg-muted/25 rounded-xl px-4 py-3'
                                        >
                                            <p className='mb-2 font-medium'>
                                                {ver.title || `v${ver.version}`}
                                                <span className='text-muted-foreground ml-2 text-xs'>
                                                    {ver.version}
                                                    {ver.created_at ? ` · ${ver.created_at}` : ''}
                                                </span>
                                            </p>
                                            {ver.changelog ? (
                                                <MarkdownBody content={String(ver.changelog)} />
                                            ) : (
                                                <p className='text-muted-foreground text-sm'>No changelog.</p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : tab === 'reviews' ? (
                            <div className='space-y-6'>
                                <div className='bg-muted/25 space-y-4 rounded-2xl p-4 sm:p-5'>
                                    <div>
                                        <p className='text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase'>
                                            Your rating
                                        </p>
                                        <StarRatingInput value={rating} onChange={setRating} disabled={savingReview} />
                                    </div>
                                    <div>
                                        <p className='text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase'>
                                            Comment
                                        </p>
                                        <Textarea
                                            rows={3}
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder='Share your experience (5–1000 characters)'
                                        />
                                    </div>
                                    <Button onClick={() => void submitReview()} disabled={savingReview}>
                                        {savingReview ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                                        Save review
                                    </Button>
                                </div>

                                {reviews.length === 0 ? (
                                    <p className='text-muted-foreground text-sm'>No reviews yet. Be the first.</p>
                                ) : (
                                    <ul className='space-y-3'>
                                        {reviews.map((r) => (
                                            <li key={String(r.id)} className='bg-muted/20 rounded-xl px-4 py-3 text-sm'>
                                                <div className='flex flex-wrap items-center gap-2'>
                                                    <StarDisplay rating={Number(r.rating || 0)} />
                                                    <span className='font-medium'>
                                                        {r.user?.username || r.user?.name || 'User'}
                                                    </span>
                                                    {r.created_at ? (
                                                        <span className='text-muted-foreground text-xs'>
                                                            {r.created_at}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {r.comment ? (
                                                    <p className='text-muted-foreground mt-2'>{r.comment}</p>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ) : (
                            <div className='space-y-6'>
                                <div className='bg-muted/25 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-end sm:p-5'>
                                    <Textarea
                                        rows={3}
                                        value={questionBody}
                                        onChange={(e) => setQuestionBody(e.target.value)}
                                        placeholder='Ask a question about this plugin…'
                                        className='flex-1'
                                    />
                                    <Button onClick={() => void submitQuestion()} disabled={savingQuestion}>
                                        {savingQuestion ? (
                                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        ) : (
                                            <MessageCircle className='mr-2 h-4 w-4' />
                                        )}
                                        Ask
                                    </Button>
                                </div>
                                {questions.length === 0 ? (
                                    <p className='text-muted-foreground text-sm'>No questions yet.</p>
                                ) : (
                                    <ul className='space-y-4'>
                                        {questions.map((q) => (
                                            <li key={String(q.id)} className='bg-muted/20 rounded-xl px-4 py-3 text-sm'>
                                                <p className='font-medium'>
                                                    {q.user?.username || 'User'}
                                                    {q.is_team_member ? (
                                                        <span className='text-primary ml-2 text-xs'>Seller</span>
                                                    ) : null}
                                                </p>
                                                <p className='text-muted-foreground mt-1'>{q.body}</p>
                                                {(q.replies?.length ?? 0) > 0 ? (
                                                    <ul className='border-muted-foreground/20 mt-3 space-y-2 border-l pl-3'>
                                                        {q.replies!.map((reply) => (
                                                            <li key={String(reply.id)}>
                                                                <p className='text-xs font-semibold'>
                                                                    {reply.user?.username || 'User'}
                                                                    {reply.is_team_member ? (
                                                                        <span className='text-primary ml-2'>
                                                                            Seller
                                                                        </span>
                                                                    ) : null}
                                                                </p>
                                                                <p className='text-muted-foreground'>{reply.body}</p>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
