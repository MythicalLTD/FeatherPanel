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

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { toast } from 'sonner';
import { BadgeCheck, ExternalLink, HeartHandshake, MapPin, Network, Shield, Star, X } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { cn } from '@/lib/utils';

interface AffiliateRating {
    score?: number;
    platform?: string;
    status?: string;
}

interface AffiliateUpstream {
    asn?: string;
    name?: string;
}

interface AffiliateNetwork {
    primary_asn?: string;
    upstreams?: AffiliateUpstream[];
    port_speeds?: string[];
    ddos_protection?: string[];
}

interface AffiliatePricingMinimums {
    vps?: string;
    dedicated?: string;
    storage_vps?: string;
    webhosting?: string;
    currency?: string;
}

interface AffiliateEntry {
    name?: string;
    tagline?: string;
    url?: string;
    image?: string;
    rating?: AffiliateRating;
    network?: AffiliateNetwork;
    pricing_minimums?: AffiliatePricingMinimums;
    selling_points?: string[];
    locations?: string[];
}

interface AffiliatesResponse {
    data?: {
        affiliates?: AffiliateEntry[];
    };
}

interface AffiliatesShowcaseProps {
    endpoint: string;
    className?: string;
}

const ADS_HIDE_KEY = 'featherpanel_hide_ads';

function normalizeAsn(asn: string): string {
    return asn.replace(/^AS/i, '').trim();
}

function bgpToolsUrl(asn?: string): string | null {
    if (!asn) return null;
    const normalized = normalizeAsn(asn);
    return normalized ? `https://bgp.tools/as/${normalized}` : null;
}

export function AffiliatesShowcase({ endpoint, className }: AffiliatesShowcaseProps) {
    const { t } = useTranslation();

    const [prefsLoaded, setPrefsLoaded] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [affiliates, setAffiliates] = useState<AffiliateEntry[]>([]);

    useEffect(() => {
        const pref = typeof window !== 'undefined' ? window.localStorage.getItem(ADS_HIDE_KEY) : null;
        setHidden(pref === 'true');
        setPrefsLoaded(true);
    }, []);

    useEffect(() => {
        let mounted = true;

        if (!prefsLoaded || hidden) {
            setLoading(false);
            return () => {
                mounted = false;
            };
        }

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await axios.get<AffiliatesResponse>(endpoint);
                const list = Array.isArray(data?.data?.affiliates) ? data.data.affiliates : [];
                if (mounted) {
                    setAffiliates(list);
                }
            } catch {
                if (mounted) {
                    setError(t('admin.affiliates.load_failed'));
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            mounted = false;
        };
    }, [endpoint, hidden, prefsLoaded, t]);

    const hasAffiliates = useMemo(() => affiliates.length > 0, [affiliates]);

    const hidePanel = () => {
        const confirmed = window.confirm(t('admin.affiliates.hide_confirm'));
        if (!confirmed) {
            toast.message(t('admin.affiliates.hide_cancel_title'), {
                description: t('admin.affiliates.hide_cancel_description'),
            });
            return;
        }

        window.localStorage.setItem(ADS_HIDE_KEY, 'true');
        setHidden(true);
    };

    if (!prefsLoaded || hidden) {
        return null;
    }

    return (
        <PageCard
            className={className}
            title={t('admin.affiliates.title')}
            description={t('admin.affiliates.description')}
            icon={BadgeCheck}
        >
            <div className='mb-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3'>
                <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-1'>
                        <p className='text-sm font-semibold'>{t('admin.affiliates.banner_title')}</p>
                        <p className='text-xs text-muted-foreground'>{t('admin.affiliates.banner_description')}</p>
                    </div>
                    <Button type='button' size='sm' variant='ghost' className='h-8 px-2' onClick={hidePanel}>
                        <X className='h-4 w-4 mr-1' />
                        {t('admin.affiliates.hide_this')}
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className='rounded-xl border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground'>
                    {t('common.loading')}
                </div>
            ) : error ? (
                <div className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
                    {error}
                </div>
            ) : !hasAffiliates ? (
                <div className='rounded-xl border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground'>
                    {t('admin.affiliates.no_results')}
                </div>
            ) : (
                <div className='space-y-4'>
                    {affiliates.map((affiliate, index) => {
                        const upstreams = affiliate.network?.upstreams ?? [];
                        const speeds = affiliate.network?.port_speeds ?? [];
                        const ddos = affiliate.network?.ddos_protection ?? [];
                        const locations = affiliate.locations ?? [];
                        const sellingPoints = affiliate.selling_points ?? [];
                        const primaryAsn = affiliate.network?.primary_asn;
                        const primaryAsnBGP = bgpToolsUrl(primaryAsn);

                        return (
                            <div
                                key={`${affiliate.name ?? 'affiliate'}-${index}`}
                                className='rounded-2xl border border-border/50 bg-card/30 p-4 space-y-4 shadow-sm'
                            >
                                <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
                                    <div className='space-y-2'>
                                        <h3 className='text-lg font-semibold'>
                                            {affiliate.name ?? t('common.unknown')}
                                        </h3>
                                        {affiliate.tagline && (
                                            <p className='text-sm text-muted-foreground'>{affiliate.tagline}</p>
                                        )}
                                        {affiliate.rating && (
                                            <div className='inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs font-medium'>
                                                <Star className='h-3.5 w-3.5 text-amber-500' />
                                                <span>
                                                    {t('admin.affiliates.rating')}: {affiliate.rating.score ?? '-'}
                                                </span>
                                                {affiliate.rating.platform && (
                                                    <span className='text-muted-foreground'>
                                                        ({affiliate.rating.platform})
                                                    </span>
                                                )}
                                                {affiliate.rating.status && (
                                                    <span className='text-emerald-600'>
                                                        - {affiliate.rating.status}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className='flex items-center gap-2'>
                                        {affiliate.url && (
                                            <a href={affiliate.url} target='_blank' rel='noreferrer noopener'>
                                                <Button type='button' variant='outline' size='sm'>
                                                    <ExternalLink className='h-4 w-4 mr-2' />
                                                    {t('admin.affiliates.visit_partner')}
                                                </Button>
                                            </a>
                                        )}
                                        {primaryAsnBGP && (
                                            <a href={primaryAsnBGP} target='_blank' rel='noreferrer noopener'>
                                                <Button type='button' variant='outline' size='sm'>
                                                    <Network className='h-4 w-4 mr-2' />
                                                    {t('admin.affiliates.bgp_tools')}
                                                </Button>
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {affiliate.image && (
                                    <a
                                        href={affiliate.url || '#'}
                                        target={affiliate.url ? '_blank' : undefined}
                                        rel={affiliate.url ? 'noreferrer noopener' : undefined}
                                        className='block'
                                    >
                                        <div className='rounded-xl border border-border/50 bg-background/40 p-3'>
                                            <Image
                                                src={affiliate.image}
                                                alt={affiliate.name ?? t('admin.affiliates.affiliate_alt')}
                                                width={600}
                                                height={150}
                                                unoptimized
                                                className='w-full max-h-24 object-contain'
                                            />
                                        </div>
                                    </a>
                                )}

                                <div className='grid grid-cols-1 xl:grid-cols-3 gap-4'>
                                    <div className='space-y-2'>
                                        <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                                            {t('admin.affiliates.pricing_minimums')}
                                        </p>
                                        <div className='text-sm space-y-1'>
                                            {affiliate.pricing_minimums?.vps && (
                                                <p>
                                                    <strong>{t('admin.affiliates.vps')}:</strong>{' '}
                                                    {affiliate.pricing_minimums.vps}
                                                </p>
                                            )}
                                            {affiliate.pricing_minimums?.dedicated && (
                                                <p>
                                                    <strong>{t('admin.affiliates.dedicated')}:</strong>{' '}
                                                    {affiliate.pricing_minimums.dedicated}
                                                </p>
                                            )}
                                            {affiliate.pricing_minimums?.storage_vps && (
                                                <p>
                                                    <strong>{t('admin.affiliates.storage_vps')}:</strong>{' '}
                                                    {affiliate.pricing_minimums.storage_vps}
                                                </p>
                                            )}
                                            {affiliate.pricing_minimums?.webhosting && (
                                                <p>
                                                    <strong>{t('admin.affiliates.webhosting')}:</strong>{' '}
                                                    {affiliate.pricing_minimums.webhosting}
                                                </p>
                                            )}
                                            {affiliate.pricing_minimums?.currency && (
                                                <p className='text-muted-foreground'>
                                                    {t('admin.affiliates.currency')}:{' '}
                                                    {affiliate.pricing_minimums.currency}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className='space-y-2'>
                                        <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                                            <span className='inline-flex items-center gap-1'>
                                                <Network className='h-3.5 w-3.5' />
                                                {t('admin.affiliates.network')}
                                            </span>
                                        </p>
                                        <div className='text-sm space-y-2'>
                                            {primaryAsn && (
                                                <div>
                                                    <p>
                                                        <strong>{t('admin.affiliates.primary_asn')}:</strong>{' '}
                                                        {primaryAsn}
                                                    </p>
                                                    {primaryAsnBGP && (
                                                        <a
                                                            href={primaryAsnBGP}
                                                            target='_blank'
                                                            rel='noreferrer noopener'
                                                            className='text-xs text-primary hover:underline'
                                                        >
                                                            {t('admin.affiliates.view_on_bgp_tools')}
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {upstreams.length > 0 && (
                                                <div className='space-y-1'>
                                                    <p className='text-muted-foreground'>
                                                        {t('admin.affiliates.upstreams')}: {upstreams.length}
                                                    </p>
                                                    {upstreams.map((upstream, upstreamIndex) => {
                                                        const upstreamAsn = upstream.asn ?? '';
                                                        const upstreamBGP = bgpToolsUrl(upstreamAsn);
                                                        return (
                                                            <div
                                                                key={`${upstream.asn ?? 'asn'}-${upstreamIndex}`}
                                                                className='rounded-lg border border-border/40 px-2 py-1.5 text-xs'
                                                            >
                                                                <div className='font-medium'>
                                                                    {upstream.name || t('common.unknown')}
                                                                </div>
                                                                {upstreamAsn && (
                                                                    <div className='flex items-center justify-between gap-2 text-muted-foreground mt-0.5'>
                                                                        <span>{upstreamAsn}</span>
                                                                        {upstreamBGP && (
                                                                            <a
                                                                                href={upstreamBGP}
                                                                                target='_blank'
                                                                                rel='noreferrer noopener'
                                                                                className='text-primary hover:underline'
                                                                            >
                                                                                {t('admin.affiliates.bgp_tools')}
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className='space-y-2'>
                                        <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                                            {t('admin.affiliates.features')}
                                        </p>
                                        <div className='space-y-2'>
                                            {speeds.length > 0 && (
                                                <div>
                                                    <p className='text-[11px] font-semibold text-muted-foreground mb-1'>
                                                        {t('admin.affiliates.port_speeds')}
                                                    </p>
                                                    <div className='flex flex-wrap gap-2'>
                                                        {speeds.map((item) => (
                                                            <span
                                                                key={item}
                                                                className='rounded-full border border-border/50 px-2.5 py-1 text-xs'
                                                            >
                                                                {item}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {ddos.length > 0 && (
                                                <div>
                                                    <p className='text-[11px] font-semibold text-muted-foreground mb-1 inline-flex items-center gap-1'>
                                                        <Shield className='h-3.5 w-3.5' />
                                                        {t('admin.affiliates.ddos_protection')}
                                                    </p>
                                                    <div className='flex flex-wrap gap-2'>
                                                        {ddos.map((item) => (
                                                            <span
                                                                key={item}
                                                                className='rounded-full border border-border/50 px-2.5 py-1 text-xs'
                                                            >
                                                                {item}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {(sellingPoints.length > 0 || locations.length > 0) && (
                                                <div className='flex flex-wrap gap-2 pt-1'>
                                                    {sellingPoints.map((point) => (
                                                        <span
                                                            key={`sp-${point}`}
                                                            className={cn(
                                                                'rounded-full px-2.5 py-1 text-xs border',
                                                                'border-primary/30 bg-primary/10 text-primary',
                                                            )}
                                                        >
                                                            {point}
                                                        </span>
                                                    ))}
                                                    {locations.map((loc) => (
                                                        <span
                                                            key={`loc-${loc}`}
                                                            className='inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-xs'
                                                        >
                                                            <MapPin className='h-3 w-3' />
                                                            {loc.toUpperCase()}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className='mt-6 rounded-2xl border border-border/50 bg-muted/20 p-4'>
                <div className='flex items-start gap-2'>
                    <HeartHandshake className='h-4 w-4 mt-0.5 text-primary shrink-0' />
                    <div className='space-y-3'>
                        <p className='text-sm font-semibold'>{t('admin.affiliates.support_title')}</p>
                        <p className='text-xs text-muted-foreground'>{t('admin.affiliates.support_description')}</p>
                        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2'>
                            <a href='https://cloud.mythical.systems/market' target='_blank' rel='noreferrer noopener'>
                                <Button type='button' size='sm' variant='outline' className='w-full justify-start'>
                                    <ExternalLink className='h-4 w-4 mr-2' />
                                    {t('admin.affiliates.support_cloud')}
                                </Button>
                            </a>
                            <a href='https://github.com/sponsors/nayskutzu' target='_blank' rel='noreferrer noopener'>
                                <Button type='button' size='sm' variant='outline' className='w-full justify-start'>
                                    <ExternalLink className='h-4 w-4 mr-2' />
                                    {t('admin.affiliates.support_github')}
                                </Button>
                            </a>
                            <a
                                href='https://www.paypal.com/paypalme/nayskutzu'
                                target='_blank'
                                rel='noreferrer noopener'
                            >
                                <Button type='button' size='sm' variant='outline' className='w-full justify-start'>
                                    <ExternalLink className='h-4 w-4 mr-2' />
                                    {t('admin.affiliates.support_paypal')}
                                </Button>
                            </a>
                            <a
                                href='https://donate.stripe.com/00gcO2epX5yj2ysfYY'
                                target='_blank'
                                rel='noreferrer noopener'
                            >
                                <Button type='button' size='sm' variant='outline' className='w-full justify-start'>
                                    <ExternalLink className='h-4 w-4 mr-2' />
                                    {t('admin.affiliates.support_stripe')}
                                </Button>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </PageCard>
    );
}
