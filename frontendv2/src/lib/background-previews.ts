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

import type { BackgroundAnimatedVariant } from '@/lib/background-variants';

/** CSS gradient approximations for background picker thumbnails. */
export const BACKGROUND_VARIANT_PREVIEWS: Record<BackgroundAnimatedVariant, string> = {
    aurora: 'linear-gradient(135deg, #5227ff 0%, #7cff67 50%, #5227ff 100%)',
    beams: 'linear-gradient(180deg, #1a0a2e 0%, #7c3aed 40%, #1a0a2e 100%)',
    colorBends: 'linear-gradient(120deg, #5227ff, #ff6b6b, #7cff67, #5227ff)',
    floatingLines: 'linear-gradient(180deg, #0f172a 0%, #334155 60%, #7c3aed 100%)',
    silk: 'radial-gradient(ellipse at 30% 20%, #7c3aed 0%, #1e1b4b 70%)',
    waves: 'linear-gradient(180deg, #0c1445 0%, #2563eb 45%, #7cff67 100%)',
    softAura: 'linear-gradient(160deg, #f7f7f7 0%, #e100ff 55%, #1e1b4b 100%)',
    plasmaWave: 'linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)',
    plasma: 'radial-gradient(circle at 50% 80%, #ea580c 0%, #1c1917 65%)',
    lineWaves: 'conic-gradient(from 180deg, #7c3aed, #06b6d4, #7c3aed)',
    ghostFibers: 'linear-gradient(135deg, #140e35 0%, #3437a0 50%, #0a0618 100%)',
    crtWarp: 'linear-gradient(180deg, #05010a 0%, #c755f7 50%, #05010a 100%)',
    ferrofluid: 'radial-gradient(circle at 40% 60%, #7c3aed 0%, #0891b2 40%, #0a0a0a 80%)',
};

export type StaticBackgroundKind = 'gradient' | 'solid' | 'pattern' | 'image';

export const STATIC_BACKGROUND_PREVIEWS: Record<Exclude<StaticBackgroundKind, 'image'>, string> = {
    gradient:
        'linear-gradient(135deg, hsl(var(--primary) / 0.35) 0%, hsl(var(--primary) / 0.08) 50%, hsl(var(--primary) / 0.35) 100%)',
    solid: 'hsl(var(--background))',
    pattern: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)',
};
