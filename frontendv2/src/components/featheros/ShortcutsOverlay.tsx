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

import { useEffect, useMemo } from 'react';
import { Expand, Shrink, X } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { isMacPlatform, keyboardLockSupported, toggleImmersiveWithFeedback, useImmersiveState } from './immersive';

type Row = { keys: string[][]; label: string };

export function ShortcutsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const immersiveState = useImmersiveState();
    const immersive = immersiveState !== 'off';
    const mod = useMemo(() => (isMacPlatform() ? '⌘' : 'Win'), []);
    const alt = useMemo(() => (isMacPlatform() ? '⌥' : 'Alt'), []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const groups: { title: string; rows: Row[] }[] = [
        {
            title: t('featheros.keys.group_windows'),
            rows: [
                {
                    keys: [
                        [alt, 'Tab'],
                        [alt, '`'],
                    ],
                    label: t('featheros.keys.switch_windows'),
                },
                {
                    keys: [
                        [mod, '←'],
                        [mod, '→'],
                    ],
                    label: t('featheros.keys.snap'),
                },
                {
                    keys: [
                        [mod, '↑'],
                        [alt, 'F10'],
                    ],
                    label: t('featheros.keys.maximize'),
                },
                { keys: [[mod, '↓']], label: t('featheros.keys.bottom_half') },
                {
                    keys: [
                        [mod, 'M'],
                        [alt, 'F9'],
                    ],
                    label: t('featheros.keys.minimize'),
                },
                {
                    keys: [
                        [alt, 'F4'],
                        ['Ctrl', 'F4'],
                        [mod, 'W'],
                        ['Ctrl', 'W'],
                    ],
                    label: t('featheros.keys.close'),
                },
                { keys: [[mod, 'Home']], label: t('featheros.keys.minimize_others') },
                { keys: [[mod, 'D']], label: t('featheros.keys.show_desktop') },
            ],
        },
        {
            title: t('featheros.keys.group_desktops'),
            rows: [
                { keys: [[mod, 'Tab'], ['F3']], label: t('featheros.keys.mission') },
                {
                    keys: [
                        ['Ctrl', mod, '←'],
                        ['Ctrl', mod, '→'],
                    ],
                    label: t('featheros.keys.switch_desktop'),
                },
                {
                    keys: [
                        [mod, 'Shift', '←'],
                        [mod, 'Shift', '→'],
                    ],
                    label: t('featheros.keys.move_window'),
                },
                { keys: [['Ctrl', mod, 'D']], label: t('featheros.keys.new_desktop') },
            ],
        },
        {
            title: t('featheros.keys.group_apps'),
            rows: [
                { keys: [[mod]], label: t('featheros.keys.launchpad') },
                { keys: [[mod, '1-9']], label: t('featheros.keys.dock_slot') },
                {
                    keys: [
                        ['Ctrl', 'Space'],
                        [mod, 'S'],
                    ],
                    label: t('featheros.keys.spotlight'),
                },
                { keys: [[mod, 'E']], label: t('featheros.keys.finder') },
                { keys: [[mod, 'N']], label: t('featheros.keys.notifications') },
                { keys: [[mod, ',']], label: t('featheros.keys.settings') },
            ],
        },
        {
            title: t('featheros.keys.group_system'),
            rows: [
                { keys: [['Ctrl', alt, 'F']], label: t('featheros.keys.immersive') },
                {
                    keys: [
                        ['Ctrl', alt, 'L'],
                        [mod, 'L'],
                    ],
                    label: t('featheros.keys.lock'),
                },
                {
                    keys: [
                        [mod, '/'],
                        ['Ctrl', '/'],
                    ],
                    label: t('featheros.keys.cheatsheet'),
                },
            ],
        },
    ];

    return (
        <div className='fos-keys' onClick={onClose}>
            <div
                className='fos-keys-panel'
                role='dialog'
                aria-label={t('featheros.keys.title')}
                onClick={(e) => e.stopPropagation()}
            >
                <header className='fos-keys-header'>
                    <div>
                        <h2>{t('featheros.keys.title')}</h2>
                        <p>{t('featheros.keys.peek_hint', { mod })}</p>
                    </div>
                    <button
                        type='button'
                        className='fos-keys-close'
                        onClick={onClose}
                        aria-label={t('featheros.common.close')}
                    >
                        <X className='h-4 w-4' />
                    </button>
                </header>
                <div className='fos-keys-immersive'>
                    <div>
                        <strong>
                            {t('featheros.immersive.title')} · {t(`featheros.immersive.status_${immersiveState}`)}
                        </strong>
                        <span>
                            {keyboardLockSupported()
                                ? t('featheros.immersive.description')
                                : t('featheros.immersive.description_no_lock')}
                        </span>
                    </div>
                    <button type='button' onClick={() => toggleImmersiveWithFeedback(t)}>
                        {immersive ? <Shrink className='h-3.5 w-3.5' /> : <Expand className='h-3.5 w-3.5' />}
                        {immersive ? t('featheros.immersive.exit') : t('featheros.immersive.enter')}
                    </button>
                </div>
                <div className='fos-keys-grid'>
                    {groups.map((g) => (
                        <section key={g.title} className='fos-keys-group'>
                            <h3>{g.title}</h3>
                            {g.rows.map((row) => (
                                <div key={row.label} className='fos-keys-row'>
                                    <span>{row.label}</span>
                                    <span className='fos-keys-combos'>
                                        {row.keys.map((combo, ci) => (
                                            <span key={ci} className='fos-keys-combo'>
                                                {combo.map((k) => (
                                                    <kbd key={k}>{k}</kbd>
                                                ))}
                                            </span>
                                        ))}
                                    </span>
                                </div>
                            ))}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
