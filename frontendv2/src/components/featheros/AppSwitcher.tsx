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

import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useFeatherOs } from './FeatherOsContext';
import { OS_APPS } from './registry';
import { AppIcon } from './AppIcon';
import { useImmersive } from './immersive';
import type { OsWindow } from './types';

export function AppSwitcher({
    open,
    ordered,
    selectedIndex,
    onHover,
    onPick,
}: {
    open: boolean;
    ordered: OsWindow[];
    selectedIndex: number;
    onHover: (index: number) => void;
    onPick: (id: string) => void;
}) {
    const { t } = useTranslation();
    const { getServer, activeSpace } = useFeatherOs();
    const immersive = useImmersive();

    if (!open || ordered.length === 0) return null;

    const titleOf = (win: OsWindow) =>
        [t(OS_APPS[win.app].nameKey), getServer(win.serverUuid)?.name].filter(Boolean).join(' - ');
    const selected = ordered[selectedIndex];

    return (
        <div className='fos-switcher' role='listbox' aria-label={t('featheros.switcher.title')}>
            <div className='fos-switcher-panel'>
                {ordered.map((win, i) => {
                    const space = win.space ?? 0;
                    return (
                        <button
                            key={win.id}
                            type='button'
                            role='option'
                            aria-selected={i === selectedIndex}
                            className={cn(
                                'fos-switcher-item',
                                i === selectedIndex && 'is-selected',
                                win.minimized && 'is-minimized',
                            )}
                            onMouseEnter={() => onHover(i)}
                            onClick={() => onPick(win.id)}
                        >
                            <AppIcon app={win.app} size={64} />
                            {space !== activeSpace && (
                                <span className='fos-switcher-space'>
                                    {t('featheros.spaces.desktop', { n: String(space + 1) })}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            {selected && (
                <div className='fos-switcher-title'>
                    <strong>{titleOf(selected)}</strong>
                    {selected.minimized && <span>{t('featheros.switcher.minimized')}</span>}
                </div>
            )}
            <div className='fos-switcher-keys'>
                <span>
                    <kbd>Tab</kbd> {t('featheros.switcher.next')}
                </span>
                <span>
                    <kbd>Q</kbd> {t('featheros.switcher.close')}
                </span>
                <span>
                    <kbd>M</kbd> {t('featheros.switcher.minimize')}
                </span>
                <span>
                    <kbd>Esc</kbd> {t('featheros.switcher.cancel')}
                </span>
            </div>
            {!immersive && <p className='fos-switcher-hint'>{t('featheros.switcher.hint')}</p>}
        </div>
    );
}
