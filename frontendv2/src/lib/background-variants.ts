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

export const BACKGROUND_ANIMATED_VARIANTS = [
    'aurora',
    'beams',
    'colorBends',
    'floatingLines',
    'silk',
    'waves',
    'softAura',
    'plasmaWave',
    'plasma',
    'lineWaves',
    'ghostFibers',
    'crtWarp',
    'ferrofluid',
] as const;

export type BackgroundAnimatedVariant = (typeof BACKGROUND_ANIMATED_VARIANTS)[number];

export function isBackgroundAnimatedVariant(value: string | null | undefined): value is BackgroundAnimatedVariant {
    return BACKGROUND_ANIMATED_VARIANTS.includes(value as BackgroundAnimatedVariant);
}
