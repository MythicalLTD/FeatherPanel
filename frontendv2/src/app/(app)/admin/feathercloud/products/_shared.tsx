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

import React from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FEATHERPANEL_CATEGORY_SLUG = 'featherpanel-plugins';

export interface StoreProduct {
    id?: number | string;
    name?: string;
    /** Marketplace product slug use for Mythic API / detail routes. */
    slug?: string;
    /**
     * Panel-facing plugin id from Mythic (`featherpanel_plugin_identifier` or slug fallback).
     * Matches local conf.yml / addons folder identifier when possible.
     */
    identifier?: string;
    /** Explicit FeatherPanel plugin identifier when MythicalCloud downloads are enabled. */
    featherpanel_plugin_identifier?: string | null;
    tagline?: string;
    description?: string;
    description_format?: string;
    icon_url?: string | null;
    gallery_urls?: string[];
    price?: number | string;
    list_price?: number | string;
    effective_price?: number | string;
    currency?: { code?: string; symbol?: string };
    is_free?: boolean;
    allow_mythicalcloud_download?: boolean;
    category?: { name?: string; slug?: string };
    seller?: { name?: string; profile_photo_url?: string | null };
    average_rating?: number;
    review_count?: number;
    versions_count?: number;
    question_count?: number;
    latest_version?: VersionRow | null;
    versions?: VersionRow[];
    reviews?: ReviewRow[];
    questions?: QuestionRow[];
}

export interface VersionRow {
    id?: number | string;
    version?: string;
    title?: string | null;
    changelog?: string | null;
    changelog_format?: string;
    file_name?: string;
    created_at?: string;
}

export interface ReviewRow {
    id?: string | number;
    rating?: number;
    comment?: string;
    created_at?: string;
    user?: { id?: number | string; username?: string; name?: string };
}

export interface QuestionReply {
    id?: number | string;
    body?: string;
    created_at?: string;
    is_team_member?: boolean;
    user?: { id?: number | string; username?: string };
}

export interface QuestionRow {
    id?: number | string;
    body?: string;
    created_at?: string;
    is_team_member?: boolean;
    user?: { id?: number | string; username?: string };
    replies?: QuestionReply[];
}

export interface StoreItem {
    kind?: string;
    owned?: boolean;
    can_download?: boolean;
    product?: StoreProduct;
}

export interface DetailMeta {
    average_rating?: number;
    review_count?: number;
    question_count?: number;
    versions_count?: number;
}

export type DetailTab = 'overview' | 'versions' | 'reviews' | 'questions';

export type TranslateFn = (key: string, params?: Record<string, string>) => string;

const MYTHIC_ERROR_KEYS: Record<string, string> = {
    PANEL_DOWNLOADS_DISABLED: 'admin.marketplace.plugins.errors.panel_downloads_disabled',
    ACCESS_DENIED: 'admin.marketplace.plugins.errors.access_denied',
    INVALID_USER_UUID: 'admin.marketplace.plugins.errors.invalid_user_uuid',
    USER_NOT_TEAM_MEMBER: 'admin.marketplace.plugins.errors.user_not_team_member',
    MEMBER_UUID_REQUIRED: 'admin.marketplace.plugins.errors.member_uuid_required',
    NO_RELEASES: 'admin.marketplace.plugins.errors.no_releases',
    PRODUCT_NOT_FOUND: 'admin.marketplace.plugins.errors.product_not_found',
    REVIEW_NOT_FOUND: 'admin.marketplace.plugins.errors.review_not_found',
};

export function mythicCloudErrorFromPayload(
    payload: { error_code?: string; message?: string; error?: string } | null | undefined,
    fallback: string,
    t?: TranslateFn,
): string {
    const code = String(payload?.error_code || '');
    const message = payload?.message || (typeof payload?.error === 'string' ? payload.error : null) || fallback;
    const key = MYTHIC_ERROR_KEYS[code];
    if (key && t) {
        const translated = t(key);
        if (translated !== key) return translated;
    }
    switch (code) {
        case 'PANEL_DOWNLOADS_DISABLED':
            return 'Panel downloads are disabled for this product.';
        case 'ACCESS_DENIED':
            return message || 'Access denied for this Mythic marketplace action.';
        case 'INVALID_USER_UUID':
            return 'Missing or invalid Mythic user id. Re-link Cloud Connections.';
        case 'USER_NOT_TEAM_MEMBER':
            return 'This panel user is not a member of the linked Mythic team.';
        case 'MEMBER_UUID_REQUIRED':
            return 'Your panel user is not mapped to a Mythic team member. Re-link Cloud Connections with a matching email.';
        case 'NO_RELEASES':
            return 'No downloadable releases for this product.';
        case 'PRODUCT_NOT_FOUND':
            return 'Product not found on Mythic store.';
        case 'REVIEW_NOT_FOUND':
            return 'Review not found.';
        default:
            return message;
    }
}

export function mythicCloudErrorMessage(err: unknown, fallback: string, t?: TranslateFn): string {
    if (!axios.isAxiosError(err)) return fallback;
    return mythicCloudErrorFromPayload(err.response?.data, fallback, t);
}

/** Marketplace slug for store detail URLs and Mythic download/release APIs. */
export function productSlug(product?: StoreProduct | null): string {
    if (!product) return '';
    const slug = String(product.slug || '').trim();
    if (slug) return slug;
    // Legacy / incomplete payloads may omit slug.
    return String(product.identifier || '').trim();
}

/**
 * Local plugin identifier used to detect installs (conf.yml / addons folder).
 * Prefers explicit featherpanel_plugin_identifier, then shared identifier, then slug.
 */
export function pluginIdentifier(product?: StoreProduct | null): string {
    if (!product) return '';
    const explicit = String(product.featherpanel_plugin_identifier || '').trim();
    if (explicit) return explicit;
    const shared = String(product.identifier || '').trim();
    if (shared) return shared;
    return String(product.slug || '').trim();
}

export function isFeatherPanelPlugin(product?: StoreProduct | null): boolean {
    return product?.category?.slug === FEATHERPANEL_CATEGORY_SLUG;
}

export function canInstallItem(item: StoreItem): boolean {
    if (item.kind === 'bundle') return false;
    if (!isFeatherPanelPlugin(item.product)) return false;
    if (item.can_download !== true) return false;
    if (item.product?.allow_mythicalcloud_download === false) return false;
    return productSlug(item.product) !== '';
}

/** Whether a store product matches an installed local plugin identifier. */
export function isPluginInstalled(
    product: StoreProduct | null | undefined,
    installedIds: ReadonlySet<string> | readonly string[] | ReadonlyMap<string, InstalledPluginInfo>,
): boolean {
    return resolveInstalledPlugin(product, installedIds) !== null;
}

export interface InstalledPluginInfo {
    /** Local folder / conf.yml identifier. */
    identifier: string;
    version: string;
}

function compactPluginId(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function installedPluginLookup(
    installed: ReadonlySet<string> | readonly string[] | ReadonlyMap<string, InstalledPluginInfo>,
): Map<string, InstalledPluginInfo> {
    if (installed instanceof Map) {
        return installed;
    }
    const map = new Map<string, InstalledPluginInfo>();
    const values = installed instanceof Set ? [...installed] : [...installed];
    for (const value of values) {
        const id = String(value || '').trim();
        if (!id) continue;
        map.set(id.toLowerCase(), { identifier: id, version: '' });
    }
    return map;
}

/** Parse `/api/admin/plugins` payload into identifier → version map (lower + compact keys). */
export function extractInstalledPlugins(pluginsPayload: unknown): Map<string, InstalledPluginInfo> {
    const map = new Map<string, InstalledPluginInfo>();
    if (!pluginsPayload || typeof pluginsPayload !== 'object') return map;

    const add = (identifier: string, version: string) => {
        const id = identifier.trim();
        if (!id) return;
        const info: InstalledPluginInfo = { identifier: id, version: version.trim() };
        map.set(id.toLowerCase(), info);
        const compact = compactPluginId(id);
        if (compact && compact !== id.toLowerCase()) {
            map.set(compact, info);
        }
    };

    for (const [key, pluginData] of Object.entries(pluginsPayload as Record<string, unknown>)) {
        const nested =
            pluginData && typeof pluginData === 'object'
                ? (pluginData as { plugin?: { identifier?: string; version?: string } }).plugin
                : null;
        const identifier = String(nested?.identifier || key || '').trim();
        const version = String(nested?.version || '').trim();
        add(identifier, version);
        if (key && key !== identifier) add(String(key), version);
    }
    return map;
}

/** Resolve the local install entry that matches a store product, if any. */
export function resolveInstalledPlugin(
    product: StoreProduct | null | undefined,
    installed: ReadonlySet<string> | readonly string[] | ReadonlyMap<string, InstalledPluginInfo>,
): InstalledPluginInfo | null {
    const id = pluginIdentifier(product);
    if (!id) return null;
    const map = installedPluginLookup(installed);
    if (map.size === 0) return null;

    const normalized = id.trim().toLowerCase();
    const direct = map.get(normalized);
    if (direct) return direct;

    const needle = compactPluginId(normalized);
    if (!needle) return null;
    return map.get(needle) || null;
}

export function comparePluginVersions(a: string, b: string): number {
    const normalize = (v: string) =>
        v
            .trim()
            .replace(/^v/i, '')
            .split(/[.+_-]/)
            .map((part) => {
                const n = Number.parseInt(part, 10);
                return Number.isFinite(n) ? n : 0;
            });
    const left = normalize(a);
    const right = normalize(b);
    const len = Math.max(left.length, right.length);
    for (let i = 0; i < len; i += 1) {
        const l = left[i] || 0;
        const r = right[i] || 0;
        if (l < r) return -1;
        if (l > r) return 1;
    }
    return 0;
}

export function storeLatestVersion(product?: StoreProduct | null): string {
    if (!product) return '';
    return String(product.latest_version?.version || product.versions?.[0]?.version || '').trim();
}

/** True when the product is installed and Mythic has a newer release. */
export function hasPluginUpdate(
    product: StoreProduct | null | undefined,
    installed: ReadonlySet<string> | readonly string[] | ReadonlyMap<string, InstalledPluginInfo>,
): boolean {
    const local = resolveInstalledPlugin(product, installed);
    const latest = storeLatestVersion(product);
    if (!local?.version || !latest) return false;
    return comparePluginVersions(local.version, latest) < 0;
}

export function isProductFree(product?: StoreProduct | null): boolean {
    if (!product) return false;
    return Boolean(product.is_free || Number(product.effective_price ?? product.price ?? 0) <= 0);
}

export function formatPrice(product?: StoreProduct | null, labels?: { free?: string; empty?: string }): string {
    if (!product) return labels?.empty ?? '—';
    if (isProductFree(product)) return labels?.free ?? 'Free';
    return `${product.currency?.symbol || '€'}${String(product.effective_price ?? product.price ?? '0.00')}`;
}

export function bannerUrl(product?: StoreProduct | null): string | null {
    return product?.gallery_urls?.[0] || product?.icon_url || null;
}

export function extractStoreItems(data: unknown): StoreItem[] {
    if (!data || typeof data !== 'object') return [];
    const d = data as Record<string, unknown>;
    return Array.isArray(d.items) ? (d.items as StoreItem[]) : [];
}

export async function parseBlobError(err: unknown, fallback: string, t?: TranslateFn): Promise<string> {
    if (!axios.isAxiosError(err)) return fallback;
    const data = err.response?.data;
    if (data instanceof Blob) {
        try {
            return mythicCloudErrorFromPayload(JSON.parse(await data.text()), fallback, t);
        } catch {
            return fallback;
        }
    }
    return mythicCloudErrorMessage(err, fallback, t);
}

export function MarkdownBody({ content, className }: { content: string; className?: string }) {
    if (!content.trim()) return null;
    return (
        <div
            className={cn(
                'prose prose-sm dark:prose-invert max-w-none',
                'prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground',
                'prose-strong:text-foreground prose-a:text-primary',
                'prose-code:text-primary prose-code:bg-muted prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none',
                'prose-pre:bg-muted/60',
                className,
            )}
        >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
    );
}

/** Display-only star row (1–5). */
export function StarDisplay({
    rating,
    size = 'sm',
    className,
    ariaLabel,
}: {
    rating: number;
    size?: 'sm' | 'md';
    className?: string;
    ariaLabel?: string;
}) {
    const value = Math.max(0, Math.min(5, Number(rating) || 0));
    const icon = size === 'md' ? 'h-5 w-5' : 'h-3.5 w-3.5';
    return (
        <span
            className={cn('inline-flex items-center gap-0.5', className)}
            aria-label={ariaLabel || `${value} out of 5 stars`}
        >
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    className={cn(
                        icon,
                        n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/35',
                    )}
                    aria-hidden
                />
            ))}
        </span>
    );
}

/** Interactive rating picker. */
export function StarRatingInput({
    value,
    onChange,
    disabled,
    groupLabel,
    starLabel,
}: {
    value: number;
    onChange: (rating: number) => void;
    disabled?: boolean;
    groupLabel?: string;
    starLabel?: (count: number) => string;
}) {
    const [hover, setHover] = React.useState(0);
    const shown = hover || value;

    return (
        <div className='flex items-center gap-1' role='radiogroup' aria-label={groupLabel || 'Rating'}>
            {[1, 2, 3, 4, 5].map((n) => {
                const active = n <= shown;
                return (
                    <button
                        key={n}
                        type='button'
                        role='radio'
                        aria-checked={value === n}
                        aria-label={starLabel ? starLabel(n) : `${n} star${n === 1 ? '' : 's'}`}
                        disabled={disabled}
                        className={cn(
                            'rounded-md p-0.5 transition-transform hover:scale-110 disabled:opacity-50',
                            'focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none',
                        )}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onFocus={() => setHover(n)}
                        onBlur={() => setHover(0)}
                        onClick={() => onChange(n)}
                    >
                        <Star
                            className={cn(
                                'h-7 w-7',
                                active ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
                            )}
                        />
                    </button>
                );
            })}
        </div>
    );
}

export async function downloadAndInstall(slug: string, version: string): Promise<void> {
    const response = await axios.get(
        `/api/admin/cloud/data/products/${encodeURIComponent(slug)}/releases/${encodeURIComponent(version)}/download`,
        { responseType: 'blob' },
    );
    const contentType = String(response.headers['content-type'] || '');
    if (contentType.includes('application/json')) {
        const text = await (response.data as Blob).text();
        let payload: unknown = null;
        try {
            payload = JSON.parse(text);
        } catch {
            payload = null;
        }
        throw Object.assign(new Error('Download failed'), {
            isAxiosError: true,
            response: { data: payload },
        });
    }
    const blob = new Blob([response.data], { type: 'application/octet-stream' });
    const form = new FormData();
    form.append('file', blob, `${slug}-${version}.fpa`);
    await axios.post('/api/admin/plugins/upload/install', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
}

export async function resolveInstallVersion(slug: string, item?: StoreItem | null): Promise<string | null> {
    const embedded = item?.product?.latest_version?.version || item?.product?.versions?.[0]?.version;
    if (embedded) return String(embedded);
    try {
        const res = await axios.get(`/api/admin/cloud/data/store/products/${encodeURIComponent(slug)}/versions`);
        const versions = res.data?.data?.versions;
        if (Array.isArray(versions) && versions[0]?.version) return String(versions[0].version);
    } catch {
        /* fall through */
    }
    const relRes = await axios.get(`/api/admin/cloud/data/products/${encodeURIComponent(slug)}/releases`);
    const releases = relRes.data?.data?.releases;
    if (Array.isArray(releases) && releases[0]?.version) return String(releases[0].version);
    return null;
}
