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

import { useContext, useState } from 'react';
import { CircleUser } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/contexts/SessionContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { ServerContext } from '@/contexts/ServerContext';
import Permissions from '@/lib/permissions';
import { LocalStorageManagerDialog } from '@/components/layout/LocalStorageManagerDialog';
import { useNavbarHoverReveal } from '@/hooks/useNavbarHoverReveal';
import { useChromeLayout } from '@/hooks/useChromeLayout';
import { NavbarClassicChrome, NavbarModernChrome } from '@/components/NavbarChromeVariants';

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
    const { navbarHoverReveal } = useNavbarHoverReveal();
    const { chromeLayout } = useChromeLayout();

    const canAccessAdmin = hasPermission(Permissions.ADMIN_DASHBOARD_VIEW);

    const chromeProps = {
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
        desktopHoverDock: navbarHoverReveal,
    };

    const Chrome = chromeLayout === 'classic' ? NavbarClassicChrome : NavbarModernChrome;

    return (
        <>
            <Chrome {...chromeProps} />
            <LocalStorageManagerDialog open={localStorageOpen} onOpenChange={setLocalStorageOpen} />
        </>
    );
}
