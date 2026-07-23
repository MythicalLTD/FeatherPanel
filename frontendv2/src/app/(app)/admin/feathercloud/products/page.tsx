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
import { ArrowLeft, Download, Loader2, Package, RefreshCw, Star, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { EmptyState } from '@/components/featherui/EmptyState';

interface PurchaseRow {
    product?: {
        identifier?: string;
        name?: string;
        id?: string | number;
        price?: number | string;
    };
    username?: string;
    email?: string;
    purchased_at?: string;
    access_id?: string | number;
}

interface ReleaseRow {
    version?: string;
    title?: string;
    changelog?: string;
    file_name?: string;
    created_at?: string;
}

interface ReviewRow {
    id?: string | number;
    rating?: number;
    comment?: string;
    createdAt?: string;
    user?: { id?: number | string; name?: string };
}

function extractPurchases(data: unknown): PurchaseRow[] {
    if (!data || typeof data !== 'object') return [];
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.purchases)) return d.purchases as PurchaseRow[];
    if (Array.isArray(d.items)) return d.items as PurchaseRow[];
    if (Array.isArray(data)) return data as PurchaseRow[];
    return [];
}

export default function MythicProductsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
    const [credentialsError, setCredentialsError] = useState<string | null>(null);
    const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
    const [selectedName, setSelectedName] = useState<string>('');
    const [releases, setReleases] = useState<ReleaseRow[]>([]);
    const [releasesLoading, setReleasesLoading] = useState(false);
    const [reviews, setReviews] = useState<ReviewRow[]>([]);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [savingReview, setSavingReview] = useState(false);
    const [downloading, setDownloading] = useState<string | null>(null);

    const loadPurchases = useCallback(async () => {
        setLoading(true);
        setCredentialsError(null);
        try {
            const response = await axios.get('/api/admin/cloud/data/products');
            setPurchases(extractPurchases(response.data?.data));
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const code = err.response?.data?.error_code;
                if (code === 'CLOUD_CREDENTIALS_NOT_CONFIGURED' || err.response?.status === 503) {
                    setCredentialsError(
                        err.response?.data?.message ||
                            'Mythic Cloud is not linked. Connect under MyFeatherPanel → Cloud Connections.',
                    );
                    return;
                }
            }
            toast.error('Failed to load Mythic purchases');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPurchases();
    }, [loadPurchases]);

    const openProduct = async (slug: string, name: string) => {
        setSelectedSlug(slug);
        setSelectedName(name || slug);
        setReleasesLoading(true);
        setReleases([]);
        setReviews([]);
        try {
            const [relRes, revRes] = await Promise.all([
                axios.get(`/api/admin/cloud/data/products/${encodeURIComponent(slug)}/releases`),
                axios.get(`/api/admin/cloud/data/products/${encodeURIComponent(slug)}/reviews`).catch(() => null),
            ]);
            const relData = relRes.data?.data;
            const list = Array.isArray(relData?.releases) ? relData.releases : Array.isArray(relData) ? relData : [];
            setReleases(list);
            const revData = revRes?.data?.data;
            const revList = Array.isArray(revData)
                ? revData
                : Array.isArray(revData?.data)
                  ? revData.data
                  : Array.isArray(revData?.reviews)
                    ? revData.reviews
                    : [];
            setReviews(revList);
        } catch (err) {
            toast.error(
                axios.isAxiosError(err)
                    ? err.response?.data?.message || 'Failed to load releases'
                    : 'Failed to load releases',
            );
        } finally {
            setReleasesLoading(false);
        }
    };

    const downloadRelease = async (version: string, install = false) => {
        if (!selectedSlug) return;
        setDownloading(version);
        try {
            const response = await axios.get(
                `/api/admin/cloud/data/products/${encodeURIComponent(selectedSlug)}/releases/${encodeURIComponent(version)}/download`,
                { responseType: 'blob' },
            );
            const blob = new Blob([response.data], { type: 'application/octet-stream' });
            if (install) {
                const form = new FormData();
                form.append('file', blob, `${selectedSlug}-${version}.fpa`);
                await axios.post('/api/admin/plugins/upload/install', form, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Addon installed from .fpa');
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${selectedSlug}-${version}.fpa`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                toast.success('Download started');
            }
        } catch (err) {
            toast.error(
                axios.isAxiosError(err)
                    ? err.response?.data?.message || (install ? 'Install failed' : 'Download failed')
                    : install
                      ? 'Install failed'
                      : 'Download failed',
            );
        } finally {
            setDownloading(null);
        }
    };

    const submitReview = async () => {
        if (!selectedSlug) return;
        if (comment.trim().length > 0 && comment.trim().length < 5) {
            toast.error('Comment must be at least 5 characters');
            return;
        }
        setSavingReview(true);
        try {
            await axios.post(`/api/admin/cloud/data/products/${encodeURIComponent(selectedSlug)}/reviews`, {
                rating,
                comment: comment.trim(),
            });
            toast.success('Review saved');
            setComment('');
            await openProduct(selectedSlug, selectedName);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.data?.error_code === 'MEMBER_UUID_REQUIRED') {
                toast.error(err.response.data.message || 'Link a matching Mythic email to leave reviews.');
                return;
            }
            toast.error(
                axios.isAxiosError(err)
                    ? err.response?.data?.message || 'Failed to save review'
                    : 'Failed to save review',
            );
        } finally {
            setSavingReview(false);
        }
    };

    const uniquePurchases = useMemo(() => {
        const seen = new Set<string>();
        return purchases.filter((row) => {
            const slug = String(row.product?.identifier || '');
            if (!slug || seen.has(slug)) return false;
            seen.add(slug);
            return true;
        });
    }, [purchases]);

    return (
        <div className='space-y-6 md:space-y-8'>
            <PageHeader
                title='Mythic Products'
                description='Team purchases, releases, .fpa downloads, and reviews from Mythic Cloud.'
                icon={Store}
                actions={
                    <div className='flex gap-2'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => router.push('/admin/feathercloud/marketplace')}
                        >
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            Marketplace
                        </Button>
                        <Button variant='outline' size='sm' onClick={loadPurchases} disabled={loading}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                }
            />

            {credentialsError ? (
                <PageCard title='Not linked' description={credentialsError} icon={Package}>
                    <Button onClick={() => router.push('/admin/cloud-management')}>Open Cloud Connections</Button>
                </PageCard>
            ) : selectedSlug ? (
                <div className='space-y-6'>
                    <PageCard
                        title={selectedName}
                        description={`Slug: ${selectedSlug}`}
                        icon={Package}
                        action={
                            <Button variant='outline' size='sm' onClick={() => setSelectedSlug(null)}>
                                Back to purchases
                            </Button>
                        }
                    >
                        {releasesLoading ? (
                            <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                                <Loader2 className='h-4 w-4 animate-spin' /> Loading releases…
                            </div>
                        ) : releases.length === 0 ? (
                            <EmptyState
                                title='No releases'
                                description='No downloadable releases for this product.'
                                icon={Download}
                            />
                        ) : (
                            <ul className='space-y-3'>
                                {releases.map((rel) => {
                                    const version = String(rel.version || '');
                                    return (
                                        <li
                                            key={version}
                                            className='border-border/50 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3'
                                        >
                                            <div>
                                                <p className='font-semibold'>{rel.title || version}</p>
                                                <p className='text-muted-foreground text-xs'>
                                                    {version}
                                                    {rel.created_at ? ` · ${rel.created_at}` : ''}
                                                </p>
                                                {rel.changelog && (
                                                    <p className='text-muted-foreground mt-1 max-w-xl text-sm'>
                                                        {rel.changelog}
                                                    </p>
                                                )}
                                            </div>
                                            <div className='flex gap-2'>
                                                <Button
                                                    size='sm'
                                                    variant='outline'
                                                    disabled={downloading === version}
                                                    onClick={() => void downloadRelease(version, false)}
                                                >
                                                    {downloading === version ? (
                                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                                    ) : (
                                                        <Download className='mr-2 h-4 w-4' />
                                                    )}
                                                    Download .fpa
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    disabled={downloading === version}
                                                    onClick={() => void downloadRelease(version, true)}
                                                >
                                                    Install
                                                </Button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </PageCard>

                    <PageCard title='Reviews' icon={Star}>
                        <div className='space-y-4'>
                            <div className='grid gap-3 md:grid-cols-[120px_1fr_auto]'>
                                <div>
                                    <label className='text-muted-foreground mb-1 block text-xs font-semibold uppercase'>
                                        Rating
                                    </label>
                                    <Input
                                        type='number'
                                        min={1}
                                        max={5}
                                        value={rating}
                                        onChange={(e) =>
                                            setRating(Math.min(5, Math.max(1, Number(e.target.value) || 1)))
                                        }
                                    />
                                </div>
                                <div>
                                    <label className='text-muted-foreground mb-1 block text-xs font-semibold uppercase'>
                                        Comment
                                    </label>
                                    <Textarea
                                        rows={2}
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder='Optional (5–1000 chars)'
                                    />
                                </div>
                                <div className='flex items-end'>
                                    <Button onClick={() => void submitReview()} disabled={savingReview}>
                                        {savingReview ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                                        Save review
                                    </Button>
                                </div>
                            </div>
                            {reviews.length === 0 ? (
                                <p className='text-muted-foreground text-sm'>No reviews yet.</p>
                            ) : (
                                <ul className='space-y-2'>
                                    {reviews.map((r) => (
                                        <li
                                            key={String(r.id)}
                                            className='border-border/40 rounded-lg border p-3 text-sm'
                                        >
                                            <p className='font-medium'>
                                                {'★'.repeat(Number(r.rating || 0))}{' '}
                                                <span className='text-muted-foreground'>{r.user?.name || 'User'}</span>
                                            </p>
                                            {r.comment && <p className='text-muted-foreground mt-1'>{r.comment}</p>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </PageCard>
                </div>
            ) : loading ? (
                <PageCard title='Purchases' icon={Package}>
                    <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' /> Loading purchases…
                    </div>
                </PageCard>
            ) : uniquePurchases.length === 0 ? (
                <EmptyState
                    title='No purchases'
                    description='No Mythic marketplace purchases on this linked team yet.'
                    icon={Store}
                />
            ) : (
                <PageCard title='Team purchases' icon={Package}>
                    <div className='grid gap-3 md:grid-cols-2'>
                        {uniquePurchases.map((row) => {
                            const slug = String(row.product?.identifier || '');
                            const name = String(row.product?.name || slug);
                            return (
                                <button
                                    key={slug}
                                    type='button'
                                    className='border-border/50 hover:border-primary/40 rounded-xl border p-4 text-left transition'
                                    onClick={() => void openProduct(slug, name)}
                                >
                                    <p className='font-semibold'>{name}</p>
                                    <p className='text-muted-foreground text-xs'>{slug}</p>
                                    {row.purchased_at && (
                                        <p className='text-muted-foreground mt-2 text-xs'>
                                            Purchased {row.purchased_at}
                                        </p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </PageCard>
            )}
        </div>
    );
}
