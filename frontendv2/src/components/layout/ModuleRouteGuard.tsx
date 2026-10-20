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

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PackageX } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { EmptyState } from '@/components/featherui/EmptyState';
import { getModuleForPath, isModuleEnabled } from '@/lib/modules';

/**
 * Keeps pages of a disabled module (game servers, web hosting, VDS) out of reach: shows a short
 * notice and sends the user back to the dashboard (or the admin overview for admin pages).
 */
export function ModuleRouteGuard({ children }: { children: ReactNode }) {
    const pathname = usePathname() ?? '';
    const router = useRouter();
    const { settings } = useSettings();
    const { t } = useTranslation();
    const routeModule = getModuleForPath(pathname);
    const blocked = routeModule !== null && !isModuleEnabled(settings, routeModule);

    useEffect(() => {
        if (!blocked || !routeModule) return;
        toast.info(t('modules.disabledToast', { module: t(`modules.names.${routeModule}`) }), {
            id: 'module-disabled',
        });
        router.replace(pathname.startsWith('/admin') ? '/admin' : '/dashboard');
    }, [blocked, routeModule, pathname, router, t]);

    if (blocked && routeModule) {
        return (
            <EmptyState
                icon={PackageX}
                title={t('modules.disabledTitle')}
                description={t('modules.disabledDescription', { module: t(`modules.names.${routeModule}`) })}
            />
        );
    }

    return <>{children}</>;
}
