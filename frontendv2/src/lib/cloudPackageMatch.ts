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

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
    value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;

export const normalizeCloudPackageId = (value: string) => value.trim().toLowerCase();

export const compactCloudPackageId = (value: string) => normalizeCloudPackageId(value).replace(/[^a-z0-9]/g, '');

/** Last path segment from MythicalCloud / FeatherPanel marketplace URLs. */
export const extractStoreSlugFromUrl = (url: string): string | null => {
    const trimmed = url.trim();
    if (trimmed === '') {
        return null;
    }
    try {
        const pathname = new URL(trimmed).pathname;
        const segments = pathname.split('/').filter((segment) => segment.length > 0);
        return segments.length > 0 ? segments[segments.length - 1] : null;
    } catch {
        const withoutQuery = trimmed.split('?')[0]?.split('#')[0] ?? trimmed;
        const segments = withoutQuery.split('/').filter((segment) => segment.length > 0);
        return segments.length > 0 ? segments[segments.length - 1] : null;
    }
};

const addMatchKey = (keys: Set<string>, value: unknown) => {
    if (typeof value !== 'string') {
        return;
    }
    const normalized = normalizeCloudPackageId(value);
    if (normalized !== '') {
        keys.add(normalized);
    }
    if (!value.includes('://') && !value.startsWith('//')) {
        return;
    }
    const slug = extractStoreSlugFromUrl(value);
    if (!slug) {
        return;
    }
    const slugNorm = normalizeCloudPackageId(slug);
    if (slugNorm !== '' && slugNorm !== normalized) {
        keys.add(slugNorm);
    }
};

const compactIdsFuzzyMatch = (a: string, b: string): boolean => {
    if (a === b) {
        return true;
    }
    const minLen = 10;
    if (a.length < minLen || b.length < minLen) {
        return false;
    }
    const maxLenDiff = 1;
    if (Math.abs(a.length - b.length) > maxLenDiff) {
        return false;
    }
    let i = 0;
    let j = 0;
    let edits = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            i += 1;
            j += 1;
            continue;
        }
        edits += 1;
        if (edits > 1) {
            return false;
        }
        if (a.length > b.length) {
            i += 1;
        } else if (b.length > a.length) {
            j += 1;
        } else {
            i += 1;
            j += 1;
        }
    }
    edits += a.length - i + (b.length - j);
    return edits <= 1;
};

/** Whether a FeatherCloud purchase id matches a panel addon id / store slug. */
export const cloudPackageIdsMatch = (ownedId: string, addonId: string): boolean => {
    const ownedNorm = normalizeCloudPackageId(ownedId);
    const addonNorm = normalizeCloudPackageId(addonId);
    if (ownedNorm === addonNorm) {
        return true;
    }
    const ownedCompact = compactCloudPackageId(ownedId);
    const addonCompact = compactCloudPackageId(addonId);
    if (ownedCompact === '' || addonCompact === '') {
        return false;
    }
    if (ownedCompact === addonCompact) {
        return true;
    }
    return compactIdsFuzzyMatch(ownedCompact, addonCompact);
};

/** Keys used to match an online addon row against owned cloud product ids. */
export const collectAddonMatchKeys = (
    identifier: string,
    options?: { premiumLink?: string | null; storeSlug?: string | null; displayName?: string | null },
): string[] => {
    const keys = new Set<string>();
    addMatchKey(keys, identifier);
    addMatchKey(keys, options?.storeSlug);
    addMatchKey(keys, options?.premiumLink);
    addMatchKey(keys, options?.displayName);
    return [...keys];
};

export const isCloudPackageOwned = (
    ownedIds: readonly string[],
    identifier: string,
    options?: { premiumLink?: string | null; storeSlug?: string | null; displayName?: string | null },
): boolean => {
    const addonKeys = collectAddonMatchKeys(identifier, options);
    if (addonKeys.length === 0 || ownedIds.length === 0) {
        return false;
    }
    return ownedIds.some((ownedId) => addonKeys.some((addonKey) => cloudPackageIdsMatch(ownedId, addonKey)));
};

const PURCHASE_STRING_FIELDS = [
    'identifier',
    'package_identifier',
    'product_identifier',
    'package_name',
    'product_name',
    'name',
    'slug',
    'url',
    'link',
    'product_url',
    'marketplace_url',
    'premium_link',
    'store_url',
] as const;

const collectFromRecord = (keys: Set<string>, source: UnknownRecord | null) => {
    if (!source) {
        return;
    }
    for (const field of PURCHASE_STRING_FIELDS) {
        addMatchKey(keys, source[field]);
    }
};

/** Extract all matchable ids from a FeatherCloud purchase payload. */
export const collectOwnedCloudPackageIds = (purchase: unknown): string[] => {
    const keys = new Set<string>();
    const root = asRecord(purchase);
    collectFromRecord(keys, root);
    for (const field of ['product', 'package', 'addon', 'item']) {
        collectFromRecord(keys, asRecord(root?.[field]));
    }
    return [...keys];
};
