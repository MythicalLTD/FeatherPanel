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

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
    Menu as MenuIcon,
    CircleUser,
    ChevronDown,
    ChevronRight,
    Copy,
    Database,
    Eye,
    EyeOff,
    LogOut,
    ShieldCheck,
} from 'lucide-react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import Image from 'next/image';
import { RoleBadge } from '@/components/RoleBadge';
import { cn, copyToClipboard } from '@/lib/utils';
import ThemeCustomizer from '@/components/layout/ThemeCustomizer';
import { PoweredByFeatherPanel } from '@/components/branding/PoweredByFeatherPanel';
import type { UserInfo } from '@/contexts/SessionContext';

export type NavbarChromeProps = {
    onMenuClick: () => void;
    headerTitle: string;
    headerContent?: ReactNode;
    showAdminAreaButton: boolean;
    adminAreaHref: string;
    user: UserInfo | null;
    router: AppRouterInstance;
    userNavigation: Array<{ name: string; href: string; icon: typeof CircleUser }>;
    t: (key: string, params?: Record<string, string>) => string;
    emailRevealed: boolean;
    setEmailRevealed: Dispatch<SetStateAction<boolean>>;
    setLocalStorageOpen: (open: boolean) => void;
    getUserInitials: () => string;
    getUsername: () => string;
    getLegalName: () => string;
    handleLogout: () => Promise<void>;
    /** Large screens: parent uses hover-reveal dock; header must not be sticky so transforms work. */
    desktopHoverDock?: boolean;
    /** If false, navbar scrolls with content instead of sticking to top. */
    navbarSticky?: boolean;
};

export function NavbarClassicChrome(props: NavbarChromeProps) {
    const {
        onMenuClick,
        headerTitle,
        headerContent,
        showAdminAreaButton,
        adminAreaHref,
        user,
        router,
        userNavigation,
        t,
        emailRevealed,
        setEmailRevealed,
        setLocalStorageOpen,
        getUserInitials,
        getUsername,
        getLegalName,
        handleLogout,
        desktopHoverDock = false,
        navbarSticky = true,
    } = props;
    return (
        <div
            className={cn(
                'border-border/50 bg-card z-30 flex h-14 shrink-0 items-center gap-x-2 border-b px-2 sm:h-16 sm:gap-x-4 sm:px-6 lg:px-8',
                navbarSticky ? 'sticky top-0' : 'relative',
                desktopHoverDock && 'lg:static lg:top-auto',
            )}
        >
            <button
                type='button'
                className='text-muted-foreground hover:bg-accent/50 hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background shrink-0 touch-manipulation rounded-lg p-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 lg:hidden'
                onClick={onMenuClick}
                aria-label={t('navbar.openSidebar')}
            >
                <span className='sr-only'>{t('navbar.openSidebar')}</span>
                <MenuIcon className='h-6 w-6' aria-hidden='true' />
            </button>

            <div className='bg-border h-5 w-px shrink-0 sm:h-6 lg:hidden' aria-hidden='true' />

            <div className='flex min-w-0 flex-1 gap-x-2 self-stretch sm:gap-x-4 lg:gap-x-6'>
                <div className='flex min-w-0 flex-1 items-center'>
                    {headerContent ?? (
                        <h1
                            className='text-foreground min-w-0 truncate pr-2 text-base font-semibold sm:pr-1 sm:text-lg'
                            title={headerTitle}
                        >
                            {headerTitle}
                        </h1>
                    )}
                </div>

                <div className='flex shrink-0 items-center gap-x-1.5 sm:gap-x-3 lg:gap-x-6'>
                    {showAdminAreaButton && (
                        <button
                            type='button'
                            onClick={() => router.push(adminAreaHref)}
                            className='text-muted-foreground hover:bg-accent/50 hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background sm:hover:bg-accent flex shrink-0 items-center gap-2 rounded-lg p-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:px-3'
                            title={t('navbar.adminPanelTooltip')}
                        >
                            <ShieldCheck className='h-5 w-5 shrink-0' />
                            <span className='hidden lg:inline'>{t('navbar.adminArea')}</span>
                        </button>
                    )}

                    <ThemeCustomizer />

                    <Menu as='div' className='relative shrink-0'>
                        <Menu.Button
                            className={cn(
                                'group text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-background flex items-center text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                'bg-muted/15 hover:bg-muted/35 hover:text-foreground data-[headlessui-state=open]:bg-muted/40 data-[headlessui-state=open]:text-foreground h-10 w-10 shrink-0 justify-center rounded-full p-0.5',
                                'lg:hover:bg-accent/80 lg:data-[headlessui-state=open]:bg-accent/80 lg:h-auto lg:w-auto lg:justify-start lg:gap-x-2 lg:rounded-xl lg:bg-transparent lg:p-0 lg:px-3 lg:py-2',
                            )}
                        >
                            <span className='sr-only'>{t('navbar.openUserMenu')}</span>
                            <span className='flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full lg:h-8 lg:w-8'>
                                {user?.avatar ? (
                                    <Image
                                        src={user.avatar}
                                        alt={getUsername()}
                                        width={36}
                                        height={36}
                                        unoptimized
                                        className='h-full w-full rounded-full object-cover'
                                    />
                                ) : (
                                    <div className='bg-muted/40 flex h-full w-full items-center justify-center rounded-full'>
                                        <span className='text-primary text-sm font-semibold'>{getUserInitials()}</span>
                                    </div>
                                )}
                            </span>
                            <span className='hidden sm:ml-0.5 sm:flex sm:max-w-44 sm:min-w-0 sm:flex-col sm:items-start'>
                                <span className='text-foreground w-full truncate text-sm leading-tight font-semibold'>
                                    {getUsername()}
                                </span>
                                {user?.role ? (
                                    <RoleBadge role={user.role} className='mt-0.5' />
                                ) : (
                                    <span className='text-muted-foreground mt-0.5 w-full truncate text-[11px] leading-tight'>
                                        {t('navbar.noRole')}
                                    </span>
                                )}
                            </span>
                            <ChevronDown
                                className='text-muted-foreground hidden h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 group-data-[headlessui-state=open]:-rotate-180 group-data-[headlessui-state=open]:opacity-100 lg:block'
                                aria-hidden
                            />
                        </Menu.Button>
                        <Transition
                            as={Fragment}
                            enter='transition ease-out duration-150'
                            enterFrom='transform opacity-0 scale-[0.98] translate-y-1'
                            enterTo='transform opacity-100 scale-100 translate-y-0'
                            leave='transition ease-in duration-100'
                            leaveFrom='transform opacity-100 scale-100 translate-y-0'
                            leaveTo='transform opacity-0 scale-[0.98] translate-y-1'
                        >
                            <Menu.Items className='border-border/30 bg-card/88 ring-border/25 absolute right-0 z-50 mt-2 max-h-[min(32rem,calc(100dvh-5rem))] w-[min(20rem,calc(100vw-1rem))] origin-top-right overflow-x-hidden overflow-y-auto rounded-xl border shadow-md ring-1 backdrop-blur-xl focus:outline-none sm:w-80 sm:max-w-none'>
                                <div className='border-border/30 bg-muted/15 border-b px-3 py-3 sm:px-4 sm:py-3.5'>
                                    <p className='text-muted-foreground mb-2.5 text-[10px] font-semibold tracking-wider uppercase'>
                                        {t('navbar.menuAccount')}
                                    </p>
                                    <div className='flex items-start gap-3'>
                                        {user?.avatar ? (
                                            <Image
                                                src={user.avatar}
                                                alt={getUsername()}
                                                width={44}
                                                height={44}
                                                unoptimized
                                                className='border-border/50 h-10 w-10 shrink-0 rounded-full border object-cover sm:h-11 sm:w-11'
                                            />
                                        ) : (
                                            <div className='border-border/50 bg-muted/40 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border sm:h-11 sm:w-11'>
                                                <span className='text-primary text-sm font-semibold sm:text-base'>
                                                    {getUserInitials()}
                                                </span>
                                            </div>
                                        )}
                                        <div className='min-w-0 flex-1'>
                                            <p className='text-foreground truncate text-sm font-semibold'>
                                                {getUsername()}
                                            </p>
                                            {getLegalName() ? (
                                                <p className='text-muted-foreground mt-0.5 truncate text-xs'>
                                                    {getLegalName()}
                                                </p>
                                            ) : null}
                                            {user?.role ? (
                                                <div className='mt-1.5'>
                                                    <RoleBadge role={user.role} size='sm' />
                                                </div>
                                            ) : (
                                                <p className='text-muted-foreground mt-1.5 text-xs'>
                                                    {t('navbar.noRole')}
                                                </p>
                                            )}
                                            {user?.email ? (
                                                <div className='border-border/50 bg-muted/25 mt-2.5 flex items-center gap-0.5 rounded-lg border py-1 pr-0.5 pl-2'>
                                                    <p
                                                        className={cn(
                                                            'text-muted-foreground min-w-0 flex-1 truncate text-xs transition-[filter] duration-150',
                                                            !emailRevealed && 'blur-xs select-none',
                                                        )}
                                                        title={emailRevealed ? user.email : undefined}
                                                    >
                                                        {user.email}
                                                    </p>
                                                    <button
                                                        type='button'
                                                        className='text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring shrink-0 rounded-md p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none'
                                                        aria-label={
                                                            emailRevealed
                                                                ? t('navbar.hideEmail')
                                                                : t('navbar.showEmail')
                                                        }
                                                        aria-pressed={emailRevealed}
                                                        onClick={() => setEmailRevealed((v) => !v)}
                                                    >
                                                        {emailRevealed ? (
                                                            <EyeOff className='h-3.5 w-3.5' aria-hidden />
                                                        ) : (
                                                            <Eye className='h-3.5 w-3.5' aria-hidden />
                                                        )}
                                                    </button>
                                                    <button
                                                        type='button'
                                                        className='text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring shrink-0 rounded-md p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none'
                                                        aria-label={t('navbar.copyEmail')}
                                                        onClick={() => void copyToClipboard(user.email, t)}
                                                    >
                                                        <Copy className='h-3.5 w-3.5' aria-hidden />
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className='p-1.5'>
                                    {userNavigation.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <Menu.Item key={item.name}>
                                                {({ active }) => (
                                                    <button
                                                        type='button'
                                                        onClick={() => router.push(item.href)}
                                                        className={cn(
                                                            'text-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                                                            active ? 'bg-accent' : 'hover:bg-accent/50',
                                                        )}
                                                    >
                                                        <span className='border-border/50 bg-muted/30 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border'>
                                                            <Icon className='text-muted-foreground h-4 w-4' />
                                                        </span>
                                                        <span className='flex-1 text-left font-medium'>
                                                            {item.name}
                                                        </span>
                                                        <ChevronRight className='text-muted-foreground h-4 w-4 shrink-0 opacity-60' />
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        );
                                    })}
                                    <Menu.Item>
                                        {({ active, close }) => (
                                            <button
                                                type='button'
                                                onClick={() => {
                                                    setLocalStorageOpen(true);
                                                    close();
                                                }}
                                                className={cn(
                                                    'text-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                                                    active ? 'bg-accent' : 'hover:bg-accent/50',
                                                )}
                                            >
                                                <span className='border-border/50 bg-muted/30 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border'>
                                                    <Database className='text-muted-foreground h-4 w-4' />
                                                </span>
                                                <span className='flex-1 text-left font-medium'>
                                                    {t('navbar.localStorageMenu')}
                                                </span>
                                                <ChevronRight className='text-muted-foreground h-4 w-4 shrink-0 opacity-60' />
                                            </button>
                                        )}
                                    </Menu.Item>
                                </div>

                                <div className='border-border/50 bg-muted/10 border-t p-1.5'>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                type='button'
                                                onClick={handleLogout}
                                                className={cn(
                                                    'text-destructive flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                                    active ? 'bg-destructive/10' : 'hover:bg-destructive/10',
                                                )}
                                            >
                                                <span className='border-destructive/20 bg-destructive/5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border'>
                                                    <LogOut className='h-4 w-4' aria-hidden />
                                                </span>
                                                {t('navbar.signOut')}
                                            </button>
                                        )}
                                    </Menu.Item>
                                </div>

                                <div className='border-border/50 bg-card/80 border-t px-3 py-2'>
                                    <PoweredByFeatherPanel variant='menu' />
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                </div>
            </div>
        </div>
    );
}

export function NavbarModernChrome(props: NavbarChromeProps) {
    const {
        onMenuClick,
        headerTitle,
        headerContent,
        showAdminAreaButton,
        adminAreaHref,
        user,
        router,
        userNavigation,
        t,
        emailRevealed,
        setEmailRevealed,
        setLocalStorageOpen,
        getUserInitials,
        getUsername,
        getLegalName,
        handleLogout,
        desktopHoverDock = false,
        navbarSticky = true,
    } = props;
    return (
        <header
            className={cn(
                'z-30 shrink-0 px-3 pt-3 pb-2 sm:px-4 lg:px-6',
                navbarSticky ? 'sticky top-0' : 'relative',
                desktopHoverDock && 'lg:static lg:top-auto',
            )}
        >
            <div className='border-border/15 bg-card/74 mx-auto flex h-12 max-w-450 items-center gap-x-2 rounded-2xl border px-2.5 shadow-sm backdrop-blur-xl sm:h-13 sm:gap-x-3 sm:px-3.5'>
                <button
                    type='button'
                    className='text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background flex shrink-0 touch-manipulation items-center justify-center rounded-xl border border-transparent p-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 lg:hidden'
                    onClick={onMenuClick}
                    aria-label={t('navbar.openSidebar')}
                >
                    <span className='sr-only'>{t('navbar.openSidebar')}</span>
                    <MenuIcon className='h-5 w-5' aria-hidden='true' />
                </button>

                <div
                    className='via-border/80 hidden h-6 w-px bg-linear-to-b from-transparent to-transparent sm:block lg:hidden'
                    aria-hidden='true'
                />

                <div className='flex min-w-0 flex-1 items-stretch gap-x-2 self-stretch sm:gap-x-3'>
                    <div className='flex min-w-0 flex-1 items-center'>
                        {headerContent ?? (
                            <h1
                                className='text-foreground truncate text-sm font-semibold tracking-tight sm:text-[0.95rem]'
                                title={headerTitle}
                            >
                                {headerTitle}
                            </h1>
                        )}
                    </div>

                    <div className='flex shrink-0 items-center gap-1 sm:gap-2'>
                        <div className='bg-muted/15 sm:bg-muted/20 flex items-center gap-0.5 rounded-xl p-0.5 sm:p-1'>
                            {showAdminAreaButton && (
                                <button
                                    type='button'
                                    onClick={() => router.push(adminAreaHref)}
                                    className='text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:rounded-xl sm:px-2.5 sm:py-2'
                                    title={t('navbar.adminPanelTooltip')}
                                >
                                    <ShieldCheck className='h-4 w-4 shrink-0 sm:h-[1.05rem] sm:w-[1.05rem]' />
                                    <span className='hidden lg:inline'>{t('navbar.adminArea')}</span>
                                </button>
                            )}

                            <div className='bg-border/50 hidden h-6 w-px sm:block lg:hidden' aria-hidden />

                            <div className='flex items-center [&>button]:rounded-lg sm:[&>button]:rounded-xl'>
                                <ThemeCustomizer />
                            </div>
                        </div>

                        <Menu as='div' className='relative shrink-0'>
                            <Menu.Button
                                className={cn(
                                    'group text-muted-foreground focus-visible:ring-ring/40 focus-visible:ring-offset-background flex items-center text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                    'bg-muted/15 hover:bg-muted/35 hover:text-foreground data-[headlessui-state=open]:bg-muted/40 data-[headlessui-state=open]:text-foreground h-9 w-9 shrink-0 justify-center rounded-xl p-0.5',
                                    'lg:hover:bg-muted/30 lg:data-[headlessui-state=open]:bg-muted/35 lg:h-auto lg:w-auto lg:justify-start lg:gap-x-2 lg:rounded-xl lg:px-2.5 lg:py-1.5',
                                )}
                            >
                                <span className='sr-only'>{t('navbar.openUserMenu')}</span>
                                <span className='flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full lg:h-8 lg:w-8'>
                                    {user?.avatar ? (
                                        <Image
                                            src={user.avatar}
                                            alt={getUsername()}
                                            width={36}
                                            height={36}
                                            unoptimized
                                            className='h-full w-full rounded-full object-cover'
                                        />
                                    ) : (
                                        <div className='bg-muted/40 flex h-full w-full items-center justify-center rounded-full'>
                                            <span className='text-primary text-sm font-semibold'>
                                                {getUserInitials()}
                                            </span>
                                        </div>
                                    )}
                                </span>
                                <span className='hidden sm:ml-0.5 sm:flex sm:max-w-44 sm:min-w-0 sm:flex-col sm:items-start'>
                                    <span className='text-foreground w-full truncate text-sm leading-tight font-semibold'>
                                        {getUsername()}
                                    </span>
                                    {user?.role ? (
                                        <RoleBadge role={user.role} className='mt-0.5' />
                                    ) : (
                                        <span className='text-muted-foreground mt-0.5 w-full truncate text-[11px] leading-tight'>
                                            {t('navbar.noRole')}
                                        </span>
                                    )}
                                </span>
                                <ChevronDown
                                    className='text-muted-foreground hidden h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 group-data-[headlessui-state=open]:-rotate-180 group-data-[headlessui-state=open]:opacity-100 lg:block'
                                    aria-hidden
                                />
                            </Menu.Button>
                            <Transition
                                as={Fragment}
                                enter='transition ease-out duration-150'
                                enterFrom='transform opacity-0 scale-[0.98] translate-y-1'
                                enterTo='transform opacity-100 scale-100 translate-y-0'
                                leave='transition ease-in duration-100'
                                leaveFrom='transform opacity-100 scale-100 translate-y-0'
                                leaveTo='transform opacity-0 scale-[0.98] translate-y-1'
                            >
                                <Menu.Items className='border-border/30 bg-card/88 ring-border/25 absolute right-0 z-50 mt-2 max-h-[min(32rem,calc(100dvh-5rem))] w-[min(20rem,calc(100vw-1rem))] origin-top-right overflow-x-hidden overflow-y-auto rounded-2xl border p-1.5 shadow-md ring-1 backdrop-blur-xl focus:outline-none sm:w-80 sm:max-w-none'>
                                    <div className='border-border/30 bg-muted/10 rounded-xl border px-3 py-3 backdrop-blur-sm sm:px-3.5 sm:py-3'>
                                        <p className='text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase'>
                                            {t('navbar.menuAccount')}
                                        </p>
                                        <div className='flex items-start gap-3'>
                                            {user?.avatar ? (
                                                <Image
                                                    src={user.avatar}
                                                    alt={getUsername()}
                                                    width={44}
                                                    height={44}
                                                    unoptimized
                                                    className='border-border/50 h-10 w-10 shrink-0 rounded-xl border object-cover sm:h-11 sm:w-11'
                                                />
                                            ) : (
                                                <div className='border-border/50 bg-muted/30 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border sm:h-11 sm:w-11'>
                                                    <span className='text-primary text-sm font-semibold sm:text-base'>
                                                        {getUserInitials()}
                                                    </span>
                                                </div>
                                            )}
                                            <div className='min-w-0 flex-1'>
                                                <p className='text-foreground truncate text-sm font-semibold'>
                                                    {getUsername()}
                                                </p>
                                                {getLegalName() ? (
                                                    <p className='text-muted-foreground mt-0.5 truncate text-xs'>
                                                        {getLegalName()}
                                                    </p>
                                                ) : null}
                                                {user?.role ? (
                                                    <div className='mt-1.5'>
                                                        <RoleBadge role={user.role} size='sm' />
                                                    </div>
                                                ) : (
                                                    <p className='text-muted-foreground mt-1.5 text-xs'>
                                                        {t('navbar.noRole')}
                                                    </p>
                                                )}
                                                {user?.email ? (
                                                    <div className='border-border/45 bg-background/25 dark:bg-background/20 mt-2.5 flex items-center gap-0.5 rounded-lg border py-1 pr-0.5 pl-2 backdrop-blur-sm'>
                                                        <p
                                                            className={cn(
                                                                'text-muted-foreground min-w-0 flex-1 truncate text-xs transition-[filter] duration-150',
                                                                !emailRevealed && 'blur-xs select-none',
                                                            )}
                                                            title={emailRevealed ? user.email : undefined}
                                                        >
                                                            {user.email}
                                                        </p>
                                                        <button
                                                            type='button'
                                                            className='text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-ring shrink-0 rounded-md p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none'
                                                            aria-label={
                                                                emailRevealed
                                                                    ? t('navbar.hideEmail')
                                                                    : t('navbar.showEmail')
                                                            }
                                                            aria-pressed={emailRevealed}
                                                            onClick={() => setEmailRevealed((v) => !v)}
                                                        >
                                                            {emailRevealed ? (
                                                                <EyeOff className='h-3.5 w-3.5' aria-hidden />
                                                            ) : (
                                                                <Eye className='h-3.5 w-3.5' aria-hidden />
                                                            )}
                                                        </button>
                                                        <button
                                                            type='button'
                                                            className='text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-ring shrink-0 rounded-md p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none'
                                                            aria-label={t('navbar.copyEmail')}
                                                            onClick={() => void copyToClipboard(user.email, t)}
                                                        >
                                                            <Copy className='h-3.5 w-3.5' aria-hidden />
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                    <div className='border-border/30 bg-muted/5 dark:bg-muted/10 mt-1 space-y-0.5 rounded-lg border px-0.5 py-0.5 pb-1'>
                                        {userNavigation.map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <Menu.Item key={item.name}>
                                                    {({ active }) => (
                                                        <button
                                                            type='button'
                                                            onClick={() => router.push(item.href)}
                                                            className={cn(
                                                                'text-foreground flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors',
                                                                active ? 'bg-muted/60' : 'hover:bg-muted/40',
                                                            )}
                                                        >
                                                            <span className='border-border/45 bg-muted/20 text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border'>
                                                                <Icon className='h-4 w-4' />
                                                            </span>
                                                            <span className='flex-1 text-left font-medium'>
                                                                {item.name}
                                                            </span>
                                                            <ChevronRight className='text-muted-foreground h-4 w-4 shrink-0 opacity-50' />
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                            );
                                        })}
                                        <Menu.Item>
                                            {({ active, close }) => (
                                                <button
                                                    type='button'
                                                    onClick={() => {
                                                        setLocalStorageOpen(true);
                                                        close();
                                                    }}
                                                    className={cn(
                                                        'text-foreground flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors',
                                                        active ? 'bg-muted/60' : 'hover:bg-muted/40',
                                                    )}
                                                >
                                                    <span className='border-border/45 bg-muted/20 text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border'>
                                                        <Database className='h-4 w-4' />
                                                    </span>
                                                    <span className='flex-1 text-left font-medium'>
                                                        {t('navbar.localStorageMenu')}
                                                    </span>
                                                    <ChevronRight className='text-muted-foreground h-4 w-4 shrink-0 opacity-50' />
                                                </button>
                                            )}
                                        </Menu.Item>
                                    </div>

                                    <div className='border-border/40 border-t px-0.5 pt-1 pb-1'>
                                        <Menu.Item>
                                            {({ active }) => (
                                                <button
                                                    type='button'
                                                    onClick={handleLogout}
                                                    className={cn(
                                                        'text-destructive flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors',
                                                        active ? 'bg-destructive/10' : 'hover:bg-destructive/10',
                                                    )}
                                                >
                                                    <span className='border-destructive/25 bg-destructive/5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border'>
                                                        <LogOut className='h-4 w-4' aria-hidden />
                                                    </span>
                                                    {t('navbar.signOut')}
                                                </button>
                                            )}
                                        </Menu.Item>
                                    </div>

                                    <div className='border-border/35 border-t px-3 py-2'>
                                        <PoweredByFeatherPanel variant='menu' />
                                    </div>
                                </Menu.Items>
                            </Transition>
                        </Menu>
                    </div>
                </div>
            </div>
        </header>
    );
}
