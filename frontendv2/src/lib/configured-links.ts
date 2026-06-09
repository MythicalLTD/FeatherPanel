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

import type { AppSettings } from '@/types/settings';

export interface ConfiguredLink {
    id: string;
    label: string;
    href: string;
    external: boolean;
}

type LinkSource = {
    id: string;
    labelKey: string;
    url?: string;
};

function isExternalUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
}

function resolveHref(url: string): { href: string; external: boolean } {
    const trimmed = url.trim();
    if (!trimmed) {
        return { href: '', external: false };
    }

    if (isExternalUrl(trimmed)) {
        return { href: trimmed, external: true };
    }

    return { href: trimmed.startsWith('/') ? trimmed : `/${trimmed}`, external: false };
}

export function getConfiguredLinks(
    settings: Partial<AppSettings> | null | undefined,
    t: (key: string) => string,
): ConfiguredLink[] {
    if (!settings) {
        return [];
    }

    const sources: LinkSource[] = [
        { id: 'website', labelKey: 'links.website', url: settings.website_url },
        { id: 'support', labelKey: 'links.support', url: settings.app_support_url },
        { id: 'discord', labelKey: 'links.discord', url: settings.discord_url },
        { id: 'linkedin', labelKey: 'links.linkedin', url: settings.linkedin_url },
        { id: 'telegram', labelKey: 'links.telegram', url: settings.telegram_url },
        { id: 'tiktok', labelKey: 'links.tiktok', url: settings.tiktok_url },
        { id: 'twitter', labelKey: 'links.twitter', url: settings.twitter_url },
        { id: 'whatsapp', labelKey: 'links.whatsapp', url: settings.whatsapp_url },
        { id: 'youtube', labelKey: 'links.youtube', url: settings.youtube_url },
        { id: 'status', labelKey: 'links.status', url: settings.status_page_url },
        { id: 'terms', labelKey: 'links.terms', url: settings.legal_tos },
        { id: 'privacy', labelKey: 'links.privacy', url: settings.legal_privacy },
    ];

    const links: ConfiguredLink[] = [];

    for (const source of sources) {
        const trimmed = source.url?.trim();
        if (!trimmed) {
            continue;
        }

        const { href, external } = resolveHref(trimmed);
        if (!href) {
            continue;
        }

        links.push({
            id: source.id,
            label: t(source.labelKey),
            href,
            external,
        });
    }

    return links;
}

export function getLegalLinks(
    settings: Partial<AppSettings> | null | undefined,
    t: (key: string) => string,
): { terms: ConfiguredLink | null; privacy: ConfiguredLink | null } {
    const links = getConfiguredLinks(settings, t);
    return {
        terms: links.find((link) => link.id === 'terms') ?? null,
        privacy: links.find((link) => link.id === 'privacy') ?? null,
    };
}
