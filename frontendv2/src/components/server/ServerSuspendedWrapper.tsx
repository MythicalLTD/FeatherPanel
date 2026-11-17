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

import { ReactNode } from 'react';
import { useServer } from '@/contexts/ServerContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { SuspendedState } from '@/components/featherui/SuspendedState';

interface ServerSuspendedWrapperProps {
    children: ReactNode;
}

export function ServerSuspendedWrapper({ children }: ServerSuspendedWrapperProps) {
    const { server } = useServer();
    const { t } = useTranslation();
    const { settings } = useSettings();

    if (server?.suspended === 1) {
        return (
            <SuspendedState
                statusLabel={t('servers.status.suspended')}
                title={t('servers.suspended_banner.title')}
                description={t('servers.suspended_banner.message')}
                resourceName={server.name}
                backHref='/dashboard'
                backLabel={t('servers.suspended_banner.back_to_dashboard')}
                supportUrl={settings?.app_support_url}
                supportLabel={t('servers.suspended_banner.contact_support')}
            />
        );
    }

    return <>{children}</>;
}
