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

/**
 * Character → physical key (KeyboardEvent.code) on a US QWERTY layout, plus whether Shift is held.
 *
 * Proxmox/QEMU VNC supports the QEMU "extended key event", where noVNC sends the hardware scancode
 * derived from `code`. The guest then turns the scancode into a character with its own keymap, so
 * sending the right physical key + Shift is what makes typed text reliable, independent of the
 * browser's keyboard layout. This assumes the guest uses a US layout (the default for most
 * cloud images and installers). Characters outside this map fall back to a keysym-only event.
 */
export interface KeyStroke {
    keysym: number;
    code: string;
    shift: boolean;
}

const ROWS: Array<[string, string, string]> = [
    // [unshifted, shifted, code]
    ['`', '~', 'Backquote'],
    ['1', '!', 'Digit1'],
    ['2', '@', 'Digit2'],
    ['3', '#', 'Digit3'],
    ['4', '$', 'Digit4'],
    ['5', '%', 'Digit5'],
    ['6', '^', 'Digit6'],
    ['7', '&', 'Digit7'],
    ['8', '*', 'Digit8'],
    ['9', '(', 'Digit9'],
    ['0', ')', 'Digit0'],
    ['-', '_', 'Minus'],
    ['=', '+', 'Equal'],
    ['[', '{', 'BracketLeft'],
    [']', '}', 'BracketRight'],
    ['\\', '|', 'Backslash'],
    [';', ':', 'Semicolon'],
    ["'", '"', 'Quote'],
    [',', '<', 'Comma'],
    ['.', '>', 'Period'],
    ['/', '?', 'Slash'],
    [' ', ' ', 'Space'],
];

export const XK_SHIFT_L = 0xffe1;
const XK_RETURN = 0xff0d;
const XK_TAB = 0xff09;

const MAP = new Map<string, KeyStroke>();
for (const [lower, upper, code] of ROWS) {
    MAP.set(lower, { keysym: lower.charCodeAt(0), code, shift: false });
    if (!MAP.has(upper)) MAP.set(upper, { keysym: upper.charCodeAt(0), code, shift: true });
}
for (let i = 0; i < 26; i++) {
    const lower = String.fromCharCode(97 + i);
    const upper = lower.toUpperCase();
    const code = `Key${upper}`;
    MAP.set(lower, { keysym: lower.charCodeAt(0), code, shift: false });
    MAP.set(upper, { keysym: upper.charCodeAt(0), code, shift: true });
}
MAP.set('\n', { keysym: XK_RETURN, code: 'Enter', shift: false });
MAP.set('\t', { keysym: XK_TAB, code: 'Tab', shift: false });

/** Resolves a character to a key stroke; `code` is null for characters that have no US key. */
export function strokeFor(ch: string): { keysym: number; code: string | null; shift: boolean } {
    const hit = MAP.get(ch);
    if (hit) return hit;
    const cp = ch.codePointAt(0) ?? 0;
    // Latin-1 keysyms equal their code point; anything else uses the Unicode keysym range.
    return { keysym: cp < 0x100 ? cp : 0x01000000 | cp, code: null, shift: false };
}

/** Normalises pasted text: CRLF/CR → LF, drops other control characters. */
export function normalizeTypedText(text: string): string {
    return text
        .replace(/\r\n?/g, '\n')
        .split('')
        .filter((c) => c === '\n' || c === '\t' || c >= ' ')
        .join('');
}
