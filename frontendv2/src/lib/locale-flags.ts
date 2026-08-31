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

/** ISO 3166-1 alpha-2 country codes for flagcdn.com */
const LOCALE_FLAG_MAP: Record<string, string> = {
    en: 'us',
    'en-us': 'us',
    'en-gb': 'gb',
    'en-au': 'au',
    'en-ca': 'ca',
    ro: 'ro',
    de: 'de',
    'de-at': 'at',
    'de-ch': 'ch',
    fr: 'fr',
    'fr-ca': 'ca',
    es: 'es',
    'es-mx': 'mx',
    it: 'it',
    pt: 'pt',
    'pt-br': 'br',
    'pt-pt': 'pt',
    nl: 'nl',
    pl: 'pl',
    ru: 'ru',
    zh: 'cn',
    'zh-cn': 'cn',
    'zh-tw': 'tw',
    ja: 'jp',
    ko: 'kr',
    ar: 'sa',
    tr: 'tr',
    sv: 'se',
    no: 'no',
    nb: 'no',
    nn: 'no',
    da: 'dk',
    fi: 'fi',
    cs: 'cz',
    hu: 'hu',
    el: 'gr',
    he: 'il',
    th: 'th',
    vi: 'vn',
    id: 'id',
    ms: 'my',
    uk: 'ua',
    bg: 'bg',
    hr: 'hr',
    sk: 'sk',
    sl: 'si',
    sr: 'rs',
    et: 'ee',
    lv: 'lv',
    lt: 'lt',
};

const RTL_LOCALES = new Set(['ar', 'he']);

export function localeToFlagCode(locale: string): string {
    const normalized = locale.trim().toLowerCase().replace(/_/g, '-');
    if (LOCALE_FLAG_MAP[normalized]) {
        return LOCALE_FLAG_MAP[normalized];
    }

    const base = normalized.split('-')[0] ?? normalized;
    return LOCALE_FLAG_MAP[base] ?? base.slice(0, 2);
}

export function flagCdnUrl(flagCode: string, width = 24): string {
    const height = Math.round(width * 0.75);
    return `https://flagcdn.com/${width}x${height}/${flagCode}.png`;
}

export function flagCdnSrcSet(flagCode: string, width = 24): string {
    const height = Math.round(width * 0.75);
    const w2 = width * 2;
    const h2 = height * 2;
    const w3 = width * 3;
    const h3 = height * 3;
    return `https://flagcdn.com/${w2}x${h2}/${flagCode}.png 2x, https://flagcdn.com/${w3}x${h3}/${flagCode}.png 3x`;
}

export function isRtlLocale(locale: string): boolean {
    const base = locale.trim().toLowerCase().replace(/_/g, '-').split('-')[0];
    return RTL_LOCALES.has(base);
}
