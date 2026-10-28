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

'use client';

import { useEffect, useState, type RefObject } from 'react';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type { VncConsoleHandle } from '@/components/vds/VncConsole';
import { EXTRA_KEY_ACTIONS, type StickyModifier } from '@/lib/vnc/extraKeys';

interface VdsVncExtraKeysProps {
    vncRef: RefObject<VncConsoleHandle | null>;
    connected: boolean;
    className?: string;
}

const MODS: { id: StickyModifier; labelKey: string }[] = [
    { id: 'ctrl', labelKey: 'ctrl' },
    { id: 'alt', labelKey: 'alt' },
    { id: 'shift', labelKey: 'shift' },
    { id: 'meta', labelKey: 'meta' },
];

const NAV_IDS = ['esc', 'tab', 'enter', 'bksp', 'del', 'ins', 'home', 'end', 'pgup', 'pgdn', 'up', 'down', 'left', 'right'];
const FN_IDS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12'];
const COMBO_IDS = ['cad', 'cae', 'cab', 'caf1', 'caf2', 'caf3', 'caf7', 'altf4', 'alttab', 'win', 'prtsc'];

/**
 * Proxmox-style extra keys for the embedded VNC console: sticky Ctrl/Alt/Shift/Win
 * plus one-shot nav, F-keys and common OS shortcuts.
 */
export function VdsVncExtraKeys({ vncRef, connected, className }: VdsVncExtraKeysProps) {
    const { t } = useTranslation();
    const [sticky, setSticky] = useState<Record<StickyModifier, boolean>>({
        ctrl: false,
        alt: false,
        shift: false,
        meta: false,
    });

    useEffect(() => {
        if (connected) return;
        setSticky({ ctrl: false, alt: false, shift: false, meta: false });
    }, [connected]);

    const toggleSticky = (mod: StickyModifier) => {
        if (!connected) return;
        const next = !sticky[mod];
        vncRef.current?.setStickyModifier(mod, next);
        setSticky((s) => ({ ...s, [mod]: next }));
        vncRef.current?.focus();
    };

    const fire = (id: string) => {
        if (!connected) return;
        const action = EXTRA_KEY_ACTIONS.find((a) => a.id === id);
        if (!action) return;
        vncRef.current?.sendExtraAction(action);
        vncRef.current?.focus();
    };

    const chip = (id: string, label: string, active?: boolean, onClick?: () => void) => (
        <Button
            key={id}
            type='button'
            size='sm'
            variant={active ? 'default' : 'outline'}
            disabled={!connected}
            className={cn(
                'h-7 shrink-0 rounded-md px-2 font-mono text-[11px] font-semibold tracking-tight',
                active && 'shadow-sm',
            )}
            onClick={onClick}
            title={label}
        >
            {label}
        </Button>
    );

    const byId = Object.fromEntries(EXTRA_KEY_ACTIONS.map((a) => [a.id, a]));

    return (
        <div
            className={cn(
                'border-border/50 bg-muted/20 flex w-full min-w-0 flex-col gap-1.5 border-t px-2 py-1.5 sm:px-3',
                className,
            )}
        >
            <div className='flex flex-wrap items-center gap-1'>
                <span className='text-muted-foreground mr-1 text-[10px] font-semibold tracking-wide uppercase'>
                    {t('vds.console.extra_keys.modifiers')}
                </span>
                {MODS.map((m) =>
                    chip(m.id, t(`vds.console.extra_keys.${m.labelKey}`), sticky[m.id], () => toggleSticky(m.id)),
                )}
                <span className='bg-border/60 mx-1 hidden h-4 w-px sm:inline-block' aria-hidden />
                {COMBO_IDS.map((id) => {
                    const action = byId[id];
                    if (!action) return null;
                    return chip(id, t(`vds.console.extra_keys.${action.labelKey}`), false, () => fire(id));
                })}
            </div>
            <div className='flex flex-wrap items-center gap-1'>
                <span className='text-muted-foreground mr-1 text-[10px] font-semibold tracking-wide uppercase'>
                    {t('vds.console.extra_keys.keys')}
                </span>
                {NAV_IDS.map((id) => {
                    const action = byId[id];
                    if (!action) return null;
                    return chip(id, t(`vds.console.extra_keys.${action.labelKey}`), false, () => fire(id));
                })}
            </div>
            <div className='flex flex-wrap items-center gap-1'>
                <span className='text-muted-foreground mr-1 text-[10px] font-semibold tracking-wide uppercase'>
                    {t('vds.console.extra_keys.function')}
                </span>
                {FN_IDS.map((id) => {
                    const action = byId[id];
                    if (!action) return null;
                    return chip(id, t(`vds.console.extra_keys.${action.labelKey}`), false, () => fire(id));
                })}
            </div>
            <p className='text-muted-foreground text-[10px] leading-snug'>{t('vds.console.extra_keys.hint')}</p>
        </div>
    );
}
