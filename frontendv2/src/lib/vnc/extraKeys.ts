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

/** X11 keysyms + KeyboardEvent.code for noVNC sendKey / sticky modifiers. */
export const XK = {
    Shift_L: 0xffe1,
    Control_L: 0xffe3,
    Alt_L: 0xffe9,
    Super_L: 0xffeb,
    Escape: 0xff1b,
    Tab: 0xff09,
    Return: 0xff0d,
    BackSpace: 0xff08,
    Delete: 0xffff,
    Insert: 0xff63,
    Home: 0xff50,
    End: 0xff57,
    Page_Up: 0xff55,
    Page_Down: 0xff56,
    Left: 0xff51,
    Up: 0xff52,
    Right: 0xff53,
    Down: 0xff54,
    F1: 0xffbe,
    F2: 0xffbf,
    F3: 0xffc0,
    F4: 0xffc1,
    F5: 0xffc2,
    F6: 0xffc3,
    F7: 0xffc4,
    F8: 0xffc5,
    F9: 0xffc6,
    F10: 0xffc7,
    F11: 0xffc8,
    F12: 0xffc9,
    Print: 0xff61,
} as const;

export type StickyModifier = 'ctrl' | 'alt' | 'shift' | 'meta';

export interface VncKeySpec {
    keysym: number;
    code: string;
}

export const STICKY_MODIFIERS: Record<StickyModifier, VncKeySpec> = {
    ctrl: { keysym: XK.Control_L, code: 'ControlLeft' },
    alt: { keysym: XK.Alt_L, code: 'AltLeft' },
    shift: { keysym: XK.Shift_L, code: 'ShiftLeft' },
    meta: { keysym: XK.Super_L, code: 'MetaLeft' },
};

export interface ExtraKeyAction {
    id: string;
    /** Translation key under vds.console.extra_keys.* */
    labelKey: string;
    /** One-shot key presses (after sticky mods are already held, or as a full combo). */
    keys: VncKeySpec[];
    /** If set, press these modifiers for this action only (in addition to sticky). */
    mods?: StickyModifier[];
    /** Use RFB.sendCtrlAltDel() instead of composing keys. */
    cad?: boolean;
    group: 'mod' | 'nav' | 'fn' | 'combo';
}

export const EXTRA_KEY_ACTIONS: ExtraKeyAction[] = [
    { id: 'esc', labelKey: 'esc', keys: [{ keysym: XK.Escape, code: 'Escape' }], group: 'nav' },
    { id: 'tab', labelKey: 'tab', keys: [{ keysym: XK.Tab, code: 'Tab' }], group: 'nav' },
    { id: 'enter', labelKey: 'enter', keys: [{ keysym: XK.Return, code: 'Enter' }], group: 'nav' },
    { id: 'bksp', labelKey: 'backspace', keys: [{ keysym: XK.BackSpace, code: 'Backspace' }], group: 'nav' },
    { id: 'del', labelKey: 'delete', keys: [{ keysym: XK.Delete, code: 'Delete' }], group: 'nav' },
    { id: 'ins', labelKey: 'insert', keys: [{ keysym: XK.Insert, code: 'Insert' }], group: 'nav' },
    { id: 'home', labelKey: 'home', keys: [{ keysym: XK.Home, code: 'Home' }], group: 'nav' },
    { id: 'end', labelKey: 'end', keys: [{ keysym: XK.End, code: 'End' }], group: 'nav' },
    { id: 'pgup', labelKey: 'page_up', keys: [{ keysym: XK.Page_Up, code: 'PageUp' }], group: 'nav' },
    { id: 'pgdn', labelKey: 'page_down', keys: [{ keysym: XK.Page_Down, code: 'PageDown' }], group: 'nav' },
    { id: 'up', labelKey: 'up', keys: [{ keysym: XK.Up, code: 'ArrowUp' }], group: 'nav' },
    { id: 'down', labelKey: 'down', keys: [{ keysym: XK.Down, code: 'ArrowDown' }], group: 'nav' },
    { id: 'left', labelKey: 'left', keys: [{ keysym: XK.Left, code: 'ArrowLeft' }], group: 'nav' },
    { id: 'right', labelKey: 'right', keys: [{ keysym: XK.Right, code: 'ArrowRight' }], group: 'nav' },
    ...([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const).map((n) => ({
        id: `f${n}`,
        labelKey: `f${n}`,
        keys: [{ keysym: XK[`F${n}` as keyof typeof XK], code: `F${n}` }],
        group: 'fn' as const,
    })),
    { id: 'cad', labelKey: 'ctrl_alt_del', keys: [], cad: true, group: 'combo' },
    {
        id: 'cae',
        labelKey: 'ctrl_alt_esc',
        keys: [{ keysym: XK.Escape, code: 'Escape' }],
        mods: ['ctrl', 'alt'],
        group: 'combo',
    },
    {
        id: 'cab',
        labelKey: 'ctrl_alt_backspace',
        keys: [{ keysym: XK.BackSpace, code: 'Backspace' }],
        mods: ['ctrl', 'alt'],
        group: 'combo',
    },
    {
        id: 'caf1',
        labelKey: 'ctrl_alt_f1',
        keys: [{ keysym: XK.F1, code: 'F1' }],
        mods: ['ctrl', 'alt'],
        group: 'combo',
    },
    {
        id: 'caf2',
        labelKey: 'ctrl_alt_f2',
        keys: [{ keysym: XK.F2, code: 'F2' }],
        mods: ['ctrl', 'alt'],
        group: 'combo',
    },
    {
        id: 'caf3',
        labelKey: 'ctrl_alt_f3',
        keys: [{ keysym: XK.F3, code: 'F3' }],
        mods: ['ctrl', 'alt'],
        group: 'combo',
    },
    {
        id: 'caf7',
        labelKey: 'ctrl_alt_f7',
        keys: [{ keysym: XK.F7, code: 'F7' }],
        mods: ['ctrl', 'alt'],
        group: 'combo',
    },
    {
        id: 'altf4',
        labelKey: 'alt_f4',
        keys: [{ keysym: XK.F4, code: 'F4' }],
        mods: ['alt'],
        group: 'combo',
    },
    {
        id: 'alttab',
        labelKey: 'alt_tab',
        keys: [{ keysym: XK.Tab, code: 'Tab' }],
        mods: ['alt'],
        group: 'combo',
    },
    {
        id: 'win',
        labelKey: 'win',
        keys: [{ keysym: XK.Super_L, code: 'MetaLeft' }],
        group: 'combo',
    },
    {
        id: 'prtsc',
        labelKey: 'print_screen',
        keys: [{ keysym: XK.Print, code: 'PrintScreen' }],
        group: 'combo',
    },
];
