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

import { resolveAttachmentUrl } from '@/lib/utils';
import type { AppSettings } from '@/types/settings';

export type ServerSpellBannerStyle = 'off' | 'cover' | 'strip' | 'hero';
export type ServerSpellBannerBackground = 'off' | 'blend' | 'replace';

const STYLES: ServerSpellBannerStyle[] = ['off', 'cover', 'strip', 'hero'];
const BACKGROUNDS: ServerSpellBannerBackground[] = ['off', 'blend', 'replace'];

export function resolveServerSpellBannerStyle(settings: AppSettings | null | undefined): ServerSpellBannerStyle {
    const raw = (settings?.app_server_spell_banner_style || '').trim().toLowerCase();
    if (STYLES.includes(raw as ServerSpellBannerStyle)) {
        return raw as ServerSpellBannerStyle;
    }
    // Legacy: enabled=true with no style → cover
    if (settings?.app_server_spell_banner_enabled === 'true') {
        return 'cover';
    }
    return 'off';
}

export function resolveServerSpellBannerBackground(
    settings: AppSettings | null | undefined,
): ServerSpellBannerBackground {
    const raw = (settings?.app_server_spell_banner_background || '').trim().toLowerCase();
    if (BACKGROUNDS.includes(raw as ServerSpellBannerBackground)) {
        return raw as ServerSpellBannerBackground;
    }
    return 'off';
}

export function resolveSpellBannerUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    return resolveAttachmentUrl(url) || url.trim() || null;
}
