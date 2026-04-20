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

import type { Dispatch, SetStateAction } from 'react';
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
import { cn, copyToClipboard } from '@/lib/utils';
import ThemeCustomizer from '@/components/layout/ThemeCustomizer';
import type { UserInfo } from '@/contexts/SessionContext';

export type NavbarChromeProps = {
    onMenuClick: () => void;
    headerTitle: string;
    canAccessAdmin: boolean;
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
};

export function NavbarClassicChrome(props: NavbarChromeProps) {
    const {
        onMenuClick,
        headerTitle,
        canAccessAdmin,
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
    } = props;
    return (
        <div
            className={cn(
                'sticky top-0 z-30 flex h-14 sm:h-16 shrink-0 items-center gap-x-2 sm:gap-x-4 border-b border-border/30 bg-card/75 backdrop-blur-xl px-2 sm:px-6 lg:px-8',
                desktopHoverDock && 'lg:static lg:top-auto',
            )}
        >
            <button
                type='button'
                className='-m-2 shrink-0 rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden'
                onClick={onMenuClick}
            >
                <span className='sr-only'>{t('navbar.openSidebar')}</span>
                <MenuIcon className='h-6 w-6' aria-hidden='true' />
            </button>

            <div className='h-5 sm:h-6 w-px bg-border lg:hidden shrink-0' aria-hidden='true' />

            <div className='flex flex-1 gap-x-2 sm:gap-x-4 self-stretch lg:gap-x-6 min-w-0'>
                <div className='flex flex-1 items-center min-w-0'>
                    <h1
                        className='text-base sm:text-lg font-semibold text-foreground truncate pr-2 sm:pr-1 min-w-0'
                        title={headerTitle}
                    >
                        {headerTitle}
                    </h1>
                </div>

                <div className='flex items-center gap-x-1.5 sm:gap-x-3 lg:gap-x-6 shrink-0'>
                    {canAccessAdmin && (
                        <button
                            type='button'
                            onClick={() => router.push('/admin')}
                            className='flex shrink-0 items-center gap-2 rounded-lg p-2 sm:px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:hover:bg-accent'
                            title={t('navbar.adminPanelTooltip')}
                        >
                            <ShieldCheck className='h-5 w-5 shrink-0' />
                            <span className='hidden lg:inline'>{t('navbar.adminArea')}</span>
                        </button>
                    )}

                    <ThemeCustomizer />

                    <div className='hidden lg:block lg:h-6 lg:w-px lg:bg-border' aria-hidden='true' />

                    <Menu as='div' className='relative shrink-0'>
                        <Menu.Button
                            className={cn(
                                'group flex items-center text-sm font-medium text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                'h-10 w-10 shrink-0 justify-center rounded-full border border-border/50 bg-background/90 p-0.5 backdrop-blur-md hover:bg-background hover:text-foreground data-[headlessui-state=open]:bg-background data-[headlessui-state=open]:text-foreground',
                                'lg:h-auto lg:w-auto lg:justify-start lg:gap-x-2 lg:rounded-xl lg:border-transparent lg:bg-transparent lg:p-0 lg:backdrop-blur-none lg:px-3 lg:py-2 lg:hover:bg-accent/80 lg:data-[headlessui-state=open]:bg-accent/80',
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
                                        className='h-full w-full rounded-full border border-border/50 object-cover'
                                    />
                                ) : (
                                    <div className='flex h-full w-full items-center justify-center rounded-full bg-muted/50 ring-1 ring-border/50'>
                                        <span className='text-sm font-semibold text-primary'>{getUserInitials()}</span>
                                    </div>
                                )}
                            </span>
                            <span className='hidden lg:flex lg:flex-col lg:items-start lg:ml-0.5 lg:min-w-0 lg:max-w-44'>
                                <span className='text-sm font-semibold text-foreground leading-tight truncate w-full'>
                                    {getUsername()}
                                </span>
                                {user?.role ? (
                                    <span
                                        className='mt-0.5 inline-flex max-w-full items-center truncate rounded-md px-1.5 py-px text-[11px] font-medium leading-tight'
                                        style={{
                                            backgroundColor: `${user.role.color}18`,
                                            color: user.role.color,
                                            border: `1px solid ${user.role.color}35`,
                                        }}
                                    >
                                        {user.role.display_name}
                                    </span>
                                ) : (
                                    <span className='mt-0.5 text-[11px] text-muted-foreground leading-tight truncate w-full'>
                                        {t('navbar.noRole')}
                                    </span>
                                )}
                            </span>
                            <ChevronDown
                                className='hidden lg:block h-4 w-4 shrink-0 text-muted-foreground opacity-60 transition-transform duration-200 group-data-[headlessui-state=open]:-rotate-180 group-data-[headlessui-state=open]:opacity-100'
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
                            <Menu.Items className='absolute right-0 z-50 mt-2 max-h-[min(32rem,calc(100dvh-5rem))] w-[min(20rem,calc(100vw-1rem))] origin-top-right overflow-y-auto overflow-x-hidden rounded-xl border border-border/40 bg-card shadow-md ring-1 ring-border/40 focus:outline-none sm:w-80 sm:max-w-none'>
                                <div className='border-b border-border/50 bg-muted/20 px-3 py-3 sm:px-4 sm:py-3.5'>
                                    <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5'>
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
                                                className='h-10 w-10 shrink-0 rounded-full border border-border/50 object-cover sm:h-11 sm:w-11'
                                            />
                                        ) : (
                                            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/40 sm:h-11 sm:w-11'>
                                                <span className='text-sm font-semibold text-primary sm:text-base'>
                                                    {getUserInitials()}
                                                </span>
                                            </div>
                                        )}
                                        <div className='min-w-0 flex-1'>
                                            <p className='text-sm font-semibold text-foreground truncate'>
                                                {getUsername()}
                                            </p>
                                            {getLegalName() ? (
                                                <p className='text-xs text-muted-foreground truncate mt-0.5'>
                                                    {getLegalName()}
                                                </p>
                                            ) : null}
                                            {user?.role ? (
                                                <div className='mt-1.5'>
                                                    <span
                                                        className='inline-flex max-w-full items-center truncate rounded-md px-2 py-0.5 text-xs font-medium'
                                                        style={{
                                                            backgroundColor: `${user.role.color}20`,
                                                            color: user.role.color,
                                                            border: `1px solid ${user.role.color}40`,
                                                        }}
                                                    >
                                                        {user.role.display_name}
                                                    </span>
                                                </div>
                                            ) : (
                                                <p className='mt-1.5 text-xs text-muted-foreground'>
                                                    {t('navbar.noRole')}
                                                </p>
                                            )}
                                            {user?.email ? (
                                                <div className='mt-2.5 flex items-center gap-0.5 rounded-lg border border-border/50 bg-muted/25 py-1 pl-2 pr-0.5'>
                                                    <p
                                                        className={cn(
                                                            'min-w-0 flex-1 text-xs text-muted-foreground truncate transition-[filter] duration-150',
                                                            !emailRevealed && 'blur-[4px] select-none',
                                                        )}
                                                        title={emailRevealed ? user.email : undefined}
                                                    >
                                                        {user.email}
                                                    </p>
                                                    <button
                                                        type='button'
                                                        className='shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
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
                                                        className='shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
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
                                                            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors',
                                                            active ? 'bg-accent' : 'hover:bg-accent/50',
                                                        )}
                                                    >
                                                        <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/30'>
                                                            <Icon className='h-4 w-4 text-muted-foreground' />
                                                        </span>
                                                        <span className='flex-1 text-left font-medium'>
                                                            {item.name}
                                                        </span>
                                                        <ChevronRight className='h-4 w-4 shrink-0 text-muted-foreground opacity-60' />
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
                                                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors',
                                                    active ? 'bg-accent' : 'hover:bg-accent/50',
                                                )}
                                            >
                                                <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/30'>
                                                    <Database className='h-4 w-4 text-muted-foreground' />
                                                </span>
                                                <span className='flex-1 text-left font-medium'>
                                                    {t('navbar.localStorageMenu')}
                                                </span>
                                                <ChevronRight className='h-4 w-4 shrink-0 text-muted-foreground opacity-60' />
                                            </button>
                                        )}
                                    </Menu.Item>
                                </div>

                                <div className='border-t border-border/50 bg-muted/10 p-1.5'>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                type='button'
                                                onClick={handleLogout}
                                                className={cn(
                                                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors',
                                                    active ? 'bg-destructive/10' : 'hover:bg-destructive/10',
                                                )}
                                            >
                                                <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5'>
                                                    <LogOut className='h-4 w-4' aria-hidden />
                                                </span>
                                                {t('navbar.signOut')}
                                            </button>
                                        )}
                                    </Menu.Item>
                                </div>

                                <div className='border-t border-border/50 bg-card/80 px-3 py-2'>
                                    <p className='text-center'>
                                        <a
                                            href='https://featherpanel.com'
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            className='text-[10px] font-normal lowercase tracking-wide text-muted-foreground/80 transition-colors hover:text-primary hover:underline underline-offset-2'
                                        >
                                            {t('navbar.poweredBy')}
                                        </a>
                                    </p>
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
        canAccessAdmin,
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
    } = props;
    return (
        <header
            className={cn(
                'sticky top-0 z-30 shrink-0 px-3 pb-2 pt-3 sm:px-4 lg:px-6',
                desktopHoverDock && 'lg:static lg:top-auto',
            )}
        >
            <div className='mx-auto flex h-12 max-w-[1800px] items-center gap-x-2 rounded-2xl border border-border/30 bg-card/65 px-2.5 shadow-sm backdrop-blur-xl sm:h-13 sm:gap-x-3 sm:px-3.5 dark:bg-card/55'>
                <button
                    type='button'
                    className='-m-1 flex shrink-0 items-center justify-center rounded-xl border border-transparent p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden'
                    onClick={onMenuClick}
                >
                    <span className='sr-only'>{t('navbar.openSidebar')}</span>
                    <MenuIcon className='h-5 w-5' aria-hidden='true' />
                </button>

                <div
                    className='hidden h-6 w-px bg-linear-to-b from-transparent via-border/80 to-transparent sm:block lg:hidden'
                    aria-hidden='true'
                />

                <div className='flex min-w-0 flex-1 items-stretch gap-x-2 self-stretch sm:gap-x-3'>
                    <div className='flex min-w-0 flex-1 items-center'>
                        <h1
                            className='truncate text-sm font-semibold tracking-tight text-foreground sm:text-[0.95rem]'
                            title={headerTitle}
                        >
                            {headerTitle}
                        </h1>
                    </div>

                    <div className='flex shrink-0 items-center gap-1 sm:gap-2'>
                        <div className='flex items-center gap-0.5 rounded-xl border border-border/40 bg-muted/15 p-0.5 sm:p-1'>
                            {canAccessAdmin && (
                                <button
                                    type='button'
                                    onClick={() => router.push('/admin')}
                                    className='flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:rounded-xl sm:px-2.5 sm:py-2'
                                    title={t('navbar.adminPanelTooltip')}
                                >
                                    <ShieldCheck className='h-4 w-4 shrink-0 sm:h-[1.05rem] sm:w-[1.05rem]' />
                                    <span className='hidden lg:inline'>{t('navbar.adminArea')}</span>
                                </button>
                            )}

                            <div className='hidden h-6 w-px bg-border/50 sm:block lg:hidden' aria-hidden />

                            <div className='flex items-center [&>button]:rounded-lg sm:[&>button]:rounded-xl'>
                                <ThemeCustomizer />
                            </div>
                        </div>

                        <div
                            className='mx-0.5 hidden h-6 w-px bg-linear-to-b from-transparent via-border/80 to-transparent lg:block'
                            aria-hidden='true'
                        />

                        <Menu as='div' className='relative shrink-0'>
                            <Menu.Button
                                className={cn(
                                    'group flex items-center text-sm font-medium text-muted-foreground transition-[background-color,border-color,box-shadow,color] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                    'h-9 w-9 shrink-0 justify-center rounded-xl border border-border/45 bg-muted/15 p-0.5 shadow-sm hover:bg-muted/40 hover:text-foreground hover:border-border/60 data-[headlessui-state=open]:border-border/70 data-[headlessui-state=open]:bg-muted/35 data-[headlessui-state=open]:text-foreground data-[headlessui-state=open]:shadow-sm',
                                    'lg:h-auto lg:w-auto lg:justify-start lg:gap-x-2 lg:rounded-xl lg:border-border/45 lg:bg-muted/15 lg:px-2.5 lg:py-1.5 lg:hover:bg-muted/35 lg:data-[headlessui-state=open]:bg-muted/35',
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
                                            className='h-full w-full rounded-full border border-border/50 object-cover'
                                        />
                                    ) : (
                                        <div className='flex h-full w-full items-center justify-center rounded-full bg-muted/50 ring-1 ring-border/50'>
                                            <span className='text-sm font-semibold text-primary'>
                                                {getUserInitials()}
                                            </span>
                                        </div>
                                    )}
                                </span>
                                <span className='hidden lg:flex lg:flex-col lg:items-start lg:ml-0.5 lg:min-w-0 lg:max-w-44'>
                                    <span className='text-sm font-semibold text-foreground leading-tight truncate w-full'>
                                        {getUsername()}
                                    </span>
                                    {user?.role ? (
                                        <span className='mt-0.5 inline-flex max-w-full items-center truncate rounded-md border border-primary/20 bg-primary/10 px-1.5 py-px text-[11px] font-medium leading-tight text-primary'>
                                            {user.role.display_name}
                                        </span>
                                    ) : (
                                        <span className='mt-0.5 text-[11px] text-muted-foreground leading-tight truncate w-full'>
                                            {t('navbar.noRole')}
                                        </span>
                                    )}
                                </span>
                                <ChevronDown
                                    className='hidden lg:block h-4 w-4 shrink-0 text-muted-foreground opacity-60 transition-transform duration-200 group-data-[headlessui-state=open]:-rotate-180 group-data-[headlessui-state=open]:opacity-100'
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
                                <Menu.Items className='absolute right-0 z-50 mt-2 max-h-[min(32rem,calc(100dvh-5rem))] w-[min(20rem,calc(100vw-1rem))] origin-top-right overflow-y-auto overflow-x-hidden rounded-2xl border border-border/40 bg-card p-1.5 shadow-md ring-1 ring-border/40 focus:outline-none sm:w-80 sm:max-w-none dark:bg-card/55'>
                                    <div className='rounded-xl border border-border/40 bg-muted/10 px-3 py-3 backdrop-blur-sm sm:px-3.5 sm:py-3'>
                                        <p className='mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
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
                                                    className='h-10 w-10 shrink-0 rounded-xl border border-border/50 object-cover sm:h-11 sm:w-11'
                                                />
                                            ) : (
                                                <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/30 sm:h-11 sm:w-11'>
                                                    <span className='text-sm font-semibold text-primary sm:text-base'>
                                                        {getUserInitials()}
                                                    </span>
                                                </div>
                                            )}
                                            <div className='min-w-0 flex-1'>
                                                <p className='truncate text-sm font-semibold text-foreground'>
                                                    {getUsername()}
                                                </p>
                                                {getLegalName() ? (
                                                    <p className='mt-0.5 truncate text-xs text-muted-foreground'>
                                                        {getLegalName()}
                                                    </p>
                                                ) : null}
                                                {user?.role ? (
                                                    <div className='mt-1.5'>
                                                        <span className='inline-flex max-w-full items-center truncate rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                                                            {user.role.display_name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <p className='mt-1.5 text-xs text-muted-foreground'>
                                                        {t('navbar.noRole')}
                                                    </p>
                                                )}
                                                {user?.email ? (
                                                    <div className='mt-2.5 flex items-center gap-0.5 rounded-lg border border-border/45 bg-background/25 py-1 pl-2 pr-0.5 backdrop-blur-sm dark:bg-background/20'>
                                                        <p
                                                            className={cn(
                                                                'min-w-0 flex-1 truncate text-xs text-muted-foreground transition-[filter] duration-150',
                                                                !emailRevealed && 'blur-xs select-none',
                                                            )}
                                                            title={emailRevealed ? user.email : undefined}
                                                        >
                                                            {user.email}
                                                        </p>
                                                        <button
                                                            type='button'
                                                            className='shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
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
                                                            className='shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
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

                                    <div className='mt-1 space-y-0.5 rounded-lg border border-border/30 bg-muted/5 px-0.5 py-0.5 pb-1 dark:bg-muted/10'>
                                        {userNavigation.map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <Menu.Item key={item.name}>
                                                    {({ active }) => (
                                                        <button
                                                            type='button'
                                                            onClick={() => router.push(item.href)}
                                                            className={cn(
                                                                'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-foreground transition-colors',
                                                                active ? 'bg-muted/60' : 'hover:bg-muted/40',
                                                            )}
                                                        >
                                                            <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/45 bg-muted/20 text-muted-foreground'>
                                                                <Icon className='h-4 w-4' />
                                                            </span>
                                                            <span className='flex-1 text-left font-medium'>
                                                                {item.name}
                                                            </span>
                                                            <ChevronRight className='h-4 w-4 shrink-0 text-muted-foreground opacity-50' />
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
                                                        'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-foreground transition-colors',
                                                        active ? 'bg-muted/60' : 'hover:bg-muted/40',
                                                    )}
                                                >
                                                    <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/45 bg-muted/20 text-muted-foreground'>
                                                        <Database className='h-4 w-4' />
                                                    </span>
                                                    <span className='flex-1 text-left font-medium'>
                                                        {t('navbar.localStorageMenu')}
                                                    </span>
                                                    <ChevronRight className='h-4 w-4 shrink-0 text-muted-foreground opacity-50' />
                                                </button>
                                            )}
                                        </Menu.Item>
                                    </div>

                                    <div className='border-t border-border/40 px-0.5 pb-1 pt-1'>
                                        <Menu.Item>
                                            {({ active }) => (
                                                <button
                                                    type='button'
                                                    onClick={handleLogout}
                                                    className={cn(
                                                        'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-destructive transition-colors',
                                                        active ? 'bg-destructive/10' : 'hover:bg-destructive/10',
                                                    )}
                                                >
                                                    <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-destructive/25 bg-destructive/5'>
                                                        <LogOut className='h-4 w-4' aria-hidden />
                                                    </span>
                                                    {t('navbar.signOut')}
                                                </button>
                                            )}
                                        </Menu.Item>
                                    </div>

                                    <div className='border-t border-border/35 px-3 py-2'>
                                        <p className='text-center'>
                                            <a
                                                href='https://featherpanel.com'
                                                target='_blank'
                                                rel='noopener noreferrer'
                                                className='text-[10px] font-normal lowercase tracking-wide text-muted-foreground/70 transition-colors hover:text-primary hover:underline underline-offset-2'
                                            >
                                                {t('navbar.poweredBy')}
                                            </a>
                                        </p>
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
