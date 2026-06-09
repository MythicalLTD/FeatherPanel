/* eslint-disable react-hooks/unsupported-syntax */

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

import { Fragment, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { X, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';
import NextImage from 'next/image';
import Link from 'next/link';
import axios from 'axios';
import { useSettings } from '@/contexts/SettingsContext';
import { useSession } from '@/contexts/SessionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { useNavigation } from '@/hooks/useNavigation';
import { useTranslation } from '@/contexts/TranslationContext';
import type { NavigationItem } from '@/types/navigation';
import { type ChromeLayout, useChromeLayout } from '@/hooks/useChromeLayout';
import { PoweredByFeatherPanel } from '@/components/branding/PoweredByFeatherPanel';

interface SidebarProps {
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
    /** Full-bleed plugin route: reduce glass/backdrop stacking against the iframe canvas */
    pluginFullBleed?: boolean;
}

function renderIcon(item: NavigationItem, className: string, sizeClass: string) {
    if (item.lucideIcon) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const iconName: any = item.lucideIcon;
        return (
            <DynamicIcon
                name={iconName}
                className={cn('shrink-0 transition-transform group-hover:scale-110', className, sizeClass)}
            />
        );
    }

    const Icon = item.icon;
    if (typeof Icon === 'string') {
        return (
            <span className={cn('flex shrink-0 items-center justify-center text-lg', className, sizeClass)}>
                {Icon}
            </span>
        );
    }

    return <Icon className={cn('shrink-0 transition-transform group-hover:scale-110', className, sizeClass)} />;
}

function SidebarContent({
    mobile = false,
    collapsed,
    settings,
    pathname,
    setMobileOpen,
    groupedItems,
    chromeLayout,
}: {
    mobile?: boolean;
    collapsed: boolean;
    settings: { app_name?: string; app_version?: string; app_logo_white?: string; app_logo_dark?: string } | null;
    pathname: string;
    router: ReturnType<typeof useRouter>;
    setMobileOpen: (open: boolean) => void;
    groupedItems: Record<string, NavigationItem[]>;
    chromeLayout: ChromeLayout;
}) {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const { adminTicketStats } = useSession();

    const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

    const [collapsedSubmenus, setCollapsedSubmenus] = useState<string[]>([]);
    const [unreadTicketCount, setUnreadTicketCount] = useState(0);
    const adminOpenTicketCount = adminTicketStats?.open_count ?? 0;

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
    }, [pathname]);

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

    const navItemBase = isClassicChrome
        ? 'group flex items-center w-full rounded-md text-sm font-medium transition-colors'
        : 'group flex items-center w-full rounded-xl text-sm font-medium transition-[background-color,box-shadow,color,transform] duration-200';
    const navItemIdle = isClassicChrome
        ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
        : 'text-muted-foreground hover:bg-muted/55 hover:text-foreground dark:hover:bg-muted/20';
    const navItemActive = isClassicChrome
        ? 'bg-accent text-accent-foreground font-semibold ring-1 ring-border/50'
        : 'bg-primary/12 text-primary font-semibold shadow-sm ring-1 ring-inset ring-primary/15 dark:bg-primary/[0.14] dark:ring-primary/28';

    const badgeClass = isClassicChrome
        ? 'ml-auto inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium'
        : 'ml-auto inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/20';

    const topLevelItemPad = cn(
        collapsed && !mobile
            ? isClassicChrome
                ? 'justify-center'
                : 'justify-center px-1.5 py-2'
            : isClassicChrome
              ? 'gap-3 px-3 py-2.5'
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

    const renderCollapsedLabel = (label: string) => {
        if (!collapsed || mobile) return null;
        return (
            <span className='border-border/50 bg-card/95 text-foreground ring-border/30 pointer-events-none absolute top-1/2 left-full z-50 ml-3 flex -translate-x-1 -translate-y-1/2 items-center rounded-xl border px-2.5 py-1.5 text-xs font-medium tracking-tight whitespace-nowrap opacity-0 shadow-xl ring-1 shadow-black/20 backdrop-blur-md transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none'>
                <span
                    className='border-border/50 bg-card/95 absolute top-1/2 -left-1.5 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-t border-l'
                    aria-hidden='true'
                />
                {label}
            </span>
        );
    };

    const modernBrandInner = (
        <div
            className={cn(
                'border-border/50 bg-card/40 hover:border-border/70 hover:bg-card/55 flex items-center rounded-2xl border px-3 py-2.5 transition-colors',
                collapsed && !mobile ? 'justify-center px-1.5 py-2' : 'gap-2.5',
            )}
        >
            <div
                className={cn(
                    'bg-muted/30 ring-border/40 flex shrink-0 items-center justify-center rounded-xl ring-1',
                    collapsed && !mobile ? 'h-8 w-8' : 'h-9 w-9',
                )}
            >
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
                    <span className='border-primary/20 bg-primary/10 text-primary inline-flex w-fit items-center rounded-md border px-1.5 py-px text-[10px] font-semibold tracking-wider uppercase'>
                        v{settings?.app_version || '1.0.0'}
                    </span>
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
                    <span className='border-primary/20 bg-primary/10 text-primary inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-[10px] font-medium'>
                        v{settings?.app_version || '1.0.0'}
                    </span>
                </div>
            )}
        </div>
    );

    return (
        <div className='flex h-full min-h-0 flex-col'>
            {isClassicChrome ? (
                mobile ? (
                    <Link
                        href='/dashboard'
                        prefetch={true}
                        className='focus-visible:ring-ring shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'
                    >
                        {classicBrandInner}
                    </Link>
                ) : (
                    <Link
                        href='/dashboard'
                        prefetch={true}
                        className='focus-visible:ring-ring block min-w-0 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'
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
            ) : (
                <Link
                    href='/dashboard'
                    prefetch={true}
                    className={cn(
                        'focus-visible:ring-ring mx-2 mt-3 block min-w-0 shrink-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                        collapsed && 'mx-1.5 mt-2',
                    )}
                >
                    {modernBrandInner}
                </Link>
            )}

            <nav
                className={cn(
                    isClassicChrome
                        ? 'custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3'
                        : 'custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto py-3 sm:space-y-5',
                    !isClassicChrome && (collapsed && !mobile ? 'px-1.5' : 'px-2'),
                )}
            >
                {sortedGroups.map((group) => {
                    const isCollapsed = collapsedGroups.includes(group);

                    return (
                        <div key={group}>
                            {(!collapsed || mobile) && (
                                <button
                                    type='button'
                                    onClick={() => toggleGroup(group)}
                                    className={cn(
                                        'group/header mb-2 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-semibold tracking-wider uppercase transition-colors',
                                        isClassicChrome
                                            ? 'text-muted-foreground hover:text-accent-foreground'
                                            : 'text-muted-foreground/90 hover:bg-muted/40 hover:text-foreground text-[11px]',
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
                                    'space-y-1 overflow-hidden transition-all duration-200',
                                    isCollapsed && (!collapsed || mobile)
                                        ? 'max-h-0 opacity-0'
                                        : 'max-h-500 opacity-100',
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
                                            <div key={item.id}>
                                                <button
                                                    type='button'
                                                    onClick={() => toggleSubmenu(item.id)}
                                                    className={cn(
                                                        navItemBase,
                                                        navItemIdle,
                                                        topLevelItemPad,
                                                        'group relative overflow-visible',
                                                    )}
                                                    title={collapsed && !mobile ? undefined : item.name}
                                                    aria-label={item.name}
                                                >
                                                    {renderIcon(item, '', topIconSize)}

                                                    {(!collapsed || mobile) && (
                                                        <span className='flex-1 truncate text-left'>{item.name}</span>
                                                    )}

                                                    {(!collapsed || mobile) && (
                                                        <ChevronDown
                                                            className={cn(
                                                                'h-4 w-4 transition-transform duration-200',
                                                                !isSubmenuCollapsed && 'rotate-180',
                                                            )}
                                                        />
                                                    )}
                                                    {renderCollapsedLabel(item.name)}
                                                </button>

                                                <div
                                                    className={cn(
                                                        isClassicChrome
                                                            ? 'ml-4 space-y-1 overflow-hidden transition-all duration-200'
                                                            : 'border-border/30 ml-3 space-y-0.5 overflow-hidden border-l pl-2 transition-all duration-200',
                                                        isSubmenuCollapsed || (collapsed && !mobile)
                                                            ? 'max-h-0 opacity-0'
                                                            : 'mt-1 max-h-125 opacity-100',
                                                    )}
                                                >
                                                    {item.children?.map((child) => {
                                                        const childActive = isActive(child.url);

                                                        return (
                                                            <Link
                                                                key={child.id}
                                                                href={child.url}
                                                                prefetch={true}
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
                                                                {renderIcon(child, '', 'h-4 w-4')}
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
                                                        eval(item.pluginJs!);
                                                    } catch (e) {
                                                        console.error('Failed to execute plugin JS', e);
                                                    }
                                                    if (mobile) setMobileOpen(false);
                                                }}
                                                className={cn(
                                                    navItemBase,
                                                    active ? navItemActive : navItemIdle,
                                                    topLevelItemPad,
                                                    'group relative overflow-visible',
                                                )}
                                                title={collapsed && !mobile ? undefined : item.name}
                                                aria-label={item.name}
                                            >
                                                {renderIcon(item, '', topIconSize)}

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
                                                {renderCollapsedLabel(item.name)}
                                            </button>
                                        );
                                    }

                                    const targetUrl = item.pluginRedirect || item.url;

                                    return (
                                        <Link
                                            key={item.id}
                                            href={targetUrl}
                                            prefetch={true}
                                            onClick={() => {
                                                if (mobile) setMobileOpen(false);
                                            }}
                                            className={cn(
                                                navItemBase,
                                                active ? navItemActive : navItemIdle,
                                                topLevelItemPad,
                                                'group relative overflow-visible',
                                            )}
                                            title={collapsed && !mobile ? undefined : item.name}
                                            aria-label={item.name}
                                        >
                                            {renderIcon(item, '', topIconSize)}

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
                                            {renderCollapsedLabel(item.name)}
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
                        'mt-auto shrink-0',
                        isClassicChrome
                            ? 'border-border/50 border-t p-2'
                            : 'border-border/40 bg-muted/10 border-t p-1.5',
                        !isClassicChrome && collapsed && 'px-1 pt-1 pb-2',
                        !isClassicChrome && !collapsed && 'p-2',
                    )}
                >
                    <button
                        type='button'
                        title={collapsed ? t('navbar.expandSidebar') : t('navbar.collapseSidebar')}
                        onClick={() => {
                            if (typeof window !== 'undefined') {
                                const event = new CustomEvent<boolean>('toggle-sidebar', {
                                    detail: !collapsed,
                                });
                                window.dispatchEvent(event);
                            }
                        }}
                        className={cn(
                            'text-muted-foreground flex w-full items-center justify-center rounded-lg text-sm font-medium transition-all',
                            isClassicChrome
                                ? 'hover:bg-accent hover:text-accent-foreground px-3 py-2'
                                : 'border-border/50 bg-muted/15 hover:border-border/70 hover:bg-muted/30 hover:text-foreground gap-2 rounded-xl border border-dashed transition-colors',
                            !isClassicChrome && collapsed && 'px-1 py-2',
                            !isClassicChrome && !collapsed && 'px-3 py-2.5',
                        )}
                    >
                        {collapsed ? (
                            <ChevronRight className='h-5 w-5' />
                        ) : (
                            <>
                                <ChevronLeft className={cn('h-5 w-5', isClassicChrome && 'mr-2')} />
                                <span className='truncate'>{t('navbar.collapseSidebar')}</span>
                            </>
                        )}
                    </button>
                    {!collapsed && <PoweredByFeatherPanel variant='sidebar' className='mt-2 px-1' />}
                </div>
            )}
        </div>
    );
}

const SIDEBAR_COLLAPSED_KEY = 'featherpanel_sidebar_collapsed';

export default function Sidebar({ mobileOpen, setMobileOpen, pluginFullBleed = false }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { settings } = useSettings();
    const { navigationItems } = useNavigation();
    const { chromeLayout } = useChromeLayout();
    const { t } = useTranslation();
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
            } catch {
                return false;
            }
        }
        return false;
    });
    const [portalReady, setPortalReady] = useState(false);

    useEffect(() => {
        setPortalReady(true);
    }, []);

    const groupedItems = useMemo(() => {
        const grouped = navigationItems.reduce(
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
    }, [navigationItems]);

    useEffect(() => {
        try {
            localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
        } catch {
            // ignore
        }
    }, [collapsed]);

    useEffect(() => {
        const handleToggle = () => setCollapsed((prev) => !prev);
        window.addEventListener('toggle-sidebar', handleToggle);
        return () => window.removeEventListener('toggle-sidebar', handleToggle);
    }, []);

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
                                        : 'border-border/50 bg-card/45 overflow-hidden rounded-r-2xl border border-l-0 shadow-sm backdrop-blur-2xl',
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
                                    />
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </Dialog>
            </Transition.Root>

            {portalReady
                ? createPortal(
                      <div className='fp-desktop-sidebar hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:h-svh lg:max-h-svh lg:flex-col'>
                          <div
                              className={cn(
                                  'flex h-full min-h-0 flex-col overflow-hidden transition-[width] duration-300 ease-out',
                                  chromeLayout === 'classic'
                                      ? cn('bg-card lg:border-border/80 lg:border-r', collapsed ? 'w-16' : 'w-64')
                                      : cn(
                                            'lg:border-border/50 lg:bg-card/45 lg:rounded-tr-2xl lg:border-r lg:shadow-sm lg:backdrop-blur-2xl',
                                            collapsed ? 'w-14' : 'w-56',
                                        ),
                              )}
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
                              />
                          </div>
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}
