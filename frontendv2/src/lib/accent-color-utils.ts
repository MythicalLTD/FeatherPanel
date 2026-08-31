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

export const CUSTOM_ACCENT_PREFIX = 'custom:';

export function isCustomAccent(value: string): boolean {
    return value.startsWith(CUSTOM_ACCENT_PREFIX);
}

export function getCustomAccentHex(value: string): string {
    if (!isCustomAccent(value)) {
        return '#7c3aed';
    }
    const hex = value.slice(CUSTOM_ACCENT_PREFIX.length);
    return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex.toLowerCase() : '#7c3aed';
}

export function formatCustomAccent(hex: string): string {
    const normalized = hex.startsWith('#') ? hex : `#${hex}`;
    if (!/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
        return `${CUSTOM_ACCENT_PREFIX}#7c3aed`;
    }
    return `${CUSTOM_ACCENT_PREFIX}${normalized.toLowerCase()}`;
}

export function hexToHslComponents(hex: string): { h: number; s: number; l: number } {
    const normalized = hex.replace('#', '');
    const r = parseInt(normalized.slice(0, 2), 16) / 255;
    const g = parseInt(normalized.slice(2, 4), 16) / 255;
    const b = parseInt(normalized.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    const l = (max + min) / 2;
    let s = 0;

    if (delta !== 0) {
        s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / delta + 2) / 6;
                break;
            default:
                h = ((r - g) / delta + 4) / 6;
                break;
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

export function hslComponentsToCss(h: number, s: number, l: number): string {
    return `${h} ${s}% ${l}%`;
}

export function hexToHslCss(hex: string): string {
    const { h, s, l } = hexToHslComponents(hex);
    return hslComponentsToCss(h, s, l);
}

export function hslToHex(h: number, s: number, l: number): string {
    const sNorm = s / 100;
    const lNorm = l / 100;

    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lNorm - c / 2;

    let r = 0;
    let g = 0;
    let b = 0;

    if (h < 60) {
        r = c;
        g = x;
    } else if (h < 120) {
        r = x;
        g = c;
    } else if (h < 180) {
        g = c;
        b = x;
    } else if (h < 240) {
        g = x;
        b = c;
    } else if (h < 300) {
        r = x;
        b = c;
    } else {
        r = c;
        b = x;
    }

    const toHex = (channel: number) =>
        Math.round((channel + m) * 255)
            .toString(16)
            .padStart(2, '0');

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function deriveAuroraStopsFromHex(hex: string): [string, string, string] {
    const { h, s, l } = hexToHslComponents(hex);
    const mid = hslToHex((h + 72) % 360, Math.min(s + 8, 100), Math.min(l + 22, 88));
    return [hex.toLowerCase(), mid, hex.toLowerCase()];
}

export function deriveBeamLightFromHex(hex: string): string {
    const { h, s, l } = hexToHslComponents(hex);
    return hslToHex(h, Math.max(s - 10, 30), Math.min(l + 18, 78));
}

export function resolveForegroundForLightness(l: number): string {
    return l > 58 ? '0 0% 9%' : '0 0% 98%';
}
