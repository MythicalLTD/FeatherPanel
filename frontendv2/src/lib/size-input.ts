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

export type SizeUnit = 'MB' | 'MiB' | 'GB' | 'GiB';
export type SizeDisplayUnit = 'MB' | 'GB' | 'TB';

export interface ParsedSize {
    value: number;
    hasUnit: boolean;
    roundedUp: boolean;
}

const SIZE_FACTORS_IN_MIB: Record<string, number> = {
    k: 1 / 1024,
    kb: 1 / 1024,
    kib: 1 / 1024,
    m: 1,
    mb: 1,
    mib: 1,
    g: 1024,
    gb: 1024,
    gib: 1024,
    t: 1024 * 1024,
    tb: 1024 * 1024,
    tib: 1024 * 1024,
};

/** Hosting quotas use binary multiples: 1 GB entered here is 1024 MiB. */
export function parseSizeInput(
    raw: string,
    targetUnit: SizeUnit,
    defaultUnit: SizeDisplayUnit | SizeUnit = targetUnit,
): ParsedSize | null {
    const match = raw.trim().match(/^(\d+(?:[.,]\d*)?)\s*([a-z]*)$/i);
    if (!match) return null;

    const amount = Number(match[1].replace(',', '.'));
    const suffix = match[2].toLowerCase();
    const factor = suffix ? SIZE_FACTORS_IN_MIB[suffix] : SIZE_FACTORS_IN_MIB[defaultUnit.toLowerCase()];
    if (!Number.isFinite(amount) || factor === undefined) return null;

    const targetFactor = targetUnit.startsWith('G') ? 1024 : 1;
    const exactValue = (amount * factor) / targetFactor;
    if (!Number.isFinite(exactValue) || exactValue > Number.MAX_SAFE_INTEGER) return null;

    const value = Math.ceil(exactValue - Number.EPSILON * exactValue);
    return { value, hasUnit: suffix.length > 0, roundedUp: value > exactValue };
}

export function formatSizeInput(value: number | '', targetUnit: SizeUnit, displayUnit: SizeDisplayUnit): string {
    if (value === '') return '';
    const targetFactor = targetUnit.startsWith('G') ? 1024 : 1;
    return String((value * targetFactor) / SIZE_FACTORS_IN_MIB[displayUnit.toLowerCase()]);
}
