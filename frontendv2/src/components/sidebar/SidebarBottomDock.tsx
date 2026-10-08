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

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { ChevronsDown, ChevronsUp } from 'lucide-react';
import type { DockDisplay, DockSize, SidebarGlow } from '@/hooks/useSidebarPreferences';
import type { NavigationItem } from '@/types/navigation';
import { PanelIcon } from '@/components/icons/PanelIcon';
import {
    getDockIconSize,
    MacDockCategory,
    MacDockItem,
    MacDockProvider,
    MacDockTrack,
} from '@/components/sidebar/MacDock';
import { setSidebarCollapsed } from '@/lib/sidebarChrome';
import { runPluginJs } from '@/lib/run-plugin-js';
import { cn } from '@/lib/utils';

type SidebarBottomDockProps = {
    collapsed: boolean;
    dockDisplay: DockDisplay;
    dockSize: DockSize;
    sidebarGlow: SidebarGlow;
    groupedItems: Record<string, NavigationItem[]>;
    logoUrl: string;
    appName: string;
    t: (key: string, params?: Record<string, string>) => string;
    isActive: (href: string) => boolean;
    unreadTicketCount: number;
    adminOpenTicketCount: number;
    showCollapseToggle?: boolean;
};

const GROUP_ORDER = [
    'overview',
    'management',
    'files',
    'networking',
    'automation',
    'configuration',
    'feathercloud',
    'users',
    'tickets',
    'infrastructure',
    'content',
    'system',
    'support',
    'plugins',
];

export function SidebarBottomDock({
    collapsed,
    dockSize,
    sidebarGlow,
    groupedItems,
    logoUrl,
    appName,
    t,
    isActive,
    unreadTicketCount,
    adminOpenTicketCount,
    showCollapseToggle = true,
}: SidebarBottomDockProps) {
    const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);

    const sortedGroups = useMemo(() => {
        return Object.keys(groupedItems).sort((a, b) => {
            const indexA = GROUP_ORDER.indexOf(a.toLowerCase());
            const indexB = GROUP_ORDER.indexOf(b.toLowerCase());
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });
    }, [groupedItems]);

    const itemCount = useMemo(
        () => sortedGroups.reduce((sum, group) => sum + groupedItems[group].length, 0),
        [sortedGroups, groupedItems],
    );

    const iconPx = getDockIconSize(dockSize, itemCount, collapsed);
    const showItemLabels = !collapsed;
    const collapseLabel = collapsed ? t('navbar.expandSidebar') : t('navbar.collapseSidebar');

    const renderGroupTitle = (group: string) => {
        const translationKey = `navigation.groups.${group}`;
        const translated = t(translationKey);
        if (translated === translationKey) {
            return group.charAt(0).toUpperCase() + group.slice(1);
        }
        return translated;
    };

    const renderBadge = (item: NavigationItem) => {
        const isTicketsItem = item.url === '/dashboard/tickets';
        const isAdminTicketsItem = item.url === '/admin/tickets';
        if ((isTicketsItem && unreadTicketCount > 0) || (isAdminTicketsItem && adminOpenTicketCount > 0)) {
            return (
                <span className='border-background bg-destructive absolute top-0 right-0 h-2 w-2 rounded-full border' />
            );
        }
        return null;
    };

    const renderItemContent = (item: NavigationItem) => (
        <span className='relative flex items-center justify-center text-current'>
            <PanelIcon
                source={item}
                size={iconPx}
                label={item.name}
                className='pointer-events-none shrink-0 text-current'
            />
            {renderBadge(item)}
        </span>
    );

    const renderDockEntry = (item: NavigationItem) => {
        const active = isActive(item.pluginRedirect || item.url);
        const hasChildren = Boolean(item.children?.length);
        const isSubmenuOpen = openSubmenuId === item.id;

        if (hasChildren) {
            return (
                <div key={item.id} className='relative shrink-0'>
                    <MacDockItem label={item.name} active={active || isSubmenuOpen}>
                        <button
                            type='button'
                            className='flex h-full w-full items-center justify-center outline-none'
                            aria-label={item.name}
                            aria-expanded={isSubmenuOpen}
                            onClick={() => setOpenSubmenuId((current) => (current === item.id ? null : item.id))}
                        >
                            {renderItemContent(item)}
                        </button>
                    </MacDockItem>
                    {isSubmenuOpen && (
                        <div className='border-primary/20 bg-popover absolute bottom-[calc(100%+0.5rem)] left-1/2 z-[120] min-w-44 -translate-x-1/2 space-y-0.5 rounded-xl border p-1.5 shadow-lg'>
                            {item.children?.map((child) => (
                                <Link
                                    key={child.id}
                                    href={child.url}
                                    prefetch
                                    onClick={() => setOpenSubmenuId(null)}
                                    className={cn(
                                        'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors',
                                        isActive(child.url)
                                            ? 'bg-primary/10 text-primary font-medium'
                                            : 'text-foreground hover:bg-muted/50',
                                    )}
                                >
                                    <PanelIcon source={child} size={16} label={child.name} className='text-current' />
                                    <span className='truncate'>{child.name}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        if (item.pluginJs) {
            return (
                <MacDockItem key={item.id} label={item.name} active={active}>
                    <button
                        type='button'
                        className='flex h-full w-full items-center justify-center outline-none'
                        aria-label={item.name}
                        onClick={() => {
                            try {
                                runPluginJs(item.pluginJs!);
                            } catch (e) {
                                console.error('Failed to execute plugin JS', e);
                            }
                        }}
                    >
                        {renderItemContent(item)}
                    </button>
                </MacDockItem>
            );
        }

        const targetUrl = item.pluginRedirect || item.url;
        const openExternal = Boolean(item.openInNewTab) || /^https?:\/\//i.test(targetUrl);

        if (openExternal) {
            return (
                <MacDockItem key={item.id} label={item.name} active={active}>
                    <a
                        href={targetUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex h-full w-full items-center justify-center outline-none'
                        aria-label={item.name}
                    >
                        {renderItemContent(item)}
                    </a>
                </MacDockItem>
            );
        }

        return (
            <MacDockItem key={item.id} label={item.name} active={active}>
                <Link
                    href={targetUrl}
                    prefetch
                    className='flex h-full w-full items-center justify-center outline-none'
                    aria-label={item.name}
                >
                    {renderItemContent(item)}
                </Link>
            </MacDockItem>
        );
    };

    const handleToggleCollapsed = () => {
        setSidebarCollapsed(!collapsed);
    };

    return (
        <MacDockProvider
            dockSize={dockSize}
            itemCount={itemCount}
            compact={collapsed}
            showItemLabels={showItemLabels}
            sidebarGlow={sidebarGlow}
            className='fp-mac-dock-shell w-full gap-1 px-1.5 py-0.5'
        >
            <MacDockItem label={appName}>
                <Link
                    href='/dashboard'
                    prefetch
                    className='flex h-full w-full items-center justify-center overflow-hidden outline-none'
                    aria-label={appName}
                >
                    <NextImage
                        src={logoUrl}
                        alt={appName}
                        width={iconPx + 6}
                        height={iconPx + 6}
                        className='h-[82%] w-[82%] object-contain'
                        unoptimized
                    />
                </Link>
            </MacDockItem>

            <div
                className='from-primary/25 mx-0.5 h-6 w-px shrink-0 self-center bg-gradient-to-b to-transparent'
                aria-hidden
            />

            <MacDockTrack>
                {sortedGroups.flatMap((group) => {
                    const entries: ReactNode[] = [
                        <MacDockCategory key={`cat-${group}`} label={renderGroupTitle(group)} />,
                    ];
                    groupedItems[group].forEach((item) => {
                        entries.push(renderDockEntry(item));
                    });
                    return entries;
                })}
            </MacDockTrack>

            {showCollapseToggle && (
                <>
                    <div
                        className='from-primary/25 mx-0.5 h-6 w-px shrink-0 self-center bg-gradient-to-b to-transparent'
                        aria-hidden
                    />
                    <MacDockItem label={collapseLabel} active={false}>
                        <button
                            type='button'
                            className='text-muted-foreground hover:text-primary flex h-full w-full items-center justify-center outline-none'
                            title={collapseLabel}
                            aria-label={t('navbar.toggleSidebar')}
                            aria-pressed={collapsed}
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleToggleCollapsed();
                            }}
                        >
                            {collapsed ? (
                                <ChevronsUp className='h-5 w-5' aria-hidden />
                            ) : (
                                <ChevronsDown className='h-5 w-5' aria-hidden />
                            )}
                        </button>
                    </MacDockItem>
                </>
            )}
        </MacDockProvider>
    );
}
