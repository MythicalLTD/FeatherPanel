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
import { useTranslation } from '@/contexts/TranslationContext';
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
    const { t } = useTranslation();

    const initialTab = ((): DetailTab => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'versions' || tabParam === 'reviews' || tabParam === 'questions') return tabParam;
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
            toast.error(mythicCloudErrorMessage(err, t('admin.marketplace.plugins.detail.load_failed'), t));
            setItem(null);
        } finally {
            setLoading(false);
        }
    }, [slug, loadInstalledPlugins, t]);

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
            toast.error(t('admin.marketplace.plugins.toasts.cannot_install'));
            return;
        }
        if (installed && !updateAvailable) {
            toast.info(t('admin.marketplace.plugins.toasts.already_up_to_date'));
            return;
        }
        setInstalling(true);
        try {
            const version = await resolveInstallVersion(slug, item);
            if (!version) {
                toast.error(t('admin.marketplace.plugins.toasts.no_release'));
                return;
            }
            await downloadAndInstall(slug, version);
            toast.success(
                updateAvailable
                    ? t('admin.marketplace.plugins.toasts.updated', {
                          name: product?.name || slug,
                          version,
                      })
                    : t('admin.marketplace.plugins.toasts.installed', {
                          name: product?.name || slug,
                      }),
            );
            await loadInstalledPlugins();
        } catch (err) {
            toast.error(
                await parseBlobError(
                    err,
                    updateAvailable
                        ? t('admin.marketplace.plugins.toasts.update_failed')
                        : t('admin.marketplace.plugins.toasts.install_failed'),
                    t,
                ),
            );
        } finally {
            setInstalling(false);
        }
    };

    const submitReview = async () => {
        if (comment.trim().length < 5) {
            toast.error(t('admin.marketplace.plugins.detail.comment_required'));
            return;
        }
        setSavingReview(true);
        try {
            await axios.post(`/api/admin/cloud/data/store/products/${encodeURIComponent(slug)}/reviews`, {
                rating,
                comment: comment.trim(),
            });
            toast.success(t('admin.marketplace.plugins.detail.review_saved'));
            setComment('');
            setTab('reviews');
            await load();
        } catch (err) {
            toast.error(mythicCloudErrorMessage(err, t('admin.marketplace.plugins.detail.review_failed'), t));
        } finally {
            setSavingReview(false);
        }
    };

    const submitQuestion = async () => {
        if (!questionBody.trim()) {
            toast.error(t('admin.marketplace.plugins.detail.enter_question'));
            return;
        }
        setSavingQuestion(true);
        try {
            await axios.post(`/api/admin/cloud/data/store/products/${encodeURIComponent(slug)}/questions`, {
                body: questionBody.trim(),
            });
            toast.success(t('admin.marketplace.plugins.detail.question_submitted'));
            setQuestionBody('');
            setTab('questions');
            await load();
        } catch (err) {
            toast.error(mythicCloudErrorMessage(err, t('admin.marketplace.plugins.detail.question_failed'), t));
        } finally {
            setSavingQuestion(false);
        }
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={product?.name || t('admin.marketplace.plugins.detail.fallback_title')}
                description={product?.tagline || t('admin.marketplace.plugins.detail.fallback_description')}
                icon={Package}
                actions={
                    <div className='flex flex-wrap gap-2'>
                        <Button variant='outline' size='sm' onClick={() => router.push('/admin/feathercloud/products')}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('admin.marketplace.plugins.detail.back')}
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
                            {updateAvailable
                                ? t('admin.marketplace.plugins.actions.update_to', { version: latest })
                                : installed
                                  ? t('admin.marketplace.plugins.labels.installed')
                                  : t('admin.marketplace.plugins.actions.install')}
                        </Button>
                    </div>
                }
            />

            {loading && !product ? (
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                    <Loader2 className='h-4 w-4 animate-spin' /> {t('admin.marketplace.plugins.detail.loading')}
                </div>
            ) : !product ? (
                <div className='bg-muted/40 rounded-2xl px-6 py-16 text-center'>
                    <Package className='text-muted-foreground mx-auto mb-3 h-10 w-10' />
                    <p className='font-medium'>{t('admin.marketplace.plugins.detail.not_found_title')}</p>
                    <p className='text-muted-foreground mt-1 text-sm'>
                        {t('admin.marketplace.plugins.detail.not_found_description')}
                    </p>
                    <Button
                        className='mt-4'
                        variant='outline'
                        onClick={() => router.push('/admin/feathercloud/products')}
                    >
                        {t('admin.marketplace.plugins.detail.return_catalog')}
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
                                        <span className='text-foreground font-medium'>
                                            {formatPrice(product, {
                                                free: t('admin.marketplace.plugins.labels.free'),
                                                empty: t('admin.marketplace.plugins.labels.empty_price'),
                                            })}
                                        </span>
                                        {latest ? (
                                            <span>
                                                {t('admin.marketplace.plugins.labels.store_version', {
                                                    version: latest,
                                                })}
                                            </span>
                                        ) : null}
                                        {local?.version ? (
                                            <span>
                                                {t('admin.marketplace.plugins.labels.installed_version', {
                                                    version: local.version,
                                                })}
                                            </span>
                                        ) : null}
                                        {updateAvailable ? (
                                            <span className='rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400'>
                                                {t('admin.marketplace.plugins.labels.update_available')}
                                            </span>
                                        ) : installed ? (
                                            <span className='rounded-md bg-blue-500/15 px-1.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400'>
                                                {t('admin.marketplace.plugins.labels.installed')}
                                            </span>
                                        ) : null}
                                        {item?.owned ? (
                                            <span className='rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400'>
                                                {t('admin.marketplace.plugins.labels.owned')}
                                            </span>
                                        ) : null}
                                        <span className='inline-flex items-center gap-1.5'>
                                            <StarDisplay
                                                rating={avg}
                                                ariaLabel={t('admin.marketplace.plugins.detail.rating_stars', {
                                                    value: String(avg),
                                                })}
                                            />
                                            <span>
                                                {t('admin.marketplace.plugins.detail.rating_summary', {
                                                    rating: avg > 0 ? avg.toFixed(1) : t('admin.marketplace.plugins.labels.empty_price'),
                                                    count: String(reviewCount),
                                                })}
                                            </span>
                                        </span>
                                        {product.seller?.name ? (
                                            <span>
                                                {t('admin.marketplace.plugins.labels.by_author', {
                                                    author: product.seller.name,
                                                })}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='flex gap-1 overflow-x-auto px-3 pt-3 sm:px-5'>
                            {[
                                {
                                    key: 'overview' as const,
                                    label: t('admin.marketplace.plugins.detail.tabs.overview'),
                                    count: null as number | null,
                                    withStar: false,
                                },
                                {
                                    key: 'versions' as const,
                                    label: t('admin.marketplace.plugins.detail.tabs.versions'),
                                    count: meta?.versions_count ?? versions.length,
                                    withStar: false,
                                },
                                {
                                    key: 'reviews' as const,
                                    label: t('admin.marketplace.plugins.detail.tabs.reviews'),
                                    count: reviewCount,
                                    withStar: true,
                                },
                                {
                                    key: 'questions' as const,
                                    label: t('admin.marketplace.plugins.detail.tabs.questions'),
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
                                <Loader2 className='h-4 w-4 animate-spin' /> {t('admin.marketplace.plugins.detail.refreshing')}
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
                                        {t('admin.marketplace.plugins.detail.no_versions')}
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
                                                <p className='text-muted-foreground text-sm'>
                                                    {t('admin.marketplace.plugins.detail.no_changelog')}
                                                </p>
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
                                            {t('admin.marketplace.plugins.detail.your_rating')}
                                        </p>
                                        <StarRatingInput
                                            value={rating}
                                            onChange={setRating}
                                            disabled={savingReview}
                                            groupLabel={t('admin.marketplace.plugins.detail.rating_input')}
                                            starLabel={(count) =>
                                                t(
                                                    count === 1
                                                        ? 'admin.marketplace.plugins.detail.star_one'
                                                        : 'admin.marketplace.plugins.detail.star_other',
                                                    { count: String(count) },
                                                )
                                            }
                                        />
                                    </div>
                                    <div>
                                        <p className='text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase'>
                                            {t('admin.marketplace.plugins.detail.comment')}
                                        </p>
                                        <Textarea
                                            rows={3}
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder={t('admin.marketplace.plugins.detail.comment_placeholder')}
                                        />
                                    </div>
                                    <Button onClick={() => void submitReview()} disabled={savingReview}>
                                        {savingReview ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                                        {t('admin.marketplace.plugins.detail.save_review')}
                                    </Button>
                                </div>

                                {reviews.length === 0 ? (
                                    <p className='text-muted-foreground text-sm'>
                                        {t('admin.marketplace.plugins.detail.no_reviews')}
                                    </p>
                                ) : (
                                    <ul className='space-y-3'>
                                        {reviews.map((r) => (
                                            <li key={String(r.id)} className='bg-muted/20 rounded-xl px-4 py-3 text-sm'>
                                                <div className='flex flex-wrap items-center gap-2'>
                                                    <StarDisplay
                                                        rating={Number(r.rating || 0)}
                                                        ariaLabel={t('admin.marketplace.plugins.detail.rating_stars', {
                                                            value: String(r.rating || 0),
                                                        })}
                                                    />
                                                    <span className='font-medium'>
                                                        {r.user?.username ||
                                                            r.user?.name ||
                                                            t('admin.marketplace.plugins.detail.user')}
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
                                        placeholder={t('admin.marketplace.plugins.detail.question_placeholder')}
                                        className='flex-1'
                                    />
                                    <Button onClick={() => void submitQuestion()} disabled={savingQuestion}>
                                        {savingQuestion ? (
                                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        ) : (
                                            <MessageCircle className='mr-2 h-4 w-4' />
                                        )}
                                        {t('admin.marketplace.plugins.detail.ask')}
                                    </Button>
                                </div>
                                {questions.length === 0 ? (
                                    <p className='text-muted-foreground text-sm'>
                                        {t('admin.marketplace.plugins.detail.no_questions')}
                                    </p>
                                ) : (
                                    <ul className='space-y-4'>
                                        {questions.map((q) => (
                                            <li key={String(q.id)} className='bg-muted/20 rounded-xl px-4 py-3 text-sm'>
                                                <p className='font-medium'>
                                                    {q.user?.username || t('admin.marketplace.plugins.detail.user')}
                                                    {q.is_team_member ? (
                                                        <span className='text-primary ml-2 text-xs'>
                                                            {t('admin.marketplace.plugins.detail.seller')}
                                                        </span>
                                                    ) : null}
                                                </p>
                                                <p className='text-muted-foreground mt-1'>{q.body}</p>
                                                {(q.replies?.length ?? 0) > 0 ? (
                                                    <ul className='border-muted-foreground/20 mt-3 space-y-2 border-l pl-3'>
                                                        {q.replies!.map((reply) => (
                                                            <li key={String(reply.id)}>
                                                                <p className='text-xs font-semibold'>
                                                                    {reply.user?.username ||
                                                                        t('admin.marketplace.plugins.detail.user')}
                                                                    {reply.is_team_member ? (
                                                                        <span className='text-primary ml-2'>
                                                                            {t(
                                                                                'admin.marketplace.plugins.detail.seller',
                                                                            )}
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
