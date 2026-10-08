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

import type { LucideIcon } from 'lucide-react';
import {
    type IconLibrary,
    isIconifyId,
    isReactIconComponent,
    lucideComponentToSlug,
    normalizeIconSlug,
    toIconifyId,
} from '@/lib/iconLibrary';

/** Supported icon sources for navigation / UI items. */
export type PanelIconSource = {
    lucideIcon?: string;
    /** Iconify id (`tabler:home`, `mdi:server`) or bare lucide name. */
    panelIcon?: string;
    icon?: LucideIcon | string;
};

export type PanelIconSpec =
    | { type: 'lucide'; name: string }
    | { type: 'iconify'; icon: string }
    | { type: 'emoji'; char: string }
    | { type: 'image'; src: string }
    | { type: 'component'; Icon: LucideIcon };

const URL_PATTERN = /^https?:\/\//i;

function isLikelyEmoji(value: string): boolean {
    if (value.length > 8) return false;
    return /\p{Extended_Pictographic}/u.test(value) || value.length <= 2;
}

function resolveBareName(name: string, library: IconLibrary): PanelIconSpec {
    const slug = normalizeIconSlug(name);
    if (library === 'lucide') return { type: 'lucide', name: slug };
    return { type: 'iconify', icon: toIconifyId(slug, library) };
}

function resolveStringIcon(value: string, library: IconLibrary): PanelIconSpec {
    const trimmed = value.trim();
    if (!trimmed) return { type: 'emoji', char: '•' };
    if (URL_PATTERN.test(trimmed)) return { type: 'image', src: trimmed };
    if (isIconifyId(trimmed)) return { type: 'iconify', icon: trimmed };
    if (isLikelyEmoji(trimmed)) return { type: 'emoji', char: trimmed };
    return resolveBareName(trimmed, library);
}

/**
 * Resolve an icon from navigation/plugin/custom-link fields.
 * Priority: panelIcon → lucideIcon → icon string/component.
 */
export function resolvePanelIcon(source: PanelIconSource, options?: { iconLibrary?: IconLibrary }): PanelIconSpec {
    const library = options?.iconLibrary ?? 'lucide';

    const panelIcon = source.panelIcon?.trim();
    if (panelIcon) {
        if (URL_PATTERN.test(panelIcon)) return { type: 'image', src: panelIcon };
        if (isIconifyId(panelIcon)) return { type: 'iconify', icon: panelIcon };
        return resolveBareName(panelIcon, library);
    }

    const lucideIcon = source.lucideIcon?.trim();
    if (lucideIcon) {
        if (isIconifyId(lucideIcon)) return { type: 'iconify', icon: lucideIcon };
        return resolveBareName(lucideIcon, library);
    }

    const icon = source.icon;
    if (typeof icon === 'string') {
        return resolveStringIcon(icon, library);
    }

    if (isReactIconComponent(icon)) {
        if (library === 'lucide') {
            return { type: 'component', Icon: icon };
        }
        const slug = lucideComponentToSlug(icon);
        if (slug) {
            return { type: 'iconify', icon: toIconifyId(slug, library) };
        }
        return { type: 'component', Icon: icon };
    }

    return { type: 'emoji', char: '•' };
}

function specKey(spec: PanelIconSpec): string {
    switch (spec.type) {
        case 'lucide':
            return `lucide:${spec.name}`;
        case 'iconify':
            return `iconify:${spec.icon}`;
        case 'emoji':
            return `emoji:${spec.char}`;
        case 'image':
            return `image:${spec.src}`;
        case 'component':
            return `component:${(spec.Icon as { displayName?: string }).displayName ?? 'unknown'}`;
        default:
            return 'unknown';
    }
}

function pushUnique(specs: PanelIconSpec[], seen: Set<string>, spec: PanelIconSpec) {
    const key = specKey(spec);
    if (seen.has(key)) return;
    seen.add(key);
    specs.push(spec);
}

export function extractLucideSlug(source: PanelIconSource): string | null {
    const panelIcon = source.panelIcon?.trim();
    if (panelIcon && !URL_PATTERN.test(panelIcon) && !isIconifyId(panelIcon)) {
        return normalizeIconSlug(panelIcon);
    }

    const lucideIcon = source.lucideIcon?.trim();
    if (lucideIcon && !isIconifyId(lucideIcon)) {
        return normalizeIconSlug(lucideIcon);
    }

    if (isReactIconComponent(source.icon)) {
        return lucideComponentToSlug(source.icon);
    }

    if (typeof source.icon === 'string') {
        const value = source.icon.trim();
        if (!value || URL_PATTERN.test(value) || isIconifyId(value) || isLikelyEmoji(value)) return null;
        return normalizeIconSlug(value);
    }

    return null;
}

/** Ordered specs to try when the preferred library icon is missing. */
export function resolvePanelIconFallbacks(
    source: PanelIconSource,
    options?: { iconLibrary?: IconLibrary },
): PanelIconSpec[] {
    const library = options?.iconLibrary ?? 'lucide';
    const primary = resolvePanelIcon(source, options);
    const specs: PanelIconSpec[] = [];
    const seen = new Set<string>();
    const slug = extractLucideSlug(source);
    const lucideComponent = isReactIconComponent(source.icon) ? source.icon : null;

    pushUnique(specs, seen, primary);

    if (primary.type === 'iconify' && slug) {
        pushUnique(specs, seen, { type: 'lucide', name: slug });
        pushUnique(specs, seen, { type: 'iconify', icon: `lucide:${slug}` });
        if (lucideComponent) {
            pushUnique(specs, seen, { type: 'component', Icon: lucideComponent });
        }
    } else if (primary.type === 'lucide' && slug) {
        pushUnique(specs, seen, { type: 'iconify', icon: `lucide:${slug}` });
        if (lucideComponent) {
            pushUnique(specs, seen, { type: 'component', Icon: lucideComponent });
        }
    } else if (primary.type === 'component' && slug) {
        pushUnique(specs, seen, { type: 'lucide', name: slug });
        pushUnique(specs, seen, { type: 'iconify', icon: `lucide:${slug}` });
        if (library !== 'lucide') {
            pushUnique(specs, seen, { type: 'iconify', icon: toIconifyId(slug, library) });
        }
    } else if (primary.type === 'emoji' && primary.char === '•') {
        specs.length = 0;
        seen.clear();
    }

    pushUnique(specs, seen, { type: 'lucide', name: 'circle-help' });
    pushUnique(specs, seen, { type: 'iconify', icon: 'lucide:circle-help' });

    return specs.length > 0 ? specs : [{ type: 'lucide', name: 'circle-help' }];
}
