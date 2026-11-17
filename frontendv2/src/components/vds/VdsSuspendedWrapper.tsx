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
import { useVmInstance } from '@/contexts/VmInstanceContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { SuspendedState } from '@/components/featherui/SuspendedState';

interface VdsSuspendedWrapperProps {
    children: ReactNode;
}

export function VdsSuspendedWrapper({ children }: VdsSuspendedWrapperProps) {
    const { instance } = useVmInstance();
    const { settings } = useSettings();
    const { t } = useTranslation();

    if (instance?.suspended === 1 || instance?.status === 'suspended') {
        const suspension = instance.suspension;

        return (
            <SuspendedState
                statusLabel={t('vms.status.suspended')}
                title={t('vds.suspended_banner.title')}
                description={suspension?.message || t('vds.suspended_banner.message')}
                resourceName={instance.hostname}
                details={[
                    { label: t('vds.suspended_banner.reason'), value: suspension?.reason ?? null },
                    {
                        label: t('vds.suspended_banner.since_label'),
                        value: suspension?.suspended_at
                            ? t('vds.suspended_banner.since_value', { date: suspension.suspended_at })
                            : null,
                    },
                ]}
                backHref='/dashboard'
                backLabel={t('servers.suspended_banner.back_to_dashboard')}
                supportUrl={settings?.app_support_url}
                supportLabel={t('servers.suspended_banner.contact_support')}
            />
        );
    }

    return <>{children}</>;
}
