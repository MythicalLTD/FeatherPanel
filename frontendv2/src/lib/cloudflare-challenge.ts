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
    'enable javascript and cookies to continue',
];

export function isCloudflareChallengeText(value: string | null | undefined): boolean {
    const text = (value || '').toLowerCase();
    if (!text) return false;
    return CHALLENGE_MARKERS.some((marker) => text.includes(marker));
}

export function isCloudflareChallengeResponseData(data: unknown): boolean {
    if (typeof data === 'string') {
        return isCloudflareChallengeText(data);
    }
    return false;
}

/** Detect Cloudflare challenge / Precursor interstitial from an Axios response or error. */
export function isCloudflareChallengeAxios(errorOrResponse: unknown): boolean {
    if (!errorOrResponse || typeof errorOrResponse !== 'object') {
        return false;
    }

    const maybeError = errorOrResponse as {
        response?: { data?: unknown; headers?: Record<string, unknown>; status?: number };
        data?: unknown;
        headers?: Record<string, unknown>;
        status?: number;
    };

    const response = maybeError.response ?? maybeError;
    const data = response?.data;
    if (isCloudflareChallengeResponseData(data)) {
        return true;
    }

    const headers = response?.headers as Record<string, unknown> | undefined;
    const contentType = String(headers?.['content-type'] ?? headers?.['Content-Type'] ?? '').toLowerCase();
    if (contentType.includes('text/html') && typeof data === 'string') {
        return isCloudflareChallengeText(data);
    }

    // Common CF challenge status when body is HTML interstitial
    const status = response?.status;
    if ((status === 403 || status === 503) && typeof data === 'string' && data.includes('<html')) {
        return isCloudflareChallengeText(data) || data.toLowerCase().includes('cloudflare');
    }

    return false;
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
