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
import { useWebSpace } from '@/contexts/WebSpaceContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { SuspendedState } from '@/components/featherui/SuspendedState';

interface WebSpaceSuspendedWrapperProps {
    children: ReactNode;
}

export function WebSpaceSuspendedWrapper({ children }: WebSpaceSuspendedWrapperProps) {
    const { webspace } = useWebSpace();
    const { t } = useTranslation();
    const { settings } = useSettings();

    if (webspace?.suspended === 1 || webspace?.status === 'suspended') {
        return (
            <SuspendedState
                statusLabel={t('servers.status.suspended')}
                title={t('webSpaces.suspended.title')}
                description={t('webSpaces.suspended.description')}
                resourceName={webspace.name}
                backHref='/dashboard/webspaces'
                backLabel={t('webSpaces.suspended.back')}
                supportUrl={settings?.app_support_url}
                supportLabel={t('servers.suspended_banner.contact_support')}
            />
        );
    }

    return <>{children}</>;
}

/** @deprecated Use WebSpaceSuspendedWrapper */
export function WebSpaceSuspendedBanner({ children }: { children: ReactNode }) {
    return <WebSpaceSuspendedWrapper>{children}</WebSpaceSuspendedWrapper>;
}
