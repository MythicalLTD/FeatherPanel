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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useFeatherOs } from './FeatherOsContext';
import { OS_APPS, OS_APP_IDS } from './registry';
import { AppIcon } from './AppIcon';
import type { OsAppId } from './types';

function gridColumns(grid: HTMLElement | null) {
    if (!grid) return 1;
    return Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length);
}

export function Launchpad() {
    const { t } = useTranslation();
    const { launchpadOpen, setLaunchpadOpen, openApp, windows } = useFeatherOs();
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    const apps = useMemo(() => {
        const q = query.trim().toLowerCase();
        return OS_APP_IDS.map((id) => ({
            id,
            name: t(OS_APPS[id].nameKey),
            running: windows.some((w) => w.app === id),
        }))
            .filter((a) => !q || a.name.toLowerCase().includes(q) || a.id.includes(q))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [query, t, windows]);

    useEffect(() => {
        if (!launchpadOpen) return;
        setQuery('');
        setSelected(-1);
        const tmr = window.setTimeout(() => inputRef.current?.focus(), 40);
        return () => window.clearTimeout(tmr);
    }, [launchpadOpen]);

    useEffect(() => {
        setSelected(query.trim() ? 0 : -1);
    }, [query]);

    if (!launchpadOpen) return null;

    const launch = (id: OsAppId) => {
        setLaunchpadOpen(false);
        openApp(id);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            if (query) setQuery('');
            else setLaunchpadOpen(false);
            return;
        }
        if (apps.length === 0) return;
        const cols = gridColumns(gridRef.current);
        const move = (delta: number) => {
            e.preventDefault();
            setSelected((cur) => {
                if (cur < 0) return 0;
                return Math.max(0, Math.min(apps.length - 1, cur + delta));
            });
        };
        if (e.key === 'ArrowRight') move(1);
        else if (e.key === 'ArrowLeft') move(-1);
        else if (e.key === 'ArrowDown') move(cols);
        else if (e.key === 'ArrowUp') move(-cols);
        else if (e.key === 'Enter') {
            e.preventDefault();
            const app = apps[Math.max(0, selected)];
            if (app) launch(app.id);
        }
    };

    return (
        <div
            className='fos-launchpad'
            role='dialog'
            aria-label={t('featheros.launchpad.title', { defaultValue: 'Launchpad' })}
            onKeyDown={onKeyDown}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) setLaunchpadOpen(false);
            }}
        >
            <div
                className='fos-launchpad-inner'
                onMouseDown={(e) => {
                    if (e.target === e.currentTarget) setLaunchpadOpen(false);
                }}
            >
                <label className='fos-launchpad-search'>
                    <Search className='h-3.5 w-3.5' aria-hidden />
                    <input
                        ref={inputRef}
                        type='text'
                        name='fos-launchpad-query'
                        autoComplete='off'
                        autoCorrect='off'
                        spellCheck={false}
                        data-1p-ignore='true'
                        data-lpignore='true'
                        data-bwignore='true'
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('featheros.launchpad.search', { defaultValue: 'Search apps' })}
                        className='fos-launchpad-input'
                    />
                    {query && (
                        <button
                            type='button'
                            className='fos-launchpad-clear'
                            onClick={() => {
                                setQuery('');
                                inputRef.current?.focus();
                            }}
                            aria-label={t('featheros.common.close')}
                        >
                            <X className='h-3 w-3' />
                        </button>
                    )}
                </label>
                {apps.length === 0 ? (
                    <p className='fos-launchpad-empty'>{t('featheros.spotlight.no_results')}</p>
                ) : (
                    <div
                        ref={gridRef}
                        className='fos-launchpad-grid'
                        onMouseDown={(e) => {
                            if (e.target === e.currentTarget) setLaunchpadOpen(false);
                        }}
                    >
                        {apps.map((app, i) => (
                            <button
                                key={app.id}
                                type='button'
                                tabIndex={-1}
                                className={cn('fos-launchpad-app', i === selected && 'is-selected')}
                                style={{ animationDelay: `${Math.min(i, 24) * 12}ms` }}
                                onClick={() => launch(app.id)}
                                onMouseEnter={() => setSelected(i)}
                                onMouseLeave={() => setSelected((cur) => (cur === i && !query.trim() ? -1 : cur))}
                            >
                                <span className='fos-launchpad-icon'>
                                    <AppIcon app={app.id} size={72} />
                                </span>
                                <span className='fos-launchpad-app-name'>{app.name}</span>
                                <span className={cn('fos-launchpad-dot', app.running && 'is-on')} aria-hidden />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
