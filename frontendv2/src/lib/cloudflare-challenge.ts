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

const CHALLENGE_MARKERS = [
    'just a moment',
    'checking your browser before accessing',
    'cf-browser-verification',
    'challenges.cloudflare.com',
    '__cf_chl_',
    'cf-chl-',
];

export function isCloudflareChallengeText(value: string | null | undefined): boolean {
    const text = (value || '').toLowerCase();
    if (!text) return false;
    return CHALLENGE_MARKERS.some((marker) => text.includes(marker));
}

export function isCloudflareChallengeResponseData(data: unknown): boolean {
    return typeof data === 'string' && isCloudflareChallengeText(data);
}

export function isCloudflareChallengeDocument(doc: Document | null | undefined): boolean {
    if (!doc) return false;

    const title = (doc.title || '').toLowerCase();
    const bodyText = (doc.body?.textContent || '').toLowerCase();
    const html = (doc.documentElement?.innerHTML || '').slice(0, 12000).toLowerCase();

    return CHALLENGE_MARKERS.some(
        (marker) => title.includes(marker) || bodyText.includes(marker) || html.includes(marker),
    );
}

export function withCacheBuster(url: string): string {
    try {
        const parsed = new URL(url, window.location.origin);
        parsed.searchParams.set('_fp_challenge_retry', Date.now().toString());

        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}_fp_challenge_retry=${Date.now()}`;
    }
}
