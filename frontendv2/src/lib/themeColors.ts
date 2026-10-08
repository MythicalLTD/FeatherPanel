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

import { ACCENT_PRESETS, type AccentPresetId } from '@/lib/accent-colors';
import {
    deriveAuroraStopsFromHex,
    deriveBeamLightFromHex,
    getCustomAccentHex,
    hexToHslComponents,
    isCustomAccent,
} from '@/lib/accent-color-utils';

/** Aurora color stops [left, mid, right] per accent – for Aurora and ColorBends */
export const ACCENT_AURORA_STOPS: Record<string, [string, string, string]> = Object.fromEntries(
    Object.entries(ACCENT_PRESETS).map(([id, preset]) => [id, preset.aurora]),
);

/** Single primary hex per accent – for Silk, etc. */
export const ACCENT_PRIMARY_HEX: Record<string, string> = Object.fromEntries(
    Object.entries(ACCENT_PRESETS).map(([id, preset]) => [id, preset.hex]),
);

/** Brighter hex for Beams light – shows up on black background */
export const ACCENT_BEAM_LIGHT_HEX: Record<string, string> = Object.fromEntries(
    Object.entries(ACCENT_PRESETS).map(([id, preset]) => [id, preset.beamLight]),
);

/** Hue in degrees (0–360) per accent – for animated backgrounds / theme tooling */
export const ACCENT_HUE: Record<string, number> = Object.fromEntries(
    Object.entries(ACCENT_PRESETS).map(([id, preset]) => [id, preset.hue]),
);

export function getAuroraColorStops(accentColor: string): [string, string, string] {
    if (isCustomAccent(accentColor)) {
        return deriveAuroraStopsFromHex(getCustomAccentHex(accentColor));
    }
    return ACCENT_AURORA_STOPS[accentColor] ?? ACCENT_AURORA_STOPS.purple;
}

export function getPrimaryHex(accentColor: string): string {
    if (isCustomAccent(accentColor)) {
        return getCustomAccentHex(accentColor);
    }
    return ACCENT_PRIMARY_HEX[accentColor] ?? ACCENT_PRIMARY_HEX.purple;
}

/** Bright light color for Beams so theme shows clearly on black */
export function getBeamLightHex(accentColor: string): string {
    if (isCustomAccent(accentColor)) {
        return deriveBeamLightFromHex(getCustomAccentHex(accentColor));
    }
    return ACCENT_BEAM_LIGHT_HEX[accentColor] ?? ACCENT_BEAM_LIGHT_HEX.purple;
}

export function getAccentHue(accentColor: string): number {
    if (isCustomAccent(accentColor)) {
        return hexToHslComponents(getCustomAccentHex(accentColor)).h;
    }
    return ACCENT_HUE[accentColor as AccentPresetId] ?? ACCENT_HUE.purple;
}
