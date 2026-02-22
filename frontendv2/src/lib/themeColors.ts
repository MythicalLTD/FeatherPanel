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

/** Aurora color stops [left, mid, right] per accent – for Aurora and ColorBends */
export const ACCENT_AURORA_STOPS: Record<string, [string, string, string]> = {
    purple: ['#5227FF', '#7cff67', '#5227FF'],
    blue: ['#2563eb', '#67e8f9', '#2563eb'],
    green: ['#16a34a', '#a3e635', '#16a34a'],
    red: ['#dc2626', '#fca5a5', '#dc2626'],
    orange: ['#ea580c', '#fdba74', '#ea580c'],
    pink: ['#db2777', '#f9a8d4', '#db2777'],
    teal: ['#0d9488', '#5eead4', '#0d9488'],
    yellow: ['#ca8a04', '#fde047', '#ca8a04'],
    white: ['#e2e8f0', '#f8fafc', '#cbd5e1'],
    violet: ['#6d28d9', '#a78bfa', '#6d28d9'],
    cyan: ['#0891b2', '#22d3ee', '#0891b2'],
    lime: ['#65a30d', '#bef34b', '#65a30d'],
    amber: ['#d97706', '#fcd34d', '#d97706'],
    rose: ['#e11d48', '#fb7185', '#e11d48'],
    slate: ['#475569', '#94a3b8', '#64748b'],
};

/** Single primary hex per accent – for Silk, etc. */
export const ACCENT_PRIMARY_HEX: Record<string, string> = {
    purple: '#7c3aed',
    blue: '#2563eb',
    green: '#16a34a',
    red: '#dc2626',
    orange: '#ea580c',
    pink: '#db2777',
    teal: '#0d9488',
    yellow: '#ca8a04',
    white: '#e2e8f0',
    violet: '#7c3aed',
    cyan: '#0891b2',
    lime: '#65a30d',
    amber: '#d97706',
    rose: '#e11d48',
    slate: '#64748b',
};

/** Brighter hex for Beams light – shows up on black background */
export const ACCENT_BEAM_LIGHT_HEX: Record<string, string> = {
    purple: '#a78bfa',
    blue: '#60a5fa',
    green: '#4ade80',
    red: '#f87171',
    orange: '#fb923c',
    pink: '#f472b6',
    teal: '#2dd4bf',
    yellow: '#facc15',
    white: '#f8fafc',
    violet: '#a78bfa',
    cyan: '#22d3ee',
    lime: '#a3e635',
    amber: '#fbbf24',
    rose: '#fb7185',
    slate: '#94a3b8',
};

/** Hue in degrees (0–360) per accent – for DarkVeil hueShift */
export const ACCENT_HUE: Record<string, number> = {
    purple: 262,
    blue: 217,
    green: 142,
    red: 0,
    orange: 25,
    pink: 330,
    teal: 173,
    yellow: 48,
    white: 210,
    violet: 270,
    cyan: 188,
    lime: 84,
    amber: 38,
    rose: 347,
    slate: 215,
};

export function getAuroraColorStops(accentColor: string): [string, string, string] {
    return ACCENT_AURORA_STOPS[accentColor] ?? ACCENT_AURORA_STOPS.purple;
}

export function getPrimaryHex(accentColor: string): string {
    return ACCENT_PRIMARY_HEX[accentColor] ?? ACCENT_PRIMARY_HEX.purple;
}

/** Bright light color for Beams so theme shows clearly on black */
export function getBeamLightHex(accentColor: string): string {
    return ACCENT_BEAM_LIGHT_HEX[accentColor] ?? ACCENT_BEAM_LIGHT_HEX.purple;
}

export function getAccentHue(accentColor: string): number {
    return ACCENT_HUE[accentColor] ?? ACCENT_HUE.purple;
}
