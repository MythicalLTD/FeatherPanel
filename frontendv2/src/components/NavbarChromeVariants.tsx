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

import type { ReactNode } from 'react';
import { Menu as MenuIcon, Search, ShieldCheck } from 'lucide-react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { CircleUser } from 'lucide-react';
import { NavbarUserMenu } from '@/components/navbar/NavbarUserMenu';
import ThemeCustomizer from '@/components/layout/ThemeCustomizer';
import { PrivacyModeButton } from '@/components/common/PrivacyModeButton';
import { useGlobalSearch } from '@/contexts/GlobalSearchContext';
import { SidebarCollapseToggle } from '@/components/sidebar/SidebarCollapseToggle';
import { GlobalSearchTrigger } from '@/components/global-search/GlobalSearchDialog';
import { cn } from '@/lib/utils';
import type { SidebarPosition, SidebarTogglePlacement, SidebarGlow } from '@/hooks/useSidebarPreferences';
import { getChromeGlowClass } from '@/lib/sidebarLayout';
import type { UserInfo } from '@/contexts/SessionContext';

export type NavbarChromeProps = {
    onMenuClick: () => void;
    sidebarCollapsed?: boolean;
    headerTitle: string;
    headerContent?: ReactNode;
    showAdminAreaButton: boolean;
    adminAreaHref: string;
    user: UserInfo | null;
    userLoading?: boolean;
    router: AppRouterInstance;
    userNavigation: Array<{ name: string; href: string; icon: typeof CircleUser }>;
    t: (key: string, params?: Record<string, string>) => string;
    emailRevealed: boolean;
    setEmailRevealed: React.Dispatch<React.SetStateAction<boolean>>;
    setLocalStorageOpen: (open: boolean) => void;
    getUserInitials: () => string;
    getUsername: () => string;
    getLegalName: () => string;
    handleLogout: () => Promise<void>;
    desktopHoverDock?: boolean;
    navbarSticky?: boolean;
    sidebarPosition?: SidebarPosition;
    sidebarTogglePlacement?: SidebarTogglePlacement;
    sidebarGlow?: SidebarGlow;
};

function shouldShowNavbarSidebarToggle(
    sidebarPosition: SidebarPosition = 'left',
    sidebarTogglePlacement: SidebarTogglePlacement = 'sidebar',
) {
    if (sidebarPosition === 'bottom') return false;
    return sidebarTogglePlacement === 'navbar' || sidebarTogglePlacement === 'both';
}

function NavbarSidebarToggleButton({
    sidebarPosition,
    sidebarCollapsed,
    t,
    className,
}: {
    sidebarPosition: SidebarPosition;
    sidebarCollapsed?: boolean;
    t: NavbarChromeProps['t'];
    className?: string;
}) {
    return (
        <SidebarCollapseToggle
            position={sidebarPosition}
            collapsed={Boolean(sidebarCollapsed)}
            t={t}
            variant='navbar'
            className={className}
        />
    );
}

function NavbarMobileSearchButton({ t, compact }: { t: NavbarChromeProps['t']; compact?: boolean }) {
    const { setOpen } = useGlobalSearch();

    return (
        <button
            type='button'
            onClick={() => setOpen(true)}
            className={cn(
                'text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background flex shrink-0 items-center justify-center rounded-xl p-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                compact ? 'lg:hidden' : 'md:hidden',
            )}
            aria-label={t('globalSearch.open')}
        >
            <Search className='h-5 w-5' aria-hidden />
        </button>
    );
}

function NavbarCenterSearch({ variant, compact }: { variant: 'classic' | 'modern'; compact?: boolean }) {
    return (
        // A regular flex item between the title and the actions: it shrinks
        // with the row instead of sitting on top of its neighbours.
        <div
            className={cn(
                'hidden min-w-40 items-center',
                compact
                    ? 'flex-[0_1_26rem] lg:flex xl:flex-[0_1_30rem]'
                    : 'flex-[0_1_32rem] md:flex lg:flex-[0_1_36rem]',
            )}
        >
            <GlobalSearchTrigger variant={variant} className='max-w-none' />
        </div>
    );
}

function NavbarActionsCluster({
    compactSearch,
    variant,
    showAdminAreaButton,
    adminAreaHref,
    router,
    t,
    userMenuProps,
}: {
    compactSearch?: boolean;
    variant: 'classic' | 'modern';
    showAdminAreaButton: boolean;
    adminAreaHref: string;
    router: AppRouterInstance;
    t: NavbarChromeProps['t'];
    userMenuProps: Omit<
        NavbarChromeProps,
        | 'onMenuClick'
        | 'headerTitle'
        | 'headerContent'
        | 'showAdminAreaButton'
        | 'adminAreaHref'
        | 'router'
        | 't'
        | 'desktopHoverDock'
        | 'navbarSticky'
        | 'sidebarCollapsed'
        | 'sidebarPosition'
        | 'sidebarTogglePlacement'
    >;
}) {
    const isModern = variant === 'modern';

    const adminButton = showAdminAreaButton ? (
        <button
            type='button'
            onClick={() => router.push(adminAreaHref)}
            className={cn(
                'text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background hidden shrink-0 items-center gap-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:flex',
                isModern
                    ? 'hover:bg-muted/50 rounded-lg px-2 py-1.5 sm:rounded-xl sm:px-2.5 sm:py-2'
                    : 'hover:bg-accent/50 sm:hover:bg-accent rounded-lg p-2 sm:px-3',
            )}
            title={t('navbar.adminPanelTooltip')}
        >
            <ShieldCheck className={cn('shrink-0', isModern ? 'h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]' : 'h-5 w-5')} />
            <span className='hidden xl:inline'>{t('navbar.adminArea')}</span>
        </button>
    ) : null;

    if (isModern) {
        return (
            <div className='relative z-10 flex shrink-0 items-center gap-1 sm:gap-2'>
                <NavbarMobileSearchButton t={t} compact={compactSearch} />
                <div className='bg-muted/20 hidden items-center gap-0.5 rounded-xl p-1 sm:flex'>
                    {adminButton}
                    {showAdminAreaButton && (
                        <div className='bg-border/50 hidden h-6 w-px sm:block xl:hidden' aria-hidden />
                    )}
                    <div className='flex items-center [&>button]:rounded-lg sm:[&>button]:rounded-xl'>
                        <PrivacyModeButton />
                        <ThemeCustomizer />
                    </div>
                </div>
                <NavbarUserMenu
                    variant='modern'
                    {...userMenuProps}
                    adminAreaHref={showAdminAreaButton ? adminAreaHref : undefined}
                    router={router}
                    t={t}
                />
            </div>
        );
    }

    return (
        <div className='relative z-10 flex shrink-0 items-center gap-x-1.5 sm:gap-x-2 lg:gap-x-3'>
            <NavbarMobileSearchButton t={t} compact={compactSearch} />
            {adminButton}
            <PrivacyModeButton className='hidden sm:flex' />
            <div className='hidden sm:flex'>
                <ThemeCustomizer />
            </div>
            <NavbarUserMenu
                variant='classic'
                {...userMenuProps}
                adminAreaHref={showAdminAreaButton ? adminAreaHref : undefined}
                router={router}
                t={t}
            />
        </div>
    );
}

function NavbarMainRow({
    variant,
    headerTitle,
    headerContent,
    showSidebarToggle,
    toggleOnRight,
    sidebarPosition,
    sidebarCollapsed,
    showAdminAreaButton,
    adminAreaHref,
    router,
    t,
    userMenuProps,
}: {
    variant: 'classic' | 'modern';
    headerTitle: string;
    headerContent?: ReactNode;
    showSidebarToggle: boolean;
    toggleOnRight: boolean;
    sidebarPosition: SidebarPosition;
    sidebarCollapsed?: boolean;
    showAdminAreaButton: boolean;
    adminAreaHref: string;
    router: AppRouterInstance;
    t: NavbarChromeProps['t'];
    userMenuProps: Omit<
        NavbarChromeProps,
        | 'onMenuClick'
        | 'headerTitle'
        | 'headerContent'
        | 'showAdminAreaButton'
        | 'adminAreaHref'
        | 'router'
        | 't'
        | 'desktopHoverDock'
        | 'navbarSticky'
        | 'sidebarCollapsed'
        | 'sidebarPosition'
        | 'sidebarTogglePlacement'
    >;
}) {
    const isModern = variant === 'modern';

    return (
        <div className='relative flex min-w-0 flex-1 items-center gap-x-2 self-stretch sm:gap-x-3'>
            {/* Title / header content keeps its width (up to 40%); the search shrinks first. */}
            <div className='flex max-w-[calc(100%-6.5rem)] min-w-0 flex-[1_0_auto] items-center gap-2 sm:max-w-[45%] md:max-w-[40%]'>
                <div className='min-w-0 flex-1'>
                    {headerContent ?? (
                        <h1
                            className={cn(
                                'text-foreground truncate font-semibold tracking-tight',
                                isModern ? 'text-sm sm:text-[0.95rem]' : 'text-base sm:text-lg',
                            )}
                            title={headerTitle}
                        >
                            {headerTitle}
                        </h1>
                    )}
                </div>

                {showSidebarToggle && toggleOnRight && (
                    <NavbarSidebarToggleButton
                        sidebarPosition={sidebarPosition}
                        sidebarCollapsed={sidebarCollapsed}
                        t={t}
                        className={cn('hidden p-2 lg:flex', isModern && 'self-center')}
                    />
                )}
            </div>

            <NavbarCenterSearch variant={variant} compact={Boolean(headerContent)} />

            {/* Never shrinks below its content, so the search gives way first. */}
            <div className='flex flex-[1_0_auto] items-center justify-end'>
                <NavbarActionsCluster
                    compactSearch={Boolean(headerContent)}
                    variant={variant}
                    showAdminAreaButton={showAdminAreaButton}
                    adminAreaHref={adminAreaHref}
                    router={router}
                    t={t}
                    userMenuProps={userMenuProps}
                />
            </div>
        </div>
    );
}

export function NavbarClassicChrome(props: NavbarChromeProps) {
    const {
        onMenuClick,
        sidebarCollapsed,
        headerTitle,
        headerContent,
        showAdminAreaButton,
        adminAreaHref,
        router,
        t,
        desktopHoverDock = false,
        navbarSticky = true,
        sidebarPosition = 'left',
        sidebarTogglePlacement = 'sidebar',
        ...userMenuProps
    } = props;

    const showSidebarToggle = shouldShowNavbarSidebarToggle(sidebarPosition, sidebarTogglePlacement);
    const toggleOnRight = sidebarPosition === 'right';

    return (
        <div
            className={cn(
                'border-border/40 bg-card/90 z-30 flex h-14 shrink-0 items-center gap-x-2 border-b px-2 sm:h-16 sm:gap-x-4 sm:px-6 lg:px-8',
                navbarSticky ? 'sticky top-0' : 'relative',
                desktopHoverDock && 'lg:static lg:top-auto',
            )}
        >
            <button
                type='button'
                className={cn(
                    'text-muted-foreground hover:bg-accent/50 hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background shrink-0 touch-manipulation rounded-lg p-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 lg:hidden',
                    toggleOnRight && 'order-last',
                )}
                onClick={onMenuClick}
                aria-label={t('navbar.openSidebar')}
            >
                <span className='sr-only'>{t('navbar.openSidebar')}</span>
                <MenuIcon className='h-6 w-6' aria-hidden='true' />
            </button>

            {showSidebarToggle && !toggleOnRight && (
                <NavbarSidebarToggleButton
                    sidebarPosition={sidebarPosition}
                    sidebarCollapsed={sidebarCollapsed}
                    t={t}
                    className='hidden p-2 lg:flex'
                />
            )}

            {showSidebarToggle && !toggleOnRight && (
                <div className='bg-border hidden h-5 w-px shrink-0 sm:h-6 lg:block' aria-hidden='true' />
            )}

            <NavbarMainRow
                variant='classic'
                headerTitle={headerTitle}
                headerContent={headerContent}
                showSidebarToggle={showSidebarToggle}
                toggleOnRight={toggleOnRight}
                sidebarPosition={sidebarPosition}
                sidebarCollapsed={sidebarCollapsed}
                showAdminAreaButton={showAdminAreaButton}
                adminAreaHref={adminAreaHref}
                router={router}
                t={t}
                userMenuProps={userMenuProps}
            />
        </div>
    );
}

export function NavbarModernChrome(props: NavbarChromeProps) {
    const {
        onMenuClick,
        sidebarCollapsed,
        headerTitle,
        headerContent,
        showAdminAreaButton,
        adminAreaHref,
        router,
        t,
        desktopHoverDock = false,
        navbarSticky = true,
        sidebarPosition = 'left',
        sidebarTogglePlacement = 'sidebar',
        sidebarGlow = 'none',
        ...userMenuProps
    } = props;

    const showSidebarToggle = shouldShowNavbarSidebarToggle(sidebarPosition, sidebarTogglePlacement);
    const toggleOnRight = sidebarPosition === 'right';
    const navbarGlowClass = getChromeGlowClass(sidebarGlow);

    return (
        <header
            className={cn(
                'z-30 shrink-0 px-3 pt-3 pb-2 sm:px-4 lg:px-6',
                navbarSticky ? 'sticky top-0' : 'relative',
                desktopHoverDock && 'lg:static lg:top-auto',
            )}
        >
            <div
                className={cn(
                    'fp-chrome-surface mx-auto flex h-12 max-w-450 items-center gap-x-2 rounded-2xl border px-2.5 sm:h-13 sm:gap-x-3 sm:px-3.5',
                    navbarGlowClass,
                )}
            >
                <button
                    type='button'
                    className={cn(
                        'text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background flex shrink-0 touch-manipulation items-center justify-center rounded-xl border border-transparent p-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 lg:hidden',
                        // Mobile drawer opens from the chosen side, so the button that opens it sits there too.
                        toggleOnRight && 'order-last',
                    )}
                    onClick={onMenuClick}
                    aria-label={t('navbar.openSidebar')}
                >
                    <span className='sr-only'>{t('navbar.openSidebar')}</span>
                    <MenuIcon className='h-5 w-5' aria-hidden='true' />
                </button>

                {showSidebarToggle && !toggleOnRight && (
                    <NavbarSidebarToggleButton
                        sidebarPosition={sidebarPosition}
                        sidebarCollapsed={sidebarCollapsed}
                        t={t}
                        className='hidden p-2 lg:flex'
                    />
                )}

                {showSidebarToggle && !toggleOnRight && (
                    <div
                        className='via-border/80 hidden h-6 w-px bg-linear-to-b from-transparent to-transparent sm:block'
                        aria-hidden='true'
                    />
                )}

                <NavbarMainRow
                    variant='modern'
                    headerTitle={headerTitle}
                    headerContent={headerContent}
                    showSidebarToggle={showSidebarToggle}
                    toggleOnRight={toggleOnRight}
                    sidebarPosition={sidebarPosition}
                    sidebarCollapsed={sidebarCollapsed}
                    showAdminAreaButton={showAdminAreaButton}
                    adminAreaHref={adminAreaHref}
                    router={router}
                    t={t}
                    userMenuProps={userMenuProps}
                />
            </div>
        </header>
    );
}
