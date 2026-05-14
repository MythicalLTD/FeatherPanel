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

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/contexts/SessionContext';
import PermissionsClass from '@/lib/permissions';

interface PermissionGuardProps {
    children: React.ReactNode;
    permission?: string;
    fallbackUrl?: string;
}

export default function PermissionGuard({
    children,
    permission = PermissionsClass.ADMIN_ROOT,
    fallbackUrl = '/dashboard',
}: PermissionGuardProps) {
    const { hasPermission, isSessionChecked, isLoading } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (isSessionChecked && !isLoading && !hasPermission(permission)) {
            router.push(fallbackUrl);
        }
    }, [isSessionChecked, isLoading, hasPermission, permission, router, fallbackUrl]);

    if (!isSessionChecked || isLoading) {
        return (
            <div className='bg-background flex h-screen w-full items-center justify-center'>
                <div className='border-primary h-12 w-12 animate-spin rounded-full border-2 border-t-transparent' />
            </div>
        );
    }

    if (!hasPermission(permission)) {
        return null;
    }

    return <>{children}</>;
}
