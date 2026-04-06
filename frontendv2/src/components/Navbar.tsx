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

import { Fragment, useContext, useState } from 'react';
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
import { useRouter, usePathname } from 'next/navigation';
import { cn, copyToClipboard } from '@/lib/utils';
import ThemeCustomizer from '@/components/layout/ThemeCustomizer';
import { useSession } from '@/contexts/SessionContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { ServerContext } from '@/contexts/ServerContext';
import Image from 'next/image';
import Permissions from '@/lib/permissions';
import { LocalStorageManagerDialog } from '@/components/layout/LocalStorageManagerDialog';

interface NavbarProps {
    onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout, hasPermission } = useSession();
    const { t } = useTranslation();
    const serverContext = useContext(ServerContext);
    const isOnServerPage = pathname?.startsWith('/server/');
    const serverName = isOnServerPage ? serverContext?.server?.name : null;
    const headerTitle = serverName ?? t('dashboard.title');

    const userNavigation = [{ name: t('navbar.profile'), href: '/dashboard/account', icon: CircleUser }];

    const handleLogout = async () => {
        await logout();
    };

    const getUserInitials = () => {
        if (!user) return 'U';
        const u = user.username?.trim();
        if (u && u.length >= 2) return u.slice(0, 2).toUpperCase();
        if (u) return u.slice(0, 1).toUpperCase();
        return 'U';
    };

    const getUsername = () => {
        if (!user) return t('navbar.user');
        return user.username?.trim() || t('navbar.user');
    };

    const getLegalName = () => {
        if (!user) return '';
        const parts = [user.first_name?.trim(), user.last_name?.trim()].filter(Boolean);
        return parts.join(' ');
    };

    const [emailRevealed, setEmailRevealed] = useState(false);
    const [localStorageOpen, setLocalStorageOpen] = useState(false);

    const canAccessAdmin = hasPermission(Permissions.ADMIN_DASHBOARD_VIEW);

    return (
        <div className='sticky top-0 z-30 flex h-14 sm:h-16 shrink-0 items-center gap-x-2 sm:gap-x-4 border-b border-border/50 bg-card/70 backdrop-blur-xl px-2 sm:px-6 lg:px-8'>
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
                            <Menu.Items className='absolute right-0 z-50 mt-2 max-h-[min(32rem,calc(100dvh-5rem))] w-[min(20rem,calc(100vw-1rem))] origin-top-right overflow-y-auto overflow-x-hidden rounded-xl border border-border/50 bg-card backdrop-blur-xl shadow-lg ring-1 ring-black/5 focus:outline-none dark:ring-white/10 sm:w-80 sm:max-w-none'>
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

            <LocalStorageManagerDialog open={localStorageOpen} onOpenChange={setLocalStorageOpen} />
        </div>
    );
}
