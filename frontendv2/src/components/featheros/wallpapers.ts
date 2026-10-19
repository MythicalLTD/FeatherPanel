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

import { safeCssUrl } from '@/lib/safe-css-url';

export interface OsWallpaper {
    id: string;
    /** Translation key of the name shown in Settings. */
    nameKey: string;
    light: string;
    dark: string;
}

/** CSS only wallpapers: no binary assets, crisp on any screen, separate light / dark variants. */
export const OS_WALLPAPERS: OsWallpaper[] = [
    {
        id: 'sonoma',
        nameKey: 'featheros.wallpapers.sonoma',
        light: 'radial-gradient(ellipse 105% 130% at 112% 110%, transparent 46%, #bedeea 46.3%, #64a7c3 53%, transparent 69%), radial-gradient(ellipse 110% 150% at -15% 110%, #123f6b 36%, #3b8cba 48%, #a1d9e6 48.3%, #c6e8e7 55%, transparent 55.3%), linear-gradient(135deg, #cce7e6, #80b7d0 48%, #30618b)',
        dark: 'radial-gradient(ellipse 105% 130% at 112% 110%, transparent 46%, #408195 46.3%, #1d506e 53%, transparent 69%), radial-gradient(ellipse 110% 150% at -15% 110%, #071c34 36%, #154565 48%, #387e98 48.3%, #5b9ca8 55%, transparent 55.3%), linear-gradient(135deg, #173f55, #16374f 48%, #091a30)',
    },
    {
        id: 'ventura',
        nameKey: 'featheros.wallpapers.ventura',
        light: 'radial-gradient(140% 100% at 0% 0%, #ffd29d 0%, transparent 50%), radial-gradient(120% 120% at 100% 100%, #ff7a59 0%, transparent 50%), linear-gradient(135deg, #ffe6c7 0%, #ff9f68 50%, #e8455b 100%)',
        dark: 'radial-gradient(140% 100% at 0% 0%, #5e2a12 0%, transparent 50%), radial-gradient(120% 120% at 100% 100%, #7a1a2b 0%, transparent 50%), linear-gradient(135deg, #1f0f0a 0%, #4a1b12 50%, #2a0a14 100%)',
    },
    {
        id: 'aurora',
        nameKey: 'featheros.wallpapers.aurora',
        light: 'radial-gradient(100% 70% at 20% 20%, #9ff5d8 0%, transparent 60%), radial-gradient(90% 80% at 80% 30%, #8fb7ff 0%, transparent 60%), linear-gradient(180deg, #e8f7ff 0%, #c7d8ff 100%)',
        dark: 'radial-gradient(100% 70% at 20% 20%, #0f8a6a 0%, transparent 60%), radial-gradient(90% 80% at 80% 30%, #3b2fa8 0%, transparent 60%), linear-gradient(180deg, #050b1a 0%, #0b1530 100%)',
    },
    {
        id: 'ocean',
        nameKey: 'featheros.wallpapers.ocean',
        light: 'radial-gradient(120% 80% at 50% 120%, #2bb3ff 0%, transparent 60%), linear-gradient(180deg, #e0f4ff 0%, #8fd3ff 60%, #3aa0ff 100%)',
        dark: 'radial-gradient(120% 80% at 50% 120%, #0a5c9e 0%, transparent 60%), linear-gradient(180deg, #02101f 0%, #062a4d 60%, #0a3f73 100%)',
    },
    {
        id: 'feather',
        nameKey: 'featheros.wallpapers.feather',
        light: 'radial-gradient(90% 90% at 15% 15%, hsl(var(--primary) / 0.55) 0%, transparent 60%), radial-gradient(90% 90% at 85% 85%, hsl(var(--primary) / 0.35) 0%, transparent 60%), linear-gradient(135deg, #f6f5ff 0%, #e9e7f7 100%)',
        dark: 'radial-gradient(90% 90% at 15% 15%, hsl(var(--primary) / 0.45) 0%, transparent 60%), radial-gradient(90% 90% at 85% 85%, hsl(var(--primary) / 0.25) 0%, transparent 60%), linear-gradient(135deg, #0b0a12 0%, #15131f 100%)',
    },
    {
        id: 'graphite',
        nameKey: 'featheros.wallpapers.graphite',
        light: 'radial-gradient(120% 100% at 50% 0%, #ffffff 0%, transparent 60%), linear-gradient(180deg, #e7e8ec 0%, #b9bcc6 100%)',
        dark: 'radial-gradient(120% 100% at 50% 0%, #3a3d46 0%, transparent 60%), linear-gradient(180deg, #1a1b20 0%, #0c0c0f 100%)',
    },
    {
        id: 'meadow',
        nameKey: 'featheros.wallpapers.meadow',
        light: 'radial-gradient(120% 80% at 0% 100%, #b6f09c 0%, transparent 55%), radial-gradient(100% 90% at 100% 0%, #fff3a6 0%, transparent 55%), linear-gradient(160deg, #eaffd9 0%, #9be0a8 100%)',
        dark: 'radial-gradient(120% 80% at 0% 100%, #1f5c2b 0%, transparent 55%), radial-gradient(100% 90% at 100% 0%, #4a4413 0%, transparent 55%), linear-gradient(160deg, #07140b 0%, #0f2a18 100%)',
    },
];

export function resolveWallpaper(id: string, isDark: boolean, customUrl: string): string {
    if (id === 'custom') {
        const url = safeCssUrl(customUrl);
        if (url) return `center / cover no-repeat ${url}, #111`;
    }
    const wp = OS_WALLPAPERS.find((w) => w.id === id) ?? OS_WALLPAPERS[0];
    return isDark ? wp.dark : wp.light;
}
