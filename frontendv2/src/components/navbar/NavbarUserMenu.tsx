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
import { CircleUser, ChevronDown, Copy, Database, Eye, EyeOff, LogOut, Palette } from 'lucide-react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import Image from 'next/image';
import { RoleBadge } from '@/components/RoleBadge';
import { cn, copyToClipboard } from '@/lib/utils';
import { PoweredByFeatherPanel } from '@/components/branding/PoweredByFeatherPanel';
import type { UserInfo } from '@/contexts/SessionContext';

type NavbarUserMenuProps = {
    variant: 'classic' | 'modern';
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
};

function UserAvatar({
    user,
    getUserInitials,
    getUsername,
    size = 'md',
    ringColor,
}: {
    user: UserInfo | null;
    getUserInitials: () => string;
    getUsername: () => string;
    size?: 'sm' | 'md' | 'lg';
    ringColor?: string | null;
}) {
    const dimension = size === 'lg' ? 'h-11 w-11' : size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';

    const avatar = user?.avatar ? (
        <Image
            src={user.avatar}
            alt={getUsername()}
            width={44}
            height={44}
            unoptimized
            className='h-full w-full rounded-full object-cover'
        />
    ) : (
        <div className='bg-primary/10 text-primary flex h-full w-full items-center justify-center rounded-full'>
            <span className={cn('font-semibold', size === 'lg' ? 'text-base' : 'text-sm')}>{getUserInitials()}</span>
        </div>
    );

    if (ringColor) {
        return (
            <span
                className='inline-flex shrink-0 rounded-full p-px'
                style={{ background: `linear-gradient(135deg, ${ringColor}, ${ringColor}88)` }}
            >
                <span className={cn('bg-card block overflow-hidden rounded-full', dimension)}>{avatar}</span>
            </span>
        );
    }

    return <span className={cn('block shrink-0 overflow-hidden rounded-full', dimension)}>{avatar}</span>;
}

function MenuLinkRow({
    active,
    onClick,
    icon: Icon,
    label,
    destructive = false,
}: {
    active: boolean;
    onClick: () => void;
    icon: typeof CircleUser;
    label: string;
    destructive?: boolean;
}) {
    return (
        <button
            type='button'
            onClick={onClick}
            className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                destructive
                    ? active
                        ? 'bg-destructive/12 text-destructive'
                        : 'text-destructive hover:bg-destructive/10'
                    : active
                      ? 'bg-muted/70 text-foreground'
                      : 'text-foreground hover:bg-muted/45',
            )}
        >
            <Icon className={cn('h-4 w-4 shrink-0', destructive ? 'text-destructive' : 'text-muted-foreground')} />
            <span className='font-medium'>{label}</span>
        </button>
    );
}

export function NavbarUserMenu({
    variant,
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
}: NavbarUserMenuProps) {
    const isModern = variant === 'modern';
    const roleColor = user?.role?.color?.trim() || null;

    return (
        <Menu as='div' className='relative shrink-0'>
            <Menu.Button
                className={cn(
                    'group focus-visible:ring-ring focus-visible:ring-offset-background flex items-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    isModern
                        ? 'border-border/35 bg-muted/10 hover:bg-muted/25 data-[headlessui-state=open]:bg-muted/35 gap-2 rounded-xl border px-1.5 py-1 sm:px-2'
                        : 'hover:bg-accent/60 data-[headlessui-state=open]:bg-accent/80 gap-2 rounded-xl px-1.5 py-1 sm:px-2',
                )}
            >
                <span className='sr-only'>{t('navbar.openUserMenu')}</span>
                <UserAvatar
                    user={user}
                    getUserInitials={getUserInitials}
                    getUsername={getUsername}
                    size='sm'
                    ringColor={roleColor}
                />
                <span className='hidden min-w-0 flex-col items-start sm:flex'>
                    <span className='text-foreground max-w-[8.5rem] truncate text-sm leading-tight font-semibold'>
                        {getUsername()}
                    </span>
                    {user?.role ? (
                        <RoleBadge role={user.role} size='xs' className='mt-0.5 max-w-[8.5rem]' />
                    ) : (
                        <span className='text-muted-foreground mt-0.5 truncate text-[11px]'>{t('navbar.noRole')}</span>
                    )}
                </span>
                <ChevronDown
                    className='text-muted-foreground hidden h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 group-data-[headlessui-state=open]:-rotate-180 group-data-[headlessui-state=open]:opacity-100 sm:block'
                    aria-hidden
                />
            </Menu.Button>

            <Transition
                as={Fragment}
                enter='transition ease-out duration-200'
                enterFrom='transform opacity-0 scale-[0.97] translate-y-1'
                enterTo='transform opacity-100 scale-100 translate-y-0'
                leave='transition ease-in duration-150'
                leaveFrom='transform opacity-100 scale-100 translate-y-0'
                leaveTo='transform opacity-0 scale-[0.97] translate-y-1'
            >
                <Menu.Items className='border-border/40 bg-card/95 ring-border/20 absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1rem))] origin-top-right overflow-hidden rounded-2xl border shadow-xl ring-1 backdrop-blur-xl focus:outline-none sm:w-80'>
                    <div className='from-primary/10 via-primary/5 relative border-b border-white/5 bg-linear-to-br to-transparent px-4 py-4'>
                        <div className='flex items-start gap-3'>
                            <UserAvatar
                                user={user}
                                getUserInitials={getUserInitials}
                                getUsername={getUsername}
                                size='lg'
                                ringColor={roleColor}
                            />
                            <div className='min-w-0 flex-1 pt-0.5'>
                                <p className='text-foreground truncate text-base font-semibold'>{getUsername()}</p>
                                {getLegalName() ? (
                                    <p className='text-muted-foreground mt-0.5 truncate text-xs'>{getLegalName()}</p>
                                ) : null}
                                {user?.role ? (
                                    <div className='mt-2'>
                                        <RoleBadge role={user.role} size='sm' />
                                    </div>
                                ) : (
                                    <p className='text-muted-foreground mt-2 text-xs'>{t('navbar.noRole')}</p>
                                )}
                            </div>
                        </div>

                        {user?.email ? (
                            <div className='bg-background/40 border-border/40 mt-3 flex items-center gap-1 rounded-xl border px-2 py-1.5 backdrop-blur-sm'>
                                <p
                                    className={cn(
                                        'text-muted-foreground min-w-0 flex-1 truncate text-xs',
                                        !emailRevealed && 'blur-xs select-none',
                                    )}
                                    title={emailRevealed ? user.email : undefined}
                                >
                                    {user.email}
                                </p>
                                <button
                                    type='button'
                                    className='text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-lg p-1.5 transition-colors'
                                    aria-label={emailRevealed ? t('navbar.hideEmail') : t('navbar.showEmail')}
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
                                    className='text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-lg p-1.5 transition-colors'
                                    aria-label={t('navbar.copyEmail')}
                                    onClick={() => void copyToClipboard(user.email, t)}
                                >
                                    <Copy className='h-3.5 w-3.5' aria-hidden />
                                </button>
                            </div>
                        ) : null}
                    </div>

                    <div className='space-y-1 p-2'>
                        {userNavigation.map((item) => (
                            <Menu.Item key={item.name}>
                                {({ active }) => (
                                    <MenuLinkRow
                                        active={active}
                                        onClick={() => router.push(item.href)}
                                        icon={item.icon}
                                        label={item.name}
                                    />
                                )}
                            </Menu.Item>
                        ))}
                        <Menu.Item>
                            {({ active }) => (
                                <MenuLinkRow
                                    active={active}
                                    onClick={() => router.push('/dashboard/preferences')}
                                    icon={Palette}
                                    label={t('navigation.items.preferences')}
                                />
                            )}
                        </Menu.Item>
                        <Menu.Item>
                            {({ active, close }) => (
                                <MenuLinkRow
                                    active={active}
                                    onClick={() => {
                                        setLocalStorageOpen(true);
                                        close();
                                    }}
                                    icon={Database}
                                    label={t('navbar.localStorageMenu')}
                                />
                            )}
                        </Menu.Item>
                    </div>

                    <div className='border-border/40 space-y-1 border-t p-2'>
                        <Menu.Item>
                            {({ active }) => (
                                <MenuLinkRow
                                    active={active}
                                    onClick={handleLogout}
                                    icon={LogOut}
                                    label={t('navbar.signOut')}
                                    destructive
                                />
                            )}
                        </Menu.Item>
                    </div>

                    <div className='border-border/40 border-t px-3 py-2'>
                        <PoweredByFeatherPanel variant='menu' />
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}
