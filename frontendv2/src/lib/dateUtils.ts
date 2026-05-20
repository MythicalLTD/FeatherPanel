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

import { format, formatDistanceToNowStrict, parseISO, type Locale } from 'date-fns';
import {
    ar,
    cs,
    de,
    el,
    enGB,
    enUS,
    es,
    fi,
    fr,
    he,
    hi,
    hu,
    id,
    it,
    ja,
    ko,
    nb,
    nl,
    pl,
    pt,
    ptBR,
    ro,
    ru,
    sv,
    th,
    tr,
    uk,
    vi,
    zhCN,
} from 'date-fns/locale';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const NAIVE_MYSQL_DATETIME = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d+)?$/;

/**
 * Parse a datetime value returned by the API into a `Date`.
 *
 * - ISO-8601 strings with an offset or `Z` are parsed via `parseISO`.
 * - Naive `Y-m-d H:i:s` strings are rewritten to ISO-8601 with a `Z` suffix
 *   (i.e. **assumed UTC**) before parsing. This matches the backend storage
 *   contract (MySQL session is pinned to `+00:00`).
 * - Numbers are treated as Unix timestamps in **seconds** when < 1e12,
 *   otherwise milliseconds.
 * - Returns `null` for null/undefined/empty/invalid input.
 */
export function parseApiDate(value: string | number | Date | null | undefined): Date | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) {
        return Number.isFinite(value.getTime()) ? value : null;
    }
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return null;
        const ms = value < 1e12 ? value * 1000 : value;
        const d = new Date(ms);
        return Number.isFinite(d.getTime()) ? d : null;
    }
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '0000-00-00 00:00:00') return null;

    let candidate: string = trimmed;
    const m = trimmed.match(NAIVE_MYSQL_DATETIME);
    if (m) {
        candidate = `${m[1]}T${m[2]}${m[3] ?? ''}Z`;
    }

    const d = parseISO(candidate);
    return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Map a TranslationContext locale code (e.g. `en`, `pt-BR`, `pt_BR`) to a
 * `date-fns` locale object. Falls back to `enUS` for unknown values.
 *
 * Keep the table small but representative — extra locales can be added on
 * demand once they are introduced in the translation system.
 */
const DATE_FNS_LOCALES: Record<string, Locale> = {
    en: enUS,
    'en-US': enUS,
    'en-GB': enGB,
    de: de,
    fr: fr,
    es: es,
    it: it,
    pt: pt,
    'pt-BR': ptBR,
    nl: nl,
    pl: pl,
    ru: ru,
    uk: uk,
    cs: cs,
    hu: hu,
    ro: ro,
    el: el,
    sv: sv,
    nb: nb,
    fi: fi,
    tr: tr,
    ar: ar,
    he: he,
    hi: hi,
    th: th,
    vi: vi,
    id: id,
    ja: ja,
    ko: ko,
    'zh-CN': zhCN,
    zh: zhCN,
};

export function resolveDateFnsLocale(code: string | null | undefined): Locale {
    if (!code) return enUS;
    const normalised = code.replace('_', '-');
    if (DATE_FNS_LOCALES[normalised]) return DATE_FNS_LOCALES[normalised];
    // Fall back to the language-only prefix (e.g. `pt-PT` → `pt`).
    const prefix = normalised.split('-')[0];
    if (DATE_FNS_LOCALES[prefix]) return DATE_FNS_LOCALES[prefix];
    return enUS;
}

/**
 * Get the user's effective IANA timezone identifier.
 *
 * Priority: explicit preference > browser detection > `'UTC'` as a last resort.
 */
export function getEffectiveTimezone(preference?: string | null): string {
    if (preference && preference.trim() !== '') return preference;
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) return tz;
    } catch {
        // Intl may be unavailable in very old environments; fall through.
    }
    return 'UTC';
}

export interface FormatDateOptions {
    /** IANA timezone identifier. Defaults to the user's effective timezone. */
    timeZone?: string;
    /** Translation locale code from TranslationContext (e.g. `en`, `pt-BR`). */
    locale?: string;
    /** Override the "now" anchor (mostly useful in tests). */
    now?: Date;
    /**
     * Only used by {@link formatRelativeTime}. `short` (default) uses `Intl.RelativeTimeFormat`
     * with `style: 'narrow'` (~`30 min ago`). `long` uses full `date-fns` distance strings.
     */
    relativeStyle?: 'long' | 'short';
}

/**
 * Compact relative labels (e.g. narrow `30 min ago`) via Intl — locale-aware where the
 * runtime supports it; falls back to {@link formatDistanceToNowStrict} on failure.
 */
function formatRelativeTimeIntlNarrow(date: Date, now: Date, localeCode: string | null | undefined): string {
    const diffSecTotal = Math.round((date.getTime() - now.getTime()) / 1000);
    const absSec = Math.abs(diffSecTotal);

    let value: number;
    let unit: Intl.RelativeTimeFormatUnit;

    if (absSec < 60) {
        value = diffSecTotal;
        unit = 'second';
    } else if (absSec < 3600) {
        value = Math.round(diffSecTotal / 60);
        unit = 'minute';
    } else if (absSec < 86_400) {
        value = Math.round(diffSecTotal / 3600);
        unit = 'hour';
    } else {
        value = Math.round(diffSecTotal / 86_400);
        unit = 'day';
    }

    const tag = (localeCode || 'en').trim().replace('_', '-') || 'en';
    try {
        const rtf = new Intl.RelativeTimeFormat(tag, { numeric: 'always', style: 'narrow' });

        return rtf.format(value, unit);
    } catch {
        return formatDistanceToNowStrict(date, { addSuffix: true, locale: resolveDateFnsLocale(localeCode) });
    }
}

/**
 * Format a date relative to "now" using `date-fns`'s
 * `formatDistanceToNowStrict`. Examples (en-US):
 *   - `"5 seconds ago"`, `"3 minutes ago"`, `"2 hours ago"`
 *   - `"in 1 day"`, `"in 4 months"`
 *
 * With `relativeStyle: 'long'`, uses full `date-fns` distance strings instead of narrow Intl labels.
 *
 * Defaults to `short` (~`30 min ago`) for list-style UIs across the panel.
 * Falls back to an absolute, timezone-aware label once the delta exceeds
 * ~30 days, since "in 3 months" is rarely useful in operational UIs.
 */
export function formatRelativeTime(
    value: string | number | Date | null | undefined,
    options: FormatDateOptions = {},
): string {
    const date = parseApiDate(value);
    if (!date) return '-';

    const now = options.now ?? new Date();
    const diffMs = now.getTime() - date.getTime();
    const absDays = Math.abs(diffMs) / 86_400_000;

    if (absDays > 30) {
        return formatDateTimeInTz(date, { ...options, now });
    }

    const style = options.relativeStyle ?? 'short';
    if (style === 'long') {
        return formatDistanceToNowStrict(date, { addSuffix: true, locale: resolveDateFnsLocale(options.locale) });
    }

    return formatRelativeTimeIntlNarrow(date, now, options.locale);
}

/**
 * Format an absolute date+time in the user's timezone, using the active
 * locale's localised short date + time format.
 */
export function formatDateTimeInTz(
    value: string | number | Date | null | undefined,
    options: FormatDateOptions = {},
): string {
    const date = parseApiDate(value);
    if (!date) return '-';
    const tz = getEffectiveTimezone(options.timeZone);
    const locale = resolveDateFnsLocale(options.locale);
    try {
        return formatInTimeZone(date, tz, 'PPp', { locale });
    } catch {
        // Invalid timezone — fall back to the browser's local zone.
        return format(date, 'PPp', { locale });
    }
}

/**
 * Format an absolute date (no time component) in the user's timezone.
 */
export function formatDateInTz(
    value: string | number | Date | null | undefined,
    options: FormatDateOptions = {},
): string {
    const date = parseApiDate(value);
    if (!date) return '-';
    const tz = getEffectiveTimezone(options.timeZone);
    const locale = resolveDateFnsLocale(options.locale);
    try {
        return formatInTimeZone(date, tz, 'PP', { locale });
    } catch {
        return format(date, 'PP', { locale });
    }
}

/**
 * Convert a UTC `Date` into a "wall-clock" `Date` representing the same
 * instant in the given timezone. Useful when feeding date-fns helpers that
 * don't accept a `timeZone` option (e.g. `differenceInBusinessDays`).
 */
export function dateInUserTz(value: string | number | Date | null | undefined, timeZone?: string): Date | null {
    const date = parseApiDate(value);
    if (!date) return null;
    try {
        return toZonedTime(date, getEffectiveTimezone(timeZone));
    } catch {
        return date;
    }
}

/**
 * Return the list of IANA timezone identifiers supported by the current
 * environment. Falls back to a hand-maintained list of common zones if
 * `Intl.supportedValuesOf` is unavailable.
 */
export function listSupportedTimezones(): string[] {
    type IntlWithSupportedValuesOf = typeof Intl & {
        supportedValuesOf?: (key: 'timeZone') => string[];
    };
    const intl = Intl as IntlWithSupportedValuesOf;
    if (typeof intl.supportedValuesOf === 'function') {
        try {
            const zones = intl.supportedValuesOf('timeZone');
            if (Array.isArray(zones) && zones.length > 0) return zones;
        } catch {
            // ignored
        }
    }
    return FALLBACK_TIMEZONES;
}

const FALLBACK_TIMEZONES: string[] = [
    'Africa/Abidjan',
    'Africa/Accra',
    'Africa/Addis_Ababa',
    'Africa/Algiers',
    'Africa/Asmara',
    'Africa/Bamako',
    'Africa/Bangui',
    'Africa/Banjul',
    'Africa/Bissau',
    'Africa/Blantyre',
    'Africa/Brazzaville',
    'Africa/Bujumbura',
    'Africa/Cairo',
    'Africa/Casablanca',
    'Africa/Ceuta',
    'Africa/Conakry',
    'Africa/Dakar',
    'Africa/Dar_es_Salaam',
    'Africa/Djibouti',
    'Africa/Douala',
    'Africa/El_Aaiun',
    'Africa/Freetown',
    'Africa/Gaborone',
    'Africa/Harare',
    'Africa/Johannesburg',
    'Africa/Juba',
    'Africa/Kampala',
    'Africa/Khartoum',
    'Africa/Kigali',
    'Africa/Kinshasa',
    'Africa/Lagos',
    'Africa/Libreville',
    'Africa/Lome',
    'Africa/Luanda',
    'Africa/Lubumbashi',
    'Africa/Lusaka',
    'Africa/Malabo',
    'Africa/Maputo',
    'Africa/Maseru',
    'Africa/Mbabane',
    'Africa/Mogadishu',
    'Africa/Monrovia',
    'Africa/Nairobi',
    'Africa/Ndjamena',
    'Africa/Niamey',
    'Africa/Nouakchott',
    'Africa/Ouagadougou',
    'Africa/Porto-Novo',
    'Africa/Sao_Tome',
    'Africa/Tripoli',
    'Africa/Tunis',
    'Africa/Windhoek',

    'America/Adak',
    'America/Anchorage',
    'America/Anguilla',
    'America/Antigua',
    'America/Araguaina',
    'America/Argentina/Buenos_Aires',
    'America/Argentina/Catamarca',
    'America/Argentina/Cordoba',
    'America/Argentina/Jujuy',
    'America/Argentina/La_Rioja',
    'America/Argentina/Mendoza',
    'America/Argentina/Rio_Gallegos',
    'America/Argentina/Salta',
    'America/Argentina/San_Juan',
    'America/Argentina/San_Luis',
    'America/Argentina/Tucuman',
    'America/Argentina/Ushuaia',
    'America/Aruba',
    'America/Asuncion',
    'America/Bahia',
    'America/Bahia_Banderas',
    'America/Barbados',
    'America/Belem',
    'America/Belize',
    'America/Blanc-Sablon',
    'America/Boa_Vista',
    'America/Bogota',
    'America/Boise',
    'America/Cambridge_Bay',
    'America/Campo_Grande',
    'America/Cancun',
    'America/Caracas',
    'America/Cayenne',
    'America/Cayman',
    'America/Chicago',
    'America/Chihuahua',
    'America/Costa_Rica',
    'America/Creston',
    'America/Cuiaba',
    'America/Curacao',
    'America/Danmarkshavn',
    'America/Dawson',
    'America/Dawson_Creek',
    'America/Denver',
    'America/Detroit',
    'America/Dominica',
    'America/Edmonton',
    'America/Eirunepe',
    'America/El_Salvador',
    'America/Fort_Nelson',
    'America/Fortaleza',
    'America/Glace_Bay',
    'America/Goose_Bay',
    'America/Grand_Turk',
    'America/Grenada',
    'America/Guadeloupe',
    'America/Guatemala',
    'America/Guayaquil',
    'America/Guyana',
    'America/Halifax',
    'America/Havana',
    'America/Hermosillo',
    'America/Indiana/Indianapolis',
    'America/Indiana/Knox',
    'America/Indiana/Marengo',
    'America/Indiana/Petersburg',
    'America/Indiana/Tell_City',
    'America/Indiana/Vevay',
    'America/Indiana/Vincennes',
    'America/Indiana/Winamac',
    'America/Inuvik',
    'America/Iqaluit',
    'America/Jamaica',
    'America/Juneau',
    'America/Kentucky/Louisville',
    'America/Kentucky/Monticello',
    'America/Kralendijk',
    'America/La_Paz',
    'America/Lima',
    'America/Los_Angeles',
    'America/Lower_Princes',
    'America/Maceio',
    'America/Managua',
    'America/Manaus',
    'America/Marigot',
    'America/Martinique',
    'America/Matamoros',
    'America/Mazatlan',
    'America/Menominee',
    'America/Merida',
    'America/Metlakatla',
    'America/Mexico_City',
    'America/Miquelon',
    'America/Moncton',
    'America/Monterrey',
    'America/Montevideo',
    'America/Montserrat',
    'America/Nassau',
    'America/New_York',
    'America/Nome',
    'America/Noronha',
    'America/North_Dakota/Beulah',
    'America/North_Dakota/Center',
    'America/North_Dakota/New_Salem',
    'America/Nuuk',
    'America/Ojinaga',
    'America/Panama',
    'America/Paramaribo',
    'America/Phoenix',
    'America/Port-au-Prince',
    'America/Port_of_Spain',
    'America/Porto_Velho',
    'America/Puerto_Rico',
    'America/Punta_Arenas',
    'America/Rankin_Inlet',
    'America/Recife',
    'America/Regina',
    'America/Resolute',
    'America/Rio_Branco',
    'America/Santarem',
    'America/Santiago',
    'America/Santo_Domingo',
    'America/Sao_Paulo',
    'America/Scoresbysund',
    'America/Sitka',
    'America/St_Barthelemy',
    'America/St_Johns',
    'America/St_Kitts',
    'America/St_Lucia',
    'America/St_Thomas',
    'America/St_Vincent',
    'America/Swift_Current',
    'America/Tegucigalpa',
    'America/Thule',
    'America/Tijuana',
    'America/Toronto',
    'America/Tortola',
    'America/Vancouver',
    'America/Whitehorse',
    'America/Winnipeg',
    'America/Yakutat',
    'America/Yellowknife',

    'Antarctica/Casey',
    'Antarctica/Davis',
    'Antarctica/DumontDUrville',
    'Antarctica/Macquarie',
    'Antarctica/Mawson',
    'Antarctica/Palmer',
    'Antarctica/Rothera',
    'Antarctica/Syowa',
    'Antarctica/Troll',
    'Antarctica/Vostok',

    'Asia/Aden',
    'Asia/Almaty',
    'Asia/Amman',
    'Asia/Anadyr',
    'Asia/Aqtau',
    'Asia/Aqtobe',
    'Asia/Ashgabat',
    'Asia/Atyrau',
    'Asia/Baghdad',
    'Asia/Bahrain',
    'Asia/Baku',
    'Asia/Bangkok',
    'Asia/Barnaul',
    'Asia/Beirut',
    'Asia/Bishkek',
    'Asia/Brunei',
    'Asia/Chita',
    'Asia/Colombo',
    'Asia/Damascus',
    'Asia/Dhaka',
    'Asia/Dili',
    'Asia/Dubai',
    'Asia/Dushanbe',
    'Asia/Famagusta',
    'Asia/Gaza',
    'Asia/Hebron',
    'Asia/Ho_Chi_Minh',
    'Asia/Hong_Kong',
    'Asia/Hovd',
    'Asia/Irkutsk',
    'Asia/Jakarta',
    'Asia/Jayapura',
    'Asia/Jerusalem',
    'Asia/Kabul',
    'Asia/Kamchatka',
    'Asia/Karachi',
    'Asia/Kathmandu',
    'Asia/Kolkata',
    'Asia/Krasnoyarsk',
    'Asia/Kuala_Lumpur',
    'Asia/Kuching',
    'Asia/Kuwait',
    'Asia/Macau',
    'Asia/Magadan',
    'Asia/Makassar',
    'Asia/Manila',
    'Asia/Muscat',
    'Asia/Nicosia',
    'Asia/Novokuznetsk',
    'Asia/Novosibirsk',
    'Asia/Omsk',
    'Asia/Oral',
    'Asia/Phnom_Penh',
    'Asia/Pontianak',
    'Asia/Pyongyang',
    'Asia/Qatar',
    'Asia/Qostanay',
    'Asia/Qyzylorda',
    'Asia/Riyadh',
    'Asia/Sakhalin',
    'Asia/Samarkand',
    'Asia/Seoul',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Asia/Srednekolymsk',
    'Asia/Taipei',
    'Asia/Tashkent',
    'Asia/Tbilisi',
    'Asia/Tehran',
    'Asia/Thimphu',
    'Asia/Tokyo',
    'Asia/Tomsk',
    'Asia/Ulaanbaatar',
    'Asia/Urumqi',
    'Asia/Ust-Nera',
    'Asia/Vientiane',
    'Asia/Vladivostok',
    'Asia/Yakutsk',
    'Asia/Yangon',
    'Asia/Yekaterinburg',
    'Asia/Yerevan',

    'Atlantic/Azores',
    'Atlantic/Bermuda',
    'Atlantic/Canary',
    'Atlantic/Cape_Verde',
    'Atlantic/Faroe',
    'Atlantic/Madeira',
    'Atlantic/Reykjavik',
    'Atlantic/South_Georgia',
    'Atlantic/St_Helena',
    'Atlantic/Stanley',

    'Australia/Adelaide',
    'Australia/Brisbane',
    'Australia/Broken_Hill',
    'Australia/Darwin',
    'Australia/Eucla',
    'Australia/Hobart',
    'Australia/Lindeman',
    'Australia/Lord_Howe',
    'Australia/Melbourne',
    'Australia/Perth',
    'Australia/Sydney',

    'Europe/Amsterdam',
    'Europe/Andorra',
    'Europe/Astrakhan',
    'Europe/Athens',
    'Europe/Belgrade',
    'Europe/Berlin',
    'Europe/Bratislava',
    'Europe/Brussels',
    'Europe/Bucharest',
    'Europe/Budapest',
    'Europe/Busingen',
    'Europe/Chisinau',
    'Europe/Copenhagen',
    'Europe/Dublin',
    'Europe/Gibraltar',
    'Europe/Guernsey',
    'Europe/Helsinki',
    'Europe/Isle_of_Man',
    'Europe/Istanbul',
    'Europe/Jersey',
    'Europe/Kaliningrad',
    'Europe/Kiev',
    'Europe/Kirov',
    'Europe/Lisbon',
    'Europe/Ljubljana',
    'Europe/London',
    'Europe/Luxembourg',
    'Europe/Madrid',
    'Europe/Malta',
    'Europe/Mariehamn',
    'Europe/Minsk',
    'Europe/Monaco',
    'Europe/Moscow',
    'Europe/Oslo',
    'Europe/Paris',
    'Europe/Podgorica',
    'Europe/Prague',
    'Europe/Riga',
    'Europe/Rome',
    'Europe/Samara',
    'Europe/San_Marino',
    'Europe/Sarajevo',
    'Europe/Saratov',
    'Europe/Simferopol',
    'Europe/Skopje',
    'Europe/Sofia',
    'Europe/Stockholm',
    'Europe/Tallinn',
    'Europe/Tirane',
    'Europe/Ulyanovsk',
    'Europe/Uzhgorod',
    'Europe/Vaduz',
    'Europe/Vatican',
    'Europe/Vienna',
    'Europe/Vilnius',
    'Europe/Volgograd',
    'Europe/Warsaw',
    'Europe/Zagreb',
    'Europe/Zaporozhye',
    'Europe/Zurich',

    'Indian/Antananarivo',
    'Indian/Chagos',
    'Indian/Christmas',
    'Indian/Cocos',
    'Indian/Comoro',
    'Indian/Kerguelen',
    'Indian/Mahe',
    'Indian/Maldives',
    'Indian/Mauritius',
    'Indian/Mayotte',
    'Indian/Reunion',

    'Pacific/Apia',
    'Pacific/Auckland',
    'Pacific/Bougainville',
    'Pacific/Chatham',
    'Pacific/Easter',
    'Pacific/Efate',
    'Pacific/Fakaofo',
    'Pacific/Fiji',
    'Pacific/Funafuti',
    'Pacific/Galapagos',
    'Pacific/Gambier',
    'Pacific/Guadalcanal',
    'Pacific/Guam',
    'Pacific/Honolulu',
    'Pacific/Kanton',
    'Pacific/Kiritimati',
    'Pacific/Kosrae',
    'Pacific/Kwajalein',
    'Pacific/Majuro',
    'Pacific/Marquesas',
    'Pacific/Midway',
    'Pacific/Nauru',
    'Pacific/Niue',
    'Pacific/Norfolk',
    'Pacific/Noumea',
    'Pacific/Pago_Pago',
    'Pacific/Palau',
    'Pacific/Pitcairn',
    'Pacific/Pohnpei',
    'Pacific/Port_Moresby',
    'Pacific/Rarotonga',
    'Pacific/Saipan',
    'Pacific/Tahiti',
    'Pacific/Tarawa',
    'Pacific/Tongatapu',
    'Pacific/Wake',
    'Pacific/Wallis',

    'UTC',
];
