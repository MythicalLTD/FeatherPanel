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

export type IconLibrary = 'lucide' | 'tabler' | 'mdi' | 'phosphor';

export const ICON_LIBRARY_PREFIX: Record<IconLibrary, string> = {
    lucide: 'lucide',
    tabler: 'tabler',
    mdi: 'mdi',
    phosphor: 'ph',
};

/** Lucide React displayName → lucide icon slug (kebab-case). */
const LUCIDE_DISPLAY_ALIASES: Record<string, string> = {
    House: 'home',
    Image: 'image',
    Link: 'link',
    Code: 'code',
    Bot: 'bot',
    Calendar: 'calendar',
    Archive: 'archive',
    Network: 'network',
    Upload: 'upload',
    Clock: 'clock',
    Folder: 'folder',
    Ban: 'ban',
    Mail: 'mail',
};

export function pascalToKebab(value: string): string {
    return value
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();
}

export function isIconifyId(value: string): boolean {
    return /^[a-z0-9-]+:[a-z0-9-]+$/i.test(value);
}

/** Lucide slug remapped per Iconify collection when names differ. */
const LIBRARY_SLUG_ALIASES: Partial<Record<IconLibrary, Record<string, string>>> = {
    tabler: {
        'book-open': 'book',
        'shield-check': 'shield-check',
        'layout-dashboard': 'layout-dashboard',
        'square-terminal': 'terminal-2',
        'app-window': 'app-window',
        'circle-help': 'help-circle',
        'circle-plus': 'plus',
        'server-plus': 'server-plus',
        'credit-card': 'credit-card',
    },
    mdi: {
        'book-open': 'book-open-variant',
        'circle-help': 'help-circle-outline',
        'shield-check': 'shield-check',
        'square-terminal': 'console',
        'app-window': 'application-outline',
    },
    phosphor: {
        'book-open': 'book-open',
        'circle-help': 'question',
        'shield-check': 'shield-check',
        'square-terminal': 'terminal-window',
        'app-window': 'app-window',
    },
};

export function normalizeIconSlug(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return 'circle-help';
    if (isIconifyId(trimmed)) {
        const parts = trimmed.split(':');
        return parts[parts.length - 1] ?? 'circle-help';
    }
    return trimmed.includes('-') ? trimmed : pascalToKebab(trimmed);
}

export function toIconifyId(name: string, library: IconLibrary): string {
    const trimmed = name.trim();
    if (!trimmed) return `${ICON_LIBRARY_PREFIX[library]}:help-circle`;
    if (isIconifyId(trimmed)) return trimmed;
    let slug = normalizeIconSlug(trimmed);
    slug = LIBRARY_SLUG_ALIASES[library]?.[slug] ?? slug;
    return `${ICON_LIBRARY_PREFIX[library]}:${slug}`;
}

export function isReactIconComponent(value: unknown): value is LucideIcon {
    if (typeof value === 'function') return true;
    if (typeof value === 'object' && value !== null && typeof (value as { render?: unknown }).render === 'function') {
        return true;
    }
    return false;
}

export function lucideComponentToSlug(Icon: LucideIcon): string | null {
    const displayName = (Icon as { displayName?: string }).displayName;
    if (!displayName) return null;
    if (LUCIDE_DISPLAY_ALIASES[displayName]) return LUCIDE_DISPLAY_ALIASES[displayName];
    return pascalToKebab(displayName);
}
