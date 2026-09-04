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

import { Fragment, useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { X, ChevronRight, ChevronDown } from 'lucide-react';
import NextImage from 'next/image';
import Link from 'next/link';
import axios from 'axios';
import { PanelIcon } from '@/components/icons/PanelIcon';
import { useSettings } from '@/contexts/SettingsContext';
import { useSession } from '@/contexts/SessionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn, isEnabled } from '@/lib/utils';
import { useNavigation } from '@/hooks/useNavigation';
import { useTranslation } from '@/contexts/TranslationContext';
import type { NavigationItem } from '@/types/navigation';
import { type ChromeLayout, useChromeLayout } from '@/hooks/useChromeLayout';
import {
    type DockDisplay,
    type DockSize,
    type SidebarDensity,
    type SidebarGlow,
    type SidebarPosition,
    type SidebarStyle,
    type SidebarTogglePlacement,
    useSidebarPreferences,
} from '@/hooks/useSidebarPreferences';
import { readSidebarCollapsed, subscribeSidebarCollapsed } from '@/lib/sidebarChrome';
import { getDesktopSidebarPanelClass, getDesktopSidebarShellClass, getSidebarSurfaceClass } from '@/lib/sidebarLayout';
import { runPluginJs } from '@/lib/run-plugin-js';
import { PoweredByFeatherPanel } from '@/components/branding/PoweredByFeatherPanel';
import { shouldShowVersion } from '@/lib/branding';
import { SidebarBottomDock } from '@/components/sidebar/SidebarBottomDock';
import { SidebarCollapseToggle } from '@/components/sidebar/SidebarCollapseToggle';
import { SidebarCollapsedTooltipLayer, sidebarTooltipProps } from '@/components/sidebar/SidebarCollapsedTooltipLayer';

interface SidebarProps {
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
    /** Full-bleed plugin route: reduce glass/backdrop stacking against the iframe canvas */
    pluginFullBleed?: boolean;
}

function navIconSize(sizeClass: string): number {
    if (sizeClass.includes('h-6')) return 24;
    if (sizeClass.includes('h-5')) return 20;
    if (sizeClass.includes('h-4')) return 16;
    return 18;
}

function NavIcon({ item, sizeClass }: { item: NavigationItem; sizeClass: string }) {
    return <PanelIcon source={item} size={navIconSize(sizeClass)} label={item.name} className='shrink-0' />;
}

function SidebarContent({
    mobile = false,
    collapsed,
    settings,
    pathname,
    setMobileOpen,
    groupedItems,
    chromeLayout,
    sidebarDensity,
    sidebarStyle,
    sidebarPosition,
    dockDisplay,
    dockSize,
    sidebarGlow,
    sidebarTogglePlacement,
}: {
    mobile?: boolean;
    collapsed: boolean;
    settings: {
        app_name?: string;
        app_version?: string;
        app_logo_white?: string;
        app_logo_dark?: string;
        ticket_system_enabled?: string;
        branding_show_version?: string;
    } | null;
    pathname: string;
    router: ReturnType<typeof useRouter>;
    setMobileOpen: (open: boolean) => void;
    groupedItems: Record<string, NavigationItem[]>;
    chromeLayout: ChromeLayout;
    sidebarDensity: SidebarDensity;
    sidebarStyle: SidebarStyle;
    sidebarPosition: SidebarPosition;
    dockDisplay: DockDisplay;
    dockSize: DockSize;
    sidebarGlow: SidebarGlow;
    sidebarTogglePlacement: SidebarTogglePlacement;
}) {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const { adminTicketStats } = useSession();
    const showVersion = shouldShowVersion(settings);

    const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

    const [collapsedSubmenus, setCollapsedSubmenus] = useState<string[]>([]);
    const [unreadTicketCount, setUnreadTicketCount] = useState(0);
    const adminOpenTicketCount = adminTicketStats?.open_count ?? 0;
    const ticketsEnabled = isEnabled(settings?.ticket_system_enabled);
    const sidebarContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem('featherpanel_collapsed_groups');
        if (saved) {
            try {
                setCollapsedGroups(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse collapsed groups', e);
            }
        }

        const savedSubmenus = localStorage.getItem('featherpanel_collapsed_submenus');
        if (savedSubmenus) {
            try {
                setCollapsedSubmenus(JSON.parse(savedSubmenus));
            } catch (e) {
                console.error('Failed to parse collapsed submenus', e);
            }
        }
    }, []);

    useEffect(() => {
        if (!ticketsEnabled) {
            setUnreadTicketCount(0);
            return;
        }

        const fetchUnreadTicketCount = async () => {
            try {
                const { data } = await axios.get('/api/user/tickets', {
                    params: { page: 1, limit: 100 },
                });
                const tickets: Array<{
                    unread_count?: number;
                    has_unread_messages_since_last_reply?: boolean;
                }> = data?.data?.tickets ?? [];
                const totalUnread = tickets.reduce((sum, ticket) => {
                    if (!ticket?.has_unread_messages_since_last_reply) return sum;
                    return sum + (ticket.unread_count ?? 0);
                }, 0);
                setUnreadTicketCount(totalUnread);
            } catch {
                setUnreadTicketCount(0);
            }
        };

        void fetchUnreadTicketCount();

        const onTicketReplied = () => {
            void fetchUnreadTicketCount();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('featherpanel:ticket-replied', onTicketReplied);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('featherpanel:ticket-replied', onTicketReplied);
            }
        };
    }, [pathname, ticketsEnabled]);

    const toggleGroup = (group: string) => {
        const newCollapsed = collapsedGroups.includes(group)
            ? collapsedGroups.filter((g) => g !== group)
            : [...collapsedGroups, group];

        setCollapsedGroups(newCollapsed);
        localStorage.setItem('featherpanel_collapsed_groups', JSON.stringify(newCollapsed));
    };

    const toggleSubmenu = (itemId: string) => {
        const newCollapsed = collapsedSubmenus.includes(itemId)
            ? collapsedSubmenus.filter((id) => id !== itemId)
            : [...collapsedSubmenus, itemId];

        setCollapsedSubmenus(newCollapsed);
        localStorage.setItem('featherpanel_collapsed_submenus', JSON.stringify(newCollapsed));
    };

    const isActive = (href: string) => {
        if (pathname === href) return true;

        if (href === '/dashboard') return false;
        if (href === '/admin') return false;
        if (href === '/admin/tickets') return false;
        if (href === '/admin/nodes') return false;

        const serverRootRegex = /^\/server\/[^/]+$/;
        if (serverRootRegex.test(href)) {
            return pathname === href;
        }

        // For VDS pages, only treat the exact root (/vds/{id}) as "console";
        // subroutes like /vds/{id}/activities should not also highlight console.
        const vdsRootRegex = /^\/vds\/[^/]+$/;
        if (vdsRootRegex.test(href)) {
            return pathname === href;
        }

        const webspaceRootRegex = /^\/webspace\/[^/]+$/;
        if (webspaceRootRegex.test(href)) {
            return pathname === href;
        }

        return pathname.startsWith(href + '/');
    };

    const renderGroupTitle = (group: string) => {
        const translationKey = `navigation.groups.${group}`;
        const translated = t(translationKey);

        if (translated === translationKey) {
            return group.charAt(0).toUpperCase() + group.slice(1);
        }

        return translated;
    };

    const logoUrl = theme === 'dark' ? settings?.app_logo_dark || '/logo.png' : settings?.app_logo_white || '/logo.png';

    const isClassicChrome = chromeLayout === 'classic';
    const isCompact = sidebarDensity === 'compact';
    const useSolidSidebar = sidebarStyle === 'solid' || isClassicChrome;
    const isBottomDock = sidebarPosition === 'bottom' && !mobile;
    const showCollapsedTooltips = collapsed && !mobile && !isBottomDock;
    const collapsedTooltipSide = sidebarPosition === 'right' ? 'right' : 'left';
    const collapsedTip = (label: string) => sidebarTooltipProps(showCollapsedTooltips ? label : undefined);
    const showSidebarToggle =
        !mobile &&
        (sidebarTogglePlacement === 'sidebar' || sidebarTogglePlacement === 'both') &&
        (!isBottomDock || sidebarTogglePlacement === 'both');

    if (isBottomDock) {
        return (
            <SidebarBottomDock
                collapsed={collapsed}
                dockDisplay={dockDisplay}
                dockSize={dockSize}
                sidebarGlow={sidebarGlow}
                groupedItems={groupedItems}
                logoUrl={logoUrl}
                appName={settings?.app_name || 'FeatherPanel'}
                t={t}
                isActive={isActive}
                unreadTicketCount={unreadTicketCount}
                adminOpenTicketCount={adminOpenTicketCount}
            />
        );
    }

    const navItemBase = isClassicChrome
        ? 'group relative flex items-center w-full rounded-md text-sm font-medium transition-colors'
        : 'group relative flex items-center w-full rounded-xl text-sm font-medium transition-[background-color,box-shadow,color,transform] duration-200';
    const navItemIdle = isClassicChrome
        ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
        : 'text-muted-foreground hover:bg-muted/55 hover:text-foreground dark:hover:bg-muted/20';
    const navItemActive = isClassicChrome
        ? 'bg-accent/80 text-accent-foreground font-semibold before:absolute before:top-1/2 before:left-0 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary'
        : 'bg-primary/10 text-primary font-medium before:absolute before:top-1/2 before:left-1.5 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary';

    const badgeClass = isClassicChrome
        ? 'ml-auto inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium'
        : 'ml-auto inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/20';

    const topLevelItemPad = cn(
        isBottomDock
            ? collapsed
                ? 'min-w-10 flex-col justify-center px-2 py-1.5'
                : 'max-w-[5.5rem] min-w-[3.5rem] flex-col justify-center gap-1 px-2 py-2 text-center'
            : collapsed && !mobile
              ? isClassicChrome
                  ? 'justify-center'
                  : 'justify-center px-1.5 py-2'
              : isClassicChrome
                ? isCompact
                    ? 'gap-2.5 px-3 py-2'
                    : 'gap-3 px-3 py-2.5'
                : isCompact
                  ? 'gap-2 px-2 py-1.5'
                  : 'gap-2.5 px-2.5 py-2',
    );

    const topIconSize =
        collapsed && !mobile
            ? isClassicChrome
                ? 'h-6 w-6'
                : 'h-5 w-5'
            : isClassicChrome
              ? 'h-5 w-5'
              : 'h-[18px] w-[18px]';

    const groupOrder = [
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

    const sortedGroups = Object.keys(groupedItems).sort((a, b) => {
        const indexA = groupOrder.indexOf(a.toLowerCase());
        const indexB = groupOrder.indexOf(b.toLowerCase());

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;

        return a.localeCompare(b);
    });

    const modernBrandInner = (
        <div
            className={cn(
                'flex items-center rounded-xl border px-3 py-2 transition-colors',
                useSolidSidebar ? 'border-border/40 bg-muted/15' : 'border-border/25 bg-card/45',
                collapsed && !mobile ? 'justify-center px-2 py-2' : 'gap-2.5',
            )}
        >
            <div className='bg-background/40 ring-border/30 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1'>
                <NextImage
                    src={logoUrl}
                    alt={settings?.app_name || 'FeatherPanel'}
                    width={40}
                    height={40}
                    className={cn('object-contain', collapsed && !mobile ? 'h-6 w-6' : 'h-7 w-7')}
                    unoptimized
                />
            </div>

            {(!collapsed || mobile) && (
                <div className='flex min-w-0 flex-col gap-0.5'>
                    <span className='text-foreground truncate text-sm font-semibold tracking-tight'>
                        {settings?.app_name || 'FeatherPanel'}
                    </span>
                    {showVersion && (
                        <span className='border-primary/20 bg-primary/10 text-primary inline-flex w-fit items-center rounded-md border px-1.5 py-px text-[10px] font-semibold tracking-wider uppercase'>
                            v{settings?.app_version || '1.0.0'}
                        </span>
                    )}
                </div>
            )}
        </div>
    );

    const classicBrandInner = (
        <div
            className={cn(
                'border-border/50 flex items-center border-b transition-all',
                collapsed && !mobile ? 'justify-center px-2 py-4' : 'gap-3 px-4 py-4',
            )}
        >
            <div className='flex h-10 w-10 shrink-0 items-center justify-center'>
                <NextImage
                    src={logoUrl}
                    alt={settings?.app_name || 'FeatherPanel'}
                    width={40}
                    height={40}
                    className='h-full w-full object-contain'
                    unoptimized
                />
            </div>

            {(!collapsed || mobile) && (
                <div className='flex min-w-0 flex-col gap-0.5'>
                    <span className='truncate text-base font-semibold'>{settings?.app_name || 'FeatherPanel'}</span>
                    {showVersion && (
                        <span className='border-primary/20 bg-primary/10 text-primary inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-[10px] font-medium'>
                            v{settings?.app_version || '1.0.0'}
                        </span>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div
            ref={sidebarContentRef}
            className={cn(
                'flex min-h-0',
                isBottomDock ? 'h-full flex-row items-stretch gap-2 px-2 py-1.5' : 'h-full flex-col',
            )}
        >
            {isClassicChrome ? (
                mobile ? (
                    <Link
                        href='/dashboard'
                        prefetch={true}
                        className='focus-visible:ring-ring shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'
                        {...collapsedTip(settings?.app_name || 'FeatherPanel')}
                    >
                        {classicBrandInner}
                    </Link>
                ) : (
                    <Link
                        href='/dashboard'
                        prefetch={true}
                        className='focus-visible:ring-ring block min-w-0 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'
                        {...collapsedTip(settings?.app_name || 'FeatherPanel')}
                    >
                        {classicBrandInner}
                    </Link>
                )
            ) : mobile ? (
                <Link
                    href='/dashboard'
                    prefetch={true}
                    className='focus-visible:ring-ring mx-2 mt-2 shrink-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'
                >
                    {modernBrandInner}
                </Link>
            ) : isBottomDock ? (
                <Link
                    href='/dashboard'
                    prefetch={true}
                    className='focus-visible:ring-ring flex shrink-0 items-center self-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'
                >
                    <div className='bg-background/40 ring-primary/15 flex h-9 w-9 items-center justify-center rounded-xl ring-1'>
                        <NextImage
                            src={logoUrl}
                            alt={settings?.app_name || 'FeatherPanel'}
                            width={32}
                            height={32}
                            className='h-6 w-6 object-contain'
                            unoptimized
                        />
                    </div>
                </Link>
            ) : (
                <Link
                    href='/dashboard'
                    prefetch={true}
                    className={cn(
                        'focus-visible:ring-ring mx-2 mt-3 block min-w-0 shrink-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                        collapsed && 'mx-1.5 mt-2',
                    )}
                    {...collapsedTip(settings?.app_name || 'FeatherPanel')}
                >
                    {modernBrandInner}
                </Link>
            )}

            <nav
                className={cn(
                    'custom-scrollbar relative min-h-0',
                    isBottomDock
                        ? 'flex min-w-0 flex-1 flex-row items-center gap-1 overflow-x-auto overflow-y-hidden py-0.5'
                        : cn(
                              'flex-1 overflow-y-auto',
                              isClassicChrome
                                  ? cn('space-y-4 px-3 py-3', isCompact && 'space-y-3 py-2')
                                  : cn('space-y-4 py-3 sm:space-y-5', isCompact && 'space-y-3 py-2 sm:space-y-3'),
                              !isClassicChrome && (collapsed && !mobile ? 'px-1.5' : 'px-2'),
                          ),
                )}
            >
                {sortedGroups.map((group, groupIndex) => {
                    const isCollapsed = collapsedGroups.includes(group);

                    return (
                        <div key={group} className={cn(isBottomDock && 'flex shrink-0 items-center gap-1')}>
                            {groupIndex > 0 && !isClassicChrome && (!collapsed || mobile || isBottomDock) && (
                                <div
                                    className={cn(
                                        'border-border/25 shrink-0',
                                        isBottomDock ? 'mx-0.5 h-8 w-px' : 'mb-3 border-t',
                                    )}
                                    aria-hidden='true'
                                />
                            )}
                            {(!collapsed || mobile) && !isBottomDock && (
                                <button
                                    type='button'
                                    onClick={() => toggleGroup(group)}
                                    className={cn(
                                        'group/header mb-2 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-semibold tracking-wider uppercase transition-colors',
                                        isClassicChrome
                                            ? 'text-muted-foreground hover:text-accent-foreground'
                                            : 'text-muted-foreground/90 hover:bg-muted/40 hover:text-foreground',
                                        isCompact ? 'text-[10px]' : 'text-[11px]',
                                    )}
                                >
                                    <span className='truncate'>{renderGroupTitle(group)}</span>
                                    <ChevronRight
                                        className={cn(
                                            'shrink-0 transition-transform duration-200',
                                            isClassicChrome
                                                ? 'h-3 w-3'
                                                : 'text-muted-foreground/70 group-hover/header:text-foreground h-3.5 w-3.5',
                                            !isClassicChrome && 'text-muted-foreground/70',
                                            !isCollapsed && 'rotate-90',
                                        )}
                                    />
                                </button>
                            )}
                            <div
                                className={cn(
                                    isBottomDock
                                        ? 'flex flex-row items-center gap-1'
                                        : 'space-y-1 overflow-hidden transition-all duration-200',
                                    !isBottomDock &&
                                        (isCollapsed && (!collapsed || mobile)
                                            ? 'max-h-0 opacity-0'
                                            : 'max-h-500 opacity-100'),
                                )}
                            >
                                {groupedItems[group].map((item) => {
                                    const active = isActive(item.url);
                                    const isPluginAction = !!item.pluginJs;
                                    const hasChildren = item.children && item.children.length > 0;
                                    const isSubmenuCollapsed = collapsedSubmenus.includes(item.id);
                                    const isTicketsItem = item.url === '/dashboard/tickets';
                                    const isAdminTicketsItem = item.url === '/admin/tickets';

                                    if (hasChildren) {
                                        return (
                                            <div key={item.id} className={cn(isBottomDock && 'relative shrink-0')}>
                                                <button
                                                    type='button'
                                                    onClick={() => toggleSubmenu(item.id)}
                                                    {...collapsedTip(item.name)}
                                                    className={cn(
                                                        navItemBase,
                                                        navItemIdle,
                                                        topLevelItemPad,
                                                        'group relative overflow-visible',
                                                    )}
                                                    title={collapsed && !mobile ? undefined : item.name}
                                                    aria-label={item.name}
                                                >
                                                    <NavIcon item={item} sizeClass={topIconSize} />

                                                    {(!collapsed || mobile) && (
                                                        <span
                                                            className={cn(
                                                                'truncate',
                                                                isBottomDock && 'w-full text-[10px] leading-tight',
                                                                isBottomDock ? 'text-center' : 'flex-1 text-left',
                                                            )}
                                                        >
                                                            {item.name}
                                                        </span>
                                                    )}

                                                    {(!collapsed || mobile) && (
                                                        <ChevronDown
                                                            className={cn(
                                                                'h-4 w-4 transition-transform duration-200',
                                                                !isSubmenuCollapsed && 'rotate-180',
                                                            )}
                                                        />
                                                    )}
                                                </button>

                                                <div
                                                    className={cn(
                                                        isBottomDock
                                                            ? 'border-border/40 bg-popover absolute bottom-full left-1/2 z-50 mb-2 min-w-40 -translate-x-1/2 space-y-0.5 overflow-hidden rounded-xl border p-1 shadow-lg'
                                                            : isClassicChrome
                                                              ? 'ml-4 space-y-1 overflow-hidden transition-all duration-200'
                                                              : 'border-border/30 ml-3 space-y-0.5 overflow-hidden border-l pl-2 transition-all duration-200',
                                                        !isBottomDock &&
                                                            (isSubmenuCollapsed || (collapsed && !mobile)
                                                                ? 'max-h-0 opacity-0'
                                                                : 'mt-1 max-h-125 opacity-100'),
                                                        isBottomDock &&
                                                            (isSubmenuCollapsed
                                                                ? 'pointer-events-none max-h-0 opacity-0'
                                                                : 'opacity-100'),
                                                    )}
                                                >
                                                    {item.children?.map((child) => {
                                                        const childActive = isActive(child.url);

                                                        return (
                                                            <Link
                                                                key={child.id}
                                                                href={child.url}
                                                                prefetch={true}
                                                                {...collapsedTip(child.name)}
                                                                onClick={() => {
                                                                    if (mobile) setMobileOpen(false);
                                                                }}
                                                                className={cn(
                                                                    navItemBase,
                                                                    !isClassicChrome &&
                                                                        'rounded-lg px-3 py-2 text-[13px]',
                                                                    childActive ? navItemActive : navItemIdle,
                                                                    'gap-3',
                                                                )}
                                                            >
                                                                <NavIcon item={child} sizeClass='h-4 w-4' />
                                                                <span className='truncate'>{child.name}</span>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (isPluginAction) {
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    try {
                                                        runPluginJs(item.pluginJs!);
                                                    } catch (e) {
                                                        console.error('Failed to execute plugin JS', e);
                                                    }
                                                    if (mobile) setMobileOpen(false);
                                                }}
                                                {...collapsedTip(item.name)}
                                                className={cn(
                                                    navItemBase,
                                                    active ? navItemActive : navItemIdle,
                                                    topLevelItemPad,
                                                    'group relative overflow-visible',
                                                )}
                                                title={collapsed && !mobile ? undefined : item.name}
                                                aria-label={item.name}
                                            >
                                                <NavIcon item={item} sizeClass={topIconSize} />

                                                {(!collapsed || mobile) && (
                                                    <span className='truncate'>{item.name}</span>
                                                )}

                                                {item.badge && (!collapsed || mobile) && (
                                                    <span className={badgeClass}>{item.badge}</span>
                                                )}
                                                {isTicketsItem && unreadTicketCount > 0 && (!collapsed || mobile) && (
                                                    <span className='ml-2 inline-flex items-center rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-300'>
                                                        {unreadTicketCount}
                                                    </span>
                                                )}
                                                {isAdminTicketsItem &&
                                                    adminOpenTicketCount > 0 &&
                                                    (!collapsed || mobile) && (
                                                        <span className='ml-2 inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300'>
                                                            {adminOpenTicketCount}
                                                        </span>
                                                    )}
                                            </button>
                                        );
                                    }

                                    const targetUrl = item.pluginRedirect || item.url;
                                    const openExternal = Boolean(item.openInNewTab) || /^https?:\/\//i.test(targetUrl);
                                    const itemClassName = cn(
                                        navItemBase,
                                        active ? navItemActive : navItemIdle,
                                        topLevelItemPad,
                                        'group relative overflow-visible',
                                    );

                                    if (openExternal) {
                                        return (
                                            <a
                                                key={item.id}
                                                href={targetUrl}
                                                target='_blank'
                                                rel='noopener noreferrer'
                                                {...collapsedTip(item.name)}
                                                onClick={() => {
                                                    if (mobile) setMobileOpen(false);
                                                }}
                                                className={itemClassName}
                                                title={collapsed && !mobile ? undefined : item.name}
                                                aria-label={item.name}
                                            >
                                                <NavIcon item={item} sizeClass={topIconSize} />
                                                {(!collapsed || mobile) && (
                                                    <span className='truncate'>{item.name}</span>
                                                )}
                                                {item.badge && (!collapsed || mobile) && (
                                                    <span className={badgeClass}>{item.badge}</span>
                                                )}
                                            </a>
                                        );
                                    }

                                    return (
                                        <Link
                                            key={item.id}
                                            href={targetUrl}
                                            prefetch={true}
                                            {...collapsedTip(item.name)}
                                            onClick={() => {
                                                if (mobile) setMobileOpen(false);
                                            }}
                                            className={itemClassName}
                                            title={collapsed && !mobile ? undefined : item.name}
                                            aria-label={item.name}
                                        >
                                            <NavIcon item={item} sizeClass={topIconSize} />

                                            {(!collapsed || mobile) && <span className='truncate'>{item.name}</span>}

                                            {item.badge && (!collapsed || mobile) && (
                                                <span className={badgeClass}>{item.badge}</span>
                                            )}
                                            {isTicketsItem && unreadTicketCount > 0 && (!collapsed || mobile) && (
                                                <span className='ml-2 inline-flex items-center rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-300'>
                                                    {unreadTicketCount}
                                                </span>
                                            )}
                                            {isAdminTicketsItem &&
                                                adminOpenTicketCount > 0 &&
                                                (!collapsed || mobile) && (
                                                    <span className='ml-2 inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300'>
                                                        {adminOpenTicketCount}
                                                    </span>
                                                )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {!mobile && (
                <div
                    className={cn(
                        'mt-auto shrink-0 border-t',
                        isClassicChrome ? 'border-border/40' : 'border-border/30',
                    )}
                >
                    {showSidebarToggle && (
                        <SidebarCollapseToggle
                            position={sidebarPosition}
                            collapsed={collapsed}
                            t={t}
                            variant='rail'
                            className={cn(isClassicChrome ? 'mx-3 my-2' : 'mx-2 my-1.5')}
                            tooltipLabel={
                                showCollapsedTooltips
                                    ? collapsed
                                        ? t('navbar.expandSidebar')
                                        : t('navbar.collapseSidebar')
                                    : undefined
                            }
                        />
                    )}
                    {!collapsed && (
                        <div className={cn(isClassicChrome ? 'p-3 pt-0' : 'p-2 pt-0')}>
                            <PoweredByFeatherPanel variant='sidebar' className='px-1' />
                        </div>
                    )}
                </div>
            )}
            <SidebarCollapsedTooltipLayer
                containerRef={sidebarContentRef}
                enabled={showCollapsedTooltips}
                side={collapsedTooltipSide}
            />
        </div>
    );
}

export default function Sidebar({ mobileOpen, setMobileOpen, pluginFullBleed = false }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { settings } = useSettings();
    const { navigationItems, navReady } = useNavigation();
    const { chromeLayout } = useChromeLayout();
    const {
        sidebarDensity,
        sidebarStyle,
        sidebarPosition,
        dockDisplay,
        dockSize,
        sidebarGlow,
        sidebarTogglePlacement,
    } = useSidebarPreferences();
    const { t } = useTranslation();
    const [collapsed, setCollapsed] = useState(() => (typeof window === 'undefined' ? false : readSidebarCollapsed()));
    // Prefer the last settled list (session + plugins). Until then, show the live
    // base items so the sidebar is never an empty chrome shell.
    const [settledItems, setSettledItems] = useState<NavigationItem[] | null>(null);

    useLayoutEffect(() => {
        if (!navReady) return;
        setSettledItems(navigationItems);
    }, [navReady, navigationItems]);

    const displayItems = settledItems ?? navigationItems;

    const groupedItems = useMemo(() => {
        const grouped = displayItems.reduce(
            (acc, item) => {
                const group = item.group || 'Other';
                if (!acc[group]) acc[group] = [];
                acc[group].push(item);
                return acc;
            },
            {} as Record<string, NavigationItem[]>,
        );

        Object.values(grouped).forEach((items) => {
            items.sort((a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER));
        });

        return grouped;
    }, [displayItems]);

    useEffect(() => subscribeSidebarCollapsed(setCollapsed), []);

    return (
        <>
            <Transition.Root show={mobileOpen} as={Fragment}>
                <Dialog as='div' className='relative z-50 lg:hidden' onClose={setMobileOpen}>
                    <Transition.Child
                        as={Fragment}
                        enter='transition-opacity ease-linear duration-300'
                        enterFrom='opacity-0'
                        enterTo='opacity-100'
                        leave='transition-opacity ease-linear duration-300'
                        leaveFrom='opacity-100'
                        leaveTo='opacity-0'
                    >
                        <div className='bg-background/80 fixed inset-0 backdrop-blur-sm' />
                    </Transition.Child>

                    <div className='fixed inset-0 flex'>
                        <Transition.Child
                            as={Fragment}
                            enter='transition ease-in-out duration-300 transform'
                            enterFrom='-translate-x-full'
                            enterTo='translate-x-0'
                            leave='transition ease-in-out duration-300 transform'
                            leaveFrom='translate-x-0'
                            leaveTo='-translate-x-full'
                        >
                            <Dialog.Panel
                                className={cn(
                                    'relative mr-16 flex w-full max-w-xs flex-1',
                                    chromeLayout === 'classic'
                                        ? 'overflow-hidden'
                                        : cn(
                                              'overflow-hidden rounded-r-2xl border border-l-0',
                                              getSidebarSurfaceClass(sidebarStyle, sidebarGlow),
                                          ),
                                )}
                            >
                                <Transition.Child
                                    as={Fragment}
                                    enter='ease-in-out duration-300'
                                    enterFrom='opacity-0'
                                    enterTo='opacity-100'
                                    leave='ease-in-out duration-300'
                                    leaveFrom='opacity-100'
                                    leaveTo='opacity-0'
                                >
                                    <div className='absolute top-0 left-full flex w-16 justify-center pt-5'>
                                        <button
                                            type='button'
                                            className='border-border/50 bg-card/90 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full border p-2.5 shadow-lg backdrop-blur-md transition-colors'
                                            onClick={() => setMobileOpen(false)}
                                        >
                                            <span className='sr-only'>{t('sidebar.close')}</span>
                                            <X className='h-5 w-5' aria-hidden='true' />
                                        </button>
                                    </div>
                                </Transition.Child>

                                <div
                                    className={cn(
                                        'flex h-full min-h-0 grow flex-col gap-y-5 overflow-y-auto',
                                        chromeLayout === 'classic' && 'bg-card border-border/80 border-r',
                                    )}
                                >
                                    <SidebarContent
                                        mobile
                                        collapsed={collapsed}
                                        settings={settings}
                                        pathname={pathname}
                                        router={router}
                                        setMobileOpen={setMobileOpen}
                                        groupedItems={groupedItems}
                                        chromeLayout={chromeLayout}
                                        sidebarDensity={sidebarDensity}
                                        sidebarStyle={sidebarStyle}
                                        sidebarPosition={sidebarPosition}
                                        dockDisplay={dockDisplay}
                                        dockSize={dockSize}
                                        sidebarGlow={sidebarGlow}
                                        sidebarTogglePlacement={sidebarTogglePlacement}
                                    />
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </Dialog>
            </Transition.Root>

            {/*
              Render fixed desktop chrome in-tree (not a post-hydrate body portal).
              Parent must not use overflow:hidden or the rail gets clipped — DashboardShell
              mounts this outside BackgroundWrapper's overflow shell.
            */}
            <div className={getDesktopSidebarShellClass(sidebarPosition, chromeLayout)}>
                <div
                    className={getDesktopSidebarPanelClass({
                        chromeLayout,
                        sidebarPosition,
                        sidebarStyle,
                        sidebarGlow,
                        collapsed,
                        dockDisplay,
                        dockSize,
                    })}
                    data-fp-plugin-sidebar-dock={pluginFullBleed ? '' : undefined}
                >
                    <SidebarContent
                        collapsed={collapsed}
                        settings={settings}
                        pathname={pathname}
                        router={router}
                        setMobileOpen={setMobileOpen}
                        groupedItems={groupedItems}
                        chromeLayout={chromeLayout}
                        sidebarDensity={sidebarDensity}
                        sidebarStyle={sidebarStyle}
                        sidebarPosition={sidebarPosition}
                        dockDisplay={dockDisplay}
                        dockSize={dockSize}
                        sidebarGlow={sidebarGlow}
                        sidebarTogglePlacement={sidebarTogglePlacement}
                    />
                </div>
            </div>
        </>
    );
}
