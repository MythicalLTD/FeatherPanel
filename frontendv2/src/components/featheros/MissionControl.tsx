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

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useFeatherOs } from './FeatherOsContext';
import { OS_APPS } from './registry';
import { AppIcon } from './AppIcon';
import { MENU_BAR_HEIGHT, type OsWindow } from './types';

const DRAG_MIME = 'application/x-featheros-window';

function SpacePreview({ windows }: { windows: OsWindow[] }) {
    const vpW = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const vpH = typeof window !== 'undefined' ? Math.max(400, window.innerHeight - 120) : 800;
    return (
        <div className='fos-mission-space-preview' aria-hidden>
            {windows
                .filter((w) => !w.minimized)
                .slice()
                .sort((a, b) => a.z - b.z)
                .slice(-8)
                .map((w) => {
                    const left = Math.max(2, (w.x / vpW) * 100);
                    const top = Math.max(2, (w.y / vpH) * 100);
                    const width = Math.max(12, Math.min(70, (w.w / vpW) * 100));
                    const height = Math.max(10, Math.min(60, (w.h / vpH) * 100));
                    return (
                        <div
                            key={w.id}
                            className='fos-mission-mini-win'
                            style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                        >
                            <div className='fos-mission-mini-win-bar' />
                        </div>
                    );
                })}
        </div>
    );
}

export function MissionControl() {
    const { t } = useTranslation();
    const {
        missionControlOpen,
        setMissionControlOpen,
        windows,
        focusWindow,
        closeWindow,
        activeSpace,
        setActiveSpace,
        settings,
        openApp,
        updateSettings,
        getServer,
        moveWindowToSpace,
    } = useFeatherOs();
    const [dropSpace, setDropSpace] = useState<number | null>(null);

    useEffect(() => {
        if (!missionControlOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMissionControlOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [missionControlOpen, setMissionControlOpen]);

    if (!missionControlOpen) return null;

    const spaces = Math.max(1, settings.spaceCount || 1);
    const visible = windows.filter((w) => (w.space ?? 0) === activeSpace);

    const acceptDrop = (space: number) => (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropSpace(space);
    };

    const onDropSpace = (space: number) => (e: React.DragEvent) => {
        e.preventDefault();
        setDropSpace(null);
        const id = e.dataTransfer.getData(DRAG_MIME);
        if (!id) return;
        moveWindowToSpace(id, space);
        setActiveSpace(space);
    };

    return (
        <div
            className='fos-mission fixed inset-0 z-[8500] flex flex-col bg-black/45 text-white backdrop-blur-2xl'
            style={{ paddingTop: MENU_BAR_HEIGHT }}
            onClick={() => setMissionControlOpen(false)}
        >
            <div className='fos-mission-spaces' onClick={(e) => e.stopPropagation()}>
                {Array.from({ length: spaces }, (_, i) => {
                    const spaceWins = windows.filter((w) => (w.space ?? 0) === i);
                    return (
                        <button
                            key={i}
                            type='button'
                            onClick={() => setActiveSpace(i)}
                            onDragOver={acceptDrop(i)}
                            onDragLeave={() => setDropSpace((s) => (s === i ? null : s))}
                            onDrop={onDropSpace(i)}
                            className={cn(
                                'fos-mission-space',
                                i === activeSpace && 'is-active',
                                dropSpace === i && 'is-drop',
                            )}
                            aria-pressed={i === activeSpace}
                            title={t('featheros.spaces.desktop', { n: String(i + 1) })}
                        >
                            <span className='fos-mission-space-label'>
                                {t('featheros.spaces.desktop', { n: String(i + 1) })}
                                <span className='ml-1 opacity-60'>({spaceWins.length})</span>
                            </span>
                            <SpacePreview windows={spaceWins} />
                        </button>
                    );
                })}
                {spaces < 8 && (
                    <button
                        type='button'
                        className='fos-mission-space items-center justify-center'
                        aria-label={t('featheros.control.add_desktop')}
                        onClick={() => {
                            updateSettings({ spaceCount: spaces + 1 });
                            setActiveSpace(spaces);
                        }}
                    >
                        <Plus size={22} />
                    </button>
                )}
            </div>

            <p className='shrink-0 px-6 pb-2 text-center text-[11px] text-white/55' onClick={(e) => e.stopPropagation()}>
                {t('featheros.mission.drag_hint', {
                    defaultValue: 'Drag a window onto a desktop above, or use Move to…',
                })}
            </p>

            <div className='fos-scroll min-h-0 flex-1 overflow-auto p-6' onClick={(e) => e.stopPropagation()}>
                {visible.length === 0 ? (
                    <p className='py-20 text-center text-sm text-white/70'>{t('featheros.mission.empty')}</p>
                ) : (
                    <div className='mx-auto grid max-w-6xl grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5'>
                        {visible
                            .slice()
                            .sort((a, b) => b.z - a.z)
                            .map((w) => (
                                <div
                                    key={w.id}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData(DRAG_MIME, w.id);
                                        e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onDragEnd={() => setDropSpace(null)}
                                    className='fos-mission-card group flex flex-col overflow-hidden rounded-[14px] bg-white/12 text-left text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.55)] ring-1 ring-white/22 transition hover:scale-[1.015] hover:bg-white/18'
                                >
                                    <div className='flex items-center gap-2 border-b border-white/10 px-3 py-2 text-[12px]'>
                                        <AppIcon app={w.app} size={18} />
                                        <span className='truncate'>{t(OS_APPS[w.app].nameKey)}</span>
                                        {w.minimized && (
                                            <span className='rounded bg-white/15 px-1.5 py-0.5 text-[10px]'>
                                                {t('featheros.window.minimize', { defaultValue: 'Minimized' })}
                                            </span>
                                        )}
                                        <button
                                            type='button'
                                            className='ml-auto rounded-md p-2 hover:bg-white/20'
                                            aria-label={t('featheros.window.close')}
                                            onClick={() => closeWindow(w.id)}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <button
                                        type='button'
                                        className='fos-mission-card-preview'
                                        onClick={() => {
                                            focusWindow(w.id);
                                            setMissionControlOpen(false);
                                        }}
                                    >
                                        <AppIcon app={w.app} size={52} />
                                        <span className='max-w-full truncate px-3 text-sm'>
                                            {typeof w.props?.title === 'string'
                                                ? w.props.title
                                                : getServer(w.serverUuid)?.name || t(OS_APPS[w.app].nameKey)}
                                        </span>
                                    </button>
                                    {spaces > 1 && (
                                        <div className='fos-mission-card-moves'>
                                            {Array.from({ length: spaces }, (_, i) => (
                                                <button
                                                    key={i}
                                                    type='button'
                                                    className={cn(
                                                        'fos-mission-move-btn',
                                                        (w.space ?? 0) === i && 'is-current',
                                                    )}
                                                    disabled={(w.space ?? 0) === i}
                                                    onClick={() => {
                                                        moveWindowToSpace(w.id, i);
                                                        setActiveSpace(i);
                                                    }}
                                                >
                                                    {t('featheros.mission.move_to', {
                                                        n: String(i + 1),
                                                        defaultValue: `Desktop ${i + 1}`,
                                                    })}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                )}
            </div>
            <div className='flex justify-center gap-2 pb-6' onClick={(e) => e.stopPropagation()}>
                <button
                    type='button'
                    className='rounded-full bg-white/15 px-4 py-1.5 text-[12px] text-white hover:bg-white/25'
                    onClick={() => {
                        openApp('settings', { props: { section: 'desktop' } });
                        setMissionControlOpen(false);
                    }}
                >
                    {t('featheros.mission.manage_spaces')}
                </button>
                <button
                    type='button'
                    className='rounded-full bg-white px-4 py-1.5 text-[12px] font-medium text-black'
                    onClick={() => setMissionControlOpen(false)}
                >
                    {t('featheros.mission.done')}
                </button>
            </div>
        </div>
    );
}
