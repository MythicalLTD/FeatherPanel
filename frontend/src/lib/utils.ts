/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Sanitize color values to prevent CSS injection attacks.
 * Only allows valid hex codes or safe named CSS colors.
 *
 * @param color - The color value to sanitize (can be undefined)
 * @returns A style object with backgroundColor and color, or empty object if invalid
 */
export function sanitizeColor(color: string | undefined): Record<string, string> {
    if (!color) return {};

    // Remove any whitespace
    const trimmedColor = color.trim();

    // Only allow valid hex codes (#RGB, #RRGGBB, #RRGGBBAA, #RRRRGGGGBBBB, #RRRRGGGGBBBBAAAA)
    const hexPattern = /^#[0-9A-Fa-f]{3}$|^#[0-9A-Fa-f]{4}$|^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{8}$/;

    // Allow safe CSS named colors (common ones used in UI)
    const namedColors = [
        'red',
        'blue',
        'green',
        'yellow',
        'purple',
        'orange',
        'pink',
        'gray',
        'grey',
        'black',
        'white',
        'transparent',
        'currentcolor',
        'inherit',
    ];

    const lowerColor = trimmedColor.toLowerCase();

    if (hexPattern.test(trimmedColor) || namedColors.includes(lowerColor)) {
        return { backgroundColor: trimmedColor, color: '#fff' };
    }

    // Invalid color, ignore it (return empty object)
    return {};
}
