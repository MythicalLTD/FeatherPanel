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

import {
    formatCustomAccent,
    getCustomAccentHex,
    hexToHslComponents,
    hexToHslCss,
    isCustomAccent,
    resolveForegroundForLightness,
} from '@/lib/accent-color-utils';

export interface AccentPreset {
    hsl: string;
    hex: string;
    foreground?: string;
    aurora: [string, string, string];
    beamLight: string;
    hue: number;
}

export const ACCENT_PRESETS = {
    purple: {
        hsl: '262 83% 58%',
        hex: '#7c3aed',
        aurora: ['#5227FF', '#7cff67', '#5227FF'],
        beamLight: '#a78bfa',
        hue: 262,
    },
    blue: {
        hsl: '217 91% 60%',
        hex: '#2563eb',
        aurora: ['#2563eb', '#67e8f9', '#2563eb'],
        beamLight: '#60a5fa',
        hue: 217,
    },
    green: {
        hsl: '142 71% 45%',
        hex: '#16a34a',
        aurora: ['#16a34a', '#a3e635', '#16a34a'],
        beamLight: '#4ade80',
        hue: 142,
    },
    red: {
        hsl: '0 84% 60%',
        hex: '#dc2626',
        aurora: ['#dc2626', '#fca5a5', '#dc2626'],
        beamLight: '#f87171',
        hue: 0,
    },
    orange: {
        hsl: '25 95% 53%',
        hex: '#ea580c',
        foreground: '0 0% 9%',
        aurora: ['#ea580c', '#fdba74', '#ea580c'],
        beamLight: '#fb923c',
        hue: 25,
    },
    pink: {
        hsl: '330 81% 60%',
        hex: '#db2777',
        aurora: ['#db2777', '#f9a8d4', '#db2777'],
        beamLight: '#f472b6',
        hue: 330,
    },
    teal: {
        hsl: '173 80% 40%',
        hex: '#0d9488',
        foreground: '0 0% 9%',
        aurora: ['#0d9488', '#5eead4', '#0d9488'],
        beamLight: '#2dd4bf',
        hue: 173,
    },
    yellow: {
        hsl: '48 96% 53%',
        hex: '#ca8a04',
        foreground: '0 0% 9%',
        aurora: ['#ca8a04', '#fde047', '#ca8a04'],
        beamLight: '#facc15',
        hue: 48,
    },
    indigo: {
        hsl: '245 58% 51%',
        hex: '#4f46e5',
        aurora: ['#4f46e5', '#818cf8', '#4f46e5'],
        beamLight: '#818cf8',
        hue: 245,
    },
    violet: {
        hsl: '270 75% 55%',
        hex: '#8b5cf6',
        aurora: ['#6d28d9', '#a78bfa', '#6d28d9'],
        beamLight: '#a78bfa',
        hue: 270,
    },
    cyan: {
        hsl: '188 78% 41%',
        hex: '#0891b2',
        foreground: '0 0% 9%',
        aurora: ['#0891b2', '#22d3ee', '#0891b2'],
        beamLight: '#22d3ee',
        hue: 188,
    },
    lime: {
        hsl: '84 69% 35%',
        hex: '#65a30d',
        foreground: '0 0% 9%',
        aurora: ['#65a30d', '#bef34b', '#65a30d'],
        beamLight: '#a3e635',
        hue: 84,
    },
    amber: {
        hsl: '38 92% 50%',
        hex: '#d97706',
        foreground: '0 0% 9%',
        aurora: ['#d97706', '#fcd34d', '#d97706'],
        beamLight: '#fbbf24',
        hue: 38,
    },
    rose: {
        hsl: '347 77% 50%',
        hex: '#e11d48',
        aurora: ['#e11d48', '#fb7185', '#e11d48'],
        beamLight: '#fb7185',
        hue: 347,
    },
    slate: {
        hsl: '215 20% 45%',
        hex: '#64748b',
        aurora: ['#475569', '#94a3b8', '#64748b'],
        beamLight: '#94a3b8',
        hue: 215,
    },
    fuchsia: {
        hsl: '292 84% 61%',
        hex: '#d946ef',
        aurora: ['#c026d3', '#f0abfc', '#c026d3'],
        beamLight: '#e879f9',
        hue: 292,
    },
    emerald: {
        hsl: '160 84% 39%',
        hex: '#059669',
        aurora: ['#047857', '#6ee7b7', '#047857'],
        beamLight: '#34d399',
        hue: 160,
    },
    sky: {
        hsl: '199 89% 48%',
        hex: '#0ea5e9',
        aurora: ['#0284c7', '#7dd3fc', '#0284c7'],
        beamLight: '#38bdf8',
        hue: 199,
    },
    coral: {
        hsl: '12 90% 62%',
        hex: '#f97356',
        aurora: ['#ea580c', '#fdba74', '#ea580c'],
        beamLight: '#fb923c',
        hue: 12,
    },
    mint: {
        hsl: '152 76% 46%',
        hex: '#10b981',
        aurora: ['#059669', '#6ee7b7', '#059669'],
        beamLight: '#34d399',
        hue: 152,
    },
    gold: {
        hsl: '43 96% 56%',
        hex: '#eab308',
        foreground: '0 0% 9%',
        aurora: ['#ca8a04', '#fde047', '#ca8a04'],
        beamLight: '#facc15',
        hue: 43,
    },
    burgundy: {
        hsl: '345 83% 41%',
        hex: '#be123c',
        aurora: ['#9f1239', '#fb7185', '#9f1239'],
        beamLight: '#f43f5e',
        hue: 345,
    },
    lavender: {
        hsl: '258 90% 76%',
        hex: '#c4b5fd',
        foreground: '0 0% 9%',
        aurora: ['#8b5cf6', '#ddd6fe', '#8b5cf6'],
        beamLight: '#ddd6fe',
        hue: 258,
    },
    turquoise: {
        hsl: '174 72% 46%',
        hex: '#14b8a6',
        aurora: ['#0f766e', '#5eead4', '#0f766e'],
        beamLight: '#2dd4bf',
        hue: 174,
    },
    navy: {
        hsl: '226 57% 40%',
        hex: '#1e40af',
        aurora: ['#1e3a8a', '#60a5fa', '#1e3a8a'],
        beamLight: '#3b82f6',
        hue: 226,
    },
} as Record<string, AccentPreset>;

export type AccentPresetId = keyof typeof ACCENT_PRESETS;

export const ACCENT_PRESET_IDS = Object.keys(ACCENT_PRESETS) as AccentPresetId[];

export const ACCENT_COLORS = Object.fromEntries(ACCENT_PRESET_IDS.map((id) => [id, ACCENT_PRESETS[id].hsl])) as Record<
    AccentPresetId,
    string
>;

export const ACCENT_FOREGROUNDS: Partial<Record<AccentPresetId, string>> = Object.fromEntries(
    ACCENT_PRESET_IDS.filter((id) => ACCENT_PRESETS[id].foreground !== undefined).map((id) => [
        id,
        ACCENT_PRESETS[id].foreground as string,
    ]),
) as Partial<Record<AccentPresetId, string>>;

export function isValidAccentValue(value: string | null | undefined): boolean {
    if (!value) {
        return false;
    }
    if (value in ACCENT_PRESETS) {
        return true;
    }
    if (isCustomAccent(value)) {
        return /^#[0-9A-Fa-f]{6}$/.test(getCustomAccentHex(value));
    }
    return false;
}

export function isPresetAccent(value: string): boolean {
    return Object.prototype.hasOwnProperty.call(ACCENT_PRESETS, value);
}

export function resolveAccentHsl(accentColor: string): string {
    if (isCustomAccent(accentColor)) {
        return hexToHslCss(getCustomAccentHex(accentColor));
    }
    return ACCENT_COLORS[accentColor as AccentPresetId] ?? ACCENT_COLORS.purple;
}

export function resolveAccentForeground(accentColor: string): string {
    if (isCustomAccent(accentColor)) {
        const { l } = hexToHslComponents(getCustomAccentHex(accentColor));
        return resolveForegroundForLightness(l);
    }
    const preset = accentColor as AccentPresetId;
    return ACCENT_FOREGROUNDS[preset] ?? '0 0% 98%';
}

export function resolveAccentSwatchCss(accentColor: string): string {
    return `hsl(${resolveAccentHsl(accentColor)})`;
}

export function normalizeAccentInput(value: string): string {
    if (isPresetAccent(value)) {
        return value;
    }
    const hex = value.startsWith('#') ? value : `#${value}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        return formatCustomAccent(hex);
    }
    return 'purple';
}

/** JSON blobs for the inline boot script in layout.tsx */
export const ACCENT_COLORS_BOOT_JSON = JSON.stringify(ACCENT_COLORS);
export const ACCENT_FOREGROUNDS_BOOT_JSON = JSON.stringify(ACCENT_FOREGROUNDS);
