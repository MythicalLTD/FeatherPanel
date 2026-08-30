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

import { Fragment, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { AppWindow, Check, ChevronsUpDown, Clock, LayoutGrid, Loader2, Search, Star, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpaceContext } from '@/contexts/WebSpaceContext';
import { useFavoriteWebSpaceUuids } from '@/hooks/useFavoriteWebSpaceUuids';
import { useUserWebSpacesList } from '@/hooks/useUserWebSpacesList';
import {
    buildWebSpaceSwitchUrl,
    filterWebSpacesBySearch,
    filterWebSpacesForSwitcherTab,
    getCurrentWebSpaceUuidShort,
    getRecentWebSpaceUuidShorts,
    getWebSpaceRouteId,
    sortWebSpacesForSwitcher,
    sortWebSpacesWithFavoritesFirst,
    type WebSpaceSwitcherTab,
} from '@/lib/webspace-switch';
import { displayWebSpaceStatus, getWebSpaceStatusDotColor } from '@/lib/webspace-utils';
import type { WebSpace } from '@/types/webspace';

const SWITCHER_TAB_KEY = 'featherpanel_webspace_switcher_tab';

interface WebSpaceSwitcherProps {
    fallbackTitle?: string;
}

function WebSpaceAvatar({ webspace, className }: { webspace: WebSpace; className?: string }) {
    const initial = (webspace.name?.trim()?.[0] || '?').toUpperCase();

    return (
        <div
            className={cn(
                'bg-primary/15 text-primary ring-primary/20 flex shrink-0 items-center justify-center rounded-md text-xs font-bold ring-1',
                className,
            )}
            aria-hidden='true'
        >
            {initial}
        </div>
    );
}

function preventMenuClose(e: React.MouseEvent | React.PointerEvent) {
    e.stopPropagation();
}

export function WebSpaceSwitcher({ fallbackTitle }: WebSpaceSwitcherProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useTranslation();
    const webSpaceContext = useContext(WebSpaceContext);
    const currentUuidShort = getCurrentWebSpaceUuidShort(pathname);
    const enabled = Boolean(currentUuidShort);

    const { webspaces, loading } = useUserWebSpacesList(enabled);
    const { favoriteUuids, toggleFavorite } = useFavoriteWebSpaceUuids();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<WebSpaceSwitcherTab>('all');
    const [recentUuidShorts, setRecentUuidShorts] = useState<string[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const saved = sessionStorage.getItem(SWITCHER_TAB_KEY);
            if (saved === 'all' || saved === 'favorites' || saved === 'recent') {
                setActiveTab(saved);
            }
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        setRecentUuidShorts(getRecentWebSpaceUuidShorts());
    }, [pathname]);

    const handleTabChange = (tab: WebSpaceSwitcherTab) => {
        setActiveTab(tab);
        try {
            sessionStorage.setItem(SWITCHER_TAB_KEY, tab);
        } catch {
            /* ignore */
        }
    };

    const sortedWebSpaces = useMemo(
        () => sortWebSpacesForSwitcher(webspaces, currentUuidShort),
        [webspaces, currentUuidShort],
    );

    const currentWebSpace = useMemo(() => {
        const fromList = sortedWebSpaces.find((w) => getWebSpaceRouteId(w) === currentUuidShort);
        if (fromList) return fromList;
        if (webSpaceContext?.webspace && getWebSpaceRouteId(webSpaceContext.webspace) === currentUuidShort) {
            return webSpaceContext.webspace;
        }
        return null;
    }, [sortedWebSpaces, currentUuidShort, webSpaceContext?.webspace]);

    const filteredWebSpaces = useMemo(() => {
        let list = filterWebSpacesForSwitcherTab(sortedWebSpaces, activeTab, favoriteUuids, recentUuidShorts);
        list = filterWebSpacesBySearch(list, searchQuery);
        if (activeTab === 'all' && !searchQuery.trim()) {
            list = sortWebSpacesWithFavoritesFirst(list, favoriteUuids);
        }
        return list;
    }, [sortedWebSpaces, activeTab, favoriteUuids, recentUuidShorts, searchQuery]);

    const favoriteUuidSet = useMemo(() => new Set(favoriteUuids), [favoriteUuids]);

    const favoriteCount = useMemo(
        () => sortedWebSpaces.filter((w) => favoriteUuidSet.has(w.uuid)).length,
        [sortedWebSpaces, favoriteUuidSet],
    );

    const recentCount = useMemo(() => {
        const recentSet = new Set(recentUuidShorts);
        return sortedWebSpaces.filter((w) => recentSet.has(getWebSpaceRouteId(w))).length;
    }, [sortedWebSpaces, recentUuidShorts]);

    if (!enabled) {
        return null;
    }

    const handleSelect = (webspace: WebSpace) => {
        const targetId = getWebSpaceRouteId(webspace);
        if (!targetId || targetId === currentUuidShort) return;

        const search = typeof window !== 'undefined' ? window.location.search : '';
        router.push(buildWebSpaceSwitchUrl(targetId, pathname, search));
    };

    const displayName = currentWebSpace?.name ?? fallbackTitle ?? t('navbar.webspace_switcher.current');

    const tabs: { id: WebSpaceSwitcherTab; label: string; count?: number; icon?: typeof Star }[] = [
        { id: 'all', label: t('navbar.webspace_switcher.tabs.all') },
        { id: 'favorites', label: t('navbar.webspace_switcher.tabs.favorites'), count: favoriteCount, icon: Star },
        { id: 'recent', label: t('navbar.webspace_switcher.tabs.recent'), count: recentCount, icon: Clock },
    ];

    const emptyMessage =
        activeTab === 'favorites'
            ? t('navbar.webspace_switcher.empty_favorites')
            : activeTab === 'recent'
              ? t('navbar.webspace_switcher.empty_recent')
              : searchQuery.trim()
                ? t('navbar.webspace_switcher.empty_search')
                : t('navbar.webspace_switcher.empty');

    return (
        <Menu as='div' className='relative max-w-full min-w-0'>
            <MenuButton
                type='button'
                className={cn(
                    'group flex max-w-full min-w-0 cursor-pointer items-center gap-2 rounded-xl px-1 py-0.5 text-left transition-colors outline-none',
                    'hover:bg-muted/40 focus-visible:ring-primary/40 focus-visible:ring-2',
                )}
                title={t('navbar.webspace_switcher.switch')}
            >
                {loading && !currentWebSpace ? (
                    <Loader2 className='text-muted-foreground h-4 w-4 shrink-0 animate-spin' aria-hidden />
                ) : currentWebSpace ? (
                    <WebSpaceAvatar webspace={currentWebSpace} className='h-7 w-7 sm:h-8 sm:w-8' />
                ) : (
                    <div className='bg-muted/40 ring-border/40 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1 sm:h-8 sm:w-8'>
                        <AppWindow className='text-muted-foreground h-3.5 w-3.5 sm:h-4 sm:w-4' />
                    </div>
                )}
                <span className='min-w-0 flex-1'>
                    <span className='text-foreground block truncate text-sm font-semibold tracking-tight sm:text-[0.95rem]'>
                        {displayName}
                        {currentWebSpace && favoriteUuidSet.has(currentWebSpace.uuid) && (
                            <Star className='text-primary ml-1 inline h-3 w-3 fill-current' aria-hidden />
                        )}
                    </span>
                    {currentWebSpace && (
                        <span className='text-muted-foreground hidden items-center gap-1 text-[11px] sm:flex'>
                            <span
                                className={cn(
                                    'h-1.5 w-1.5 shrink-0 rounded-full',
                                    getWebSpaceStatusDotColor(displayWebSpaceStatus(currentWebSpace)),
                                )}
                            />
                            {t(`servers.status.${displayWebSpaceStatus(currentWebSpace)}`, {
                                defaultValue: displayWebSpaceStatus(currentWebSpace),
                            })}
                        </span>
                    )}
                </span>
                <ChevronsUpDown
                    className='text-muted-foreground h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100'
                    aria-hidden
                />
            </MenuButton>

            <Transition
                as={Fragment}
                enter='transition ease-out duration-100'
                enterFrom='transform opacity-0 scale-95'
                enterTo='transform opacity-100 scale-100'
                leave='transition ease-in duration-75'
                leaveFrom='transform opacity-100 scale-100'
                leaveTo='transform opacity-0 scale-95'
            >
                <MenuItems
                    anchor='bottom start'
                    modal={false}
                    className='border-border/40 bg-card/95 z-50 mt-1 flex max-h-[min(28rem,75vh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border shadow-2xl backdrop-blur-xl focus:outline-none'
                >
                    <div className='border-border/40 shrink-0 border-b px-3 py-2.5'>
                        <p className='text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase'>
                            {t('navbar.webspace_switcher.title')}
                        </p>

                        <div
                            className='bg-muted/25 border-border/50 focus-within:ring-primary/30 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 focus-within:ring-2'
                            onMouseDown={(e) => {
                                preventMenuClose(e);
                                if (!(e.target instanceof HTMLInputElement)) {
                                    searchInputRef.current?.focus();
                                }
                            }}
                            onClick={preventMenuClose}
                        >
                            <Search className='text-muted-foreground h-3.5 w-3.5 shrink-0' aria-hidden />
                            <input
                                ref={searchInputRef}
                                type='search'
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('navbar.webspace_switcher.search_placeholder')}
                                className='text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none'
                                onMouseDown={preventMenuClose}
                                onKeyDown={(e) => e.stopPropagation()}
                            />
                            {searchQuery && (
                                <button
                                    type='button'
                                    className='text-muted-foreground hover:text-foreground rounded p-0.5'
                                    onMouseDown={preventMenuClose}
                                    onClick={(e) => {
                                        preventMenuClose(e);
                                        setSearchQuery('');
                                    }}
                                    aria-label={t('navbar.webspace_switcher.clear_search')}
                                >
                                    <X className='h-3.5 w-3.5' />
                                </button>
                            )}
                        </div>

                        <div
                            className='mt-2 flex gap-1'
                            role='tablist'
                            aria-label={t('navbar.webspace_switcher.tabs_label')}
                            onMouseDown={preventMenuClose}
                            onClick={preventMenuClose}
                        >
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type='button'
                                        role='tab'
                                        aria-selected={isActive}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={cn(
                                            'inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors',
                                            isActive
                                                ? 'bg-primary/15 text-primary ring-primary/25 ring-1'
                                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                                        )}
                                    >
                                        {Icon && (
                                            <Icon className={cn('h-3 w-3 shrink-0', isActive && 'fill-current')} />
                                        )}
                                        <span className='truncate'>{tab.label}</span>
                                        {tab.count !== undefined && tab.count > 0 && (
                                            <span
                                                className={cn(
                                                    'rounded-full px-1 text-[10px] tabular-nums',
                                                    isActive ? 'bg-primary/20' : 'bg-muted/60',
                                                )}
                                            >
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className='custom-scrollbar min-h-0 flex-1 overflow-y-auto p-1'>
                        {loading && sortedWebSpaces.length === 0 ? (
                            <p className='text-muted-foreground flex items-center justify-center gap-2 px-3 py-6 text-xs'>
                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                {t('navbar.webspace_switcher.loading')}
                            </p>
                        ) : filteredWebSpaces.length === 0 ? (
                            <p className='text-muted-foreground px-3 py-6 text-center text-xs leading-relaxed'>
                                {emptyMessage}
                            </p>
                        ) : (
                            filteredWebSpaces.map((webspace) => {
                                const id = getWebSpaceRouteId(webspace);
                                const isCurrent = id === currentUuidShort;
                                const status = displayWebSpaceStatus(webspace);
                                const favorited = favoriteUuidSet.has(webspace.uuid);

                                return (
                                    <MenuItem key={webspace.uuid || id} disabled={isCurrent} as='div'>
                                        {({ focus, disabled }) => (
                                            <div
                                                className={cn(
                                                    'flex w-full items-center gap-1 rounded-lg pr-1 transition-colors',
                                                    focus && 'bg-primary/10',
                                                    disabled && 'opacity-100',
                                                )}
                                            >
                                                <button
                                                    type='button'
                                                    disabled={disabled}
                                                    onClick={() => handleSelect(webspace)}
                                                    className={cn(
                                                        'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm',
                                                        !disabled && 'hover:bg-muted/40',
                                                    )}
                                                >
                                                    <WebSpaceAvatar webspace={webspace} className='h-7 w-7' />
                                                    <span className='min-w-0 flex-1'>
                                                        <span className='text-foreground flex items-center gap-1 truncate font-medium'>
                                                            {webspace.name}
                                                            {favorited && (
                                                                <Star className='text-primary h-3 w-3 shrink-0 fill-current' />
                                                            )}
                                                        </span>
                                                        <span className='text-muted-foreground flex items-center gap-1.5 text-[11px]'>
                                                            <span
                                                                className={cn(
                                                                    'h-1.5 w-1.5 shrink-0 rounded-full',
                                                                    getWebSpaceStatusDotColor(status),
                                                                )}
                                                            />
                                                            {t(`servers.status.${status}`, { defaultValue: status })}
                                                        </span>
                                                    </span>
                                                    {isCurrent && (
                                                        <Check className='text-primary h-4 w-4 shrink-0' aria-hidden />
                                                    )}
                                                </button>
                                                <button
                                                    type='button'
                                                    onMouseDown={preventMenuClose}
                                                    onClick={(e) => {
                                                        preventMenuClose(e);
                                                        toggleFavorite(webspace.uuid);
                                                    }}
                                                    className={cn(
                                                        'text-muted-foreground hover:text-primary shrink-0 rounded-lg p-2 transition-colors',
                                                        favorited && 'text-primary',
                                                    )}
                                                    title={
                                                        favorited
                                                            ? t('webSpaces.favorite_remove')
                                                            : t('webSpaces.favorite_add')
                                                    }
                                                    aria-label={
                                                        favorited
                                                            ? t('webSpaces.favorite_remove')
                                                            : t('webSpaces.favorite_add')
                                                    }
                                                >
                                                    <Star
                                                        className={cn('h-4 w-4', favorited && 'fill-current')}
                                                        aria-hidden
                                                    />
                                                </button>
                                            </div>
                                        )}
                                    </MenuItem>
                                );
                            })
                        )}
                    </div>

                    <div className='border-border/40 shrink-0 border-t p-1'>
                        <Link
                            href='/dashboard/webspaces'
                            className='text-muted-foreground hover:bg-muted/50 hover:text-foreground flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors'
                        >
                            <LayoutGrid className='h-3.5 w-3.5 shrink-0' />
                            {t('navbar.webspace_switcher.view_all')}
                        </Link>
                    </div>
                </MenuItems>
            </Transition>
        </Menu>
    );
}
