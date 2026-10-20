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
import {
    Search,
    HardDrive,
    SquareTerminal,
    Play,
    Square,
    RotateCw,
    SunMoon,
    Info,
    ExternalLink,
    AppWindow,
    type LucideIcon,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useFeatherOs } from './FeatherOsContext';
import { OS_APPS, OS_APP_IDS } from './registry';
import { AppIcon } from './AppIcon';
import type { OsAppId } from './types';
import { formatDiskPair, serverDiskUsage, serverState } from './utils';

interface SpotlightItem {
    id: string;
    title: string;
    subtitle: string;
    group: string;
    app?: OsAppId;
    icon?: LucideIcon;
    keywords: string;
    run: () => void;
}

function score(item: SpotlightItem, q: string): number {
    if (!q) return 1;
    const title = item.title.toLowerCase();
    if (title.startsWith(q)) return 100 - title.length / 100;
    if (title.split(/\s+/).some((w) => w.startsWith(q))) return 80;
    if (title.includes(q)) return 60;
    if (item.keywords.includes(q)) return 30;
    // Loose subsequence match ("srvmgr" -> "Server Manager").
    let i = 0;
    for (const ch of title) if (ch === q[i]) i++;
    return i === q.length ? 10 : 0;
}

export function Spotlight() {
    const { t } = useTranslation();
    const os = useFeatherOs();
    const {
        spotlightOpen,
        setSpotlightOpen,
        openApp,
        servers,
        can,
        windows,
        focusWindow,
        getServer,
        openTerminalFor,
        isDark,
        setOsTheme,
        setAboutOpen,
        errorMessage,
        panelName,
        live,
    } = os;
    const [query, setQuery] = useState('');
    const [index, setIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (spotlightOpen) {
            setQuery('');
            setIndex(0);
            window.setTimeout(() => inputRef.current?.focus(), 20);
        }
    }, [spotlightOpen]);

    const items = useMemo<SpotlightItem[]>(() => {
        const out: SpotlightItem[] = [];
        for (const id of OS_APP_IDS) {
            const name = t(OS_APPS[id].nameKey);
            out.push({
                id: `app:${id}`,
                title: name,
                subtitle: t('featheros.spotlight.application'),
                group: t('featheros.spotlight.group_apps'),
                app: id,
                keywords: `${id} app`,
                run: () => openApp(id),
            });
        }
        for (const w of windows) {
            const server = getServer(w.serverUuid);
            out.push({
                id: `win:${w.id}`,
                title: [t(OS_APPS[w.app].nameKey), server?.name].filter(Boolean).join(' · '),
                subtitle: t('featheros.spotlight.open_window'),
                group: t('featheros.spotlight.group_windows'),
                icon: AppWindow,
                keywords: 'window',
                run: () => focusWindow(w.id),
            });
        }
        const power = (uuid: string, action: 'start' | 'stop' | 'restart') => async () => {
            try {
                await axios.post(`/api/user/servers/${uuid}/power/${action}`);
                toast.success(t(`featheros.servers.power_sent_${action}`));
            } catch (error) {
                toast.error(errorMessage(error));
            }
        };
        for (const s of servers) {
            const kw = `${s.uuidShort} ${s.spell?.name ?? ''} ${s.node?.name ?? ''}`.toLowerCase();
            const disk = serverDiskUsage(s, live[s.uuidShort]?.stats?.diskUsage);
            const st = serverState(s, live[s.uuidShort]?.status);
            out.push({
                id: `srv:${s.uuidShort}`,
                title: s.name,
                subtitle: [t(`featheros.state.${st}`, { defaultValue: st }), formatDiskPair(disk.used, disk.limit)]
                    .filter(Boolean)
                    .join(' · '),
                group: t('featheros.spotlight.group_servers'),
                icon: HardDrive,
                keywords: `${kw} disk storage`,
                run: () => openApp('finder', { serverUuid: s.uuidShort }),
            });
            if (can(s, 'websocket.connect'))
                out.push({
                    id: `term:${s.uuidShort}`,
                    title: t('featheros.spotlight.console_of', { name: s.name }),
                    subtitle: t('featheros.apps.terminal'),
                    group: t('featheros.spotlight.group_actions'),
                    icon: SquareTerminal,
                    keywords: `${kw} console terminal`,
                    run: () => openTerminalFor(s.uuidShort),
                });
            if (can(s, 'control.start'))
                out.push({
                    id: `start:${s.uuidShort}`,
                    title: t('featheros.spotlight.start', { name: s.name }),
                    subtitle: t('featheros.spotlight.power'),
                    group: t('featheros.spotlight.group_actions'),
                    icon: Play,
                    keywords: `${kw} power start`,
                    run: power(s.uuidShort, 'start'),
                });
            if (can(s, 'control.restart'))
                out.push({
                    id: `restart:${s.uuidShort}`,
                    title: t('featheros.spotlight.restart', { name: s.name }),
                    subtitle: t('featheros.spotlight.power'),
                    group: t('featheros.spotlight.group_actions'),
                    icon: RotateCw,
                    keywords: `${kw} power restart`,
                    run: power(s.uuidShort, 'restart'),
                });
            if (can(s, 'control.stop'))
                out.push({
                    id: `stop:${s.uuidShort}`,
                    title: t('featheros.spotlight.stop', { name: s.name }),
                    subtitle: t('featheros.spotlight.power'),
                    group: t('featheros.spotlight.group_actions'),
                    icon: Square,
                    keywords: `${kw} power stop`,
                    run: power(s.uuidShort, 'stop'),
                });
        }
        out.push(
            {
                id: 'cmd:theme',
                title: isDark ? t('featheros.desktop.light_mode') : t('featheros.desktop.dark_mode'),
                subtitle: t('featheros.spotlight.command'),
                group: t('featheros.spotlight.group_actions'),
                icon: SunMoon,
                keywords: 'theme dark light appearance',
                run: () => setOsTheme(isDark ? 'light' : 'dark'),
            },
            {
                id: 'cmd:about',
                title: t('featheros.about.title'),
                subtitle: t('featheros.spotlight.command'),
                group: t('featheros.spotlight.group_actions'),
                icon: Info,
                keywords: 'about version',
                run: () => setAboutOpen(true),
            },
            {
                id: 'cmd:panel',
                title: t('featheros.menu.open_panel', { name: panelName }),
                subtitle: t('featheros.spotlight.command'),
                group: t('featheros.spotlight.group_actions'),
                icon: ExternalLink,
                keywords: 'panel dashboard classic',
                run: () => window.open('/dashboard', '_blank', 'noopener'),
            },
        );
        return out;
    }, [
        t,
        windows,
        servers,
        can,
        getServer,
        openApp,
        focusWindow,
        openTerminalFor,
        isDark,
        setOsTheme,
        setAboutOpen,
        errorMessage,
        panelName,
        live,
    ]);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        const scored = items
            .map((item) => ({ item, s: score(item, q) }))
            .filter((x) => x.s > 0)
            .sort((a, b) => b.s - a.s);
        return (q ? scored : scored.filter((x) => x.item.id.startsWith('app:') || x.item.id.startsWith('srv:')))
            .slice(0, 40)
            .map((x) => x.item);
    }, [items, query]);

    useEffect(() => setIndex(0), [query]);

    if (!spotlightOpen) return null;
    const run = (item: SpotlightItem | undefined) => {
        if (!item) return;
        setSpotlightOpen(false);
        item.run();
    };

    let lastGroup = '';
    return (
        <div
            className='fos-spotlight-scrim fos-fade fixed inset-0 z-[9500] flex justify-center pt-[14vh]'
            onMouseDown={(e) => e.target === e.currentTarget && setSpotlightOpen(false)}
        >
            <div
                role='dialog'
                aria-label={t('featheros.spotlight.title')}
                className='fos-spotlight fos-pop flex h-fit max-h-[62vh] w-[680px] max-w-[94vw] flex-col overflow-hidden'
            >
                <form
                    className='fos-spotlight-search'
                    autoComplete='off'
                    onSubmit={(e) => {
                        e.preventDefault();
                        run(results[index]);
                    }}
                >
                    <Search className='fos-spotlight-search-icon' aria-hidden />
                    {/*
                      Password managers treat bare text inputs as login fields.
                      type=search + ignore attrs keep 1Password / Bitwarden / LastPass off this control.
                    */}
                    <input
                        ref={inputRef}
                        id='fos-spotlight-search'
                        name='fos-spotlight-query'
                        type='search'
                        role='searchbox'
                        inputMode='search'
                        enterKeyHint='go'
                        autoComplete='off'
                        autoCorrect='off'
                        autoCapitalize='off'
                        spellCheck={false}
                        data-1p-ignore='true'
                        data-lpignore='true'
                        data-form-type='other'
                        data-bwignore='true'
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('featheros.spotlight.placeholder')}
                        className='fos-spotlight-input'
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setIndex((i) => Math.min(results.length - 1, i + 1));
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setIndex((i) => Math.max(0, i - 1));
                            } else if (e.key === 'Escape') {
                                setSpotlightOpen(false);
                            }
                        }}
                    />
                </form>
                {results.length > 0 && (
                    <div className='fos-spotlight-results fos-scroll'>
                        {results.map((item, i) => {
                            const header = item.group !== lastGroup ? item.group : null;
                            lastGroup = item.group;
                            const Icon = item.icon;
                            const showSubtitle = Boolean(item.subtitle) && !item.app;
                            return (
                                <div key={item.id}>
                                    {header && <div className='fos-spotlight-group'>{header}</div>}
                                    <button
                                        type='button'
                                        onMouseEnter={() => setIndex(i)}
                                        onClick={() => run(item)}
                                        className={cn('fos-spotlight-row', i === index && 'is-active')}
                                    >
                                        {item.app ? (
                                            <AppIcon app={item.app} size={28} />
                                        ) : Icon ? (
                                            <span className='fos-spotlight-glyph'>
                                                <Icon className='h-4 w-4' />
                                            </span>
                                        ) : null}
                                        <span className='fos-spotlight-title'>{item.title}</span>
                                        {(showSubtitle || item.id.startsWith('srv:')) && item.subtitle && (
                                            <span className='fos-spotlight-meta'>{item.subtitle}</span>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
                {results.length === 0 && query && (
                    <div className='fos-spotlight-empty'>{t('featheros.spotlight.no_results')}</div>
                )}
            </div>
        </div>
    );
}
