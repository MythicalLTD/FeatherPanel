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

import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, Moon, Sun, Monitor, Columns2, Settings2, HardDrive } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useFeatherOs } from './FeatherOsContext';
import { formatBytes, formatDiskPair, serverDiskUsage } from './utils';

export function ControlCenter() {
    const { t } = useTranslation();
    const os = useFeatherOs();
    const diskTotalUsed = Object.values(os.live).reduce((a, d) => a + (d.stats?.diskUsage ?? 0), 0);
    const diskTotalLimit = os.servers.reduce((a, s) => a + (s.disk > 0 ? s.disk * 1024 * 1024 : 0), 0);
    const topDisk = [...os.servers]
        .map((s) => ({ server: s, ...serverDiskUsage(s, os.live[s.uuidShort]?.stats?.diskUsage) }))
        .sort((a, b) => b.pct - a.pct || b.used - a.used)
        .slice(0, 3);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!open) return;
        const close = (event: PointerEvent) => {
            if (!ref.current?.contains(event.target as Node)) setOpen(false);
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
                trigger.current?.focus();
            }
        };
        window.addEventListener('pointerdown', close);
        window.addEventListener('keydown', escape);
        return () => {
            window.removeEventListener('pointerdown', close);
            window.removeEventListener('keydown', escape);
        };
    }, [open]);
    return (
        <div ref={ref} className='relative h-full'>
            <button
                ref={trigger}
                type='button'
                className='fos-menubar-item flex h-full items-center rounded-md px-2.5'
                aria-label={t('featheros.control.title')}
                aria-expanded={open}
                aria-controls='fos-control-center'
                onClick={() => setOpen(!open)}
            >
                <SlidersHorizontal className='h-4 w-4' />
            </button>
            {open && (
                <section
                    id='fos-control-center'
                    aria-label={t('featheros.control.title')}
                    className='fos-control-center fos-pop absolute top-full right-0 mt-2 w-[320px] rounded-[22px] p-3.5'
                >
                    <div className='mb-4 flex items-center justify-between'>
                        <h2 className='text-sm font-semibold'>{t('featheros.control.title')}</h2>
                        <button
                            type='button'
                            className='fos-control-action'
                            aria-label={t('featheros.menu.system_settings')}
                            onClick={() => {
                                os.openApp('settings');
                                setOpen(false);
                            }}
                        >
                            <Settings2 size={16} />
                        </button>
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                        <button
                            type='button'
                            className='fos-control-tile'
                            aria-pressed={os.isDark}
                            onClick={() => os.setOsTheme(os.isDark ? 'light' : 'dark')}
                        >
                            <span className='fos-control-symbol'>
                                {os.isDark ? <Moon size={20} /> : <Sun size={20} />}
                            </span>
                            <span>
                                {t('featheros.settings.appearance')}
                                <small>{t(`featheros.settings.theme_${os.isDark ? 'dark' : 'light'}`)}</small>
                            </span>
                        </button>
                        <button
                            type='button'
                            className='fos-control-tile'
                            aria-pressed={os.settings.showWidgets}
                            onClick={() => os.updateSettings({ showWidgets: !os.settings.showWidgets })}
                        >
                            <span className='fos-control-symbol'>
                                <Monitor size={20} />
                            </span>
                            <span>
                                {t('featheros.control.widgets')}
                                <small>
                                    {t(os.settings.showWidgets ? 'featheros.control.on' : 'featheros.control.off')}
                                </small>
                            </span>
                        </button>
                    </div>
                    <div className='fos-control-section mt-3'>
                        <div className='mb-2 flex items-center justify-between text-xs font-medium'>
                            <span className='inline-flex items-center gap-1.5'>
                                <HardDrive size={14} />
                                {t('featheros.widgets.storage', { defaultValue: 'Storage' })}
                            </span>
                            <span className='tabular-nums opacity-70'>
                                {diskTotalLimit
                                    ? formatDiskPair(diskTotalUsed, diskTotalLimit)
                                    : formatBytes(diskTotalUsed)}
                            </span>
                        </div>
                        {topDisk.map(({ server, used, limit, pct }) => (
                            <div key={server.uuidShort} className='fos-widget-disk-row'>
                                <span className='fos-widget-disk-name'>{server.name}</span>
                                <span className='fos-widget-disk-val'>{formatDiskPair(used, limit)}</span>
                                <div className='fos-widget-disk-track'>
                                    <span
                                        className={pct >= 90 ? 'is-crit' : pct >= 75 ? 'is-warn' : ''}
                                        style={{ width: `${limit ? pct : used ? 8 : 0}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {topDisk.length === 0 && (
                            <p className='text-[11px] opacity-50'>
                                {t('featheros.widgets.storage_hint', { defaultValue: 'Across live servers' })}
                            </p>
                        )}
                    </div>
                    <div className='fos-control-section mt-3'>
                        <label htmlFor='fos-dock-size' className='mb-3 flex justify-between text-xs font-medium'>
                            {t('featheros.settings.dock')}
                            <span>{os.settings.dockSize}px</span>
                        </label>
                        <input
                            id='fos-dock-size'
                            type='range'
                            min={32}
                            max={72}
                            step={4}
                            value={os.settings.dockSize}
                            onChange={(e) => os.updateSettings({ dockSize: Number(e.target.value) })}
                            className='w-full accent-[var(--fos-accent-color)]'
                        />
                        {(['dockAutoHide', 'reduceMotion'] as const).map((key) => (
                            <label
                                key={key}
                                className='mt-3 flex cursor-pointer items-center justify-between gap-3 text-xs'
                            >
                                {t(
                                    key === 'dockAutoHide'
                                        ? 'featheros.settings.dock_autohide'
                                        : 'featheros.settings.reduce_motion',
                                )}
                                <input
                                    type='checkbox'
                                    role='switch'
                                    checked={os.settings[key]}
                                    onChange={(e) => os.updateSettings({ [key]: e.target.checked })}
                                    className='fos-switch'
                                />
                            </label>
                        ))}
                    </div>
                    <button
                        type='button'
                        className='fos-control-section mt-3 flex w-full items-center gap-3 text-xs font-medium'
                        onClick={() => {
                            os.setMissionControlOpen(true);
                            setOpen(false);
                        }}
                    >
                        <Columns2 size={18} />
                        {t('featheros.mission.title')}
                        <kbd className='ml-auto opacity-60'>F3</kbd>
                    </button>
                </section>
            )}
        </div>
    );
}
